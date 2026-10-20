import { FlameIcon, SmileIcon, SparklesIcon } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'

const features = [
  { icon: FlameIcon, label: 'Daily habits & streaks' },
  { icon: SmileIcon, label: 'Mood, energy & sleep check-ins' },
  { icon: SparklesIcon, label: 'Insights that learn from you' },
]

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      {/* Brand panel: full column on desktop, a small header on mobile */}
      <aside className="bg-dot-pattern flex shrink-0 items-center bg-primary-strong px-6 py-4 text-white lg:w-[45%] lg:flex-col lg:items-stretch lg:justify-between lg:p-12">
        <Logo />

        <div className="mx-auto hidden max-w-md lg:block">
          <h2 className="font-heading text-4xl leading-tight font-bold tracking-tight">
            Track your habits. Understand yourself. Live better.
          </h2>
          <ul className="mt-10 flex flex-col gap-5">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-[13px] text-white/60 lg:block">© 2026 Life OS</p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-12">
        <div className="w-full max-w-[400px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
