import {
  clearTokens,
  getAccessToken,
  getRefreshPromise,
  getRefreshToken,
  setRefreshPromise,
  setTokens,
} from './session'
import type {
  ApiErrorBody,
  TokenPair,
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  status: number
  body: ApiErrorBody

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.body = body
  }
}

async function parseError(response: Response) {
  const fallback: ApiErrorBody = {
    error: 'UNKNOWN_ERROR',
    message: 'No se pudo completar la solicitud.',
    details: null,
    requestId: '',
  }

  try {
    return new ApiError(response.status, await response.json() as ApiErrorBody)
  } catch {
    return new ApiError(response.status, fallback)
  }
}

async function refreshAccessToken() {
  const activePromise = getRefreshPromise()

  if (activePromise) {
    return activePromise
  }

  const lockPromise = navigator.locks.request('lumon-refresh', async () => {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      throw new Error('No hay una sesion para restaurar.')
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lumon-Build': __BUILD_SHA__,
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      throw await parseError(response)
    }

    const tokens = await response.json() as TokenPair
    setTokens(tokens)
    return tokens.accessToken
  })
  const promise = lockPromise.then((token) => token)

  setRefreshPromise(promise)

  try {
    return await promise
  } finally {
    setRefreshPromise(null)
  }
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean
  retry?: boolean
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    authenticated = true,
    retry = true,
    headers,
    ...requestOptions
  } = options
  const requestHeaders = new Headers(headers)

  requestHeaders.set('X-Lumon-Build', __BUILD_SHA__)

  if (requestOptions.body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (authenticated) {
    const token = getAccessToken()

    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  })

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T
    }

    return await response.json() as T
  }

  const error = await parseError(response)

  if (
    authenticated &&
    retry &&
    error.body.error === 'TOKEN_EXPIRED'
  ) {
    await refreshAccessToken()
    return apiRequest<T>(path, { ...options, retry: false })
  }

  if (
    error.body.error === 'TOKEN_INVALID' ||
    error.body.error === 'SESSION_REVOKED' ||
    error.body.error === 'REFRESH_REUSED'
  ) {
    clearTokens()
  }

  throw error
}

export async function restoreSession() {
  if (!getRefreshToken()) {
    return false
  }

  await refreshAccessToken()
  return true
}
