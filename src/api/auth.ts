import { apiClient } from '@/api/client'
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '@/types/auth'

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken })
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/auth/me')
  return data.user
}
