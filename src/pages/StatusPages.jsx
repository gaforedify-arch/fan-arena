import { useEffect } from 'react'
import { C, Btn, FullPageCenter, Pill, LiveDot } from '../components/UI'
import { useMatch } from '../hooks/useMatch'

export function formatMatchTime(ts) {
  if (!ts) return 'Time to be announced'
  return new Date(ts).toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function statusLabel(match) {
  if (!match) return 'No match'
  if (match.status === 'live' || match.voting_open) return 'Live now'
  if (match.status === 'completed') return 'Completed'
  return 'Upcoming'
}

function statusColor(match) {
  if (match?.status === 'live' || match?.voting_open) return C.green
  if (match?.status === 'completed') return C.orange
  return C.purple
}

/** Shared screen: teams + scheduled time (no QR, no countdown). */
export function MatchScheduleView({ match, subtitle, onEnter, enterLabel, onRefresh }) {
  if (!match) {
    return (
      <FullPageCenter>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>No matches scheduled</h2>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Check back later. Event staff will publish match times here.
          </p>
        </div>
      </FullPageCenter>
    )
  }

  const teamA = match.team_a?.short_name || match.team_a?.name || 'TBA'
  const teamB = match.team_b?.short_name || match.team_b?.name || 'TBA'
  const live = match.status === 'live' || match.voting_open

  return (
    <FullPageCenter>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: C.purple, fontWeight: 800, marginBottom: 12 }}>
          Edify Sports · Fan Arena
        </div>

        <Pill color={statusColor(match)} style={{ marginBottom: 20 }}>
          {live && <LiveDot color={C.green} />}
          {statusLabel(match)} · Day {match.day_number} · Match {match.match_number}
        </Pill>

        <h1 style={{
          fontSize: 28, fontWeight: 900, margin: '0 0 8px', color: '#fff',
        }}>
          {teamA} <span style={{ color: C.muted, fontWeight: 600 }}>vs</span> {teamB}
        </h1>

        <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          {subtitle || (live ? 'Match is live — join below to vote and earn XP.' : 'Scheduled start')}
        </p>

        <div style={{
          background: C.card,
          border: `1px solid ${live ? `${C.green}40` : C.border}`,
          borderRadius: 20,
          padding: '28px 24px',
          marginBottom: 20,
          boxShadow: live ? `0 0 40px ${C.green}15` : 'none',
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 10 }}>
            {live ? 'Match in progress' : 'Starts at'}
          </div>
          <div style={{
            fontSize: live ? 18 : 20,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.45,
          }}>
            {formatMatchTime(match.starts_at)}
          </div>
          {!match.starts_at && (
            <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Admin will confirm the start time shortly.</p>
          )}
        </div>

        {onEnter && (
          <Btn onClick={onEnter} style={{ marginBottom: 12 }}>
            {enterLabel || (live ? 'Enter Fan Arena ⚡' : 'View match')}
          </Btn>
        )}
        {onRefresh && (
          <Btn onClick={onRefresh} secondary>
            Refresh status
          </Btn>
        )}
      </div>
    </FullPageCenter>
  )
}

/** Home: no match slug in URL — show next match schedule. */
export function MatchHomePage() {
  const { match, nextMatch, refreshMatch } = useMatch()
  const m = match || nextMatch

  useEffect(() => {
    if (m?.slug && (m.voting_open || m.status === 'live')) {
      window.location.hash = `/match/${m.slug}`
    }
  }, [m?.slug, m?.voting_open, m?.status])

  function goToMatch() {
    if (!m?.slug) return
    window.location.hash = `/match/${m.slug}`
  }

  return (
    <MatchScheduleView
      match={m}
      subtitle={m?.voting_open || m?.status === 'live'
        ? 'This match is live. Tap below to vote.'
        : 'Your next Edify match'}
      onEnter={m?.slug ? goToMatch : undefined}
      enterLabel={m?.voting_open || m?.status === 'live' ? 'Enter Fan Arena ⚡' : 'Open match page'}
      onRefresh={refreshMatch}
    />
  )
}

/** Match exists but not live yet — show schedule only. */
export function WaitingPage({ match }) {
  const { refreshMatch } = useMatch()

  useEffect(() => {
    if (match?.slug && (match.voting_open || match.status === 'live')) {
      refreshMatch()
    }
  }, [match?.slug, match?.voting_open, match?.status, refreshMatch])

  return (
    <MatchScheduleView
      match={match}
      subtitle="Voting opens when event staff marks the match live."
      onRefresh={refreshMatch}
    />
  )
}

// ── REDIRECT PAGE ─────────────────────────────────────────────
export function RedirectPage({ match, nextMatch }) {
  function goNext() {
    if (!nextMatch?.slug) return
    window.location.hash = `/match/${nextMatch.slug}`
  }

  return (
    <FullPageCenter>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 380 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🏁</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Match over</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {match?.team_a?.short_name} vs {match?.team_b?.short_name} has ended.
          {match?.winner_team && (
            <> <strong style={{ color: '#fff' }}>
              {match.winner_team === 'team_a' ? match.team_a?.name : match.team_b?.name}
            </strong> won.</>
          )}
        </p>

        {nextMatch ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
            <p style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Next match</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
              {nextMatch.team_a?.short_name || 'TBA'} vs {nextMatch.team_b?.short_name || 'TBA'}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.purple, marginBottom: 20 }}>
              {formatMatchTime(nextMatch.starts_at)}
            </p>
            <Btn onClick={goNext}>Go to next match →</Btn>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Tournament complete</p>
            <p style={{ fontSize: 13, color: C.muted }}>Thanks for playing Fan Arena.</p>
          </div>
        )}
      </div>
    </FullPageCenter>
  )
}

// ── NOT FOUND PAGE ────────────────────────────────────────────
export function NotFoundPage({ nextMatch }) {
  const { refreshMatch } = useMatch()

  function goNext() {
    if (!nextMatch?.slug) return
    window.location.hash = `/match/${nextMatch.slug}`
  }

  if (nextMatch) {
    return (
      <MatchScheduleView
        match={nextMatch}
        subtitle="That link is invalid. Here is the current match:"
        onEnter={goNext}
        enterLabel="Open current match"
        onRefresh={refreshMatch}
      />
    )
  }

  return <MatchScheduleView match={null} onRefresh={refreshMatch} />
}

// Legacy export — same as home
export function NoActiveMatchPage() {
  return <MatchHomePage />
}
