import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  id: string
  label: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm leading-5 font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] leading-5 text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] leading-5 text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
