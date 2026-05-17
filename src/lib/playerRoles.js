/** Values must match Supabase `players_role_check` (lowercase / hyphenated). */
export const PLAYER_ROLES = [
  { value: 'batsman', label: 'Batsman' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'all-rounder', label: 'All-rounder' },
  { value: 'wicketkeeper', label: 'Wicket-keeper' },
]

export const DEFAULT_PLAYER_ROLE = 'batsman'

export function formatPlayerRole(role) {
  const found = PLAYER_ROLES.find(r => r.value === role)
  return found?.label || role || ''
}
