import { useEffect, useState } from 'react'
import {
  adminGetAllMatches, adminCreateMatch, adminUpdateMatch,
  adminGetAllTeams, adminCreateTeam,
  adminGetPlayers, adminCreatePlayer,
  adminGetMatchPlayers, adminAddMatchPlayer, adminRemoveMatchPlayer,
  adminGetQuestions, adminCreateQuestion, adminUpdateQuestion, adminDeleteQuestion,
  adminRunPayout, adminPayQuestionPredictions, adminGetLeads
} from '../lib/supabase'
import { C, GlassCard, Btn, Input, Spinner, SectionLabel } from '../components/UI'
import { PLAYER_ROLES, DEFAULT_PLAYER_ROLE, formatPlayerRole } from '../lib/playerRoles'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'edify2025'
const ADMIN_SESSION_KEY = 'fan-arena-admin-authed'

function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  function attempt() {
    if (pw === ADMIN_PASSWORD) onLogin()
    else setErr('Wrong password')
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 24 }}>🔐 Admin Panel</h2>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
          <Input label="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter admin password" />
          {err && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{err}</p>}
          <Btn onClick={attempt}>Enter Admin</Btn>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1')
  const [section, setSection] = useState('matches')
  const [matches, setMatches] = useState([])
  const [teams, setTeams]     = useState([])

  const [msg, setMsg]         = useState('')

  useEffect(() => {
    if (authed) { loadMatches(); loadTeams() }
  }, [authed])

  async function loadMatches() { setMatches(await adminGetAllMatches()) }
  async function loadTeams()   { setTeams(await adminGetAllTeams()) }

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  function handleAdminLogin() {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
    setAuthed(true)
  }

  function handleAdminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    setAuthed(false)
  }

  if (!authed) return <AdminLogin onLogin={handleAdminLogin} />

  const SECTIONS = [
    { id: 'matches',  label: '📅 Matches' },
    { id: 'teams',    label: '🏏 Teams' },
    { id: 'leads',    label: '📋 Leads' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Sora', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>⚡ Fan Arena Admin</div>
          <div style={{ fontSize: 11, color: C.muted }}>Edify Admin</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {msg && <div style={{ background: `${C.green}20`, border: `1px solid ${C.green}40`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: C.green }}>{msg}</div>}
          <button type="button" className="logout-btn" onClick={handleAdminLogout}>Logout</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: `2px solid ${section === s.id ? C.purple : 'transparent'}`,
            color: section === s.id ? C.purple : C.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {section === 'matches' && <MatchesSection matches={matches} teams={teams} reload={loadMatches} flash={flash} />}
        {section === 'teams'   && <TeamsSection teams={teams} reload={loadTeams} flash={flash} />}
        {section === 'leads'   && <LeadsSection />}
      </div>
    </div>
  )
}

// ── MATCHES SECTION ───────────────────────────────────────────
function matchFanUrl(slug) {
  return `${window.location.origin}${window.location.pathname}#/match/${slug}`
}

