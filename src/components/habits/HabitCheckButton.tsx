import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HabitCheckButtonProps {
  /** Accessible name, e.g. the habit title */
  label: string
  checked: boolean
  onToggle: () => void
  disabled?: boolean
}

/** Round done / not-done toggle */
export function HabitCheckButton({ label, checked, onToggle, disabled }: HabitCheckButtonProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-150 outline-none focus-visible:ring-3 focus-visible:ring-focus-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-transparent hover:border-primary hover:text-primary/40',
      )}
    >
      <CheckIcon className="size-4.5" strokeWidth={3} aria-hidden="true" />
    </button>
  )
}
