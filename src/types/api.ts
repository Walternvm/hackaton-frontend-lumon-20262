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

export type Bin = 'WO' | 'FC' | 'DR' | 'MA'

export interface Progress {
  WO: number
  FC: number
  DR: number
  MA: number
  overall: number
}

export interface DataFile {
  id: number
  name: string
  rows: number
  cols: number
  tileSize: number
  status: 'ACTIVE' | 'COMPLETE'
  progress: Progress
  refinedGroups: number
  totalGroups: number
  mistakes: number
  updatedAt: string
}

export interface FilePage {
  content: DataFile[]
  totalElements: number
  totalPages: number
  page: number
  size: 10 | 25 | 50
}

export interface Rules {
  tremorThreshold: number
  connectivity: 4 | 8
  minGroupSize: number
  maxGroupSize: number
  binning: {
    strategy: 'DIGIT_SUM_MOD' | 'MAX_DIGIT_MOD'
    order: Bin[]
  }
}

export interface Tile {
  tileRow: number
  tileCol: number
  originRow: number
  originCol: number
  rows: number
  cols: number
  values: string
  tremor: string
  bins: string
  version: number
}

export interface CellCoordinate {
  r: number
  c: number
}

export interface RefineResult {
  refinementId: number
  bin: Bin
  size: number
  file: {
    progress: Progress
    refinedGroups: number
    totalGroups: number
    mistakes: number
    status: 'ACTIVE' | 'COMPLETE'
  }
}

export interface CheckResult {
  name: string
  passed: boolean
  detail: string
}

export interface RosterMember {
  name: string
  code: string
}

export interface Roster {
  members: RosterMember[]
  complete: boolean
  locked: boolean
}

export interface Clearance {
  granted: boolean
  grantedAt: string | null
  checks: CheckResult[]
  checkedAt: string | null
  workspace: {
    kind: 'DEV' | 'EVAL'
    chaosLevel: 0 | 1 | 2
  }
  roster: Roster
  round: {
    approved: boolean
    approvedAt: string | null
    approvedRound: number | null
    nextRoundAt: string | null
    drawnMember: RosterMember | null
  }
}

export interface ClearanceCheckResult {
  granted: boolean
  grantedAt: string | null
  checks: CheckResult[]
}

export interface IntegrationStatus {
  deploy: {
    origin: string | null
    verifiedAt: string | null
    lastBuildSeen: string | null
    lastBuildSeenAt: string | null
  }
  storage: {
    provider: 'SUPABASE' | 'CLOUDINARY' | null
    verifiedAt: string | null
    checks: CheckResult[]
  }
  clearance: {
    granted: boolean
    grantedAt: string | null
  }
}
