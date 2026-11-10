import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth()

  return (
    <div className="min-h-screen bg-[#eef1df] text-[#082b24]">
      <header className="border-b-4 border-[#0b4b3f] bg-[#f8f7eb]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <NavLink to="/" className="font-mono text-xl font-bold uppercase tracking-[0.18em]">
            Lumon MDR
          </NavLink>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Navegacion principal">
            <NavLink to="/files" className="px-3 py-2 text-sm font-semibold hover:bg-[#dbe3d1]">
              Archivos
            </NavLink>
            <NavLink to="/estado" className="px-3 py-2 text-sm font-semibold hover:bg-[#dbe3d1]">
              Estado
            </NavLink>
            {hasPermission('team:manage') && (
              <NavLink to="/equipo" className="px-3 py-2 text-sm font-semibold hover:bg-[#dbe3d1]">
                Equipo
              </NavLink>
            )}
            <span className="hidden text-sm text-[#527065] sm:inline">{user?.displayName}</span>
            <button
              type="button"
              onClick={() => void logout()}
              className="border border-[#0b4b3f] px-3 py-2 text-sm font-semibold hover:bg-[#0b4b3f] hover:text-white"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
