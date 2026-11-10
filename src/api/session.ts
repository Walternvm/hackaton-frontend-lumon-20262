import type { TokenPair } from '../types/api'

const REFRESH_KEY = 'lumon.refresh'
const SESSION_MESSAGE_KEY = 'lumon.session-message'
const SESSION_EVENT = 'lumon-session-change'
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

export function clearTokens(
  broadcast = true,
  message?: string,
) {
  accessToken = null
  localStorage.removeItem(REFRESH_KEY)

  if (message) {
    sessionStorage.setItem(SESSION_MESSAGE_KEY, message)
  }

  window.dispatchEvent(new Event(SESSION_EVENT))

  if (broadcast) {
    channel.postMessage({ type: 'logout', message })
  }
}

export function takeSessionMessage() {
  const message = sessionStorage.getItem(SESSION_MESSAGE_KEY)
  sessionStorage.removeItem(SESSION_MESSAGE_KEY)
  return message
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
    message?: string
  }>) => {
    if (event.data.type === 'tokens' && event.data.tokens) {
      setTokens(event.data.tokens, false)
      onTokens(event.data.tokens)
    }

    if (event.data.type === 'logout') {
      clearTokens(false, event.data.message)
      onLogout()
    }
  }

  const localListener = () => onLogout()

  channel.addEventListener('message', listener)
  window.addEventListener(SESSION_EVENT, localListener)

  return () => {
    channel.removeEventListener('message', listener)
    window.removeEventListener(SESSION_EVENT, localListener)
  }
}
