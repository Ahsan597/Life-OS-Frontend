import { apiClient } from '@/api/client'
import type { AuthTokens, LoginPayload, RegisterPayload, User } from '@/types/auth'

interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}
