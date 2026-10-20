import { useMutation } from '@tanstack/react-query'
import { login, register } from '@/api/auth'
import { toApiError, type ApiError } from '@/api/client'
import { startSession } from '@/lib/session'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'

// On success the session starts and GuestRoute redirects to wherever the user was headed.

export function useLogin() {
  return useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: async (payload) => {
      try {
        return await login(payload)
      } catch (error) {
        throw toApiError(error)
      }
    },
    onSuccess: startSession,
  })
}

export function useRegister() {
  return useMutation<AuthResponse, ApiError, RegisterPayload>({
    mutationFn: async (payload) => {
      try {
        return await register(payload)
      } catch (error) {
        throw toApiError(error)
      }
    },
    onSuccess: startSession,
  })
}
