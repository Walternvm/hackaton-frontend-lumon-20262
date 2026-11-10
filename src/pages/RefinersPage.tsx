import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiRequest } from '../api/client'
import type { Department, RefinerPage } from '../types/api'

export function RefinersPage() {
  const [params, setParams] = useSearchParams()
  const [departments, setDepartments] = useState<Department[]>([])
  const [data, setData] = useState<RefinerPage | null>(null)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const page = Math.max(0, Number(params.get('page')) || 0)
  const departmentId = Math.max(0, Number(params.get('departmentId')) || 0)
  const q = params.get('q') ?? ''

  useEffect(() => {
    apiRequest<Department[]>('/departments').then(setDepartments).catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setParams((current) => {
        const next = new URLSearchParams(current)
        if (query.trim()) next.set('q', query.trim())
        else next.delete('q')
        next.set('page', '0')
        return next
      }, { replace: true })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [query, setParams])

  useEffect(() => {
    const current = ++requestId.current
    const controller = new AbortController()
    const search = new URLSearchParams({ page: String(page), size: '10', sort: 'fullName,asc' })
    if (q) search.set('q', q)
    if (departmentId) search.set('departmentId', String(departmentId))
    setLoading(true)
    apiRequest<RefinerPage>(`/refiners?${search}`, { signal: controller.signal })
      .then((result) => current === requestId.current && setData(result))
      .catch((requestError: unknown) => {
        if (current === requestId.current && !(requestError instanceof DOMException)) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el directorio.')
      })
      .finally(() => current === requestId.current && setLoading(false))
    return () => controller.abort()
  }, [departmentId, page, q])

  const update = (name: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.set('page', '0')
    return next
  })

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Expedientes</p>
      <h1 className="mt-2 text-4xl font-bold">Directorio de refinadores</h1>
      <section className="mt-7 grid gap-4 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5 md:grid-cols-3">
        <label className="md:col-span-2"><span className="mb-2 block font-mono text-xs uppercase">Buscar</span><input className="w-full border-2 border-[#6d877c] bg-white px-3 py-2" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label><span className="mb-2 block font-mono text-xs uppercase">Departamento</span><select className="w-full border-2 border-[#6d877c] bg-white px-3 py-2" value={departmentId || ''} onChange={(event) => update('departmentId', event.target.value)}><option value="">Todos</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
      </section>
      {error && <p role="alert" className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-4">{error}</p>}
      {loading && <p role="status" className="mt-8 font-mono">Cargando expedientes...</p>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.content.map((refiner) => <article key={refiner.id} className="border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5">
          <div className="aspect-square overflow-hidden bg-[#d9e2d1]">{refiner.badge ? <img src={refiner.badge.url} alt={`Fotocheck de ${refiner.fullName}`} loading="lazy" width={512} height={512} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-6xl" aria-label="Sin fotocheck">◫</div>}</div>
          <h2 className="mt-4 text-xl font-bold">{refiner.fullName}</h2><p>{refiner.title}</p><p className="text-sm text-[#527065]">{refiner.department.name} · anexo {refiner.extension}</p>
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm">{refiner.bio}</p>
          <div className="mt-4 flex gap-3"><Link className="font-bold underline" to={`/refiners/${refiner.id}/edit`}>Editar</Link><Link className="font-bold underline" to={`/refiners/${refiner.id}/badge`}>Fotocheck</Link></div>
        </article>)}
      </div>
      {data && <div className="mt-8 flex items-center justify-between"><button disabled={page === 0} onClick={() => update('page', String(page - 1))} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Anterior</button><span>Pagina {page + 1} de {Math.max(1, data.totalPages)}</span><button disabled={page + 1 >= data.totalPages} onClick={() => update('page', String(page + 1))} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Siguiente</button></div>}
    </main>
  )
}
