import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { apiRequest } from '../api/client'
import type { Health } from '../types/api'
import { LoadingScreen } from './LoadingScreen'

export function HealthGate({ children }: PropsWithChildren) {
  const [available, setAvailable] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const checkHealth = useCallback(async () => {
    try {
      await apiRequest<Health>('/meta/health', {
        authenticated: false,
      })
      setAvailable(true)
      setAttempt(0)
    } catch {
      setAvailable(false)
      setAttempt((current) => current + 1)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  useEffect(() => {
    if (available || attempt === 0) {
      return
    }

    const timeout = window.setTimeout(
      () => void checkHealth(),
      Math.min(1000 * 2 ** (attempt - 1), 30000),
    )

    return () => window.clearTimeout(timeout)
  }, [attempt, available, checkHealth])

  if (available) {
    return children
  }

  if (attempt === 0) {
    return <LoadingScreen message="Conectando con Lumon..." />
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef1df] px-6">
      <section className="w-full max-w-md border-2 border-[#0b4b3f] bg-[#f8f7eb] p-8 text-center shadow-[8px_8px_0_#0b4b3f]">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#8c2f23]">
          Enlace interrumpido
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[#082b24]">
          Conectando con Lumon...
        </h1>
        <p className="mt-3 text-[#38564d]">
          La API no responde. El siguiente intento se realizara automaticamente.
        </p>
        <button
          type="button"
          onClick={() => void checkHealth()}
          className="mt-6 bg-[#0b4b3f] px-5 py-3 font-mono text-sm uppercase tracking-wider text-white hover:bg-[#156355] focus:outline-none focus:ring-4 focus:ring-[#8eb8aa]"
        >
          Reintentar ahora
        </button>
      </section>
    </main>
  )
}
