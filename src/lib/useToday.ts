import { useEffect, useState } from 'react'
import { dateKey } from './game'

export function useToday() {
  const [today, setToday] = useState(() => dateKey())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      const now = new Date()
      setToday(dateKey(now))
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
