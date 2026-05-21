import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getUserDashboard } from '../lib/supabase'
import { C, GlassCard, SectionLabel, Spinner } from './UI'

function matchLabel(match) {
  if (!match) return 'Match'
  const a = match.team_a?.short_name || 'TBA'
  const b = match.team_b?.short_name || 'TBA'
  return `Day ${match.day_number} Match ${match.match_number} - ${a} vs ${b}`
}

function resultLabel(row) {
  if (row.xp_awarded && row.is_correct === true) return { text: 'Correct', color: C.green }
  if (row.xp_awarded && row.is_correct === false) return { text: 'Settled', color: C.orange }
  return { text: 'Pending', color: C.muted }
}

function ActivityRow({ title, sub, meta, color = C.purple }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ width: 8, height: 8, marginTop: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.35 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}
      </div>
      {meta && <div style={{ fontSize: 11, fontWeight: 900, color, textAlign: 'right', flexShrink: 0 }}>{meta}</div>}
    </div>
  )
}

export default function UserDashboard({ match }) {
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!user?.id)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.id) return
      setLoading(true)
      setError('')
      try {
        const next = await getUserDashboard(user.id)
        if (!cancelled) setData(next)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const activities = useMemo(() => {
    if (!data) return []
    const matches = new Map((data.matches || []).map(m => [m.id, m]))
    const items = []

    for (const vote of data.votes || []) {
      const m = matches.get(vote.match_id)
      const picked = vote.team_picked === 'team_a' ? m?.team_a?.short_name : m?.team_b?.short_name
      items.push({
        title: `Team vote: ${picked || vote.team_picked}`,
        sub: matchLabel(m),
        meta: `${vote.vote_count || 1}/10`,
        color: C.green,
      })
    }

    for (const prediction of data.predictions || []) {
      const state = resultLabel(prediction)
      items.push({
        title: prediction.prediction_questions?.question_text || 'Prediction',
        sub: `${matchLabel(matches.get(prediction.match_id))} - Picked: ${prediction.answer}`,
        meta: state.text,
        color: state.color,
      })
    }

    for (const quiz of data.quizAnswers || []) {
      const state = resultLabel(quiz)
      items.push({
        title: quiz.quiz_questions?.question_text || 'Quiz answer',
        sub: `${matchLabel(matches.get(quiz.match_id))} - Answered: ${quiz.answer}`,
        meta: state.text,
        color: state.color,
      })
    }

    for (const pick of data.playerVotes || []) {
      items.push({
        title: `Player pick: ${pick.players?.name || 'Player'}`,
        sub: `${matchLabel(matches.get(pick.match_id))} - ${pick.category}`,
        meta: 'Saved',
        color: C.blue,
      })
    }

    for (const row of data.ledger || []) {
      items.push({
        title: `XP earned: ${row.reason?.replaceAll('_', ' ') || 'reward'}`,
        sub: row.match_id ? matchLabel(matches.get(row.match_id)) : 'Profile reward',
        meta: `+${row.xp_amount}`,
        color: C.yellow,
      })
    }

    if ((data.reactions || []).length) {
      const counts = data.reactions.reduce((acc, row) => {
        acc[row.type] = (acc[row.type] || 0) + 1
        return acc
      }, {})
      for (const [type, count] of Object.entries(counts)) {
        items.push({
          title: `Reaction: ${type}`,
          sub: 'Live crowd energy',
          meta: `${count}x`,
          color: C.orange,
        })
      }
    }

    return items
  }, [data])

  if (!user?.id) {
    return (
      <div className="arena-page">
        <GlassCard glow={C.purple}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Your Dashboard</h2>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            Login to see your votes, predictions, quiz answers, player picks, reactions, and XP history.
          </p>
          <button type="button" className="edify-promo-btn" onClick={() => { window.location.hash = `#/match/${match.slug}/login` }}>
            Login to view
          </button>
        </GlassCard>
      </div>
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="arena-page">
      <div style={{ marginBottom: 14 }}>
        <SectionLabel color={C.purple}>Dashboard</SectionLabel>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
          {profile?.name || 'Your profile'}
        </h2>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>
          Everything you have done in Fan Arena, in one place.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <GlassCard style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1 }}>TOTAL XP</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.yellow, marginTop: 4 }}>{profile?.total_xp?.toLocaleString() || 0}</div>
        </GlassCard>
        <GlassCard style={{ padding: 14 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1 }}>ACTIVITIES</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{activities.length}</div>
        </GlassCard>
      </div>

      {error && (
        <GlassCard style={{ marginBottom: 12 }}>
          <p style={{ color: C.red, fontSize: 12, lineHeight: 1.5 }}>{error}</p>
        </GlassCard>
      )}

      <GlassCard>
        <SectionLabel>Activity</SectionLabel>
        {activities.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 16 }}>No activity yet. Vote, predict, play quiz, or react live to fill this up.</p>
        ) : (
          activities.map((item, i) => (
            <ActivityRow key={`${item.title}-${i}`} {...item} />
          ))
        )}
      </GlassCard>
    </div>
  )
}
