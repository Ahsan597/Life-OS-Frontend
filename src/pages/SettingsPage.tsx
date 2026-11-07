import { CircleAlertIcon, DownloadIcon, LocateFixedIcon } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ApiError } from '@/api/client'
import type { ExportDataset } from '@/api/export'
import { LoadError } from '@/components/common/LoadError'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/form/FormField'
import { Switch } from '@/components/form/Switch'
import { TimezoneSelect } from '@/components/form/TimezoneSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useNow } from '@/hooks/useNow'
import { useExport, useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { getBrowserTimeZone } from '@/lib/datetime'
import { fieldDescribedBy, splitServerErrors } from '@/lib/form'
import {
  formatTimeInZone,
  namePatch,
  preferencesPatch,
  validateProfileName,
  validateReminderTime,
} from '@/lib/settings'
import { validateTimeZone } from '@/lib/validation'
import type { User, UserPreferences } from '@/types/auth'

const TIMEZONE_WARNING = "Past logs keep their dates; 'today' will follow the new timezone from now on."

export function SettingsPage() {
  const profile = useProfile()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your profile, timezone, reminders and data." />
      {profile.isError && !profile.data ? (
        <LoadError error={profile.error} onRetry={() => void profile.refetch()} />
      ) : !profile.data ? (
        <div className="flex flex-col gap-6" aria-label="Loading settings">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileSection user={profile.data} />
          <TimezoneSection user={profile.data} />
          <RemindersSection user={profile.data} />
          <ExportSection />
        </div>
      )}
    </div>
  )
}

/** Splits a failed save into field errors (by field name) and a form-level message */
function serverErrors(error: ApiError): { fields: Record<string, string>; form: string | null } {
  if (error.status === 400 && error.details.length > 0) return splitServerErrors(error.details)
  // 429 already got the global toast.
  return { fields: {}, form: error.status === 429 ? null : error.message }
}

function Section({
  title,
  description,
  formError,
  children,
}: {
  title: string
  description: string
  formError?: string | null
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-section-title">
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        {children}
      </CardContent>
    </Card>
  )
}

function ProfileSection({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(user.name ?? '')
  const [errors, setErrors] = useState<{ name?: string; form?: string | null }>({})
  const patch = namePatch(user.name, name)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nameError = validateProfileName(name)
    setErrors({ name: nameError })
    if (nameError || patch === undefined) return
    update.mutate(
      { name: patch },
      {
        onSuccess: () => toast.success('Profile saved'),
        onError: (error) => {
          const { fields, form } = serverErrors(error)
          setErrors({ name: fields.name, form })
        },
      },
    )
  }

  return (
    <Section title="Profile" description="How Life OS greets you." formError={errors.form}>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <FormField id="profile-name" label="Name" hint="Optional. Leave blank to clear it." error={errors.name}>
          <Input
            id="profile-name"
            autoComplete="name"
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={fieldDescribedBy('profile-name', { hint: !errors.name, error: errors.name })}
          />
        </FormField>
        <FormField id="profile-email" label="Email" hint="Email can't be changed yet.">
          <Input
            id="profile-email"
            type="email"
            value={user.email}
            readOnly
            aria-readonly="true"
            className="bg-muted/60"
            aria-describedby="profile-email-hint"
          />
        </FormField>
        <Button type="submit" className="self-start" disabled={patch === undefined} loading={update.isPending}>
          Save profile
        </Button>
      </form>
    </Section>
  )
}

function TimezoneSection({ user }: { user: User }) {
  const update = useUpdateProfile()
  const now = useNow()
  const [zone, setZone] = useState<string | null>(user.timezone)
  const [error, setError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const deviceZone = getBrowserTimeZone()
  const changed = !!zone && zone !== user.timezone

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const zoneError = validateTimeZone(zone)
    setError(zoneError)
    if (zoneError || !changed) return
    setConfirming(true)
  }

  function save() {
    if (!zone) return
    update.mutate(
      { timezone: zone },
      {
        onSuccess: (saved) => {
          setConfirming(false)
          toast.success(`Timezone set to ${saved.timezone}`)
        },
        onError: (apiError) => {
          setConfirming(false)
          const { fields, form } = serverErrors(apiError)
          setError(fields.timezone)
          setFormError(form)
        },
      },
    )
  }

  return (
    <Section title="Timezone" description="Decides when your day starts and ends." formError={formError}>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <FormField
          id="settings-timezone"
          label="Timezone"
          hint={zone ? `Local time there: ${formatTimeInZone(now, zone)}` : undefined}
          error={error}
        >
          <TimezoneSelect
            id="settings-timezone"
            value={zone}
            onChange={(next) => {
              setZone(next)
              setError(undefined)
            }}
            invalid={!!error}
            describedBy={fieldDescribedBy('settings-timezone', { hint: !!zone && !error, error })}
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setZone(deviceZone)}
            disabled={zone === deviceZone}
          >
            <LocateFixedIcon />
            Use my device timezone
          </Button>
        </div>
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px] text-muted-foreground">{TIMEZONE_WARNING}</p>
        <Button type="submit" className="self-start" disabled={!changed} loading={update.isPending && !confirming}>
          Save timezone
        </Button>
      </form>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {zone}?</DialogTitle>
            <DialogDescription>{TIMEZONE_WARNING}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button onClick={save} loading={update.isPending}>
              Change timezone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

