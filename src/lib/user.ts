import type { User } from '@/types/auth'

/** Avatar initials: from the name, or the first letter of the email */
export function getInitials(user: Pick<User, 'name' | 'email'>): string {
  const words = user.name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }
  return user.email.charAt(0).toUpperCase()
}
