import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>
          Habits, check-ins, and streaks will show up here once the Phase 1 API is wired in.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
