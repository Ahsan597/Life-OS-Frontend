import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { login, register } from '@/api/auth'
import { withApiError, type ApiError } from '@/api/client'
import { startSession } from '@/lib/session'
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth'

// On success the session starts and GuestRoute redirects to wherever the user was headed.
// Errors stay on the form (inline messages, rate-limit countdown) instead of a toast.

export function useLogin() {
  return useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: withApiError(login),
    meta: { inlineErrors: true },
    onSuccess: (response) => {
      startSession(response)
      toast.success(response.user.name ? `Welcome back, ${response.user.name}` : 'Welcome back')
    },
  })
}

export function useRegister() {
  return useMutation<AuthResponse, ApiError, RegisterPayload>({
    mutationFn: withApiError(register),
    meta: { inlineErrors: true },
    onSuccess: (response) => {
      startSession(response)
      toast.success('Account created. Welcome to Life OS!')
    },
  })
}
