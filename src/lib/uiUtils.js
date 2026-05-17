// Shared, non-component utilities to avoid react-refresh fast-refresh rule violations.

import { useEffect, useState } from 'react'

export function useAnimatedBarPct(pct, delay = 300) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay)
    return () => clearTimeout(t)
  }, [pct, delay])
  return w
}

