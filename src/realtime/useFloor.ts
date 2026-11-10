import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../api/client'
import type { CellCoordinate } from '../types/api'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
interface Ticket { ticket: string; expiresIn: number }
interface Member { userId: number; displayName: string; r?: number; c?: number }
interface Claim { claimId: string; userId: number; displayName?: string; cells: CellCoordinate[]; expiresAt: string }

export function useFloor(fileId: number) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline' | 'unavailable'>('connecting')
  const [members, setMembers] = useState<Member[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [message, setMessage] = useState('')
  const socket = useRef<WebSocket | null>(null)
  const seq = useRef(0)
  const ownClaim = useRef<string | null>(null)
  const lastCursor = useRef(0)
  const pendingClaim = useRef<{ requestId: string; resolve: (allowed: boolean) => void } | null>(null)

  useEffect(() => {
    if (!Number.isFinite(fileId)) return
    let disposed = false
    let reconnect = 1000
    let heartbeat = 0
    let renew = 0
    let missedPongs = 0
    const connect = async () => {
      if (disposed) return
      setStatus('connecting')
      try {
        const { ticket } = await apiRequest<Ticket>('/floor/tickets', { method: 'POST', body: JSON.stringify({ fileId }) })
        if (disposed) return
        const ws = new WebSocket(`${WS_BASE_URL}/floor/ws?ticket=${encodeURIComponent(ticket)}`)
        socket.current = ws
        ws.onopen = () => {
          setStatus('connected'); reconnect = 1000; missedPongs = 0
          heartbeat = window.setInterval(() => { if (missedPongs >= 2) ws.close(); else { missedPongs += 1; send(ws, { type: 'ping', t: Date.now() }) } }, 15000)
          renew = window.setInterval(() => { if (ownClaim.current) send(ws, { type: 'renew', claimId: ownClaim.current }) }, 8000)
        }
        ws.onmessage = (event) => {
          let data: Record<string, unknown>
          try { data = JSON.parse(String(event.data)) as Record<string, unknown> } catch { return }
          const type = String(data.type)
          if (type === 'pong') { missedPongs = 0; return }
          const nextSeq = Number(data.seq)
          if (nextSeq && seq.current && nextSeq !== seq.current + 1 && type !== 'snapshot') send(ws, { type: 'resync' })
          if (nextSeq) seq.current = nextSeq
          if (type === 'snapshot') {
            setMembers(toMembers(data.members)); setClaims(toClaims(data.claims))
          } else if (type === 'member.joined') {
            const member = { userId: Number(data.userId), displayName: String(data.displayName) }
            setMembers((current) => current.some((item) => item.userId === member.userId) ? current : [...current, member])
          } else if (type === 'member.left') setMembers((current) => current.filter((item) => item.userId !== Number(data.userId)))
          else if (type === 'cursor') setMembers((current) => current.map((item) => item.userId === Number(data.userId) ? { ...item, r: Number(data.r), c: Number(data.c) } : item))
          else if (type === 'claim.granted') {
            ownClaim.current = String(data.claimId); pendingClaim.current?.resolve(true); pendingClaim.current = null
            setClaims((current) => [...current.filter((item) => item.claimId !== String(data.claimId)), toClaim(data)])
          } else if (type === 'claim.denied') {
            setMessage(`Grupo reservado por ${String((data.holder as Record<string, unknown> | undefined)?.displayName ?? 'otro refinador')}.`); pendingClaim.current?.resolve(false); pendingClaim.current = null
          } else if (type === 'claim.updated') setClaims((current) => [...current.filter((item) => item.claimId !== String(data.claimId)), toClaim(data)])
          else if (type === 'claim.released') setClaims((current) => current.filter((item) => item.claimId !== String(data.claimId)))
        }
        ws.onclose = (event) => {
          window.clearInterval(heartbeat); window.clearInterval(renew); socket.current = null; ownClaim.current = null
          if (disposed) return
          if ([4400, 4403, 4404, 4423].includes(event.code)) { setStatus('unavailable'); setMessage(event.reason || 'El piso compartido no esta disponible.'); return }
          setStatus('offline'); window.setTimeout(() => void connect(), event.code === 4429 ? 10000 : reconnect); reconnect = Math.min(reconnect * 2, 30000)
        }
      } catch (error) { if (!disposed) { setStatus('offline'); setMessage(error instanceof Error ? error.message : 'Sin conexion al piso.'); window.setTimeout(() => void connect(), reconnect); reconnect = Math.min(reconnect * 2, 30000) } }
    }
    void connect()
    return () => { disposed = true; window.clearInterval(heartbeat); window.clearInterval(renew); socket.current?.close(); pendingClaim.current?.resolve(false) }
  }, [fileId])

  const moveCursor = useCallback((r: number, c: number) => {
    if (document.hidden || Date.now() - lastCursor.current < 100) return
    lastCursor.current = Date.now(); if (socket.current?.readyState === WebSocket.OPEN) send(socket.current, { type: 'cursor', r, c })
  }, [])
  const claim = useCallback((r: number, c: number) => {
    if (status !== 'connected' || !socket.current) return Promise.resolve(true)
    const requestId = crypto.randomUUID()
    return new Promise<boolean>((resolve) => { pendingClaim.current = { requestId, resolve }; send(socket.current!, { type: 'claim', requestId, r, c }); window.setTimeout(() => { if (pendingClaim.current?.requestId === requestId) { pendingClaim.current = null; resolve(false) } }, 5000) })
  }, [status])
  const release = useCallback(() => { if (ownClaim.current && socket.current?.readyState === WebSocket.OPEN) send(socket.current, { type: 'release', claimId: ownClaim.current }); ownClaim.current = null }, [])
  return { status, members, claims, message, moveCursor, claim, release }
}

function send(socket: WebSocket, value: Record<string, unknown>) { socket.send(JSON.stringify(value)) }
function toMembers(value: unknown): Member[] { return Array.isArray(value) ? value.map((item) => { const record = item as Record<string, unknown>; return { userId: Number(record.userId), displayName: String(record.displayName), r: record.r === undefined ? undefined : Number(record.r), c: record.c === undefined ? undefined : Number(record.c) } }) : [] }
function toClaim(value: Record<string, unknown>): Claim { return { claimId: String(value.claimId), userId: Number(value.userId), displayName: value.displayName ? String(value.displayName) : undefined, cells: Array.isArray(value.cells) ? value.cells.map((cell) => ({ r: Number((cell as Record<string, unknown>).r), c: Number((cell as Record<string, unknown>).c) })) : [], expiresAt: String(value.expiresAt ?? '') } }
function toClaims(value: unknown): Claim[] { return Array.isArray(value) ? value.map((item) => toClaim(item as Record<string, unknown>)) : [] }
