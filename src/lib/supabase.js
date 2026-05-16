import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
export const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`
export const PROFILE_CACHE_KEY = 'fan-arena-profile'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    // Avoid Navigator LockManager races (admin tab + fan tab + HMR).
    lock: async (_name, _timeout, fn) => await fn(),
  },
})

export function getStoredAccessToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.access_token ?? data?.session?.access_token ?? null
  } catch {
    return null
  }
}

export function getStoredAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.user ?? data?.session?.user ?? null
  } catch {
    return null
  }
}

export function readCachedProfile(userId) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const profile = JSON.parse(raw)
    return profile?.id === userId ? profile : null
  } catch {
    return null
  }
}

export function writeCachedProfile(profile) {
  if (profile?.id) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
}

export function clearCachedProfile() {
  localStorage.removeItem(PROFILE_CACHE_KEY)
}

;(async () => {
  try {
    await restRequest('teams', { query: '?select=id&limit=1' })
    console.log('[Supabase] teams connectivity test OK')
  } catch (e) {
    console.log('[Supabase] teams connectivity test FAILED:', e?.message || String(e))
  }
})()

const ADMIN_TIMEOUT_MS = 8000
let useAdminFetch = false

function withTimeout(promise, ms = ADMIN_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ])
}

function restHeaders(prefer) {
  const h = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  }
  if (prefer) h.Prefer = prefer
  return h
}

async function restRequest(table, { method = 'GET', query = '', body, prefer, accessToken } = {}) {
  const headers = restHeaders(prefer)
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || data?.hint || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

async function adminInsert(table, row) {
  const rows = await restRequest(table, {
    method: 'POST',
    body: row,
    prefer: 'return=representation',
  })
  return Array.isArray(rows) ? rows[0] : rows
}

async function adminSelect(table, params = {}) {
  const qs = new URLSearchParams(params)
  const query = qs.toString() ? `?${qs.toString()}` : ''
  const rows = await restRequest(table, { query })
  return rows || []
}

async function adminPatch(table, filterQuery, body) {
  const query = filterQuery.startsWith('?') ? filterQuery : `?${filterQuery}`
  const rows = await restRequest(table, {
    method: 'PATCH',
    query,
    body,
    prefer: 'return=representation',
  })
  return Array.isArray(rows) ? rows[0] : rows
}

async function adminRpc(fn, args) {
  return restRequest(`rpc/${fn}`, { method: 'POST', body: args })
}

const MATCH_EMBED_SELECT =
  '*,team_a:teams!matches_team_a_id_fkey(*),team_b:teams!matches_team_b_id_fkey(*)'

// ─── AUTH ────────────────────────────────────────────────────

export async function sendMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: true,
    }
  })
  if (error) throw error
}

export async function signOut() {
  clearCachedProfile()
  await supabase.auth.signOut()
}

// ─── USER PROFILE ────────────────────────────────────────────

async function userRest(table, { method = 'GET', query = '', body, prefer } = {}) {
  const accessToken = getStoredAccessToken()
  if (!accessToken) throw new Error('Not signed in')
  return restRequest(table, { method, query, body, prefer, accessToken })
}

export async function createProfile({ id, email, name, phone, city, age }) {
  try {
    const rows = await userRest('users', {
      method: 'POST',
      body: { id, email, name, phone, city, age: parseInt(age, 10) },
      prefer: 'return=representation',
    })
    const row = Array.isArray(rows) ? rows[0] : rows
    if (row) writeCachedProfile(row)
    return row
  } catch (e) {
    if (!String(e.message).includes('duplicate') && !String(e.message).includes('23505')) throw e
    const profile = await getProfile(id)
    writeCachedProfile(profile)
    return profile
  }
}

export async function getProfile(userId) {
  const rows = await userRest('users', {
    query: `?select=*&id=eq.${userId}&limit=1`,
  })
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) throw new Error('Profile not found')
  writeCachedProfile(row)
  return row
}

export async function hasProfile(userId) {
  const cached = readCachedProfile(userId)
  if (cached) return true
  try {
    const rows = await userRest('users', {
      query: `?select=id&id=eq.${userId}&limit=1`,
    })
    return Array.isArray(rows) ? rows.length > 0 : !!rows
  } catch {
    return false
  }
}

export async function awardWelcomeXP(userId) {
  const { data: existing } = await supabase
    .from('xp_ledger')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', 'welcome')
    .maybeSingle()
  if (existing) return
  await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_match_id: null,
    p_amount: 50,
    p_reason: 'welcome'
  })
}

// ─── MATCHES ─────────────────────────────────────────────────

export async function getMatchBySlug(slug) {
  const { data, error } = await supabase
    .from('matches')
    .select(`*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)`)
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function getCurrentOrNextMatch() {
  const { data } = await supabase.rpc('get_current_or_next_match')
  if (!data || data.length === 0) return null
  const match = data[0]
  const { data: full } = await supabase
    .from('matches')
    .select(`*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)`)
    .eq('id', match.id)
    .single()
  return full
}

/** Next live or upcoming match — REST fallback if RPC fails. */
export async function getNextMatch() {
  try {
    const m = await getCurrentOrNextMatch()
    if (m) return m
  } catch { /* use REST */ }
  try {
    const rows = await restRequest('matches', {
      query: `?select=${encodeURIComponent(MATCH_EMBED_SELECT)}&order=day_number.asc,match_number.asc`,
    })
    if (!rows?.length) return null
    const live = rows.find(m => m.status === 'live' || m.voting_open)
    if (live) return live
    const upcoming = rows.find(m => m.status === 'upcoming')
    return upcoming || rows[0]
  } catch {
    return null
  }
}

export async function getAllMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select(`*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)`)
    .order('day_number').order('match_number')
  if (error) throw error
  return data || []
}

// ─── VOTES ───────────────────────────────────────────────────

export async function castTeamVote(userId, matchId, teamPicked) {
  const { data, error } = await supabase
    .from('votes')
    .upsert({ user_id: userId, match_id: matchId, team_picked: teamPicked },
      { onConflict: 'user_id,match_id' })
    .select().single()
  if (error) throw error
  return data
}

export async function getUserVote(userId, matchId) {
  const { data } = await supabase
    .from('votes')
    .select('team_picked')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle()
  return data?.team_picked || null
}

export async function getVoteCounts(matchId) {
  const { data } = await supabase
    .from('votes')
    .select('team_picked')
    .eq('match_id', matchId)
  const a = data?.filter(v => v.team_picked === 'team_a').length || 0
  const b = data?.filter(v => v.team_picked === 'team_b').length || 0
  const total = a + b || 1
  return { team_a: a, team_b: b, total: a + b,
    pct_a: Math.round((a / total) * 100),
    pct_b: Math.round((b / total) * 100) }
}

// ─── PREDICTIONS ─────────────────────────────────────────────

export async function getPredictionQuestions(matchId) {
  try {
    const rows = await restRequest('prediction_questions', {
      query: `?select=*&match_id=eq.${matchId}`,
    })
    return rows || []
  } catch {
    const { data } = await supabase
      .from('prediction_questions')
      .select('*')
      .eq('match_id', matchId)
    return data || []
  }
}

export async function submitPrediction(userId, matchId, questionId, answer) {
  const { data, error } = await supabase
    .from('predictions')
    .upsert({ user_id: userId, match_id: matchId, question_id: questionId, answer },
      { onConflict: 'user_id,question_id' })
    .select().single()
  if (error) throw error
  return data
}

export async function getUserPredictions(userId, matchId) {
  const { data } = await supabase
    .from('predictions')
    .select('question_id, answer, is_correct, xp_awarded')
    .eq('user_id', userId)
    .eq('match_id', matchId)
  return data || []
}

// ─── PLAYER VOTES ────────────────────────────────────────────

export async function getMatchPlayers(matchId) {
  const { data } = await supabase
    .from('match_players')
    .select(`team_side, players(id, name, role, jersey_no, teams(name, short_name, color_hex))`)
    .eq('match_id', matchId)
  return data || []
}

export async function castPlayerVote(userId, matchId, playerId, category) {
  const { data, error } = await supabase
    .from('player_votes')
    .upsert({ user_id: userId, match_id: matchId, player_id: playerId, category },
      { onConflict: 'user_id,match_id,category' })
    .select().single()
  if (error) throw error
  return data
}

export async function getUserPlayerVotes(userId, matchId) {
  const { data } = await supabase
    .from('player_votes')
    .select('category, player_id')
    .eq('user_id', userId)
    .eq('match_id', matchId)
  return data || []
}

// ─── REACTIONS ───────────────────────────────────────────────

export async function sendReaction(userId, matchId, type) {
  // Max 20 reactions per user per match
  const { count } = await supabase
    .from('reactions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('match_id', matchId)
  if ((count || 0) >= 20) return { capped: true }

  const { error } = await supabase
    .from('reactions')
    .insert({ user_id: userId, match_id: matchId, type })
  if (error) throw error

  // +5 XP per reaction
  await supabase.rpc('award_xp', {
    p_user_id: userId,
    p_match_id: matchId,
    p_amount: 5,
    p_reason: 'reaction'
  })
  return { capped: false }
}

export async function getReactionCounts(matchId) {
  const { data } = await supabase
    .from('reactions')
    .select('type')
    .eq('match_id', matchId)
  const counts = { fire: 0, king: 0, choke: 0, robbed: 0 }
  data?.forEach(r => { if (counts[r.type] !== undefined) counts[r.type]++ })
  return counts
}

// ─── LEADERBOARD ─────────────────────────────────────────────

export async function getLeaderboard(limit = 20) {
  const { data } = await supabase
    .from('users')
    .select('id, name, total_xp, city')
    .order('total_xp', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getUserRank(userId) {
  const { data: me } = await supabase
    .from('users').select('total_xp').eq('id', userId).single()
  if (!me) return null
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('total_xp', me.total_xp)
  return (count || 0) + 1
}

// ─── ADMIN ───────────────────────────────────────────────────

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildMatchSlug(dayNumber, matchNumber, teamA, teamB) {
  const base = `day-${dayNumber}-match-${matchNumber}`
  const a = teamA?.short_name || teamA?.name
  const b = teamB?.short_name || teamB?.name
  if (a && b) return slugify(`${base}-${a}-vs-${b}`)
  return slugify(base)
}

export async function adminGetAllMatches() {
  const rows = await restRequest('matches', {
    query: `?select=${encodeURIComponent(MATCH_EMBED_SELECT)}&order=day_number.asc,match_number.asc`,
  })
  return rows || []
}

export async function adminCreateMatch(matchData) {
  const teamIds = [matchData.team_a_id, matchData.team_b_id].filter(Boolean)
  let teamA, teamB
  if (teamIds.length) {
    const teams = await restRequest('teams', {
      query: `?select=id,name,short_name&id=in.(${teamIds.join(',')})`,
    })
    const list = teams || []
    teamA = list.find(t => t.id === matchData.team_a_id)
    teamB = list.find(t => t.id === matchData.team_b_id)
  }
  const slug = buildMatchSlug(matchData.day_number, matchData.match_number, teamA, teamB)
  return adminInsert('matches', { ...matchData, slug })
}

export async function adminUpdateMatch(matchId, updates) {
  return adminPatch('matches', `id=eq.${matchId}`, updates)
}

export async function adminGetAllTeams() {
  if (useAdminFetch) {
    return adminSelect('teams', { select: '*', order: 'name.asc' })
  }
  try {
    const { data, error } = await withTimeout(
      supabase.from('teams').select('*').order('name')
    )
    if (error) throw error
    return data || []
  } catch (e) {
    if (e?.message !== 'Request timed out') throw e
    useAdminFetch = true
    return adminSelect('teams', { select: '*', order: 'name.asc' })
  }
}

export async function adminCreateTeam(teamData) {
  if (useAdminFetch) return adminInsert('teams', teamData)

  try {
    const { data, error } = await withTimeout(
      supabase.from('teams').insert(teamData).select().single()
    )
    if (error) throw error
    return data
  } catch (e) {
    if (e?.message !== 'Request timed out') throw e
    useAdminFetch = true
    return adminInsert('teams', teamData)
  }
}

export async function adminGetPlayers(teamId) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
  return data || []
}

export async function adminCreatePlayer(playerData) {
  const { data, error } = await supabase
    .from('players')
    .insert(playerData)
    .select().single()
  if (error) throw error
  return data
}

export async function adminAddMatchPlayer(matchId, playerId, teamSide) {
  const { error } = await supabase
    .from('match_players')
    .upsert({ match_id: matchId, player_id: playerId, team_side: teamSide },
      { onConflict: 'match_id,player_id' })
  if (error) throw error
}

export async function adminCreateQuestion(questionData) {
  return adminInsert('prediction_questions', questionData)
}

export async function adminUpdateQuestion(questionId, updates) {
  return adminPatch('prediction_questions', `id=eq.${questionId}`, updates)
}

export async function adminGetQuestions(matchId) {
  const rows = await restRequest('prediction_questions', {
    query: `?select=*&match_id=eq.${matchId}`,
  })
  return rows || []
}

export async function adminRunPayout(matchId) {
  return adminRpc('payout_match', { p_match_id: matchId })
}

export async function adminGetLeads() {
  const rows = await restRequest('users', {
    query: '?select=name,email,phone,city,age,total_xp,created_at&order=total_xp.desc',
  })
  return rows || []
}
