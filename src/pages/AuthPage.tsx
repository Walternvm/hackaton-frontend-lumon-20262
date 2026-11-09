import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

interface LocationState {
  from?: string
  message?: string
}

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/files" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})

    try {
      if (mode === 'register') {
        await register({ teamName, email, password })
      } else {
        await login({ email, password })
      }

      navigate(state?.from ?? '/files', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.body.details?.fields ?? {}
        const field = error.body.details?.field
        setErrors({
          ...fields,
          ...(field ? { [field]: error.message } : {}),
          ...(!field && Object.keys(fields).length === 0 ? { form: error.message } : {}),
        })
      } else {
        setErrors({ form: 'No se pudo conectar con Lumon.' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden bg-[#082b24] p-12 text-[#eef1df] lg:flex lg:flex-col lg:justify-between">
        <p className="font-mono text-lg uppercase tracking-[0.3em]">Lumon Industries</p>
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.25em] text-[#a9c5b8]">Macrodata Refinement</p>
          <h1 className="mt-5 max-w-xl text-6xl font-bold leading-tight">
            El trabajo es misterioso e importante.
          </h1>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-[#8ba99d]">Piso separado · Acceso controlado</p>
      </section>

      <section className="flex items-center justify-center bg-[#eef1df] px-6 py-12">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#527065]">
            {mode === 'login' ? 'Orientacion de ingreso' : 'Registro de cuadrilla'}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-[#082b24]">
            {mode === 'login' ? 'Entrar al piso' : 'Crear cuadrilla'}
          </h1>
          <p className="mt-2 text-[#527065]">
            {mode === 'login'
              ? 'Usa las credenciales de tu equipo.'
              : 'Lumon asignara un TEAM_CODE al finalizar.'}
          </p>

          {state?.message && (
            <p className="mt-5 border border-[#8c2f23] bg-[#fff4ee] p-3 text-sm text-[#8c2f23]" role="alert">
              {state.message}
            </p>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {mode === 'register' && (
              <Field
                label="Nombre de la cuadrilla"
                name="teamName"
                value={teamName}
                onChange={setTeamName}
                error={errors.teamName}
                autoComplete="organization"
              />
            )}
            <Field
              label="Correo"
              name="email"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              autoComplete="email"
            />
            <Field
              label="Contrasena"
              name="password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {errors.form && (
              <p className="border border-[#8c2f23] bg-[#fff4ee] p-3 text-sm text-[#8c2f23]" role="alert">
                {errors.form}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0b4b3f] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white hover:bg-[#156355] disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Registrar equipo'}
            </button>
          </form>

          <p className="mt-6 text-sm text-[#527065]">
            {mode === 'login' ? '¿Aun no tienen cuenta?' : '¿Ya tienen una cuenta?'}{' '}
            <Link
              to={mode === 'login' ? '/register' : '/login'}
              className="font-bold text-[#0b4b3f] underline"
            >
              {mode === 'login' ? 'Registrar cuadrilla' : 'Iniciar sesion'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}

interface FieldProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete: string
}

function Field({ label, name, type = 'text', value, onChange, error, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block font-mono text-xs font-bold uppercase tracking-wider text-[#294a40]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full border-2 border-[#6d877c] bg-[#f8f7eb] px-4 py-3 outline-none focus:border-[#0b4b3f] focus:ring-4 focus:ring-[#b9cec5]"
      />
      {error && <p id={`${name}-error`} className="mt-2 text-sm text-[#8c2f23]">{error}</p>}
    </div>
  )
}
