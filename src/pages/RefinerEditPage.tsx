import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, apiRequest } from '../api/client'
import type { Department, Refiner } from '../types/api'

export function RefinerEditPage() {
  const { id } = useParams()
  const [refiner, setRefiner] = useState<Refiner | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { Promise.all([apiRequest<Refiner>(`/refiners/${id}`), apiRequest<Department[]>('/departments')]).then(([record, list]) => { setRefiner(record); setDepartments(list) }).catch((requestError: Error) => setError(requestError.message)) }, [id])
  const update = (field: 'title' | 'extension' | 'bio', value: string) => setRefiner((current) => current ? { ...current, [field]: value } : current)
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!refiner) return; setSaving(true); setError('')
    try {
      const updated = await apiRequest<Refiner>(`/refiners/${refiner.id}`, { method: 'PATCH', headers: { 'If-Match': `"${refiner.version}"` }, body: JSON.stringify({ title: refiner.title, extension: refiner.extension, bio: refiner.bio, departmentId: refiner.department.id }) })
      setRefiner(updated)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 412) setError('El expediente cambio mientras lo editabas. Vuelve a cargarlo para comparar los datos.')
      else setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar.')
    } finally { setSaving(false) }
  }
  if (!refiner) return <main className="p-10">{error || 'Cargando expediente...'}</main>
  return <main className="mx-auto max-w-3xl px-5 py-10"><Link to="/refiners" className="font-mono text-sm underline">← Directorio</Link><h1 className="mt-3 text-4xl font-bold">Editar expediente</h1>{error && <p role="alert" className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-4">{error}</p>}<form onSubmit={save} className="mt-7 space-y-5 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6">
    <p className="text-xl font-bold">{refiner.fullName}</p><Field label="Cargo" value={refiner.title} onChange={(value) => update('title', value)} /><Field label="Anexo" value={refiner.extension} onChange={(value) => update('extension', value)} />
    <label className="block"><span className="mb-2 block font-bold">Departamento</span><select className="w-full border-2 border-[#6d877c] bg-white p-3" value={refiner.department.id} onChange={(event) => setRefiner({ ...refiner, department: departments.find((item) => item.id === Number(event.target.value)) ?? refiner.department })}>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
    <label className="block"><span className="mb-2 block font-bold">Biografia</span><textarea className="min-h-40 w-full border-2 border-[#6d877c] bg-white p-3" value={refiner.bio} onChange={(event) => update('bio', event.target.value)} /></label>
    <button disabled={saving} className="bg-[#0b4b3f] px-5 py-3 font-bold text-white disabled:opacity-40">{saving ? 'Guardando...' : 'Guardar expediente'}</button>
  </form></main>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block font-bold">{label}</span><input required className="w-full border-2 border-[#6d877c] bg-white p-3" value={value} onChange={(event) => onChange(event.target.value)} /></label> }
