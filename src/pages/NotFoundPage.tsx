import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef1df] px-6 text-center text-[#082b24]">
      <section>
        <p className="font-mono text-7xl font-bold">404</p>
        <h1 className="mt-4 text-3xl font-bold">Pagina no encontrada</h1>
        <p className="mt-2 text-[#527065]">La terminal solicitada no existe.</p>
        <Link to="/" className="mt-6 inline-block bg-[#0b4b3f] px-5 py-3 font-semibold text-white">Volver al inicio</Link>
      </section>
    </main>
  )
}
