import { useState, useEffect } from 'react'

// Drop-in replacement for useState that persists to localStorage.
// Values survive page refreshes and browser restarts.
// key should be unique per field, e.g. 'swp.initialCorpus'
export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  return [value, setValue]
}
