import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/useAuth'
import type { Clearance, ClearanceCheckResult, IntegrationStatus } from '../types/api'

export function StatusPage() {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [clearance, setClearance] = useState<Clearance | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [integrationData, clearanceData] = await Promise.all([
        apiRequest<IntegrationStatus>('/integrations/status'),
        apiRequest<Clearance>('/clearance'),
      ])
      setIntegrations(integrationData)
      setClearance(clearanceData)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo consultar el estado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const runCheck = async () => {
    setChecking(true)
    try {
      const result = await apiRequest<ClearanceCheckResult>('/clearance/check', { method: 'POST' })
      setClearance((current) => current ? {
        ...current,
        granted: result.granted,
        grantedAt: result.grantedAt,
        checks: result.checks,
        checkedAt: new Date().toISOString(),
      } : current)
      setError('')
      await loadStatus()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo correr la revision.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Diagnostico del sistema</p>
      <h1 className="mt-2 text-4xl font-bold">Estado</h1>
      {error && <p role="alert" className="mt-6 border border-[#8c2f23] bg-[#fff4ee] p-4 text-[#8c2f23]">{error}</p>}
      {loading && <p role="status" className="mt-6 font-mono">Consultando a Lumon...</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <StatusCard label="Build desplegado" value={__BUILD_SHA__} />
        <StatusCard label="API" value="Disponible" positive />
        <StatusCard label="Cuadrilla" value={`${user?.team.name} · ${user?.team.code}`} />
        <StatusCard
          label="Dominio"
          value={integrations?.deploy.origin ? `Verificado · ${integrations.deploy.origin}` : 'Sin verificar'}
          positive={Boolean(integrations?.deploy.verifiedAt)}
        />
        <StatusCard label="Storage" value={integrations?.storage.verifiedAt ? `${integrations.storage.provider} verificado` : 'Pendiente'} positive={Boolean(integrations?.storage.verifiedAt)} />
        <StatusCard label="Piso de Pruebas" value={clearance?.granted ? 'Abierto' : 'Pendiente'} positive={clearance?.granted} />
        <StatusCard label="Modo caos" value={`Nivel ${clearance?.workspace.chaosLevel ?? 0}`} positive={(clearance?.workspace.chaosLevel ?? 0) > 0} />
        <StatusCard label="Ronda de control" value={clearance?.round.approved ? `Aprobada · ronda ${clearance.round.approvedRound}` : clearance?.round.drawnMember ? `Sorteado: ${clearance.round.drawnMember.name}` : 'Pendiente'} positive={clearance?.round.approved} />
      </div>

      <section className="mt-8 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Revision automatica</h2>
            <p className="mt-1 text-sm text-[#527065]">Debe ejecutarse desde este dominio desplegado.</p>
          </div>
          <button type="button" disabled={checking || clearance?.granted} onClick={() => void runCheck()} className="bg-[#0b4b3f] px-5 py-3 font-bold text-white disabled:opacity-50">
            {checking ? 'Revisando...' : clearance?.granted ? 'Piso abierto' : 'Abrir el Piso de Pruebas'}
          </button>
        </div>
        <div className="mt-6 grid gap-3">
          {clearance?.checks.map((check) => (
            <article key={check.name} className={`border-l-4 p-4 ${check.passed ? 'border-[#176b52] bg-[#edf8f1]' : 'border-[#8c2f23] bg-[#fff4ee]'}`}>
              <p className="font-mono font-bold">{check.passed ? '✓' : '×'} {check.name}</p>
              <p className="mt-1 text-sm">{check.detail}</p>
            </article>
          ))}
          {!clearance?.checks.length && <p className="text-sm text-[#527065]">Aun no se ha ejecutado una revision.</p>}
        </div>
      </section>

      <section className="mt-8 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6">
        <h2 className="text-2xl font-bold">Roster</h2>
        <p className="mt-1 text-sm text-[#527065]">{clearance?.roster.complete ? 'Tres integrantes inscritos.' : 'El roster esta incompleto.'}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {clearance?.roster.members.map((member) => <li key={member.code} className="border border-[#6d877c] p-3"><strong>{member.name}</strong><br /><span className="font-mono text-sm">{member.code}</span></li>)}
        </ul>
      </section>
    </main>
  )
}

function StatusCard({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <section className="border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6">
      <p className="font-mono text-xs uppercase tracking-wider text-[#527065]">{label}</p>
      <p className={`mt-3 text-xl font-bold ${positive ? 'text-[#176b52]' : 'text-[#082b24]'}`}>{value}</p>
    </section>
  )
}
