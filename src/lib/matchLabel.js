/** Zero-padded day/match for display (Day 01, Match 02). */
export function padEventNumber(n) {
  const v = parseInt(n, 10)
  if (Number.isNaN(v) || v < 1) return '01'
  return String(v).padStart(2, '0')
}

const IPL_ROUNDS = [
  { day: 1, label: 'Eliminator' },
  { day: 2, label: 'Qualifier 2' },
  { day: 3, label: 'Final' },
]

export function getIPLRoundLabel(dayNumber) {
  return IPL_ROUNDS.find(r => r.day === dayNumber)?.label || `Round ${dayNumber}`
}

/** Header pill: LIVE · ELIMINATOR (IPL) or LIVE · DAY 01 · MATCH 02 (cricket). */
export function formatArenaStatusPill(match) {
  if (!match) return 'UPCOMING'
  const live = match.status === 'live' || match.voting_open
  const status =
    match.status === 'completed' ? 'FINAL' : live ? 'LIVE' : 'UPCOMING'
  if (match.sport === 'ipl') {
    return `${status} · ${getIPLRoundLabel(match.day_number)}`
  }
  const day = padEventNumber(match.day_number)
  const m = padEventNumber(match.match_number)
  return `${status} · DAY ${day} · MATCH ${m}`
}

/** Short subtitle under teams. */
export function formatMatchEventLine(match) {
  if (!match) return ''
  return `Day ${padEventNumber(match.day_number)} · Match ${padEventNumber(match.match_number)}`
}
