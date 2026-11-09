import { createContext } from 'react'
import type {
  CurrentUser,
  SessionResponse,
} from '../types/api'

export interface RegisterData {
  teamName: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<SessionResponse>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
