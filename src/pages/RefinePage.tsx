import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ApiError, apiRequest } from '../api/client'
import type {
  Bin,
  CellCoordinate,
  DataFile,
  RefineResult,
  Rules,
  Tile,
} from '../types/api'
import { useFloor } from '../realtime/useFloor'

const CELL_SIZE = 36
const OVERSCAN = 4
const binNames: Record<Bin, string> = {
  WO: 'Woe',
  FC: 'Frolic',
  DR: 'Dread',
  MA: 'Malice',
}

interface CellData {
  value: number
  tremor: number
  bin: string
}

export function RefinePage() {
  const { id } = useParams()
  const fileId = Number(id)
  const [searchParams, setSearchParams] = useSearchParams()
  const [file, setFile] = useState<DataFile | null>(null)
  const [rules, setRules] = useState<Rules | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewport, setViewport] = useState({ width: 800, height: 560, top: 0, left: 0 })
  const [selected, setSelected] = useState<CellCoordinate[]>([])
  const [expectedBin, setExpectedBin] = useState<Bin | null>(null)
  const [selectionMessage, setSelectionMessage] = useState('')
  const [refining, setRefining] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const positionFrame = useRef<number | null>(null)
  const initialPosition = useRef({
    row: Number(searchParams.get('r')) || 0,
    col: Number(searchParams.get('c')) || 0,
  })
  const { loadVisible, getCell, getCellSync, markRefined, reloadForCells } = useTileStore(fileId, file?.tileSize ?? 32)
  const floor = useFloor(fileId)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    Promise.all([
      apiRequest<DataFile>(`/files/${fileId}`, { signal: controller.signal }),
      apiRequest<Rules>(`/files/${fileId}/rules`, { signal: controller.signal }),
    ])
      .then(([fileData, ruleData]) => {
        setFile(fileData)
        setRules(ruleData)
        setError('')
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException)) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo abrir el archivo.')
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [fileId])

  useEffect(() => {
    const element = gridRef.current
    if (!element || !file) return

    const observer = new ResizeObserver(([entry]) => {
      setViewport((current) => ({
        ...current,
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }))
    })
    observer.observe(element)

    const initialRow = clamp(initialPosition.current.row, 0, file.rows - 1)
    const initialCol = clamp(initialPosition.current.col, 0, file.cols - 1)
    element.scrollTo({ top: initialRow * CELL_SIZE, left: initialCol * CELL_SIZE })

    return () => observer.disconnect()
  }, [file])

  const range = useMemo(() => {
    if (!file) return null
    const startRow = clamp(Math.floor(viewport.top / CELL_SIZE) - OVERSCAN, 0, file.rows - 1)
    const endRow = clamp(Math.ceil((viewport.top + viewport.height) / CELL_SIZE) + OVERSCAN, 0, file.rows - 1)
    const startCol = clamp(Math.floor(viewport.left / CELL_SIZE) - OVERSCAN, 0, file.cols - 1)
    const endCol = clamp(Math.ceil((viewport.left + viewport.width) / CELL_SIZE) + OVERSCAN, 0, file.cols - 1)
    return { startRow, endRow, startCol, endCol }
  }, [file, viewport])

  useEffect(() => {
    if (!range || !file) return
    const tileRows = rangeValues(
      Math.floor(range.startRow / file.tileSize),
      Math.floor(range.endRow / file.tileSize),
    )
    const tileCols = rangeValues(
      Math.floor(range.startCol / file.tileSize),
      Math.floor(range.endCol / file.tileSize),
    )
    const keys = tileRows.flatMap((tileRow) => tileCols.map((tileCol) => `${tileRow}:${tileCol}`))
    loadVisible(keys)
  }, [file, loadVisible, range])

  const visibleCells = useMemo(() => {
    if (!range) return []
    const cells: CellCoordinate[] = []
    for (let r = range.startRow; r <= range.endRow; r += 1) {
      for (let c = range.startCol; c <= range.endCol; c += 1) cells.push({ r, c })
    }
    return cells
  }, [range])

  const selectedKeys = useMemo(() => new Set(selected.map(cellKey)), [selected])

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    setViewport((current) => ({ ...current, top: element.scrollTop, left: element.scrollLeft }))

    if (positionFrame.current) cancelAnimationFrame(positionFrame.current)
    positionFrame.current = requestAnimationFrame(() => {
      const next = new URLSearchParams(searchParams)
      next.set('r', String(Math.floor(element.scrollTop / CELL_SIZE)))
      next.set('c', String(Math.floor(element.scrollLeft / CELL_SIZE)))
      setSearchParams(next, { replace: true })
    })
  }

  const selectGroup = async (r: number, c: number) => {
    if (!file || !rules) return
    setSelectionMessage('Buscando grupo completo...')
    floor.moveCursor(r, c)

    try {
      const start = await getCell(r, c)

      if (!start || start.bin !== '.' || start.tremor < rules.tremorThreshold) {
        setSelected([])
        setExpectedBin(null)
        setSelectionMessage('Esta celda no pertenece a un grupo disponible.')
        return
      }

      const group = await findGroup({ r, c }, file, rules, getCell)
      setSelected(group)

      if (group.length < rules.minGroupSize || group.length > rules.maxGroupSize) {
        setExpectedBin(null)
        setSelectionMessage(`Ruido: ${group.length} celdas, fuera del rango permitido.`)
        return
      }

      const cells = await Promise.all(group.map((cell) => getCell(cell.r, cell.c)))
      const values = cells.flatMap((cell) => cell ? [cell.value] : [])
      const index = rules.binning.strategy === 'DIGIT_SUM_MOD'
        ? values.reduce((sum, value) => sum + value, 0) % 4
        : Math.max(...values) % 4
      const bin = rules.binning.order[index]
      setExpectedBin(bin)
      setSelectionMessage(`${group.length} celdas · caja ${binNames[bin]}`)
    } catch (selectionError) {
      setSelectionMessage(selectionError instanceof Error ? selectionError.message : 'No se pudo completar el grupo.')
    }
  }

  const refine = async (bin: Bin) => {
    if (!selected.length || !file) return
    const idempotencyKey = crypto.randomUUID()
    setRefining(true)
    setError('')

    try {
      const allowed = await floor.claim(selected[0].r, selected[0].c)
      if (!allowed) { setError(floor.message || 'Otro refinador tiene reservado este grupo.'); return }
      const result = await refineWithRetry(file.id, bin, selected, idempotencyKey)
      markRefined(selected, bin)
      setFile({
        ...file,
        progress: result.file.progress,
        refinedGroups: result.file.refinedGroups,
        totalGroups: result.file.totalGroups,
        mistakes: result.file.mistakes,
        status: result.file.status,
      })
      setSelected([])
      setExpectedBin(null)
      setSelectionMessage(`Grupo refinado en ${binNames[bin]}.`)
    } catch (refineError) {
      const message = refineError instanceof Error ? refineError.message : 'No se pudo refinar el grupo.'
      setError(message)
      if (refineError instanceof ApiError && refineError.status === 409) {
        reloadForCells(selected)
      }
    } finally {
      floor.release()
      setRefining(false)
    }
  }

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!file) return
    const currentRow = clamp(Number(searchParams.get('r')) || 0, 0, file.rows - 1)
    const currentCol = clamp(Number(searchParams.get('c')) || 0, 0, file.cols - 1)
    let nextRow = currentRow
    let nextCol = currentCol

    if (event.key === 'ArrowUp') nextRow -= 1
    else if (event.key === 'ArrowDown') nextRow += 1
    else if (event.key === 'ArrowLeft') nextCol -= 1
    else if (event.key === 'ArrowRight') nextCol += 1
    else if (event.key === 'PageUp') nextRow -= Math.floor(viewport.height / CELL_SIZE)
    else if (event.key === 'PageDown') nextRow += Math.floor(viewport.height / CELL_SIZE)
    else if (event.key === 'Home') nextCol = 0
    else if (event.key === 'End') nextCol = file.cols - 1
    else if (event.key === 'Enter') {
      void selectGroup(currentRow, currentCol)
      return
    } else return

    event.preventDefault()
    nextRow = clamp(nextRow, 0, file.rows - 1)
    nextCol = clamp(nextCol, 0, file.cols - 1)
    gridRef.current?.scrollTo({
      top: nextRow * CELL_SIZE,
      left: nextCol * CELL_SIZE,
      behavior: 'smooth',
    })
  }

  if (loading) return <main className="p-10 font-mono">Cargando consola...</main>
  if (!file || !rules) return <main className="p-10"><p role="alert">{error || 'Archivo no encontrado.'}</p></main>

  if (file.status === 'COMPLETE') {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-[#527065]">Archivo completado</p>
        <h1 className="mt-4 text-5xl font-bold">{file.name}</h1>
        <p className="mt-4 text-lg">Todos los grupos encontraron su caja.</p>
        <Link to="/files" className="mt-8 inline-block bg-[#0b4b3f] px-5 py-3 font-bold text-white">Volver a archivos</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/files" className="font-mono text-xs uppercase underline">← Archivos</Link>
          <h1 className="mt-2 text-3xl font-bold">{file.name}</h1>
          <p className="mt-1 text-sm text-[#527065]">{file.rows} × {file.cols} · umbral {rules.tremorThreshold} · conectividad {rules.connectivity}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{Math.round(file.progress.overall * 100)}%</p>
          <p className="text-sm">{file.refinedGroups}/{file.totalGroups} grupos · {file.mistakes} errores</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 border border-[#8c2f23] bg-[#fff4ee] p-3 text-[#8c2f23]">{error}</p>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
        <div
          ref={gridRef}
          role="grid"
          aria-rowcount={file.rows}
          aria-colcount={file.cols}
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={handleGridKeyDown}
          className="relative h-[62vh] min-h-[440px] overflow-auto border-4 border-[#0b4b3f] bg-[#d9e2d1] focus:ring-4 focus:ring-[#68a28f]"
        >
          <div style={{ width: file.cols * CELL_SIZE, height: file.rows * CELL_SIZE, position: 'relative' }}>
            {visibleCells.map(({ r, c }) => {
              const cell = getCellSync(r, c)
              const scary = cell && cell.bin === '.' && cell.tremor >= rules.tremorThreshold
              const selectedCell = selectedKeys.has(`${r}:${c}`)
              return (
                <button
                  key={`${r}:${c}`}
                  type="button"
                  role="gridcell"
                  aria-rowindex={r + 1}
                  aria-colindex={c + 1}
                  aria-label={cell ? `Fila ${r + 1}, columna ${c + 1}, valor ${cell.value}, temblor ${cell.tremor}` : `Fila ${r + 1}, columna ${c + 1}, cargando`}
                  onClick={() => void selectGroup(r, c)}
                  className={`absolute grid place-items-center border border-[#719083] font-mono text-sm font-bold ${
                    selectedCell ? 'z-10 bg-[#f4d35e] text-black ring-2 ring-[#8c2f23]' :
                    cell?.bin !== '.' ? 'bg-[#0b4b3f] text-white' :
                    scary ? 'scary-cell bg-[#f2e8b8] text-[#8c2f23]' : 'bg-[#f8f7eb] text-[#294a40]'
                  }`}
                  style={{ width: CELL_SIZE, height: CELL_SIZE, top: r * CELL_SIZE, left: c * CELL_SIZE }}
                >
                  {cell ? (cell.bin === '.' ? cell.value : cell.bin) : '·'}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="border-2 border-[#0b4b3f] bg-[#f8f7eb] p-5">
          <p className="mb-4 border-b border-[#6d877c] pb-3 text-xs"><strong>Piso:</strong> {floor.status} · {floor.members.length} presentes</p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#527065]">Grupo seleccionado</p>
          <p className="mt-3 min-h-12 font-semibold">{selectionMessage || 'Selecciona un numero que de miedo.'}</p>
          {expectedBin && <p className="mt-3 text-sm">Destino calculado: <strong>{binNames[expectedBin]}</strong></p>}
          <div className="mt-6 grid grid-cols-2 gap-3" aria-label="Cajas de refinamiento">
            {(Object.keys(binNames) as Bin[]).map((bin) => (
              <button
                key={bin}
                type="button"
                onClick={() => void refine(bin)}
                disabled={!expectedBin || refining}
                className={`border-2 px-3 py-4 font-mono font-bold disabled:opacity-40 ${bin === expectedBin ? 'border-[#8c2f23] bg-[#f4d35e]' : 'border-[#0b4b3f]'}`}
              >
                {bin}<br /><span className="text-xs">{binNames[bin]}</span>
              </button>
            ))}
          </div>
          <p className="mt-5 text-xs text-[#527065]">Teclado: flechas, PageUp, PageDown, Home, End y Enter.</p>
        </aside>
      </div>
    </main>
  )
}

function useTileStore(fileId: number, tileSize: number) {
  const [, setTiles] = useState<Map<string, Tile>>(new Map())
  const cache = useRef(new Map<string, Tile>())
  const inflight = useRef(new Map<string, Promise<Tile>>())
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const activeControllers = controllers.current
    cache.current = new Map()
    inflight.current = new Map()
    setTiles(new Map())
    return () => activeControllers.forEach((controller) => controller.abort())
  }, [fileId])

  const ensureTile = useCallback(async (tileRow: number, tileCol: number, signal?: AbortSignal) => {
    const key = `${tileRow}:${tileCol}`
    const cached = cache.current.get(key)
    if (cached) return cached
    const active = inflight.current.get(key)
    if (active) return active

    const request = fetchTileWithRetry(fileId, tileRow, tileCol, signal)
      .then((tile) => {
        cache.current.set(key, tile)
        setTiles(new Map(cache.current))
        return tile
      })
      .finally(() => {
        inflight.current.delete(key)
        controllers.current.delete(key)
      })
    inflight.current.set(key, request)
    return request
  }, [fileId])

  const loadVisible = useCallback((keys: string[]) => {
    const visible = new Set(keys)
    controllers.current.forEach((controller, key) => {
      if (!visible.has(key)) {
        controller.abort()
        controllers.current.delete(key)
      }
    })
    keys.forEach((key) => {
      if (cache.current.has(key) || inflight.current.has(key)) return
      const [tileRow, tileCol] = key.split(':').map(Number)
      const controller = new AbortController()
      controllers.current.set(key, controller)
      void ensureTile(tileRow, tileCol, controller.signal).catch(() => undefined)
    })
  }, [ensureTile])

  const getCellSync = useCallback((r: number, c: number): CellData | null => {
    const tile = cache.current.get(`${Math.floor(r / tileSize)}:${Math.floor(c / tileSize)}`)
    if (!tile) return null
    const localRow = r - tile.originRow
    const localCol = c - tile.originCol
    const index = localRow * tile.cols + localCol
    if (index < 0 || index >= tile.values.length) return null
    const tremors = decodeBase64(tile.tremor)
    return { value: Number(tile.values[index]), tremor: tremors[index], bin: tile.bins[index] }
  }, [tileSize])

  const getCell = useCallback(async (r: number, c: number) => {
    await ensureTile(Math.floor(r / tileSize), Math.floor(c / tileSize))
    return getCellSync(r, c)
  }, [ensureTile, getCellSync, tileSize])

  const markRefined = useCallback((cells: CellCoordinate[], bin: Bin) => {
    const marker = bin[0]
    const grouped = new Map<string, CellCoordinate[]>()
    cells.forEach((cell) => {
      const key = `${Math.floor(cell.r / tileSize)}:${Math.floor(cell.c / tileSize)}`
      grouped.set(key, [...(grouped.get(key) ?? []), cell])
    })
    grouped.forEach((groupCells, key) => {
      const tile = cache.current.get(key)
      if (!tile) return
      const chars = tile.bins.split('')
      groupCells.forEach((cell) => {
        const index = (cell.r - tile.originRow) * tile.cols + (cell.c - tile.originCol)
        chars[index] = marker
      })
      cache.current.set(key, { ...tile, bins: chars.join('') })
    })
    setTiles(new Map(cache.current))
  }, [tileSize])

  const reloadForCells = useCallback((cells: CellCoordinate[]) => {
    const keys = new Set(cells.map((cell) => `${Math.floor(cell.r / tileSize)}:${Math.floor(cell.c / tileSize)}`))
    keys.forEach((key) => {
      cache.current.delete(key)
      const [tileRow, tileCol] = key.split(':').map(Number)
      void ensureTile(tileRow, tileCol)
    })
  }, [ensureTile, tileSize])

  return { loadVisible, getCell, getCellSync, markRefined, reloadForCells }
}

async function fetchTileWithRetry(fileId: number, tileRow: number, tileCol: number, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await apiRequest<Tile>(`/files/${fileId}/tiles/${tileRow}/${tileCol}`, { signal })
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (!(error instanceof ApiError) || ![429, 503].includes(error.status) || attempt === 3) throw error
      const retryAfter = Number(error.headers.get('Retry-After')) || 2 ** attempt
      await wait(retryAfter * 1000, signal)
    }
  }
  throw new Error('No se pudo cargar el bloque.')
}

async function refineWithRetry(
  fileId: number,
  bin: Bin,
  cells: CellCoordinate[],
  idempotencyKey: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await apiRequest<RefineResult>(`/files/${fileId}/refinements`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ bin, cells }),
      })
    } catch (error) {
      if (!(error instanceof ApiError) || ![429, 503].includes(error.status) || attempt === 2) throw error
      const retryAfter = Number(error.headers.get('Retry-After')) || 2 ** attempt
      await wait(retryAfter * 1000)
    }
  }
  throw new Error('No se pudo refinar el grupo.')
}

async function findGroup(
  start: CellCoordinate,
  file: DataFile,
  rules: Rules,
  getCell: (r: number, c: number) => Promise<CellData | null>,
) {
  const queue = [start]
  const visited = new Set<string>([cellKey(start)])
  const group: CellCoordinate[] = []
  const directions = rules.connectivity === 8
    ? [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [dr, dc] as const)).filter(([dr, dc]) => dr !== 0 || dc !== 0)
    : [[-1, 0], [1, 0], [0, -1], [0, 1]] as const

  while (queue.length) {
    const current = queue.shift()!
    const cell = await getCell(current.r, current.c)
    if (!cell || cell.bin !== '.' || cell.tremor < rules.tremorThreshold) continue
    group.push(current)

    for (const [dr, dc] of directions) {
      const next = { r: current.r + dr, c: current.c + dc }
      const key = cellKey(next)
      if (next.r < 0 || next.c < 0 || next.r >= file.rows || next.c >= file.cols || visited.has(key)) continue
      visited.add(key)
      queue.push(next)
    }
  }

  return group
}

function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

function rangeValues(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function cellKey(cell: CellCoordinate) {
  return `${cell.r}:${cell.c}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