function RemindersSection({ user }: { user: User }) {
  const update = useUpdateProfile()
  const ids = { enabled: useId(), email: useId() }
  const [prefs, setPrefs] = useState<UserPreferences>(user.preferences)
  const [errors, setErrors] = useState<{ reminderTime?: string; form?: string | null }>({})
  const patch = preferencesPatch(user.preferences, prefs)
  const off = !prefs.remindersEnabled

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    setPrefs((current) => ({ ...current, [key]: value }))
    if (key === 'reminderTime') setErrors((current) => ({ ...current, reminderTime: undefined }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const timeError = validateReminderTime(prefs.reminderTime)
    setErrors({ reminderTime: timeError })
    if (timeError || !patch) return
    update.mutate(
      { preferences: patch },
      {
        onSuccess: () => toast.success('Reminder settings saved'),
        onError: (error) => {
          const { fields, form } = serverErrors(error)
          setErrors({ reminderTime: fields['preferences.reminderTime'] ?? fields.reminderTime, form })
        },
      },
    )
  }

  return (
    <Section
      title="Notifications"
      description="We only remind you if something is still open that day."
      formError={errors.form}
    >
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={ids.enabled} className="text-sm font-medium">
            Daily reminder
          </label>
          <Switch id={ids.enabled} checked={prefs.remindersEnabled} onCheckedChange={(v) => set('remindersEnabled', v)} />
        </div>

        <FormField id="reminder-time" label={`Remind me at (your time, ${user.timezone})`} error={errors.reminderTime}>
          <Input
            id="reminder-time"
            type="time"
            className="max-w-40"
            value={prefs.reminderTime}
            disabled={off}
            onChange={(e) => set('reminderTime', e.target.value)}
            aria-invalid={!!errors.reminderTime || undefined}
            aria-describedby={fieldDescribedBy('reminder-time', { error: errors.reminderTime })}
          />
        </FormField>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <label htmlFor={ids.email} className="text-sm font-medium">
              Also email me
            </label>
            <p id={`${ids.email}-note`} className="text-[13px] text-muted-foreground">
              Email delivery is in preview: messages are logged on the server, not sent yet.
            </p>
          </div>
          <Switch
            id={ids.email}
            checked={prefs.emailReminders}
            disabled={off}
            describedBy={`${ids.email}-note`}
            onCheckedChange={(v) => set('emailReminders', v)}
          />
        </div>

        <Button type="submit" className="self-start" disabled={!patch} loading={update.isPending}>
          Save reminders
        </Button>
      </form>
    </Section>
  )
}

const DATASETS: { value: ExportDataset; label: string }[] = [
  { value: 'habits', label: 'Habits' },
  { value: 'habit_logs', label: 'Habit logs' },
  { value: 'check_ins', label: 'Check-ins' },
  { value: 'recommendations', label: 'Recommendations' },
]

function ExportSection() {
  const exporter = useExport()
  const [dataset, setDataset] = useState<ExportDataset>('habits')
  const pending = exporter.isPending ? exporter.variables?.format : null

  return (
    <Section title="Download your data" description="Includes archived habits. CSV files open in Excel / Google Sheets.">
      <Button
        className="self-start"
        onClick={() => exporter.mutate({ format: 'json' })}
        loading={pending === 'json'}
        disabled={exporter.isPending}
      >
        <DownloadIcon />
        Download everything (JSON)
      </Button>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="export-dataset" className="text-sm font-medium">
          Download a table as CSV
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            id="export-dataset"
            value={dataset}
            onChange={(e) => setDataset(e.target.value as ExportDataset)}
            className="h-11 min-w-0 flex-1 cursor-pointer rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-focus-ring sm:h-9 sm:max-w-56 dark:bg-input/30"
          >
            {DATASETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            className="h-11 sm:h-9"
            onClick={() => exporter.mutate({ format: 'csv', dataset })}
            loading={pending === 'csv'}
            disabled={exporter.isPending}
          >
            <DownloadIcon />
            Download CSV
          </Button>
        </div>
      </div>
    </Section>
  )
}
