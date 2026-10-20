import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { PasswordStrengthMeter } from '@/components/form/PasswordStrengthMeter'
import { TimezoneSelect } from '@/components/form/TimezoneSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRegister } from '@/hooks/useAuth'
import { getBrowserTimeZone } from '@/lib/datetime'
import { fieldDescribedBy } from '@/lib/form'
import {
  EMAIL_MAX,
  NAME_MAX,
  PASSWORD_MAX,
  validateEmail,
  validateName,
  validatePassword,
  validateTimeZone,
} from '@/lib/validation'

type Field = 'name' | 'email' | 'password' | 'timezone'

interface Values {
  name: string
  email: string
  password: string
  timezone: string | null
}

function validate(values: Values): Partial<Record<Field, string>> {
  return {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    timezone: validateTimeZone(values.timezone),
  }
}

export function RegisterPage() {
  const location = useLocation()
  const registerMutation = useRegister()
  const [values, setValues] = useState<Values>(() => ({
    name: '',
    email: '',
    password: '',
    timezone: getBrowserTimeZone(),
  }))
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, ReactNode>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const clientErrors = validate(values)

  function errorFor(field: Field): ReactNode {
    if (serverErrors[field]) return serverErrors[field]
    return touched[field] || submitted ? clientErrors[field] : undefined
  }

  function setValue<K extends Field>(field: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
    // A server error refers to the old value, so drop it once the user edits the field.
    setServerErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function markTouched(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(null)
    if (Object.values(clientErrors).some(Boolean)) return

    const name = values.name.trim()
    registerMutation.mutate(
      {
        email: values.email.trim(),
        password: values.password,
        timezone: values.timezone ?? undefined,
        ...(name ? { name } : {}),
      },
      {
        onError: (error) => {
          if (error.status === 409) {
            setServerErrors({
              email: (
                <>
                  This email is already registered.{' '}
                  <Link to="/login" state={location.state} className="font-semibold underline">
                    Log in instead?
                  </Link>
                </>
              ),
            })
          } else if (error.status === 400 && error.details.length > 0) {
            setServerErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])))
          } else {
            setFormError(error.message)
          }
        },
      },
    )
  }

  const errors = {
    name: errorFor('name'),
    email: errorFor('email'),
    password: errorFor('password'),
    timezone: errorFor('timezone'),
  }
  const passwordHint = 'At least 8 characters'
  const timezoneHint = 'Used to decide which day your habits count for.'

  return (
    <Card className="gap-6 sm:px-2">
      <CardContent className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-page-title">Create your Life OS</h1>
          <p className="text-muted-foreground">It takes less than a minute.</p>
        </header>

        {formError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <FormField id="name" label="Name (optional)" error={errors.name}>
            <Input
              id="name"
              autoComplete="name"
              autoFocus
              maxLength={NAME_MAX + 20}
              value={values.name}
              onChange={(e) => setValue('name', e.target.value)}
              onBlur={() => markTouched('name')}
              aria-invalid={!!errors.name || undefined}
              aria-describedby={fieldDescribedBy('name', { error: errors.name })}
            />
          </FormField>

          <FormField id="email" label="Email" error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={EMAIL_MAX + 20}
              value={values.email}
              onChange={(e) => setValue('email', e.target.value)}
              onBlur={() => markTouched('email')}
              aria-invalid={!!errors.email || undefined}
              aria-describedby={fieldDescribedBy('email', { error: errors.email })}
            />
          </FormField>

          <FormField id="password" label="Password" error={errors.password} hint={passwordHint}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={values.password}
              onChange={(e) => setValue('password', e.target.value)}
              onBlur={() => markTouched('password')}
              aria-invalid={!!errors.password || undefined}
              aria-describedby={fieldDescribedBy('password', { error: errors.password, hint: !errors.password })}
            />
            <PasswordStrengthMeter password={values.password} />
          </FormField>

          <FormField id="timezone" label="Timezone" error={errors.timezone} hint={timezoneHint}>
            <TimezoneSelect
              id="timezone"
              value={values.timezone}
              onChange={(zone) => setValue('timezone', zone)}
              onBlur={() => markTouched('timezone')}
              invalid={!!errors.timezone}
              describedBy={fieldDescribedBy('timezone', { error: errors.timezone, hint: !errors.timezone })}
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-2 w-full" loading={registerMutation.isPending}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
