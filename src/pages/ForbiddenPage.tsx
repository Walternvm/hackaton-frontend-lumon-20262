import { Link } from 'react-router'

export function ForbiddenPage() {
  return (
    <main className="grid min-h-[calc(100vh-72px)] place-items-center px-6">
      <section className="text-center">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-[#8c2f23]">Acceso denegado</p>
        <h1 className="mt-4 text-4xl font-bold">No tienes permiso para esta zona</h1>
        <Link to="/files" className="mt-6 inline-block bg-[#0b4b3f] px-5 py-3 font-semibold text-white">Volver a archivos</Link>
      </section>
    </main>
  )
}
