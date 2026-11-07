import { useMutation } from '@tanstack/react-query'
import { login, register } from '@/api/auth'
import { withApiError, type ApiError } from '@/api/client'
import { startSession } from '@/lib/session'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'

// On success the session starts and GuestRoute redirects to wherever the user was headed.

export function useLogin() {
  return useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: withApiError(login),
    onSuccess: startSession,
  })
}

export function useRegister() {
  return useMutation<AuthResponse, ApiError, RegisterPayload>({
    mutationFn: withApiError(register),
    onSuccess: startSession,
  })
}
