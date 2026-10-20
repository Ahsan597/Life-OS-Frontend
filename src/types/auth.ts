export interface User {
  /** BigInt on the server, always a string here — never convert it to a number */
  id: string
  email: string
  name: string | null
  /** IANA timezone, e.g. "Asia/Karachi" */
  timezone: string
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name?: string
  timezone?: string
}
