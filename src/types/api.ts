export interface ApiErrorBody {
  error: string
  message: string
  details: {
    field?: string
    fields?: Record<string, string>
    permission?: string
  } | null
  requestId: string
}

export interface UserSummary {
  id: number
  email: string
  displayName: string
}

export interface Team {
  code: string
  name: string
}

export interface SessionResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserSummary
  team?: Team
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface CurrentUser extends UserSummary {
  team: Team
  role: {
    code: string
    name: string
  }
  permissions: string[]
  clearance: {
    granted: boolean
    grantedAt: string | null
  }
}

export interface Health {
  status: string
  service: string
  time: string
}
