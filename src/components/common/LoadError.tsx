import { CircleAlertIcon, RotateCwIcon } from 'lucide-react'
import { toApiError } from '@/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/** Inline error for a failed query, with a retry button */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{toApiError(error).message}</span>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCwIcon />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}
