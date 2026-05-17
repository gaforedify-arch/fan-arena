import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMatchBySlug, getNextMatch } from '../lib/supabase'

export const MATCH_STATE = {
  LOADING: 'loading', ACTIVE: 'active',
  COMPLETED: 'completed', NOT_STARTED: 'not_started',
  NOT_FOUND: 'not_found'
}

const MatchContext = createContext(null)

export function MatchProvider({ slug, children }) {
  const [match, setMatch]           = useState(null)
  const [matchState, setMatchState] = useState(MATCH_STATE.LOADING)
  const [nextMatch, setNextMatch]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  const refreshMatch = useCallback(() => setRefreshTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setLoading(true)
      try {
        if (!slug) {
          const current = await getNextMatch()
          if (cancelled) return
          setNextMatch(current)
          setMatch(current)
          setMatchState(current ? MATCH_STATE.NOT_STARTED : MATCH_STATE.NOT_FOUND)
          return
        }

        const [requested, current] = await Promise.all([
          getMatchBySlug(slug).catch(() => null),
          getNextMatch()
        ])

        if (cancelled) return

        setNextMatch(current)
        if (!requested) {
          setMatchState(MATCH_STATE.NOT_FOUND)
          setMatch(null)
          return
        }

        setMatch(requested)
        if (requested.status === 'completed') setMatchState(MATCH_STATE.COMPLETED)
        else if (requested.status === 'live' || requested.voting_open) setMatchState(MATCH_STATE.ACTIVE)
        else setMatchState(MATCH_STATE.NOT_STARTED)
      } catch {
        if (!cancelled) {
          setMatchState(MATCH_STATE.NOT_FOUND)
          setMatch(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolve()
    const t = setInterval(resolve, 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [slug, refreshTick])


  return (
    <MatchContext.Provider value={{ match, matchState, nextMatch, loading, refreshMatch }}>
      {children}
    </MatchContext.Provider>
  )
}

export function useMatch() { return useContext(MatchContext) }


