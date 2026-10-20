import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeToggle } from '@/hooks/useThemeToggle'

export function ThemeToggle() {
  const { isDark, toggle } = useThemeToggle()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-muted-foreground"
    >
      {isDark ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
    </Button>
  )
}
