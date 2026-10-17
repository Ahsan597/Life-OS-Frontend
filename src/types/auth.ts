export interface User {
  id: string
  email: string
  name: string
  timezone: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
  timezone: string
}
