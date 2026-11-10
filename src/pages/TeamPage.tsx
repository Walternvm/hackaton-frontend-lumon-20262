import { useAuth } from '../auth/useAuth'

export function TeamPage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">
        Administracion de cuadrilla
      </p>
      <h1 className="mt-2 text-4xl font-bold">Equipo</h1>
      <section className="mt-8 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-[#527065]">Cuadrilla</dt>
            <dd className="mt-2 text-lg font-bold">{user?.team.name}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-[#527065]">Codigo</dt>
            <dd className="mt-2 text-lg font-bold">{user?.team.code}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-[#527065]">Rol</dt>
            <dd className="mt-2 text-lg font-bold">{user?.role.name}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-[#527065]">Permisos</dt>
            <dd className="mt-2 text-sm text-[#38564d]">{user?.permissions.join(', ')}</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}
