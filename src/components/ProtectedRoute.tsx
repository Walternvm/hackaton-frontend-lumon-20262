import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute({ permission }: { permission?: string }) {
  const { user, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen message="Verificando separacion..." />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/sin-permiso" replace />
  }

  return <Outlet />
}
