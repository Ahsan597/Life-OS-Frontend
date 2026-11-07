import { useEffect, useState } from 'react'

/** Counts down from a 429's Retry-After so a form can stay disabled until it passes */
export function useRateLimit() {
  const [message, setMessage] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  return {
    message,
    secondsLeft,
    blocked: secondsLeft > 0,
    /** retryAfter in seconds; null when the server didn't say */
    start: (text: string, retryAfter: number | null) => {
      setMessage(text)
      setSecondsLeft(Math.max(0, Math.ceil(retryAfter ?? 0)))
    },
    clear: () => setMessage(null),
  }
}
