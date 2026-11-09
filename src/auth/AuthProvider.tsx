import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import { apiRequest, restoreSession } from '../api/client'
import {
  clearTokens,
  setTokens,
  subscribeToSession,
} from '../api/session'
import type {
  CurrentUser,
  SessionResponse,
} from '../types/api'
import {
  AuthContext,
  type LoginData,
  type RegisterData,
} from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const currentUser = await apiRequest<CurrentUser>('/auth/me')
    setUser(currentUser)
  }, [])

  useEffect(() => {
    let active = true

    const initialize = async () => {
      try {
        const restored = await restoreSession()

        if (restored && active) {
          await loadUser()
        }
      } catch {
        clearTokens(false)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void initialize()

    const unsubscribe = subscribeToSession(
      () => {
        void loadUser()
      },
      () => setUser(null),
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [loadUser])

  const login = async (data: LoginData) => {
    const session = await apiRequest<SessionResponse>('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: JSON.stringify(data),
    })
    setTokens(session)
    await loadUser()
  }

  const register = async (data: RegisterData) => {
    const session = await apiRequest<SessionResponse>('/auth/register', {
      method: 'POST',
      authenticated: false,
      body: JSON.stringify(data),
    })
    setTokens(session)
    await loadUser()
    return session
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('lumon.refresh')

    try {
      if (refreshToken) {
        await apiRequest<void>('/auth/logout', {
          method: 'POST',
          authenticated: false,
          body: JSON.stringify({ refreshToken }),
        })
      }
    } finally {
      clearTokens()
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    hasPermission: (permission: string) =>
      user?.permissions.includes(permission) ?? false,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
