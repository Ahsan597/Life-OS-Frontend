import { useSearchParams } from 'react-router-dom'
import { CheckInForm } from '@/components/checkins/CheckInForm'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCheckIn } from '@/hooks/useCheckIns'
import { useToday } from '@/hooks/useToday'
import { addDays, formatFullDate, isValidDateString } from '@/lib/dates'

/** Today's check-in, or a past day's via ?date=YYYY-MM-DD */
export function CheckInPage() {
  const today = useToday()
  const [params, setParams] = useSearchParams()
  const requested = params.get('date')
  // Future dates are rejected by the backend, so they (and junk) fall back to today.
  const date = requested && isValidDateString(requested) && requested <= today ? requested : today
  const checkIn = useCheckIn(date)

  function selectDate(next: string) {
    if (!isValidDateString(next) || next > today) return
    setParams(next === today ? {} : { date: next }, { replace: true })
  }

  const yesterday = addDays(today, -1)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title={date === today ? 'Daily check-in' : 'Past check-in'}
        description={formatFullDate(date)}
      />

      <Card>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-3">
            <FormField id="checkin-date" label="Date">
              <Input
                id="checkin-date"
                type="date"
                className="w-44"
                max={today}
                value={date}
                onChange={(e) => selectDate(e.target.value)}
              />
            </FormField>
            <Button variant={date === today ? 'default' : 'secondary'} size="sm" onClick={() => selectDate(today)}>
              Today
            </Button>
            <Button variant={date === yesterday ? 'default' : 'secondary'} size="sm" onClick={() => selectDate(yesterday)}>
              Yesterday
            </Button>
          </div>

          {checkIn.isPending ? (
            <div className="flex flex-col gap-4" aria-label="Loading check-in">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : checkIn.isError ? (
            <LoadError error={checkIn.error} onRetry={() => void checkIn.refetch()} />
          ) : (
            <>
              {checkIn.data ? (
                <p className="text-sm text-muted-foreground">You already checked in for this day. Changes update it.</p>
              ) : null}
              {/* A 404 just means "not yet": show an empty form, not an error. */}
              <CheckInForm key={`${date}-${checkIn.data?.id ?? 'new'}`} date={date} existing={checkIn.data} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
