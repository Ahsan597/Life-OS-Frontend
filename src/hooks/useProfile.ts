import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withApiError, type ApiError } from '@/api/client'
import { downloadExport, saveBlob, type ExportRequest } from '@/api/export'
import { getProfile, updateProfile } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import type { User, UserUpdate } from '@/types/auth'

export const profileKeys = {
  me: ['me'] as const,
}

/** Starts from the session's user, then refreshes from GET /users/me */
export function useProfile() {
  const sessionUser = useAuthStore((state) => state.user)
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: getProfile,
    initialData: sessionUser ?? undefined,
    initialDataUpdatedAt: 0,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, UserUpdate>({
    mutationFn: withApiError(updateProfile),
    onSuccess: (user, patch) => {
      const previousZone = useAuthStore.getState().user?.timezone
      queryClient.setQueryData(profileKeys.me, user)
      useAuthStore.getState().setUser(user)
      // A new timezone moves "today": habits, streaks, forecasts and check-ins can all shift.
      if (patch.timezone !== undefined && user.timezone !== previousZone) return queryClient.invalidateQueries()
    },
  })
}

/** Fetches the export with the Bearer token and saves it under the server's filename */
export function useExport() {
  return useMutation<string, ApiError, ExportRequest>({
    mutationFn: withApiError(async (request) => {
      const { blob, filename } = await downloadExport(request)
      saveBlob(blob, filename)
      return filename
    }),
    onSuccess: (filename) => toast.success(`Downloaded ${filename}`),
    // 429s already got the global rate-limit toast.
    onError: (error) => {
      if (error.status !== 429) toast.error(error.message)
    },
  })
}
