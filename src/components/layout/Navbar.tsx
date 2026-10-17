import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

export function Navbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <span className="font-semibold">Life OS</span>
      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      ) : null}
    </header>
  )
}
