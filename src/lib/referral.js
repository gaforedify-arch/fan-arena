import { supabase } from './supabase'

const PENDING_REF_KEY = 'fan_arena_pending_ref'

// ─── Capture & store ─────────────────────────────────────────────────

export function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) localStorage.setItem(PENDING_REF_KEY, ref.trim().toUpperCase())
  } catch {}
}

export function getPendingReferralCode() {
  try { return localStorage.getItem(PENDING_REF_KEY) || '' } catch { return '' }
}

export function clearPendingReferralCode() {
  try { localStorage.removeItem(PENDING_REF_KEY) } catch {}
}

// ─── DB calls ────────────────────────────────────────────────────────

export async function processReferral(refCode, newUserId) {
  if (!refCode || !newUserId) return null
  const { data, error } = await supabase.rpc('process_referral', {
    p_referrer_code: refCode,
    p_new_user_id: newUserId,
  })
  if (error) throw error
  return data
}

export async function getReferralStats(userId) {
  const { data, error } = await supabase.rpc('get_referral_stats', {
    p_user_id: userId,
  })
  if (error) throw error
  return data
}

export async function getPassiveXPStats(userId) {
  const { data, error } = await supabase.rpc('get_passive_xp_stats', {
    p_user_id: userId,
  })
  if (error) throw error
  return data
}

export async function getTopReferrers(limit = 10) {
  const { data, error } = await supabase.rpc('get_top_referrers', {
    p_limit: limit,
  })
  if (error) throw error
  return data || []
}

export async function getTournamentEndDate() {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'tournament_end_date')
    .maybeSingle()
  if (error || !data) return null
  return data.value
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function isBonusWindow(tournamentEndDate) {
  if (!tournamentEndDate) return false
  const end = new Date(tournamentEndDate)
  const now = new Date()
  const daysLeft = (end - now) / (1000 * 60 * 60 * 24)
  return daysLeft >= 0 && daysLeft <= 2
}

export function buildReferralLink(refCode, slug, source = '') {
  const base = `${window.location.origin}${window.location.pathname || '/'}`
  const hash = slug ? `#/match/${slug}/home` : ''
  const utms = source
    ? `&utm_source=${source}&utm_medium=referral_share&utm_campaign=friend_referral`
    : ''
  return `${base}?ref=${encodeURIComponent(refCode)}${utms}${hash}`
}
