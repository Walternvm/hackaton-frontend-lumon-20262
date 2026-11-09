import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'

export function FilesPage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Terminal MDR</p>
          <h1 className="mt-2 text-4xl font-bold">Archivos de macrodatos</h1>
          <p className="mt-2 text-[#527065]">Cuadrilla {user?.team.name} · {user?.team.code}</p>
        </div>
        <Link to="/estado" className="border-2 border-[#0b4b3f] px-4 py-3 text-center font-mono text-sm font-bold uppercase hover:bg-[#0b4b3f] hover:text-white">
          Ver estado
        </Link>
      </div>

      <section className="mt-8 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-8 shadow-[8px_8px_0_#0b4b3f]">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Orientacion completada</p>
        <h2 className="mt-3 text-2xl font-bold">Sesion activa</h2>
        <p className="mt-2 max-w-2xl text-[#38564d]">
          La lista paginada y la consola de refinamiento se incorporan en el siguiente checkpoint.
        </p>
      </section>
    </main>
  )
}
