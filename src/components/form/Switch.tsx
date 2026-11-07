import { cn } from '@/lib/utils'

interface SwitchProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  describedBy?: string
}

/** On/off toggle (role="switch"); label it with <label htmlFor={id}> */
export function Switch({ id, checked, onCheckedChange, disabled, describedBy }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      // 44px tall hit area around the 24px track
      className="group relative inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-150 group-focus-visible:ring-3 group-focus-visible:ring-focus-ring',
          checked ? 'bg-primary' : 'bg-input',
        )}
      >
        <span
          className={cn(
            'size-5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  )
}
