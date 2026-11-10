import { apiRequest } from './client'
import type { Media, MediaTicket } from '../types/api'

type Purpose = 'BADGE' | 'INCIDENT'

export async function prepareImage(file: File, purpose: Purpose, zoom = 1, offsetX = 0, offsetY = 0) {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.')
  const image = await createImageBitmap(file)
  const badge = purpose === 'BADGE'
  const width = badge ? 512 : image.width >= image.height ? 1200 : Math.round(1200 * image.width / image.height)
  const height = badge ? 512 : image.height > image.width ? 1200 : Math.round(1200 * image.height / image.width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('El navegador no puede procesar la imagen.')

  if (badge) {
    const cropSize = Math.min(image.width, image.height) / zoom
    const maxX = image.width - cropSize
    const maxY = image.height - cropSize
    const sourceX = Math.max(0, Math.min(maxX, maxX / 2 + offsetX * maxX / 2))
    const sourceY = Math.max(0, Math.min(maxY, maxY / 2 + offsetY * maxY / 2))
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, width, height)
  } else {
    context.drawImage(image, 0, 0, width, height)
  }
  image.close()

  const limit = badge ? 120 * 1024 : 300 * 1024
  let quality = 0.9
  let blob = await canvasBlob(canvas, quality)
  while (blob.size > limit && quality > 0.35) {
    quality -= 0.08
    blob = await canvasBlob(canvas, quality)
  }
  if (blob.size > limit) throw new Error(`La imagen no puede reducirse a menos de ${Math.round(limit / 1024)} KB.`)
  const sha256 = await digest(blob)
  return { blob, width, height, sha256, preview: canvas.toDataURL('image/webp', quality) }
}

export async function uploadMedia(
  prepared: { blob: Blob; width: number; height: number; sha256: string },
  purpose: Purpose,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
) {
  const ticket = await apiRequest<MediaTicket>('/media/tickets', {
    method: 'POST',
    body: JSON.stringify({
      purpose,
      contentType: 'image/webp',
      bytes: prepared.blob.size,
      sha256: prepared.sha256,
      width: prepared.width,
      height: prepared.height,
    }),
  })
  const url = await uploadToStorage(ticket, prepared.blob, onProgress, signal)
  return apiRequest<Media>(`/media/tickets/${ticket.ticketId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Este navegador no puede generar WebP.')), 'image/webp', quality)
  })
}

async function digest(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(hash), (value) => value.toString(16).padStart(2, '0')).join('')
}

function uploadToStorage(ticket: MediaTicket, blob: Blob, onProgress: (progress: number) => void, signal: AbortSignal) {
  if (ticket.provider === 'SUPABASE') {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!projectUrl || !key || !ticket.bucket || !ticket.objectPath) throw new Error('Falta configurar Supabase Storage.')
    const uploadUrl = `${projectUrl}/storage/v1/object/${ticket.bucket}/${ticket.objectPath}`
    const publicUrl = `${projectUrl}/storage/v1/object/public/${ticket.bucket}/${ticket.objectPath}`
    return xhrUpload(uploadUrl, blob, { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/webp', 'x-upsert': 'false' }, onProgress, signal).then(() => publicUrl)
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !preset || !ticket.uploadPublicId) throw new Error('Falta configurar Cloudinary.')
  const form = new FormData()
  form.append('file', blob, `${ticket.ticketId}.webp`)
  form.append('upload_preset', preset)
  form.append('public_id', ticket.uploadPublicId)
  return xhrUpload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, {}, onProgress, signal)
    .then((body) => (JSON.parse(body) as { secure_url: string }).secure_url)
}

function xhrUpload(url: string, body: Blob | FormData, headers: Record<string, string>, onProgress: (progress: number) => void, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    Object.entries(headers).forEach(([name, value]) => request.setRequestHeader(name, value))
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round(event.loaded / event.total * 100))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve(request.responseText) : reject(new Error('El storage rechazo la imagen.'))
    request.onerror = () => reject(new Error('Se corto la subida al storage.'))
    request.onabort = () => reject(new DOMException('Subida cancelada.', 'AbortError'))
    signal.addEventListener('abort', () => request.abort(), { once: true })
    request.send(body)
  })
}
