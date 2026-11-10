import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { prepareImage, uploadMedia } from '../api/media'
import { apiRequest } from '../api/client'
import type { Incident, Media, Severity } from '../types/api'

interface PhotoState { file: File; progress: number; media?: Media; error?: string; controller?: AbortController }

export function IncidentNewPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [photos, setPhotos] = useState<PhotoState[]>([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => setPhotos((current) => [...current, ...Array.from(event.target.files ?? []).slice(0, 3 - current.length).map((file) => ({ file, progress: 0 }))])
  const upload = async (index: number) => {
    const photo = photos[index]; if (!photo) return
    const controller = new AbortController()
    setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, controller, error: undefined } : item))
    try {
      const prepared = await prepareImage(photo.file, 'INCIDENT')
      const media = await uploadMedia(prepared, 'INCIDENT', (progress) => setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, progress } : item)), controller.signal)
      setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, media, progress: 100, controller: undefined } : item))
    } catch (requestError) { if (!(requestError instanceof DOMException)) setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, error: requestError instanceof Error ? requestError.message : 'Fallo la subida.', controller: undefined } : item)) }
  }
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!photos.length || photos.some((photo) => !photo.media)) return; setSending(true); setError(''); try { await apiRequest<Incident>('/incidents', { method: 'POST', body: JSON.stringify({ title, description, severity, mediaIds: photos.map((photo) => photo.media!.mediaId) }) }); navigate('/incidents') } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No se pudo crear el reporte.') } finally { setSending(false) } }
  return <main className="mx-auto max-w-3xl px-5 py-10"><Link to="/incidents" className="font-mono text-sm underline">← Incidencias</Link><h1 className="mt-3 text-4xl font-bold">Nuevo reporte</h1>{error && <p role="alert" className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-4">{error}</p>}<form onSubmit={submit} className="mt-7 space-y-5 border-2 border-[#0b4b3f] bg-[#f8f7eb] p-6"><Field label="Titulo" value={title} onChange={setTitle} /><label className="block"><span className="mb-2 block font-bold">Severidad</span><select value={severity} onChange={(event) => setSeverity(event.target.value as Severity)} className="w-full border-2 border-[#6d877c] bg-white p-3">{['LOW','MEDIUM','HIGH','CRITICAL'].map((value) => <option key={value}>{value}</option>)}</select></label><label className="block"><span className="mb-2 block font-bold">Descripcion</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-40 w-full border-2 border-[#6d877c] bg-white p-3" /></label><label className="block"><span className="mb-2 block font-bold">Fotos (1 a 3)</span><input type="file" accept="image/*" multiple onChange={addPhotos} disabled={photos.length >= 3} /></label>
    <div className="grid gap-3">{photos.map((photo, index) => <article key={`${photo.file.name}-${index}`} className="border border-[#6d877c] p-3"><p className="font-bold">{photo.file.name}</p><p className="text-sm">{photo.media ? 'Confirmada' : photo.controller ? `Subiendo ${photo.progress}%` : photo.error || 'Pendiente'}</p><div className="mt-2 flex gap-2">{!photo.media && !photo.controller && <button type="button" onClick={() => void upload(index)} className="border-2 border-[#0b4b3f] px-3 py-1">{photo.error ? 'Reintentar' : 'Subir'}</button>}{photo.controller && <button type="button" onClick={() => photo.controller?.abort()} className="border-2 border-[#8c2f23] px-3 py-1">Cancelar</button>}</div></article>)}</div>
    <button disabled={sending || photos.length === 0 || photos.some((photo) => !photo.media)} className="bg-[#0b4b3f] px-5 py-3 font-bold text-white disabled:opacity-40">{sending ? 'Enviando...' : 'Enviar reporte'}</button></form></main>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block font-bold">{label}</span><input required minLength={3} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border-2 border-[#6d877c] bg-white p-3" /></label> }
