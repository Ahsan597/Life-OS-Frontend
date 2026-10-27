import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { ApiError } from '@/api/client'
import { FormField } from '@/components/form/FormField'
import { WeekdayPicker } from '@/components/habits/WeekdayPicker'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { fieldDescribedBy, splitServerErrors } from '@/lib/form'
import { FREQUENCIES } from '@/lib/habits'
import { cn } from '@/lib/utils'
import {
  DESCRIPTION_MAX,
  HABIT_TITLE_MAX,
  validateDescription,
  validateHabitTitle,
  validateTargetDays,
} from '@/lib/validation'
import type { Frequency, HabitBase, HabitPayload, Weekday } from '@/types/habit'

type Field = 'title' | 'description' | 'frequency' | 'targetDays'
type FieldErrors = Partial<Record<Field, string>>

interface HabitFormProps {
  /** Pre-fills the form when editing */
  initial?: Pick<HabitBase, 'title' | 'description' | 'frequency' | 'targetDays'>
  submitLabel: string
  pending: boolean
  /** Rejects with an ApiError to show server-side errors on the form */
  onSubmit: (payload: HabitPayload) => Promise<unknown>
  onCancel: () => void
}

export function HabitForm({ initial, submitLabel, pending, onSubmit, onCancel }: HabitFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily')
  const [targetDays, setTargetDays] = useState<Weekday[]>(initial?.targetDays ?? [1, 3, 5])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const next: FieldErrors = {
      title: validateHabitTitle(title),
      description: validateDescription(description),
      targetDays: validateTargetDays(frequency, targetDays),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    const payload: HabitPayload = {
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      // Only "custom" habits have target days; switching away clears them.
      ...(frequency === 'custom' ? { targetDays } : initial ? { targetDays: null } : {}),
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      const apiError = error as ApiError
      const { fields, form } = splitServerErrors(apiError.details ?? [])
      setErrors(fields)
      setFormError(form ?? (Object.keys(fields).length ? null : apiError.message))
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      {formError ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField id="title" label="Title" error={errors.title}>
        <Input
          id="title"
          autoFocus
          value={title}
          maxLength={HABIT_TITLE_MAX}
          placeholder="e.g. Read for 20 minutes"
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!errors.title || undefined}
          aria-describedby={fieldDescribedBy('title', { error: errors.title })}
        />
      </FormField>

      <FormField id="description" label="Description (optional)" error={errors.description}>
        <Textarea
          id="description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          placeholder="Why this habit matters, or how you'll do it"
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description || undefined}
          aria-describedby={fieldDescribedBy('description', { error: errors.description })}
        />
      </FormField>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm leading-5 font-medium">How often?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FREQUENCIES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer flex-col gap-0.5 rounded-lg border bg-card px-3 py-2.5 transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-focus-ring',
                frequency === option.value ? 'border-primary bg-primary-soft' : 'hover:bg-muted',
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="frequency"
                  value={option.value}
                  checked={frequency === option.value}
                  onChange={() => setFrequency(option.value)}
                  className="accent-primary"
                />
                {option.label}
              </span>
              <span className="pl-5 text-[13px] text-muted-foreground">{option.description}</span>
            </label>
          ))}
        </div>
        {errors.frequency ? <p className="text-[13px] leading-5 text-destructive">{errors.frequency}</p> : null}
      </fieldset>

      {frequency === 'custom' ? (
        <fieldset
          className="flex flex-col gap-1.5"
          aria-describedby={errors.targetDays ? 'targetDays-error' : undefined}
        >
          <legend className="mb-1.5 text-sm leading-5 font-medium">On which days?</legend>
          <WeekdayPicker value={targetDays} onChange={setTargetDays} invalid={!!errors.targetDays} />
          {errors.targetDays ? (
            <p id="targetDays-error" className="text-[13px] leading-5 text-destructive">
              {errors.targetDays}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
