import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiRequest } from '../api/client'
import type { IncidentPage } from '../types/api'

export function IncidentsPage() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<IncidentPage | null>(null)
  const [error, setError] = useState('')
  const page = Math.max(0, Number(params.get('page')) || 0)
  useEffect(() => { const controller = new AbortController(); apiRequest<IncidentPage>(`/incidents?page=${page}&size=10&sort=createdAt,desc`, { signal: controller.signal }).then(setData).catch((requestError: unknown) => { if (!(requestError instanceof DOMException)) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los reportes.') }); return () => controller.abort() }, [page])
  return <main className="mx-auto max-w-6xl px-5 py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.25em] text-[#527065]">Contingencias</p><h1 className="mt-2 text-4xl font-bold">Reportes de incidencia</h1></div><Link to="/incidents/new" className="bg-[#0b4b3f] px-5 py-3 font-bold text-white">Nuevo reporte</Link></div>{error && <p role="alert" className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-4">{error}</p>}<div className="mt-8 grid gap-5">{data?.content.map((incident) => <article key={incident.id} className="border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5"><div className="flex justify-between gap-4"><h2 className="text-xl font-bold">{incident.title}</h2><span className="font-mono text-sm">{incident.severity}</span></div><p className="mt-3 whitespace-pre-wrap">{incident.description}</p><div className="mt-4 flex gap-3 overflow-x-auto">{incident.photos.map((photo) => <img key={photo.mediaId} src={photo.url} alt="Evidencia de la incidencia" loading="lazy" width={200} height={140} className="h-36 w-52 shrink-0 object-cover" />)}</div><p className="mt-3 text-sm text-[#527065]">{incident.createdBy.displayName} · {new Date(incident.createdAt).toLocaleString()}</p></article>)}</div>{data && <div className="mt-8 flex justify-between"><button disabled={page === 0} onClick={() => setParams({ page: String(page - 1) })} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Anterior</button><button disabled={page + 1 >= data.totalPages} onClick={() => setParams({ page: String(page + 1) })} className="border-2 border-[#0b4b3f] px-4 py-2 disabled:opacity-40">Siguiente</button></div>}</main>
}
