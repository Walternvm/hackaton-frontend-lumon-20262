import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiRequest } from '../api/client'
import type { FilePage } from '../types/api'

const validSizes = ['10', '25', '50']
const validStatuses = ['', 'ACTIVE', 'COMPLETE']
const validSorts = ['updatedAt,desc', 'progress,desc', 'name,asc']

export function FilesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState<FilePage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const requestId = useRef(0)

  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const size = validSizes.includes(searchParams.get('size') ?? '')
    ? searchParams.get('size')!
    : '10'
  const status = validStatuses.includes(searchParams.get('status') ?? '')
    ? searchParams.get('status') ?? ''
    : ''
  const sort = validSorts.includes(searchParams.get('sort') ?? '')
    ? searchParams.get('sort')!
    : 'updatedAt,desc'

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const normalized = query.trim()
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (normalized) next.set('q', normalized)
        else next.delete('q')
        next.set('page', '0')
        return next
      }, { replace: true })
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [query, setSearchParams])

  useEffect(() => {
    const currentRequest = ++requestId.current
    const controller = new AbortController()
    const params = new URLSearchParams({
      page: String(page),
      size,
      sort,
    })

    if (status) params.set('status', status)
    if (searchParams.get('q')) params.set('q', searchParams.get('q')!)

    setLoading(true)
    setError('')

    apiRequest<FilePage>(`/files?${params}`, { signal: controller.signal })
      .then((result) => {
        if (requestId.current === currentRequest) setData(result)
      })
      .catch((requestError: unknown) => {
        if (requestId.current === currentRequest && !(requestError instanceof DOMException)) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los archivos.')
        }
      })
      .finally(() => {
        if (requestId.current === currentRequest) setLoading(false)
      })

    return () => controller.abort()
  }, [page, searchParams, size, sort, status])

  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    next.set(name, value)
    next.set('page', '0')
    setSearchParams(next)
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Terminal MDR</p>
      <h1 className="mt-2 text-4xl font-bold">Archivos de macrodatos</h1>

      <section className="mt-7 grid gap-4 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-2 block font-mono text-xs uppercase">Buscar</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full border-2 border-[#6d877c] bg-white px-3 py-2"
            placeholder="Nombre del archivo"
          />
        </label>
        <Filter label="Estado" value={status} onChange={(value) => updateParam('status', value)} options={[
          ['', 'Todos'], ['ACTIVE', 'Activos'], ['COMPLETE', 'Completos'],
        ]} />
        <Filter label="Orden" value={sort} onChange={(value) => updateParam('sort', value)} options={[
          ['updatedAt,desc', 'Actualizados'], ['progress,desc', 'Progreso'], ['name,asc', 'Nombre'],
        ]} />
      </section>

      {error && <p role="alert" className="mt-6 border border-[#8c2f23] bg-[#fff4ee] p-4 text-[#8c2f23]">{error}</p>}
      {loading && <p className="mt-8 font-mono uppercase tracking-wider" role="status">Cargando archivos...</p>}

      {!loading && data?.content.length === 0 && (
        <section className="mt-8 border-2 border-dashed border-[#6d877c] p-10 text-center">
          <h2 className="text-xl font-bold">No hay archivos para estos filtros</h2>
          <p className="mt-2 text-[#527065]">Cambia la busqueda o el estado seleccionado.</p>
        </section>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {data?.content.map((file) => (
          <article key={file.id} className="border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5 shadow-[5px_5px_0_#0b4b3f]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{file.name}</h2>
              <span className="font-mono text-xs uppercase">{file.status === 'COMPLETE' ? 'Completo' : 'Activo'}</span>
            </div>
            <p className="mt-2 text-sm text-[#527065]">{file.rows} × {file.cols} · tile {file.tileSize}</p>
            <div className="mt-5 h-3 overflow-hidden border border-[#0b4b3f] bg-white">
              <div className="h-full bg-[#0b4b3f]" style={{ width: `${file.progress.overall * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>{Math.round(file.progress.overall * 100)}%</span>
              <span>{file.refinedGroups}/{file.totalGroups} grupos</span>
            </div>
            <Link
              to={`/files/${file.id}/refine?r=0&c=0`}
              className="mt-5 block bg-[#0b4b3f] px-4 py-3 text-center font-mono text-sm font-bold uppercase text-white hover:bg-[#156355]"
            >
              Abrir archivo
            </Link>
          </article>
        ))}
      </div>

      {data && data.totalPages > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <Filter label="Por pagina" value={size} onChange={(value) => updateParam('size', value)} options={[
            ['10', '10'], ['25', '25'], ['50', '50'],
          ]} />
          <div className="flex items-center gap-3">
            <button disabled={page === 0} onClick={() => updateParam('page', String(page - 1))} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Anterior</button>
            <span>Pagina {page + 1} de {data.totalPages}</span>
            <button disabled={page + 1 >= data.totalPages} onClick={() => updateParam('page', String(page + 1))} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      )}
    </main>
  )
}

function Filter({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
}) {
  return (
    <label>
      <span className="mb-2 block font-mono text-xs uppercase">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full border-2 border-[#6d877c] bg-white px-3 py-2">
        {options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}
      </select>
    </label>
  )
}
