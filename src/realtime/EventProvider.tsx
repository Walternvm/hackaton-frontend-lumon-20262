import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { apiRequest } from '../api/client'
import { clearTokens } from '../api/session'
import { useAuth } from '../auth/useAuth'
import { EventContext, type ContingencyNotice, type StreamStatus } from './EventContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const eventNames = ['refiner.updated', 'refinement.created', 'file.completed', 'contingency.activated', 'session.revoked', 'stream.reset', 'stream.superseded']

interface TicketResponse { ticket: string; expiresIn: number }
interface StreamEnvelope { event: string; id: string; data: Record<string, unknown> }

export function EventProvider({ children }: PropsWithChildren) {
  const { user } = useAuth()
  const [status, setStatus] = useState<StreamStatus>('offline')
  const [contingency, setContingency] = useState<ContingencyNotice | null>(null)
  const [ackError, setAckError] = useState('')
  const seen = useRef(new Set<string>())

  const applyEvent = useCallback((envelope: StreamEnvelope) => {
    const key = `${envelope.event}:${envelope.id}`
    if (seen.current.has(key)) return
    seen.current.add(key)
    if (seen.current.size > 1000) seen.current.delete(seen.current.values().next().value ?? '')
    if (envelope.event === 'contingency.activated') {
      const target = Number(envelope.data.userId)
      if (!target || target === user?.id) setContingency({ id: Number(envelope.data.id), message: String(envelope.data.message ?? 'Lumon activo una contingencia de horas extra.') })
    } else if (envelope.event === 'session.revoked') {
      clearTokens(true, 'La sesion fue revocada por Lumon.')
    } else {
      window.dispatchEvent(new CustomEvent(`lumon:${envelope.event}`, { detail: envelope.data }))
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) { setStatus('offline'); return }
    const channel = new BroadcastChannel('lumon-events')
    let disposed = false
    let activeSource: EventSource | null = null
    channel.onmessage = (message: MessageEvent<StreamEnvelope>) => applyEvent(message.data)

    const lead = async () => {
      while (!disposed) {
        await navigator.locks.request('lumon-event-stream', { ifAvailable: true }, async (lock) => {
          if (!lock || disposed) return
          let lastEventId = sessionStorage.getItem('lumon.lastEventId') ?? ''
          let delay = 1000
          while (!disposed) {
            setStatus('connecting')
            try {
              const { ticket } = await apiRequest<TicketResponse>('/events/tickets', { method: 'POST' })
              const query = new URLSearchParams({ ticket })
              if (lastEventId) query.set('lastEventId', lastEventId)
              await new Promise<void>((resolve) => {
                const source = new EventSource(`${API_BASE_URL}/events/stream?${query}`)
                activeSource = source
                source.onopen = () => { setStatus('connected'); delay = 1000 }
                source.onerror = () => { source.close(); activeSource = null; resolve() }
                eventNames.forEach((name) => source.addEventListener(name, (rawEvent) => {
                const event = rawEvent as MessageEvent<string>
                if (event.lastEventId) { lastEventId = event.lastEventId; sessionStorage.setItem('lumon.lastEventId', lastEventId) }
                try {
                  const envelope = { event: name, id: event.lastEventId || crypto.randomUUID(), data: JSON.parse(event.data) as Record<string, unknown> }
                  applyEvent(envelope); channel.postMessage(envelope)
                  if (name === 'stream.superseded') { source.close(); resolve() }
                } catch { return }
                }))
              })
            } catch { setStatus('offline') }
            if (!disposed) { await wait(delay); delay = Math.min(delay * 2, 30000) }
          }
        })
        if (!disposed) await wait(2000)
      }
    }
    void lead()
    return () => { disposed = true; activeSource?.close(); channel.close() }
  }, [applyEvent, user])

  const acknowledge = async () => {
    if (!contingency) return
    try { await apiRequest<void>(`/contingency/${contingency.id}/ack`, { method: 'POST' }); setContingency(null); setAckError('') }
    catch (error) { setAckError(error instanceof Error ? error.message : 'No se pudo confirmar la contingencia.') }
  }

  return <EventContext.Provider value={{ status, contingency, acknowledge }}>
    {children}
    {contingency && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5" role="dialog" aria-modal="true" aria-labelledby="contingency-title">
      <section className="max-w-lg border-4 border-[#8c2f23] bg-[#f8f7eb] p-7 shadow-2xl"><p className="font-mono text-sm uppercase text-[#8c2f23]">Contingencia</p><h2 id="contingency-title" className="mt-2 text-3xl font-bold">Horas extra activadas</h2><p className="mt-4">{contingency.message}</p>{ackError && <p role="alert" className="mt-4 text-[#8c2f23]">{ackError}</p>}<button autoFocus onClick={() => void acknowledge()} className="mt-6 bg-[#8c2f23] px-5 py-3 font-bold text-white">Confirmar contingencia</button></section>
    </div>}
  </EventContext.Provider>
}

function wait(milliseconds: number) { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)) }
