import { useEffect, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react'
import { Link, useParams } from 'react-router'
import { uploadMedia, prepareImage } from '../api/media'
import { apiRequest } from '../api/client'
import type { Refiner } from '../types/api'

export function BadgePage() {
  const { id } = useParams()
  const [refiner, setRefiner] = useState<Refiner | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [controller, setController] = useState<AbortController | null>(null)

  useEffect(() => { apiRequest<Refiner>(`/refiners/${id}`).then(setRefiner).catch((requestError: Error) => setError(requestError.message)) }, [id])
  useEffect(() => {
    if (!file) return
    let active = true
    prepareImage(file, 'BADGE', zoom, offsetX, offsetY).then((result) => active && setPreview(result.preview)).catch((requestError: Error) => setError(requestError.message))
    return () => { active = false }
  }, [file, offsetX, offsetY, zoom])

  const choose = (selected?: File) => { if (selected) { setFile(selected); setError('') } }
  const upload = async () => {
    if (!file || !refiner) return
    const abortController = new AbortController()
    setController(abortController); setBusy(true); setError(''); setProgress(0)
    try {
      const prepared = await prepareImage(file, 'BADGE', zoom, offsetX, offsetY)
      const media = await uploadMedia(prepared, 'BADGE', setProgress, abortController.signal)
      const updated = await apiRequest<Refiner>(`/refiners/${refiner.id}`, { method: 'PATCH', headers: { 'If-Match': `"${refiner.version}"` }, body: JSON.stringify({ badgeMediaId: media.mediaId }) })
      setRefiner(updated); setPreview(updated.badge?.url ?? preview); setProgress(100)
    } catch (requestError) { if (!(requestError instanceof DOMException)) setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar el fotocheck.') }
    finally { setBusy(false); setController(null) }
  }
  const dropped = (event: DragEvent) => { event.preventDefault(); choose(event.dataTransfer.files[0]) }
  const pasted = (event: ClipboardEvent) => choose(Array.from(event.clipboardData.files).find((item) => item.type.startsWith('image/')))
  const changed = (event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0])

  return <main className="mx-auto max-w-4xl px-5 py-10" onPaste={pasted}>
    <Link to="/refiners" className="font-mono text-sm underline">← Directorio</Link><h1 className="mt-3 text-4xl font-bold">Fotocheck de {refiner?.fullName ?? 'refinador'}</h1>
    {error && <p role="alert" className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-4">{error}</p>}
    <div className="mt-7 grid gap-7 md:grid-cols-2">
      <section onDragOver={(event) => event.preventDefault()} onDrop={dropped} className="grid aspect-square place-items-center overflow-hidden border-2 border-dashed border-[#0b4b3f] bg-[#d9e2d1]">
        {preview || refiner?.badge?.url ? <img src={preview || refiner?.badge?.url} className="h-full w-full object-cover" alt="Vista previa del fotocheck" /> : <p className="p-8 text-center">Arrastra, pega o selecciona una imagen.</p>}
      </section>
      <section className="space-y-5"><label className="block"><span className="mb-2 block font-bold">Imagen</span><input type="file" accept="image/*" onChange={changed} /></label>
        <Range label="Zoom" value={zoom} min={1} max={3} step={0.05} onChange={setZoom} /><Range label="Mover horizontal" value={offsetX} min={-1} max={1} step={0.05} onChange={setOffsetX} /><Range label="Mover vertical" value={offsetY} min={-1} max={1} step={0.05} onChange={setOffsetY} />
        {busy && <div><p>Subiendo: {progress}%</p><progress className="w-full" max="100" value={progress} /></div>}
        <div className="flex gap-3"><button type="button" onClick={() => void upload()} disabled={!file || busy} className="bg-[#0b4b3f] px-5 py-3 font-bold text-white disabled:opacity-40">Guardar fotocheck</button>{busy && <button type="button" onClick={() => controller?.abort()} className="border-2 border-[#8c2f23] px-4 py-2">Cancelar</button>}</div>
      </section>
    </div>
  </main>
}

function Range({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-1 block font-bold">{label}</span><input className="w-full" type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
