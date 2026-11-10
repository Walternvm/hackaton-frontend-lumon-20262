import { Navigate, RouterProvider, createBrowserRouter } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './pages/AuthPage'
import { FilesPage } from './pages/FilesPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { StatusPage } from './pages/StatusPage'
import { TeamPage } from './pages/TeamPage'
import { RefinePage } from './pages/RefinePage'
import { RefinersPage } from './pages/RefinersPage'
import { BadgePage } from './pages/BadgePage'
import { RefinerEditPage } from './pages/RefinerEditPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { IncidentNewPage } from './pages/IncidentNewPage'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage mode="login" />,
  },
  {
    path: '/register',
    element: <AuthPage mode="register" />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/files" replace /> },
          { path: 'files', element: <FilesPage /> },
          { path: 'files/:id/refine', element: <RefinePage /> },
          {
            element: <ProtectedRoute permission="refiners:read" />,
            children: [
              { path: 'refiners', element: <RefinersPage /> },
              { path: 'refiners/:id/edit', element: <RefinerEditPage /> },
              { path: 'refiners/:id/badge', element: <BadgePage /> },
            ],
          },
          {
            element: <ProtectedRoute permission="incidents:read" />,
            children: [{ path: 'incidents', element: <IncidentsPage /> }],
          },
          {
            element: <ProtectedRoute permission="incidents:create" />,
            children: [{ path: 'incidents/new', element: <IncidentNewPage /> }],
          },
          { path: 'estado', element: <StatusPage /> },
          {
            element: <ProtectedRoute permission="team:manage" />,
            children: [
              { path: 'equipo', element: <TeamPage /> },
            ],
          },
          { path: 'sin-permiso', element: <ForbiddenPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
