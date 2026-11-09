import type { TokenPair } from '../types/api'

const REFRESH_KEY = 'lumon.refresh'
const channel = new BroadcastChannel('lumon-session')

let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: TokenPair, broadcast = true) {
  accessToken = tokens.accessToken
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)

  if (broadcast) {
    channel.postMessage({ type: 'tokens', tokens })
  }
}

export function clearTokens(broadcast = true) {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)

  if (broadcast) {
    channel.postMessage({ type: 'logout' })
  }
}

export function setRefreshPromise(promise: Promise<string> | null) {
  refreshPromise = promise
}

export function getRefreshPromise() {
  return refreshPromise
}

export function subscribeToSession(
  onTokens: (tokens: TokenPair) => void,
  onLogout: () => void,
) {
  const listener = (event: MessageEvent<{
    type: 'tokens' | 'logout'
    tokens?: TokenPair
  }>) => {
    if (event.data.type === 'tokens' && event.data.tokens) {
      setTokens(event.data.tokens, false)
      onTokens(event.data.tokens)
    }

    if (event.data.type === 'logout') {
      clearTokens(false)
      onLogout()
    }
  }

  channel.addEventListener('message', listener)

  return () => channel.removeEventListener('message', listener)
}
