import { TimerIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCountdown } from '@/lib/errors'

/** Shown inline above a submit button after a 429 */
export function RateLimitNotice({ message, secondsLeft }: { message: string | null; secondsLeft: number }) {
  if (!message) return null
  return (
    <Alert variant="destructive" data-testid="rate-limit">
      <TimerIcon />
      <AlertDescription>
        {message}{' '}
        {secondsLeft > 0 ? (
          <span className="tabular-nums">You can try again in {formatCountdown(secondsLeft)}.</span>
        ) : (
          'You can try again now.'
        )}
      </AlertDescription>
    </Alert>
  )
}