function MatchesSection({ matches, teams, reload, flash }) {
  const [creating, setCreating] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({ day_number: '', match_number: '', team_a_id: '', team_b_id: '', starts_at: '' })

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleCreate() {
    if (!form.day_number || !form.match_number || !form.team_a_id || !form.team_b_id) {
      alert('Please fill in day #, match #, and both teams.')
      return
    }
    if (form.team_a_id === form.team_b_id) {
      alert('Team A and Team B must be different.')
      return
    }
    setSaving(true)
    try {
      const created = await adminCreateMatch({
        day_number: parseInt(form.day_number, 10),
        match_number: parseInt(form.match_number, 10),
        team_a_id: form.team_a_id,
        team_b_id: form.team_b_id,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      })
      flash(`Match created! Open: ${created.slug}`)
      setForm({ day_number: '', match_number: '', team_a_id: '', team_b_id: '', starts_at: '' })
      setCreating(false)
      reload()
    } catch (e) {
      alert(e?.message || 'Failed to create match')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(match, field) {
    try {
      await adminUpdateMatch(match.id, { [field]: !match[field] })
      flash(`${field} toggled`)
      reload()
    } catch (e) { alert(e?.message || 'Update failed') }
  }

  async function setStatus(match, status) {
    try {
      await adminUpdateMatch(match.id, { status })
      flash(`Status → ${status}`)
      reload()
    } catch (e) { alert(e?.message || 'Update failed') }
  }

  async function setWinner(match, winner) {
    await adminUpdateMatch(match.id, { winner_team: winner, status: 'completed' })
    flash('Winner set')
    reload()
  }

  async function updateScore(match, scoreA, scoreB, over) {
    await adminUpdateMatch(match.id, { score_a: scoreA, score_b: scoreB, current_over: over })
    flash('Score updated')
  }

  async function runPayout(match) {
    const a = match.team_a?.short_name || 'Team A'
    const b = match.team_b?.short_name || 'Team B'
    const winner = match.winner_team === 'team_a' ? a : match.winner_team === 'team_b' ? b : null
    const msg = winner
      ? `Pay out XP for ${a} vs ${b}?\n\n• +100 XP to fans who voted ${winner}\n• +75 XP for any predictions not paid yet (green ✓ answers)\n\nThis cannot be undone.`
      : `Pay out XP for ${a} vs ${b}?\n\nThis cannot be undone.`
    if (!window.confirm(msg)) return
    try {
      const result = await adminRunPayout(match.id)
      const vp = result.votes_paid ?? 0
      const pp = result.predictions_paid ?? 0
      if (vp === 0 && pp === 0) {
        flash('✓ Payout done — no new XP (fans may already have been paid when you marked correct answers)')
      } else {
        flash(`✓ Paid: ${vp} vote(s) +${100 * vp} XP, ${pp} prediction(s) +${75 * pp} XP`)
      }
    } catch (e) { alert(e.message) }
  }

  const statusColor = { upcoming: C.muted, live: C.green, completed: C.orange }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#fff', margin: 0 }}>Matches</h3>
        <button onClick={() => setCreating(c => !c)} style={{ background: `${C.purple}20`, border: `1px solid ${C.purple}`, borderRadius: 10, padding: '8px 14px', color: C.purple, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          {creating ? 'Cancel' : '+ New Match'}
        </button>
      </div>

      {creating && (
        <GlassCard style={{ marginBottom: 16 }}>
          <SectionLabel>Create New Match</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Day #" type="number" value={form.day_number} onChange={set('day_number')} placeholder="1" />
            <Input label="Match #" type="number" value={form.match_number} onChange={set('match_number')} placeholder="1" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Team A</label>
            <select value={form.team_a_id} onChange={set('team_a_id')} style={selectStyle}>
              <option value="">Select team A</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Team B</label>
            <select value={form.team_b_id} onChange={set('team_b_id')} style={selectStyle}>
              <option value="">Select team B</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Input label="Start time" type="datetime-local" value={form.starts_at} onChange={set('starts_at')} />
          <Btn onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Match'}</Btn>
        </GlassCard>
      )}

      {matches.map(match => (
        <GlassCard key={match.id} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>
                Day {match.day_number} · Match {match.match_number}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                {match.team_a?.short_name || 'TBA'} vs {match.team_b?.short_name || 'TBA'}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => window.open(matchFanUrl(match.slug), '_blank')}
                  style={{ background: 'none', border: 'none', padding: 0, color: C.purple, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
                >
                  {match.slug}
                </button>
                {' · '}<span style={{ color: statusColor[match.status] }}>{match.status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                title="Opens the fan app in a new tab (what spectators see — not admin controls)"
                onClick={() => window.open(matchFanUrl(match.slug), '_blank')}
                style={{ background: `${C.blue}20`, border: `1px solid ${C.blue}40`, borderRadius: 8, padding: '6px 10px', color: C.blue, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
              >
                Fan preview
              </button>
              <button type="button" onClick={() => setSelected(selected === match.id ? null : match.id)}
                style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {selected === match.id ? 'Close' : 'Manage'}
              </button>
            </div>
          </div>

          {selected === match.id && (
            <div>
              {/* Status controls */}
              <SectionLabel>Status</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['upcoming', 'live', 'completed'].map(s => (
                  <button key={s} onClick={() => setStatus(match, s)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${match.status === s ? C.green : C.border}`,
                    background: match.status === s ? `${C.green}20` : 'transparent',
                    color: match.status === s ? C.green : C.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{s}</button>
                ))}
              </div>

              {/* Toggles */}
              <SectionLabel>Voting & Predictions</SectionLabel>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Team vote = Vote tab. Prediction questions = Predict tab (must tap <strong style={{ color: C.blue }}>Open Predictions</strong>).
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button onClick={() => toggle(match, 'voting_open')} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${match.voting_open ? C.green : C.border}`,
                  background: match.voting_open ? `${C.green}20` : 'transparent',
                  color: match.voting_open ? C.green : C.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>{match.voting_open ? '✓ Voting Open' : 'Open Voting'}</button>
                <button onClick={() => toggle(match, 'predictions_open')} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${match.predictions_open ? C.blue : C.border}`,
                  background: match.predictions_open ? `${C.blue}20` : 'transparent',
                  color: match.predictions_open ? C.blue : C.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                }}>{match.predictions_open ? '✓ Predictions Open' : 'Open Predictions'}</button>
              </div>

              {/* Score update */}
              <ScoreUpdater match={match} onSave={updateScore} />

              {/* Winner */}
              {match.status === 'completed' && !match.winner_team && (
                <>
                  <SectionLabel>Set Winner</SectionLabel>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setWinner(match, 'team_a')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${C.purple}`, background: `${C.purple}20`, color: C.purple, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {match.team_a?.short_name} Wins
                    </button>
                    <button onClick={() => setWinner(match, 'team_b')} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${C.orange}`, background: `${C.orange}20`, color: C.orange, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {match.team_b?.short_name} Wins
                    </button>
                  </div>
                </>
              )}

              {match.winner_team && (
                <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: C.green, fontWeight: 700 }}>
                  ✓ Winner: {match.winner_team === 'team_a' ? match.team_a?.name : match.team_b?.name}
                </div>
              )}

              <MatchPlayersManager match={match} flash={flash} />

              {/* Questions */}
              <QuestionsManager match={match} onUpdated={reload} flash={flash} />

              {/* Payout */}
              {match.status === 'completed' && match.winner_team && (
                <>
                  <SectionLabel>Payout</SectionLabel>
                  <button onClick={() => runPayout(match)} style={{
                    width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                    background: `linear-gradient(135deg, ${C.green}, ${C.blue})`,
                    color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    🏆 Run XP Payout
                  </button>
                </>
              )}
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

function ScoreUpdater({ match, onSave }) {
  const [a, setA]   = useState(match.score_a || '')
  const [b, setB]   = useState(match.score_b || '')
  const [ov, setOv] = useState(match.current_over || '')
  return (
    <div style={{ marginBottom: 14 }}>
      <SectionLabel>Live Score</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <input value={a} onChange={e => setA(e.target.value)} placeholder="142/3" style={{ ...inpStyle }} />
        <input value={b} onChange={e => setB(e.target.value)} placeholder="—" style={{ ...inpStyle }} />
        <input value={ov} onChange={e => setOv(e.target.value)} placeholder="14.2 ov" style={{ ...inpStyle }} />
      </div>
      <button onClick={() => onSave(match, a, b, ov)} style={{ marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
        Update Score
      </button>
    </div>
  )
}

function MatchPlayersManager({ match, flash }) {
  const [roster, setRoster] = useState([])
  const [teamPlayers, setTeamPlayers] = useState({ a: [], b: [] })
  const [addId, setAddId] = useState('')
  const [addSide, setAddSide] = useState('team_a')
  const [newP, setNewP] = useState({ name: '', role: DEFAULT_PLAYER_ROLE, jersey_no: '', team_side: 'team_a' })

  async function load() {
    const [inMatch, pa, pb] = await Promise.all([
      adminGetMatchPlayers(match.id),
      adminGetPlayers(match.team_a_id),
      adminGetPlayers(match.team_b_id),
    ])
    setRoster(inMatch)
    setTeamPlayers({ a: pa || [], b: pb || [] })
  }

  useEffect(() => { load() }, [match.id])

  const inMatchIds = new Set(roster.map(p => p.player_id || p.id))
  const poolA = (teamPlayers.a || []).filter(p => !inMatchIds.has(p.id))
  const poolB = (teamPlayers.b || []).filter(p => !inMatchIds.has(p.id))
  const pool = addSide === 'team_a' ? poolA : poolB
  const rosterPoolCount = poolA.length + poolB.length

  async function handleAddExisting() {
    if (!addId) { alert('Select a player'); return }
    try {
      await adminAddMatchPlayer(match.id, addId, addSide)
      flash('Player added to match')
      setAddId('')
      load()
    } catch (e) { alert(e.message) }
  }

  async function handleCreateAndAdd() {
    if (!newP.name.trim()) { alert('Player name required'); return }
    const teamId = newP.team_side === 'team_a' ? match.team_a_id : match.team_b_id
    if (!teamId) { alert('Match needs both teams set'); return }
    try {
      const created = await adminCreatePlayer({
        team_id: teamId,
        name: newP.name.trim(),
        role: newP.role,
        jersey_no: newP.jersey_no ? parseInt(newP.jersey_no, 10) : null,
      })
      await adminAddMatchPlayer(match.id, created.id, newP.team_side)
      flash(`${created.name} added to squad`)
      setNewP({ name: '', role: DEFAULT_PLAYER_ROLE, jersey_no: '', team_side: 'team_a' })
      load()
    } catch (e) { alert(e.message) }
  }

  async function handleRemove(playerId) {
    if (!window.confirm('Remove this player from the match squad?')) return
    try {
      await adminRemoveMatchPlayer(match.id, playerId)
      flash('Removed from match')
      load()
    } catch (e) { alert(e.message) }
  }

  const sideLabel = (side) =>
    side === 'team_a' ? (match.team_a?.short_name || 'Team A') : (match.team_b?.short_name || 'Team B')

  return (
    <div style={{ marginBottom: 14 }}>
      <SectionLabel>Match squad (for player votes &amp; questions)</SectionLabel>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
        <strong>Team roster</strong> (Teams tab) = saved forever for that club.
        <strong> Match squad</strong> (here) = who is playing <em>this</em> game only — fans only see players you add below.
        For the next match, pick them again from <strong>Add from team roster</strong> (no re-typing).
      </p>

      {roster.length === 0 ? (
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>No players in this match yet.</p>
      ) : (
        <div style={{ marginBottom: 10 }}>
          {roster.map(p => (
            <div key={p.player_id || p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1 }}>
                {p.name}
                {p.jersey_no != null && <span style={{ color: C.muted }}> #{p.jersey_no}</span>}
                <span style={{ fontSize: 10, color: C.purple, marginLeft: 6 }}>{sideLabel(p.team_side)}</span>
              </span>
              <span style={{ fontSize: 10, color: C.muted }}>{formatPlayerRole(p.role)}</span>
              <button type="button" onClick={() => handleRemove(p.player_id || p.id)} style={{ ...smallBtn, color: C.red, borderColor: `${C.red}50` }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 10, display: rosterPoolCount > 0 ? 'block' : 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Add from team roster</div>
        <select value={addSide} onChange={e => { setAddSide(e.target.value); setAddId('') }} style={{ ...selectStyle, marginBottom: 8 }}>
          <option value="team_a">{match.team_a?.name || 'Team A'}</option>
          <option value="team_b">{match.team_b?.name || 'Team B'}</option>
        </select>
        <select value={addId} onChange={e => setAddId(e.target.value)} style={{ ...selectStyle, marginBottom: 8 }}>
          <option value="">Select player…</option>
          {pool.map(p => (
            <option key={p.id} value={p.id}>{p.name}{p.jersey_no ? ` #${p.jersey_no}` : ''} · {formatPlayerRole(p.role)}</option>
          ))}
        </select>
        {pool.length === 0 && (
          <p style={{ fontSize: 10, color: C.orange, marginBottom: 8 }}>Everyone on this team is already in the match squad — or add more under Teams tab.</p>
        )}
        <button type="button" onClick={handleAddExisting} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: C.purple, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Add to match</button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Create new player (saved on team + this match)</div>
        <input placeholder="Full name" value={newP.name} onChange={e => setNewP(f => ({ ...f, name: e.target.value }))} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input placeholder="Jersey #" value={newP.jersey_no} onChange={e => setNewP(f => ({ ...f, jersey_no: e.target.value }))} style={inpStyle} />
          <select value={newP.role} onChange={e => setNewP(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
            {PLAYER_ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <select value={newP.team_side} onChange={e => setNewP(f => ({ ...f, team_side: e.target.value }))} style={{ ...selectStyle, marginBottom: 8 }}>
          <option value="team_a">{match.team_a?.name || 'Team A'}</option>
          <option value="team_b">{match.team_b?.name || 'Team B'}</option>
        </select>
        <button type="button" onClick={handleCreateAndAdd} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: C.blue, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Create &amp; add to match</button>
      </div>
    </div>
  )
}

function QuestionsManager({ match, onUpdated, flash }) 
{

  const matchId = match.id
  const [questions, setQuestions]     = useState([])
  const [matchPlayers, setMatchPlayers] = useState([])
  const [adding, setAdding]           = useState(false)
  const [qform, setQForm]             = useState({ question_key: '', question_text: '', options: '', player_id: '' })
  const [editingId, setEditingId] = useState(null)
            const [editForm, setEditForm] = useState({
            question_text: '',
            options: ''
          })

  async function load() {
    const [qs, squad] = await Promise.all([
      adminGetQuestions(matchId),
      adminGetMatchPlayers(matchId),
    ])
    setQuestions(qs)
    setMatchPlayers(squad)
  }

  useEffect(() => { load() }, [matchId])

  function qset(k) { return e => setQForm(f => ({ ...f, [k]: e.target.value })) }

  async function addQuestion() {
    if (!qform.question_key.trim() || !qform.question_text.trim() || !qform.options.trim()) {
      alert('Fill in key, question text, and options.')
      return
    }
    try {
      const opts = [...new Set(qform.options.split(',').map(o => o.trim()).filter(Boolean))]
      if (opts.length < 2) { alert('Add at least 2 unique options.'); return }
      await adminCreateQuestion({
        match_id: matchId,
        question_key: qform.question_key.trim(),
        question_text: qform.question_text.trim(),
        options: opts,
        player_id: qform.player_id || null,
      })
      if (!match.predictions_open) {
        await adminUpdateMatch(matchId, { predictions_open: true })
        flash('Question added — predictions opened for fans')
      } else {
        flash('Question added')
      }
      setAdding(false)
      setQForm({ question_key: '', question_text: '', options: '', player_id: '' })
      load()
      onUpdated()
    } catch (e) { alert(e.message) }
  }

  async function setCorrect(questionId, answer) {
    try {
      await adminUpdateQuestion(questionId, { correct_answer: answer })
      let paid = 0
      try {
        paid = await adminPayQuestionPredictions(questionId)
      } catch {
        // Trigger on DB may have already paid; ignore if RPC not deployed yet
      }
      flash(
        paid > 0
          ? `Correct: "${answer}" — +75 XP to ${paid} fan(s)`
          : `Correct answer set: "${answer}" (green). Fans with this pick get +75 XP.`
      )
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  function startEdit(question) {
  setEditingId(question.id)
  setEditForm({
    question_text: question.question_text,
    options: Array.isArray(question.options)
      ? question.options.join(', ')
      : JSON.parse(question.options).join(', ')
  })
}

async function saveEdit(questionId) {
  try {
    const opts = [...new Set(
      editForm.options
        .split(',')
        .map(o => o.trim())
        .filter(Boolean)
    )]

    if (opts.length < 2) {
      alert('Add at least 2 unique options.')
      return
    }

    await adminUpdateQuestion(questionId, {
      question_text: editForm.question_text,
      options: opts,
    })

    setEditingId(null)
    flash('Question updated')
    load()
  } catch (e) {
    alert(e.message)
  }
}




async function deleteQuestion(questionId) {
  const ok = window.confirm('Delete this question?')
  if (!ok) return

  try {
    await adminDeleteQuestion(questionId)
    flash('Question deleted')
    load()
  } catch (e) {
    alert(e.message)
  }
}

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>Prediction Questions</SectionLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setAdding(a => !a)} style={smallBtn}>{adding ? 'Cancel' : '+ Add'}</button>
        </div>
      </div>
      {!match.predictions_open && questions.length > 0 && (
        <p style={{ fontSize: 11, color: C.orange, marginBottom: 8 }}>
          Fans cannot answer until you tap <strong>Open Predictions</strong> above (or add a new question — we open it automatically).
        </p>
      )}
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
        <strong style={{ color: C.green }}>Correct answer:</strong> tap the right option below — it turns green with ✓.
        Fans who picked that option get <strong style={{ color: C.yellow }}>+75 XP</strong> (only if their pick matches).
        Mark correct before or when you run payout; questions without a green ✓ do not pay prediction XP.
      </p>

      {adding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <input placeholder="Key (e.g. winner)" value={qform.question_key} onChange={qset('question_key')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <input placeholder="Question text" value={qform.question_text} onChange={qset('question_text')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <input placeholder="Options (comma separated)" value={qform.options} onChange={qset('options')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <label style={{ display: 'block', fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 700 }}>Link to player (optional)</label>
          <select value={qform.player_id} onChange={qset('player_id')} style={{ ...selectStyle, marginBottom: 8 }}>
            <option value="">General match question</option>
            {matchPlayers.map(p => (
              <option key={p.player_id || p.id} value={p.player_id || p.id}>
                {p.name}{p.jersey_no ? ` #${p.jersey_no}` : ''}
              </option>
            ))}
          </select>
          {matchPlayers.length === 0 && (
            <p style={{ fontSize: 10, color: C.orange, marginBottom: 8 }}>Add match squad players above first to link questions to a player.</p>
          )}
          <button onClick={addQuestion} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: C.purple, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Add Question</button>
        </div>
      )}

     {questions.map(q => {
  const opts = Array.isArray(q.options)
    ? q.options
    : JSON.parse(q.options)

  return (
    <div
      key={q.id}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          gap: 10,
        }}
      >
        {editingId === q.id ? (
          <input
            value={editForm.question_text}
            onChange={(e) =>
              setEditForm(f => ({
                ...f,
                question_text: e.target.value,
              }))
            }
            style={{ ...inpStyle, flex: 1 }}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              flex: 1,
            }}
          >
            {q.players?.name && (
              <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: C.purple, background: `${C.purple}20`, padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>
                {q.players.name}
              </span>
            )}
            {q.question_text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          {editingId === q.id ? (
            <>
              <button
                onClick={() => saveEdit(q.id)}
                style={{
                  ...smallBtn,
                  background: `${C.green}20`,
                  border: `1px solid ${C.green}`,
                  color: C.green,
                }}
              >
                Save
              </button>

              <button
                onClick={() => setEditingId(null)}
                style={smallBtn}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => startEdit(q)}
                style={{
                  ...smallBtn,
                  border: `1px solid ${C.blue}`,
                  color: C.blue,
                }}
              >
                Edit
              </button>

              <button
                onClick={() => deleteQuestion(q.id)}
                style={{
                  ...smallBtn,
                  border: `1px solid ${C.red}`,
                  color: C.red,
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editingId === q.id && (
        <input
          placeholder="Options (comma separated)"
          value={editForm.options}
          onChange={(e) =>
            setEditForm(f => ({
              ...f,
              options: e.target.value,
            }))
          }
          style={{
            ...inpStyle,
            width: '100%',
            marginBottom: 10,
          }}
        />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opts.map((opt, i) => (
          <button
            key={`${q.id}-${i}`}
            onClick={() => setCorrect(q.id, opt)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: 11,
              border: `1px solid ${
                q.correct_answer === opt
                  ? C.green
                  : C.border
              }`,
              background:
                q.correct_answer === opt
                  ? `${C.green}20`
                  : 'transparent',
              color:
                q.correct_answer === opt
                  ? C.green
                  : C.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight:
                q.correct_answer === opt
                  ? 700
                  : 400,
            }}
          >
            {q.correct_answer === opt ? '✓ ' : ''}
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
})}
    </div>
  )

            
}

// ── TEAMS SECTION ─────────────────────────────────────────────
function TeamRoster({ team, flash }) {
  const [players, setPlayers] = useState([])
  const [open, setOpen] = useState(false)
  const [pf, setPf] = useState({ name: '', role: DEFAULT_PLAYER_ROLE, jersey_no: '' })

  async function load() {
    setPlayers(await adminGetPlayers(team.id))
  }

  useEffect(() => { load() }, [team.id])

  async function addPlayer() {
    if (!pf.name.trim()) { alert('Name required'); return }
    try {
      await adminCreatePlayer({
        team_id: team.id,
        name: pf.name.trim(),
        role: pf.role,
        jersey_no: pf.jersey_no ? parseInt(pf.jersey_no, 10) : null,
      })
      flash(`Player added to ${team.short_name}`)
      setPf({ name: '', role: DEFAULT_PLAYER_ROLE, jersey_no: '' })
      load()
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', color: C.purple, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        {open ? '▼' : '▶'} Roster ({players.length})
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {players.map(p => (
            <div key={p.id} style={{ fontSize: 12, color: '#fff', padding: '4px 0' }}>
              {p.name}{p.jersey_no ? ` #${p.jersey_no}` : ''} · <span style={{ color: C.muted }}>{formatPlayerRole(p.role)}</span>
            </div>
          ))}
          <input placeholder="Player name" value={pf.name} onChange={e => setPf(f => ({ ...f, name: e.target.value }))} style={{ ...inpStyle, width: '100%', marginTop: 8, marginBottom: 6 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input placeholder="Jersey #" value={pf.jersey_no} onChange={e => setPf(f => ({ ...f, jersey_no: e.target.value }))} style={inpStyle} />
            <select value={pf.role} onChange={e => setPf(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
              {PLAYER_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={addPlayer} style={{ ...smallBtn, width: '100%', border: `1px solid ${C.purple}`, color: C.purple }}>+ Add player</button>
        </div>
      )}
    </div>
  )
}

function TeamsSection({ teams, reload, flash }) {
  const [form, setForm]   = useState({ name: '', short_name: '', color_hex: '#a855f7' })
  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function handleCreate() {
    try {
      await adminCreateTeam(form)
      flash('Team created!')
      setForm({ name: '', short_name: '', color_hex: '#a855f7' })
      reload()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        Create teams and rosters here. In <strong>Matches → Manage</strong>, add players to the match squad and link them to live prediction questions.
      </p>
      <GlassCard style={{ marginBottom: 16 }}>
        <SectionLabel>Add Team</SectionLabel>
        <Input label="Team name" placeholder="Mumbai Indians" value={form.name} onChange={set('name')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Short name" placeholder="MI" value={form.short_name} onChange={set('short_name')} />
          <div>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Color</label>
            <input type="color" value={form.color_hex} onChange={set('color_hex')} style={{ width: '100%', height: 46, borderRadius: 12, border: `1px solid ${C.border}`, background: 'none', cursor: 'pointer' }} />
          </div>
        </div>
        <Btn onClick={handleCreate}>Add Team</Btn>
      </GlassCard>

      <GlassCard>
        {teams.map((team, i) => (
          <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < teams.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: team.color_hex, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{team.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{team.short_name}</div>
            </div>
            <TeamRoster team={team} flash={flash} />
          </div>
        ))}
        {teams.length === 0 && <p style={{ color: C.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>No teams yet. Add one above.</p>}
      </GlassCard>
    </div>
  )
}

// ── LEADS SECTION ─────────────────────────────────────────────
function LeadsSection() {
  const [leads, setLeads]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetLeads().then(l => { setLeads(l); setLoading(false) })
  }, [])

  function downloadCSV() {
    const headers = ['Name', 'Email', 'Phone', 'City', 'Age', 'XP', 'Joined']
    const rows = leads.map(l => [l.name, l.email, l.phone || '', l.city || '', l.age || '', l.total_xp, new Date(l.created_at).toLocaleDateString('en-IN')])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `fan-arena-leads-${new Date().toISOString().split('T')[0]}.csv`; a.click()
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ color: '#fff', margin: '0 0 4px' }}>Leads</h3>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{leads.length} total registrations</p>
        </div>
        <button onClick={downloadCSV} style={{ background: `${C.green}20`, border: `1px solid ${C.green}40`, borderRadius: 10, padding: '8px 14px', color: C.green, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⬇ CSV
        </button>
      </div>

      <GlassCard>
        {leads.map((lead, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < leads.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{lead.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>{lead.total_xp} XP</span>
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{lead.email} · {lead.phone} · {lead.city} · Age {lead.age}</div>
          </div>
        ))}
        {leads.length === 0 && <p style={{ color: C.muted, textAlign: 'center', padding: 20, fontSize: 13 }}>No registrations yet.</p>}
      </GlassCard>
    </div>
  )
}

const selectStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 15, fontFamily: "'Sora', sans-serif", outline: 'none' }
const inpStyle    = { background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: "'Sora', sans-serif", outline: 'none', boxSizing: 'border-box' }
const smallBtn    = { background: 'none', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.42)', fontSize: 11, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }
