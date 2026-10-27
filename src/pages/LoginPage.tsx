import { CircleAlertIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FormField } from '@/components/form/FormField'
import { PasswordInput } from '@/components/form/PasswordInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/hooks/useAuth'
import { fieldDescribedBy } from '@/lib/form'
import { validateEmail } from '@/lib/validation'

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function LoginPage() {
  const location = useLocation()
  const loginMutation = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const errors: FieldErrors = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required',
    }
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onError: (error) => {
          if (error.status === 401) {
            setFormError('Invalid email or password.')
            setPassword('')
          } else if (error.status === 400 && error.details.length > 0) {
            setFieldErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])))
          } else {
            setFormError(error.message)
          }
        },
      },
    )
  }

  return (
    <Card className="gap-6 sm:px-2">
      <CardContent className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-page-title">Welcome back</h1>
          <p className="text-muted-foreground">Log in to continue your streak.</p>
        </header>

        {formError ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <FormField id="email" label="Email" error={fieldErrors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email || undefined}
              aria-describedby={fieldDescribedBy('email', { error: fieldErrors.email })}
            />
          </FormField>

          <FormField id="password" label="Password" error={fieldErrors.password}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password || undefined}
              aria-describedby={fieldDescribedBy('password', { error: fieldErrors.password })}
            />
          </FormField>

          <Button type="submit" size="lg" className="mt-2 w-full" loading={loginMutation.isPending}>
            Log in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New to Life OS?{' '}
          {/* Keep `state` so a redirect target survives switching to register */}
          <Link to="/register" state={location.state} className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
