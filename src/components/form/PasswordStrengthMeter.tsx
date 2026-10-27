import { getPasswordChecks } from '@/lib/validation'
import { cn } from '@/lib/utils'

const LEVELS = [
  { label: 'Too weak', color: 'bg-destructive' },
  { label: 'Weak', color: 'bg-destructive' },
  { label: 'Fair', color: 'bg-warning' },
  { label: 'Good', color: 'bg-primary' },
  { label: 'Strong', color: 'bg-success' },
]

export function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = getPasswordChecks(password)
  const score = checks.filter((check) => check.passed).length
  const level = LEVELS[score]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {checks.map((check, index) => (
          <span
            key={check.label}
            title={check.label}
            className={cn(
              'h-1.5 rounded-full transition-colors duration-200',
              password && index < score ? level.color : 'bg-muted',
            )}
          />
        ))}
      </div>
      {password ? (
        <p className="text-[13px] leading-5 text-muted-foreground" aria-live="polite">
          <span className="font-medium text-foreground">{level.label}</span>
          {score < 4 ? (
            <>
              {' · Add '}
              {checks
                .filter((check) => !check.passed)
                .map((check) => check.label.toLowerCase())
                .join(', ')}
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}
