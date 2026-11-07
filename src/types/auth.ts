export interface User {
  /** BigInt on the server, always a string here — never convert it to a number */
  id: string
  email: string
  name: string | null
  /** IANA timezone, e.g. "Asia/Karachi" */
  timezone: string
  createdAt: string
  preferences: UserPreferences
}

export interface UserPreferences {
  /** Daily in-app reminder on/off */
  remindersEnabled: boolean
  /** "HH:MM", 24h, in the user's own timezone */
  reminderTime: string
  /** Also send the reminder by email (in preview: logged on the server, not sent) */
  emailReminders: boolean
}

/** PATCH /users/me: any subset, at least one field; only changed preference keys are sent */
export interface UserUpdate {
  name?: string | null
  timezone?: string
  preferences?: Partial<UserPreferences>
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse extends AuthTokens {
  user: User
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name?: string
  timezone?: string
}
