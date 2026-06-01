export const MATCH_TABS = [
  'home',
  'vote',
  'predict',
  'react',
  'players',
  'ranks',
  'rewards',
  'quiz',
  'profile',
  'referral',
  'scholarship',
  'scholarship-confirmed',
]

export function parseHash() {
  const parts = window.location.hash.replace('#', '').split('/').filter(Boolean)
  if (parts[0] === 'admin') return { type: 'admin' }
  if (parts[0] === 'premiure-league' || parts[0] === 'premier-league' || parts[0] === 'ipl') return { type: 'ipl' }
  if (parts[0] === 'match' && parts[1]) {
    return { type: 'match', slug: parts[1], tab: parts[2] || 'home' }
  }
  return { type: 'root' }
}

export function arenaPath(slug, tab = 'home') {
  if (!slug) return '#/'
  if (tab === 'home') return `#/match/${slug}/home`
  return `#/match/${slug}/${tab}`
}

export function navigateArena(slug, tab = 'home') {
  window.location.hash = arenaPath(slug, tab)
}
