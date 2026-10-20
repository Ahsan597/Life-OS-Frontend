import axios, { isAxiosError, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from '@/lib/tokenStorage'
import type { ApiErrorBody, ApiFieldError } from '@/types/api'
import type { AuthTokens } from '@/types/auth'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

/** 401s from these mean "bad credentials / bad token", never "access token expired" */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

function isAuthEndpoint(url: string | undefined) {
  return !!url && AUTH_ENDPOINTS.some((endpoint) => url.endsWith(endpoint))
}

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken()
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Refresh: single-flight within a tab, serialised across tabs.
//
// Refresh tokens are single-use and the backend revokes EVERY session if one is
// reused, so we must never send the same refresh token twice:
//  - inside a tab, all callers share one in-flight promise;
//  - across tabs, a Web Lock serialises refreshes, and inside the lock we re-read
//    storage: if another tab already rotated the tokens we use those instead.
// ---------------------------------------------------------------------------

/** Thrown when the session can't be refreshed (no token, or the server rejected it) */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired')
    this.name = 'SessionExpiredError'
  }
}

let sessionExpiredHandler: () => void = () => {}

/** Registered by the session module; called once tokens are known to be unusable */
export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler
}

let refreshInFlight: Promise<string> | null = null

/**
 * Returns a fresh access token.
 * @param failedAccessToken the access token the failed request was sent with. If the
 * stored token is already different, someone else refreshed and we just reuse theirs.
 */
export function refreshSession(failedAccessToken: string | null): Promise<string> {
  refreshInFlight ??= withRefreshLock(() => performRefresh(failedAccessToken)).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function withRefreshLock<T>(callback: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('lifeos-refresh', callback)
  }
  return callback()
}

async function performRefresh(failedAccessToken: string | null): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) throw new SessionExpiredError()

  const storedAccessToken = tokenStorage.getAccessToken()
  if (storedAccessToken && storedAccessToken !== failedAccessToken) {
    // Another tab (or an earlier refresh in this tab) already rotated the tokens.
    return storedAccessToken
  }

  try {
    // Plain axios: no interceptors, so a 401 here can never trigger another refresh.
    const { data } = await axios.post<AuthTokens>(`${API_URL}/auth/refresh`, { refreshToken })
    tokenStorage.setTokens(data)
    return data.accessToken
  } catch (error) {
    // Only a definite rejection from the server ends the session; network errors don't.
    if (isAxiosError(error) && error.response && error.response.status < 500) {
      throw new SessionExpiredError()
    }
    throw error
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

function bearerFrom(config: InternalAxiosRequestConfig): string | null {
  const header = config.headers.Authorization
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      isAuthEndpoint(config.url) ||
      !tokenStorage.getRefreshToken()
    ) {
      return Promise.reject(error)
    }

    config._retry = true

    let accessToken: string
    try {
      accessToken = await refreshSession(bearerFrom(config))
    } catch (refreshError) {
      if (refreshError instanceof SessionExpiredError) {
        tokenStorage.clear()
        sessionExpiredHandler()
      }
      return Promise.reject(refreshError)
    }

    config.headers.Authorization = `Bearer ${accessToken}`
    return apiClient(config)
  },
)

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export interface ApiError {
  /** HTTP status, or null when the server couldn't be reached */
  status: number | null
  message: string
  details: ApiFieldError[]
}

export function toApiError(error: unknown): ApiError {
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return {
        status: null,
        message: "Can't reach the Life OS server. Check your connection and try again.",
        details: [],
      }
    }
    return {
      status: error.response.status,
      message: error.response.data?.error ?? 'Something went wrong. Please try again.',
      details: error.response.data?.details ?? [],
    }
  }
  return { status: null, message: 'Something went wrong. Please try again.', details: [] }
}
