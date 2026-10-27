import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ScalePicker } from '@/components/checkins/ScalePicker'
import { FormField } from '@/components/form/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSaveCheckIn } from '@/hooks/useCheckIns'
import { fieldDescribedBy, splitServerErrors } from '@/lib/form'
import { NOTE_MAX, validateSleepHours } from '@/lib/validation'
import type { CheckIn } from '@/types/checkIn'

type Scale = number | null

interface CheckInFormProps {
  date: string
  /** The saved check-in for `date`, or null for a new one */
  existing: CheckIn | null
  onSaved?: (checkIn: CheckIn) => void
}

/** Remount it (key) when `date` or `existing` changes so the fields reset */
export function CheckInForm({ date, existing, onSaved }: CheckInFormProps) {
  const save = useSaveCheckIn()
  const [mood, setMood] = useState<Scale>(existing?.mood ?? null)
  const [energy, setEnergy] = useState<Scale>(existing?.energy ?? null)
  const [stressLevel, setStressLevel] = useState<Scale>(existing?.stressLevel ?? null)
  const [sleep, setSleep] = useState(existing?.sleepHours != null ? String(existing.sleepHours) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [errors, setErrors] = useState<{ sleepHours?: string; note?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const sleepError = validateSleepHours(sleep)
    setErrors({ sleepHours: sleepError })
    if (sleepError) return

    const sleepHours = sleep.trim() ? Number(sleep) : null
    if ([mood, energy, stressLevel, sleepHours].every((v) => v === null)) {
      setFormError('Fill in at least one of mood, energy, stress or sleep.')
      return
    }

    save.mutate(
      // Always send all four metrics: on an update, a field left out would keep its old value.
      { date, mood, energy, stressLevel, sleepHours, note: note.trim() || null },
      {
        onSuccess: (checkIn) => {
          toast.success(existing ? 'Check-in updated' : 'Check-in saved')
          onSaved?.(checkIn)
        },
        onError: (error) => {
          const { fields, form } = splitServerErrors(error.details)
          setErrors(fields)
          setFormError(form ?? (Object.keys(fields).length ? null : error.message))
        },
      },
    )
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <ScalePicker metric="mood" value={mood} onChange={setMood} />
      <ScalePicker metric="energy" value={energy} onChange={setEnergy} />
      <ScalePicker metric="stressLevel" value={stressLevel} onChange={setStressLevel} />

      <FormField id="sleepHours" label="Sleep (hours)" hint="Last night, e.g. 7.5" error={errors.sleepHours}>
        <Input
          id="sleepHours"
          type="number"
          inputMode="decimal"
          min={0}
          max={24}
          step={0.1}
          className="max-w-40"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          aria-invalid={!!errors.sleepHours || undefined}
          aria-describedby={fieldDescribedBy('sleepHours', { hint: !errors.sleepHours, error: errors.sleepHours })}
        />
      </FormField>

      <FormField id="note" label="Note (optional)" error={errors.note}>
        <Textarea
          id="note"
          value={note}
          maxLength={NOTE_MAX}
          placeholder="Anything worth remembering about today?"
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={!!errors.note || undefined}
          aria-describedby={fieldDescribedBy('note', { error: errors.note })}
        />
      </FormField>

      <Button type="submit" size="lg" className="sm:w-fit" loading={save.isPending}>
        {existing ? 'Update check-in' : 'Save check-in'}
      </Button>
    </form>
  )
}
