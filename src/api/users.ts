import { apiClient } from '@/api/client'
import type { User, UserUpdate } from '@/types/auth'

export async function getProfile(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>('/users/me')
  return data.user
}

/** Send only what changed; email can't be changed here */
export async function updateProfile(patch: UserUpdate): Promise<User> {
  const { data } = await apiClient.patch<{ user: User }>('/users/me', patch)
  return data.user
}
