import { useAuth } from '../auth/useAuth'

export function StatusPage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Diagnostico del sistema</p>
      <h1 className="mt-2 text-4xl font-bold">Estado</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <StatusCard label="Build desplegado" value={__BUILD_SHA__} />
        <StatusCard label="API" value="Disponible" positive />
        <StatusCard label="Cuadrilla" value={`${user?.team.name} · ${user?.team.code}`} />
        <StatusCard
          label="Piso de Pruebas"
          value={user?.clearance.granted ? 'Abierto' : 'Pendiente'}
          positive={user?.clearance.granted}
        />
      </div>
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
