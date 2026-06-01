import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  castTeamVote,
  getUserVote,
  getVoteCounts,
  getPredictionQuestions,
  getReactionCounts,
  getLeaderboard,
  getUserRank,
  getQuizQuestions,
} from '../lib/supabase'
import { formatArenaStatusPill, formatMatchEventLine } from '../lib/matchLabel'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { getTournamentEndDate, isBonusWindow, buildReferralLink } from '../lib/referral'
import { C, Pill, LiveDot, GlassCard } from '../components/UI'
import FanAvatar from '../components/FanAvatar'
import EdifyPromoBanner from '../components/EdifyPromoBanner'
import GrowthStudioAd from '../components/GrowthStudioAd'
import TeamLogo from '../components/TeamLogo'
import PlayMoreGamesSheet from '../components/PlayMoreGamesSheet'
import ScholarshipTeaserCard from '../components/ScholarshipTeaserCard'
import ScholarshipStatusCard from '../components/ScholarshipStatusCard'

const PODIUM_EMOJI = ['🦁', '🦊', '🐱']
const REACTION_EMOJI = {
  fire: '🔥',
  king: '👑',
  choke: '💀',
  robbed: '😭',
}

const MAX_TEAM_VOTES = 10
const MAX_GUEST_TEAM_VOTES = 3
const CROWD_TICK_MS = 14_000

function stableNumber(value) {
  return String(value || 'match').split('').reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0
  }, 0)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function guestVoteKey(matchId) {
  return `fan-arena-guest-vote-${matchId}`
}

function guestVoteCountKey(matchId) {
  return `fan-arena-guest-vote-count-${matchId}`
}

function crowdVoteKey(matchId) {
  return `fan-arena-crowd-votes-${matchId}`
}

function getCrowdConfig(matchId) {
  const seed = stableNumber(matchId)
  return {
    start: 620 + (seed % 261),
    cap: 1000 + (seed % 501),
    pctA: 46 + ((seed >> 3) % 9),
  }
}

function readCrowdVotes(matchId) {
  const config = getCrowdConfig(matchId)
  if (typeof window === 'undefined') return config.start

  try {
    const saved = JSON.parse(localStorage.getItem(crowdVoteKey(matchId)) || 'null')
    const savedValue = typeof saved?.value === 'number' ? saved.value : config.start
    const savedAt = typeof saved?.updatedAt === 'number' ? saved.updatedAt : Date.now()
    const elapsedTicks = Math.max(0, Math.floor((Date.now() - savedAt) / CROWD_TICK_MS))
    const catchUp = Math.min(24, elapsedTicks)

    return clamp(savedValue + catchUp, config.start, config.cap)
  } catch {
    return config.start
  }
}

function readCrowdPctA(matchId) {
  const config = getCrowdConfig(matchId)
  if (typeof window === 'undefined') return config.pctA

  try {
    const saved = JSON.parse(localStorage.getItem(crowdVoteKey(matchId)) || 'null')
    return clamp(typeof saved?.pctA === 'number' ? saved.pctA : config.pctA, 42, 58)
  } catch {
    return config.pctA
  }
}

function saveCrowdVotes(matchId, value, pctA) {
  if (typeof window === 'undefined') return

  localStorage.setItem(crowdVoteKey(matchId), JSON.stringify({
    value,
    pctA,
    updatedAt: Date.now(),
  }))
}

function addVoteToCounts(counts, team, amount = 1) {
  const previousTotal = counts.total || 0
  const currentA = typeof counts.team_a === 'number' ? counts.team_a : Math.round(previousTotal * (counts.pct_a || 0) / 100)
  const currentB = typeof counts.team_b === 'number' ? counts.team_b : Math.max(0, previousTotal - currentA)
  const nextA = currentA + (team === 'team_a' ? amount : 0)
  const nextB = currentB + (team === 'team_b' ? amount : 0)
  const total = nextA + nextB || 1

  return {
    team_a: nextA,
    team_b: nextB,
    total,
    pct_a: Math.round((nextA / total) * 100),
    pct_b: Math.round((nextB / total) * 100),
  }
}

function HubCard({ icon, title, sub, badge, badgeColor, onClick, glow }) {
  return (
    <button type="button" className="hub-card" onClick={onClick} style={{ '--hub-glow': glow || C.purple }}>
      <div className="hub-card-icon">{icon}</div>
      <div className="hub-card-title">{title}</div>
      <div className="hub-card-sub">{sub}</div>
      {badge && (
        <span
          className="hub-card-badge"
          style={{
            background: `${badgeColor || C.purple}25`,
            color: badgeColor || C.purple,
            borderColor: `${badgeColor || C.purple}50`,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

function teamDisplayName(team) {
  return team?.name || team?.short_name || 'TBA'
}

export default function ArenaHubPage({ match, onNavigate, onLogout }) {
  const { user, profile } = useAuth()
  const isT20 = match?.sport === 'ipl'
  const [votePct, setVotePct] = useState({ pct_a: 50, pct_b: 50, total: 0 })
  const [qCount, setQCount] = useState(0)
  const [reactTotal, setReactTotal] = useState(0)
  const [topFans, setTopFans] = useState([])
  const [quizCount, setQuizCount] = useState(0)
  const [voted, setVoted] = useState(null)
  const [voteCount, setVoteCount] = useState(0)
  const [guestVote, setGuestVote] = useState(null)
  const [castingVote, setCastingVote] = useState(false)
  const [voteBurst, setVoteBurst] = useState([])
  const [voteFlash, setVoteFlash] = useState('')
  const [showGames, setShowGames] = useState(false)
  const [rank, setRank] = useState(null)
  const [showUnlock, setShowUnlock] = useState(false)
  const [showVoteResult, setShowVoteResult] = useState(false)
  const [bonusEnd, setBonusEnd] = useState(null)
  const [countdown, setCountdown] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [crowdVotes, setCrowdVotes] = useState(() => readCrowdVotes(match.id))
  const [crowdPctA, setCrowdPctA] = useState(() => readCrowdPctA(match.id))
  const [scholarshipOptedIn, setScholarshipOptedIn] = useState(() => localStorage.getItem('scholarship_opted_in') === 'true')

  const hasVoted = !!voted
  const crowdCap = getCrowdConfig(match.id).cap
  const realActivity = (votePct.total || 0) + reactTotal
  const activeFans = Math.max(realActivity, clamp(crowdVotes + realActivity, 0, crowdCap))
  const displayTeamA = Math.round(crowdVotes * (crowdPctA / 100)) + (votePct.team_a || 0)
  const displayTeamB = Math.max(0, crowdVotes - Math.round(crowdVotes * (crowdPctA / 100))) + (votePct.team_b || 0)
  const displayVoteTotal = displayTeamA + displayTeamB

  const teamA = match.team_a
  const teamB = match.team_b
  const teamAName = teamDisplayName(teamA)
  const teamBName = teamDisplayName(teamB)
  const live = match.status === 'live' || match.voting_open
  const selectedTeam = voted === 'team_a' ? teamA : voted === 'team_b' ? teamB : null
  const heatPctA = displayVoteTotal > 0 ? clamp(Math.round((displayTeamA / displayVoteTotal) * 100), 0, 100) : 50
  const heatPctB = 100 - heatPctA
  const selectedPct = voted === 'team_a' ? heatPctA : voted === 'team_b' ? heatPctB : null
  const leaderTeam = heatPctA >= heatPctB ? teamA : teamB
  const trailingTeam = heatPctA >= heatPctB ? teamB : teamA
  const leadGap = Math.abs(heatPctA - heatPctB)
  const leaderPct = Math.max(heatPctA, heatPctB)
  const displayFanWave = activeFans
  const missionItems = [
    { label: 'Vote', done: !!voted, xp: '+100 XP', emoji: '🗳️' },
    { label: 'Play game', done: showUnlock, xp: '+100 XP', emoji: '🎮' },
    { label: 'Quiz', done: false, xp: '+100 XP', emoji: '📝' },
    { label: 'Refer', done: false, xp: '+200 XP', emoji: '🔗' },
  ]
  const missionDone = missionItems.filter(item => item.done).length
  const activityFeed = [
    {
      id: 'crowd',
      title: `${displayFanWave.toLocaleString()} fan wave moving`,
      body: leaderTeam
        ? `${teamDisplayName(leaderTeam)} momentum ahead by ${leadGap}% - ${teamDisplayName(trailingTeam) || 'opponents'} can still push back`
        : 'Crowd meter is warming up',
      tag: 'HEAT',
    },
    {
      id: 'vote',
      title: `${displayFanWave.toLocaleString()} fan votes moving`,
      body: voted ? `You backed ${teamDisplayName(selectedTeam) || 'your team'} - boost them again` : 'Pick a team to join the fan battle',
      tag: voted ? 'YOU' : 'VOTE',
    },
    {
      id: 'react',
      title: reactTotal > 0 ? `${reactTotal.toLocaleString()} reactions sent` : 'Reaction wave ready',
      body: 'Tap React Live when the match gets heated',
      tag: 'HOT',
    },
    ...topFans.slice(0, 2).map((fan, i) => ({
      id: `fan-${fan.id}`,
      title: `${fan.name} is #${i + 1}`,
      body: `${fan.total_xp?.toLocaleString() || 0} XP on the leaderboard`,
      tag: 'XP',
    })),
  ]

  function fmtCountdown(endStr) {
    if (!endStr) return ''
    const diff = new Date(endStr) - Date.now()
    if (diff <= 0) return 'ENDED'
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    const s = Math.floor((diff % 60_000) / 1_000)
    if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h left`
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function getShareLink(source = '') {
    const code = profile?.ref_code || ''
    return code ? buildReferralLink(code, match.slug, source) : window.location.href
  }

  function handleShareWhatsApp() {
    const code = profile?.ref_code || ''
    const link = getShareLink('whatsapp')
    const text = `🏏 I just voted on Fan Arena!${code ? ` Join me — use my code *${code}* when you sign up and we both earn XP!` : ' Come vote and earn XP!'}\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function handleShareCopy() {
    try {
      await navigator.clipboard.writeText(getShareLink('copy_link'))
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2200)
    } catch { /* ignore */ }
  }

  function handleShareStory() {
    const code = profile?.ref_code || ''
    const link = getShareLink('story_share')
    const text = `🏏 I'm on Fan Arena!${code ? ` Use my code ${code} to earn XP!` : ''} Come vote live!\n${link}`
    if (navigator.share) {
      navigator.share({ title: 'Fan Arena', text, url: link }).catch(() => {})
    } else {
      handleShareCopy()
    }
  }

  function trackHubNav(destination) {
    trackEvent('fan_arena_home_card_click', {
      ...matchAnalyticsParams(match, user),
      destination,
    })
    onNavigate(destination)
  }

  function openScholarship() {
    if (voted) sessionStorage.setItem(`team_voted_${match.slug}`, voted)
    onNavigate('scholarship')
  }

  function voteParams(team) {
    const selected = team === 'team_a' ? teamA : teamB
    return {
      ...matchAnalyticsParams(match, user),
      contest_type: 'team_vote',
      team,
      team_name: selected?.name,
      team_short_name: selected?.short_name,
      source: 'home_first_screen',
    }
  }

  function launchVoteBurst(team, forceRoar = false) {
    const selected = team === 'team_a' ? teamA : teamB
    const pieces = Array.from({ length: forceRoar ? 34 : 14 }).map((_, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      label: forceRoar ? 'ROAR' : '+1',
      x: 8 + Math.random() * 84,
      drift: -36 + Math.random() * 72,
      delay: i * 0.025,
      color: selected?.color_hex || C.green,
    }))

    setVoteBurst(items => [...items.slice(-40), ...pieces])
    setTimeout(() => {
      setVoteBurst(items => items.filter(item => !pieces.some(piece => piece.id === item.id)))
    }, 2200)
  }

  async function handleHubVote(team) {
    if (castingVote || (voted && voted !== team) || voteCount >= MAX_TEAM_VOTES) return
    if (!user?.id && voteCount >= MAX_GUEST_TEAM_VOTES) {
      setShowVoteResult(true)
      setVoteFlash('Login to keep boosting your team')
      return
    }

    trackEvent('fan_arena_vote_click', voteParams(team))
    trackEvent('vote_now_clicked', voteParams(team))
    trackEvent('team_selected', voteParams(team))
    setCastingVote(true)

    try {
      let nextCount = voteCount + 1
      let nextVotes = addVoteToCounts(votePct, team)

      if (!user?.id) {
        if (guestVote && guestVote !== team) return
        if (voteCount >= MAX_GUEST_TEAM_VOTES) {
          setShowVoteResult(true)
          setVoteFlash('Login to keep boosting your team')
          return
        }
        localStorage.setItem(guestVoteKey(match.id), team)
        localStorage.setItem(guestVoteCountKey(match.id), String(nextCount))
        setGuestVote(team)
        trackEvent('fan_arena_guest_vote_saved', voteParams(team))
      } else {
        const saved = await castTeamVote(user.id, match.id, team)
        nextCount = saved.vote_count || nextCount
        nextVotes = await getVoteCounts(match.id)
        getUserRank(user.id).then(setRank).catch(() => {})
        trackEvent('fan_arena_vote_submitted', voteParams(team))
        trackEvent('xp_earned', {
          ...matchAnalyticsParams(match, user),
          xp_amount: 100,
          reason: 'team_vote',
          source: 'home_vote',
        })
      }

      setVoted(team)
      setVoteCount(nextCount)
      setVotePct(nextVotes)
      setShowUnlock(true)
      localStorage.setItem('fan_arena_has_voted', 'true')
      setVoteFlash(`You are with ${team === 'team_a' ? nextVotes.pct_a : nextVotes.pct_b}% fans`)
      setCrowdPctA(current => {
        const nextPct = clamp(current + (team === 'team_a' ? 1 : -1), 42, 58)
        saveCrowdVotes(match.id, crowdVotes, nextPct)
        return nextPct
      })
      launchVoteBurst(team, nextVotes.total > 0 && nextVotes.total % 5 === 0)
      setShowVoteResult(true)
      setTimeout(() => setVoteFlash('Vote again to boost your team'), 5000)
    } catch (err) {
      alert(err.message)
    } finally {
      setCastingVote(false)
    }
  }

  useEffect(() => {
    if (missionDone < 4) return
    const key = `mission_completed_${match.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    trackEvent('mission_completed', {
      ...matchAnalyticsParams(match, user),
      mission_done: missionDone,
      mission_total: missionItems.length,
    })
  }, [match, missionDone, missionItems.length, user])

  useEffect(() => {
    let cancelled = false
    async function loadHubMeta() {
      try {
        const [qs, reactions, leaders, quizzes] = await Promise.all([
          getPredictionQuestions(match.id),
          getReactionCounts(match.id),
          getLeaderboard(3),
          getQuizQuestions(match.id).catch(() => []),
        ])
        if (cancelled) return
        setQCount(qs?.length || 0)
        setQuizCount(quizzes?.length || 0)
        setReactTotal(Object.values(reactions || {}).reduce((a, b) => a + b, 0))
        setTopFans(leaders || [])
      } catch (e) {
        console.error('[ArenaHub] meta', e)
      }
    }
    loadHubMeta()
    const metaTimer = setInterval(loadHubMeta, 60_000)
    return () => {
      cancelled = true
      clearInterval(metaTimer)
    }
  }, [match.id])

  useEffect(() => {
    setCrowdVotes(readCrowdVotes(match.id))
    setCrowdPctA(readCrowdPctA(match.id))

    const crowdTimer = setInterval(() => {
      setCrowdVotes(current => {
        const config = getCrowdConfig(match.id)
        if (current >= config.cap) return current

        const roll = Math.random()
        const bump = roll > 0.92 ? 3 : roll > 0.62 ? 2 : 1
        const next = Math.min(config.cap, current + bump)
        setCrowdPctA(currentPct => {
          const votesForA = Array.from({ length: bump }).filter(() => Math.random() * 100 < currentPct).length
          const votesForB = bump - votesForA
          const shift = votesForA > votesForB ? 1 : votesForB > votesForA ? -1 : 0
          const nextPct = clamp(currentPct + shift, 42, 58)
          saveCrowdVotes(match.id, next, nextPct)
          return nextPct
        })
        return next
      })
    }, CROWD_TICK_MS)

    return () => clearInterval(crowdTimer)
  }, [match.id])

  useEffect(() => {
    let cancelled = false
    async function loadVotes() {
      try {
        const votes = await getVoteCounts(match.id)
        if (cancelled) return
        const savedGuestVote = user?.id ? null : localStorage.getItem(guestVoteKey(match.id))
        const savedGuestCount = savedGuestVote ? Number(localStorage.getItem(guestVoteCountKey(match.id)) || 1) : 0
        setVotePct(savedGuestVote ? addVoteToCounts(votes, savedGuestVote, savedGuestCount) : votes)
      } catch (e) {
        console.error('[ArenaHub] votes', e)
      }
    }
    loadVotes()
    const voteTimer = setInterval(loadVotes, 12_000)
    return () => {
      cancelled = true
      clearInterval(voteTimer)
    }
  }, [match.id, user?.id])

  useEffect(() => {
    if (voted) sessionStorage.setItem(`team_voted_${match.slug}`, voted)
  }, [match.slug, voted])

  useEffect(() => {
    function refreshScholarshipOptIn() {
      setScholarshipOptedIn(localStorage.getItem('scholarship_opted_in') === 'true')
    }

    window.addEventListener('storage', refreshScholarshipOptIn)
    window.addEventListener('focus', refreshScholarshipOptIn)
    return () => {
      window.removeEventListener('storage', refreshScholarshipOptIn)
      window.removeEventListener('focus', refreshScholarshipOptIn)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadUserVote() {
      try {
        const savedGuestVote = user?.id ? null : localStorage.getItem(guestVoteKey(match.id))
        const savedGuestCount = savedGuestVote ? Number(localStorage.getItem(guestVoteCountKey(match.id)) || 1) : 0
        const savedVote = user?.id ? await getUserVote(user.id, match.id) : null
        if (cancelled) return
        setGuestVote(savedGuestVote)
        setVoted(savedVote?.team_picked || savedGuestVote)
        setVoteCount(savedVote?.vote_count || savedGuestCount)
        setShowUnlock(!!(savedVote?.team_picked || savedGuestVote))
        if (savedVote?.team_picked || savedGuestVote) localStorage.setItem('fan_arena_has_voted', 'true')
        if (user?.id) getUserRank(user.id).then(setRank).catch(() => {})
      } catch (e) {
        console.error('[ArenaHub] user vote', e)
      }
    }

    loadUserVote()
    return () => { cancelled = true }
  }, [match.id, user?.id])

  useEffect(() => {
    getTournamentEndDate().then(end => {
      if (end && isBonusWindow(end)) {
        setBonusEnd(end)
        setCountdown(fmtCountdown(end))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!bonusEnd) return
    const t = setInterval(() => {
      const c = fmtCountdown(bonusEnd)
      setCountdown(c)
      if (c === 'ENDED') clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [bonusEnd])

  const winnerName = match.winner_team === 'team_a' ? teamAName : match.winner_team === 'team_b' ? teamBName : null

  return (
    <div className="arena-page arena-hub">

      {isT20 && (
        <div style={{ margin: '-14px -14px 10px', padding: '8px 14px', background: 'rgba(255,255,255,0.6)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => {
              trackEvent('fan_arena_cross_promo_click', { source: 'ipl_hub_header', destination: 'cricket_home' })
              window.location.hash = '#/'
            }}
            style={{ background: 'none', border: 'none', color: '#475569', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Cricket Fan Arena
          </button>
          <p style={{ margin: 0, fontSize: 8, color: '#94a3b8', maxWidth: 220, textAlign: 'right', lineHeight: 1.4 }}>
            Not affiliated with IPL or any cricket league/team
          </p>
        </div>
      )}

      {match.status === 'completed' && winnerName && (
        <div style={{
          margin: '-14px -14px 14px',
          padding: '12px 16px',
          background: 'linear-gradient(90deg, rgba(74,222,128,0.18), rgba(74,222,128,0.06))',
          borderBottom: '1px solid rgba(74,222,128,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <p style={{ margin: 0, color: '#22c55e', fontSize: 13, fontWeight: 900 }}>
            {winnerName} won the match!
          </p>
        </div>
      )}

      {bonusEnd && countdown && countdown !== 'ENDED' && (
        <div style={{
          margin: '-14px -14px 14px',
          padding: '10px 16px',
          background: 'linear-gradient(90deg, rgba(251,191,36,0.18), rgba(249,115,22,0.12))',
          borderBottom: '1px solid rgba(251,191,36,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <p style={{ margin: 0, color: '#fbbf24', fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>2× XP ON ALL GAMES</p>
              <p style={{ margin: 0, color: '#888', fontSize: 9 }}>Vote · Quiz · Predictions · Referrals</p>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, color: '#888', fontSize: 8, fontWeight: 700, letterSpacing: 1 }}>ENDS IN</p>
            <p style={{ margin: 0, color: '#fbbf24', fontSize: 18, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 1 }}>{countdown}</p>
          </div>
        </div>
      )}

      <section className="hub-mission-panel hub-mission-panel-after-vote" style={{
        margin: '0 0 14px',
        padding: '14px 14px 12px',
        borderRadius: 16,
        border: `1px solid ${C.purple}50`,
        background: `linear-gradient(145deg, ${C.purple}15, rgba(255,255,255,0.04))`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, color: C.purple, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>YOUR MISSION TODAY</p>
            <h3 style={{ margin: '3px 0 0', color: '#fff', fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>4 steps to earn XP</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: missionDone === 4 ? C.green : C.yellow, fontSize: 20, fontWeight: 900 }}>{missionDone}/4</span>
            <p style={{ margin: 0, color: C.muted, fontSize: 9, fontWeight: 900 }}>DONE</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
          {missionItems.map(item => (
            <div
              key={item.label}
              role={item.label === 'Refer' ? 'button' : undefined}
              tabIndex={item.label === 'Refer' ? 0 : undefined}
              onClick={item.label === 'Refer' ? () => onNavigate('referral') : undefined}
              style={{
                borderRadius: 10, padding: '8px 4px', textAlign: 'center',
                border: `1px solid ${item.done ? C.green : item.label === 'Refer' ? C.purple + '60' : C.border}`,
                background: item.done ? `${C.green}15` : item.label === 'Refer' ? `${C.purple}10` : 'rgba(255,255,255,0.04)',
                cursor: item.label === 'Refer' ? 'pointer' : 'default',
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 2 }}>{item.done ? '✅' : item.emoji}</div>
              <p style={{ margin: '0 0 2px', color: item.done ? C.green : item.label === 'Refer' ? C.purple : '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1.2 }}>{item.label}</p>
              <p style={{ margin: 0, color: C.green, fontSize: 9, fontWeight: 900 }}>{item.xp}</p>
            </div>
          ))}
        </div>

        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${(missionDone / 4) * 100}%`, background: missionDone === 4 ? C.green : C.purple, transition: 'width 0.6s ease' }} />
        </div>
        {missionDone === 0 && (
          <p style={{ margin: '8px 0 0', color: C.muted, fontSize: 11, textAlign: 'center' }}>Scroll down and vote to begin →</p>
        )}
      </section>

      <header className="hub-header">
        <div className="hub-top-bar">
          <Pill color={live ? C.green : C.purple}>
            {live && <LiveDot color={C.green} />}
            {formatArenaStatusPill(match)}
          </Pill>
          <div className="hub-top-actions">
            <button
              type="button"
              onClick={() => onNavigate('referral')}
              style={{
                background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
                borderRadius: 99, padding: '5px 10px',
                color: '#a855f7', fontFamily: 'inherit', fontSize: 10, fontWeight: 900,
                cursor: 'pointer', letterSpacing: 0.5, flexShrink: 0,
              }}
            >
              🔗 Refer
            </button>
            <div className="hub-xp-chip">
              <span className="hub-xp-label">{user ? 'Your XP' : 'Login'}</span>
              <span className="hub-xp-val">{user ? (profile?.total_xp?.toLocaleString() || 0) : 'Earn XP'}</span>
            </div>
            {user && onLogout && (
              <button type="button" className="logout-btn" onClick={onLogout}>Logout</button>
            )}
            {!user && (
              <button type="button" className="logout-btn" onClick={() => trackHubNav('login')}>Login</button>
            )}
          </div>
        </div>
        <div className="hub-meta-row">
          <span className="hub-greeting">{user ? `Hi, ${profile?.name?.split(' ')[0] || 'Fan'}` : ''}</span>
          <div className="hub-active-fans">
            <span className="hub-active-label">ACTIVE FANS</span>
            <span className="hub-active-val">{activeFans.toLocaleString()}</span>
          </div>
        </div>

        <p className="hub-event-line">{formatMatchEventLine(match)} · {teamAName} vs {teamBName}</p>


        <section className="hub-vote-stage">
          {voteBurst.map(piece => (
            <span
              key={piece.id}
              className="hub-vote-burst"
              style={{
                left: `${piece.x}%`,
                color: piece.color,
                '--vote-drift': `${piece.drift}px`,
                animationDelay: `${piece.delay}s`,
              }}
            >
              {piece.label}
            </span>
          ))}
          <div className="hub-stage-head">
            <div>
              <p className="hub-stage-kicker">Live fan battle</p>
              <h1>Pick your winner</h1>
            </div>
            <div className="hub-mission">
              <span>DONE</span>
              <strong>{missionDone}/4</strong>
            </div>
          </div>

          <div className="hub-war-alert">
            <span>{teamDisplayName(leaderTeam) || 'Fans'} leading</span>
            <strong>{leadGap}% gap</strong>
          </div>

          <div className="hub-match-info-in-vote">
            <div className="hub-top-bar">
              <Pill color={live ? C.green : C.purple}>
                {live && <LiveDot color={C.green} />}
                <span style={{ display: 'block', fontSize: 8, letterSpacing: 0.5 }}>{formatArenaStatusPill(match)}</span>
                <span style={{ display: 'block', fontSize: 10, letterSpacing: 0, fontWeight: 900 }}>
                  {teamA?.short_name} vs {teamB?.short_name}
                </span>
              </Pill>
              <div className="hub-top-actions">
                <button
                  type="button"
                  onClick={() => onNavigate('referral')}
                  style={{
                    background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 99, padding: '5px 10px',
                    color: '#a855f7', fontFamily: 'inherit', fontSize: 10, fontWeight: 900,
                    cursor: 'pointer', letterSpacing: 0.5, flexShrink: 0,
                  }}
                >
                  🔗 Refer
                </button>
                <div className="hub-xp-chip">
                  <span className="hub-xp-label">{user ? 'Your XP' : 'Login'}</span>
                  <span className="hub-xp-val">{user ? (profile?.total_xp?.toLocaleString() || 0) : 'Earn XP'}</span>
                </div>
                {user && onLogout && (
                  <button type="button" className="logout-btn" onClick={onLogout}>Logout</button>
                )}
                {!user && (
                  <button type="button" className="logout-btn" onClick={() => trackHubNav('login')}>Login</button>
                )}
              </div>
            </div>
            <div className="hub-meta-row">
              <span className="hub-greeting">{user ? `Hi, ${profile?.name?.split(' ')[0] || 'Fan'}` : ''}</span>
              <div className="hub-active-fans">
                <span className="hub-active-label">ACTIVE FANS</span>
                <span className="hub-active-val">{activeFans.toLocaleString()}</span>
              </div>
            </div>
            <p className="hub-event-line">{formatMatchEventLine(match)} · {teamAName} vs {teamBName}</p>
          </div>

          <div className="hub-pick-row">
            {[
              { key: 'team_a', team: teamA, pct: votePct.pct_a },
              { key: 'team_b', team: teamB, pct: votePct.pct_b },
            ].map(item => {
              const isPicked = voted === item.key
              const disabled = castingVote || (voted && voted !== item.key) || voteCount >= MAX_TEAM_VOTES
              const color = item.team?.color_hex || (item.key === 'team_a' ? C.purple : C.orange)
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`hub-pick-btn ${live ? 'hub-pick-btn-live' : ''} ${isPicked ? 'hub-pick-btn-picked' : ''}`}
                  onClick={() => handleHubVote(item.key)}
                  disabled={disabled}
                  style={{
                    '--team-color': color,
                    borderColor: isPicked ? color : `${color}55`,
                    boxShadow: isPicked ? `0 0 28px ${color}45` : undefined,
                  }}
                >
                  <TeamLogo team={item.team} size={42} />
                  <span>{teamDisplayName(item.team)}</span>
                  <strong>{item.key === 'team_a' ? heatPctA : heatPctB}%</strong>
                  <small>
                    {isPicked
                      ? user?.id
                        ? `Vote again ${voteCount}/${MAX_TEAM_VOTES}`
                        : voteCount >= MAX_GUEST_TEAM_VOTES
                          ? 'Login to boost more'
                          : `Vote again ${voteCount}/${MAX_GUEST_TEAM_VOTES}`
                      : 'Tap to vote'}
                  </small>
                  {!isPicked && !disabled && (
                    <em style={{ display: 'block', fontStyle: 'normal', color: C.green, fontSize: 9, fontWeight: 900, marginTop: 3 }}>+100 XP</em>
                  )}
                </button>
              )
            })}
          </div>

          <div className="hub-battle-meter">
            <div className="hub-crowd-head">
              <span>Live momentum fight</span>
              <strong>{displayFanWave.toLocaleString()} fan wave</strong>
            </div>
            <div className="hub-battle-bar" style={{ '--team-a': teamA?.color_hex || C.purple, '--team-b': teamB?.color_hex || C.orange }}>
              <div className="hub-battle-fill-a" style={{ width: `${heatPctA}%` }} />
              <div className="hub-battle-fill-b" style={{ width: `${heatPctB}%` }} />
              <div className="hub-battle-clash" style={{ left: `${heatPctA}%` }}>VS</div>
            </div>
            <div className="hub-battle-labels">
              <span>{teamAName} {heatPctA}%</span>
              <strong>{teamDisplayName(leaderTeam)} holds {leaderPct}%</strong>
              <span>{heatPctB}% {teamBName}</span>
            </div>
          </div>

          <div className="hub-vote-feedback">
            {voteFlash || (voted ? `You backed ${teamDisplayName(selectedTeam)}` : 'One tap starts the game')}
            {selectedPct !== null && <span>{selectedPct}% crowd support</span>}
          </div>

          {rank && (
            <div className="hub-rank-move">You moved to #{rank}</div>
          )}
        </section>

      </header>

      <section className="hub-mission-panel hub-mission-panel-visible" style={{
        margin: '0 0 14px',
        padding: '14px 14px 12px',
        borderRadius: 16,
        border: `1px solid ${C.purple}50`,
        background: `linear-gradient(145deg, ${C.purple}15, rgba(255,255,255,0.04))`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, color: C.purple, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>YOUR MISSION TODAY</p>
            <h3 style={{ margin: '3px 0 0', color: '#fff', fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>4 steps to earn XP</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: missionDone === 4 ? C.green : C.yellow, fontSize: 20, fontWeight: 900 }}>{missionDone}/4</span>
            <p style={{ margin: 0, color: C.muted, fontSize: 9, fontWeight: 900 }}>DONE</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
          {missionItems.map(item => (
            <div
              key={item.label}
              role={item.label === 'Refer' ? 'button' : undefined}
              tabIndex={item.label === 'Refer' ? 0 : undefined}
              onClick={item.label === 'Refer' ? () => onNavigate('referral') : undefined}
              style={{
                borderRadius: 10, padding: '8px 4px', textAlign: 'center',
                border: `1px solid ${item.done ? C.green : item.label === 'Refer' ? C.purple + '60' : C.border}`,
                background: item.done ? `${C.green}15` : item.label === 'Refer' ? `${C.purple}10` : 'rgba(255,255,255,0.04)',
                cursor: item.label === 'Refer' ? 'pointer' : 'default',
              }}
            >
              <div style={{ fontSize: 16, marginBottom: 2 }}>{item.done ? '✅' : item.emoji}</div>
              <p style={{ margin: '0 0 2px', color: item.done ? C.green : item.label === 'Refer' ? C.purple : '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1.2 }}>{item.label}</p>
              <p style={{ margin: 0, color: C.green, fontSize: 9, fontWeight: 900 }}>{item.xp}</p>
            </div>
          ))}
        </div>

        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${(missionDone / 4) * 100}%`, background: missionDone === 4 ? C.green : C.purple, transition: 'width 0.6s ease' }} />
        </div>
        {missionDone === 0 && (
          <p style={{ margin: '8px 0 0', color: C.muted, fontSize: 11, textAlign: 'center' }}>Scroll down and vote to begin →</p>
        )}
      </section>

      {hasVoted && !scholarshipOptedIn && (
        <ScholarshipTeaserCard onClick={openScholarship} />
      )}
      {hasVoted && scholarshipOptedIn && (
        <ScholarshipStatusCard
          onViewDetails={() => onNavigate('scholarship-confirmed')}
        />
      )}

      {showVoteResult && voted && (
        <div className="hub-vote-result" onClick={() => setShowVoteResult(false)}>
          <section className="hub-vote-result-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="hub-result-close" onClick={() => setShowVoteResult(false)}>x</button>
            <div className="hub-result-badge">⚡</div>
            <p className="hub-result-alert">
              {leaderTeam?.id === selectedTeam?.id ? `${selectedTeam?.short_name} still ahead` : `${selectedTeam?.short_name} closing the gap`}
            </p>
            <h2>Your vote pushed<br />{selectedTeam?.short_name} to {selectedPct}%</h2>
            <p>
              {selectedTeam?.short_name} fans are {leaderTeam?.id === selectedTeam?.id ? 'holding the line' : 'surging back'}.
              Every vote moves the crowd fight.
            </p>
            <div className="hub-result-xp">+100 XP energy</div>

            {bonusEnd && countdown && countdown !== 'ENDED' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '6px 0 10px', padding: '7px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10 }}>
                <span style={{ fontSize: 14 }}>⚡</span>
                <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 900 }}>2× XP active</span>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 900, fontFamily: 'monospace', letterSpacing: 1 }}>{countdown}</span>
              </div>
            )}

            <div style={{ margin: '0 0 10px', padding: '10px 12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#a855f7', fontWeight: 900 }}>Earn even more XP</p>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888', lineHeight: 1.4 }}>Refer a friend → earn 200 XP — highest reward in the app</p>
              <button type="button" onClick={() => { setShowVoteResult(false); onNavigate('referral') }} style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8, padding: '6px 14px', color: '#a855f7', fontFamily: 'inherit', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                🔗 Refer now
              </button>
            </div>
            {!user?.id && voteCount >= MAX_GUEST_TEAM_VOTES ? (
              <button type="button" className="hub-result-cta" onClick={() => trackHubNav('login')}>
                Login to keep boosting
              </button>
            ) : (
              <button type="button" className="hub-result-cta" onClick={() => setShowVoteResult(false)}>
                Keep watching the battle
              </button>
            )}
            <div className="hub-result-actions">
              <button type="button" onClick={handleShareWhatsApp}>
                <span style={{ display: 'block', fontSize: 15, marginBottom: 2 }}>💬</span>
                WhatsApp
              </button>
              <button
                type="button"
                onClick={handleShareCopy}
                style={{ color: linkCopied ? '#22c55e' : undefined, borderColor: linkCopied ? '#22c55e40' : undefined }}
              >
                <span style={{ display: 'block', fontSize: 15, marginBottom: 2 }}>{linkCopied ? '✓' : '🔗'}</span>
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
              <button type="button" onClick={handleShareStory}>
                <span style={{ display: 'block', fontSize: 15, marginBottom: 2 }}>📸</span>
                Story
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="hub-section">
        <GrowthStudioAd
          onClick={() => trackEvent('fan_arena_sponsor_ad_click', {
            ...matchAnalyticsParams(match, user),
            sponsor: 'Growth Studio',
            destination: 'growthsystems.edifyexternship.com',
          })}
        />
      </section>

      <div className="hub-primary-actions">
        <HubCard
          icon="🔥"
          title="React Live"
          sub="Send energy · earn XP"
          badge="HOT 🔥"
          badgeColor={C.orange}
          glow={C.orange}
          onClick={() => trackHubNav('react')}
        />
        <HubCard
          icon="▶"
          title="Play More"
          sub={showUnlock ? 'Predictions, quiz, ranks' : 'Vote first to unlock →'}
          badge={showUnlock ? 'OPEN' : 'LOCKED'}
          badgeColor={showUnlock ? C.green : C.muted}
          glow={showUnlock ? C.green : C.purple}
          onClick={() => setShowGames(true)}
        />
      </div>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>Live Activity</h3>
          <button type="button" className="hub-link" onClick={() => trackHubNav('ranks')}>Ranks →</button>
        </div>
        <p style={{ margin: '0 0 10px', color: C.muted, fontSize: 11 }}>Your votes and reactions appear here live</p>
        <div className="hub-activity-feed">
          {activityFeed.map(item => (
            <div key={item.id} className="hub-activity-item">
              <div className="hub-activity-dot" />
              <div className="hub-activity-copy">
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </div>
              <em>{item.tag}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>#EdifyFanMoment</h3>
          <button type="button" className="hub-link" onClick={() => setShowGames(true)}>Games →</button>
        </div>
        <EdifyPromoBanner variant="contest" compact />
      </section>

      <section className="hub-section">
        <div className="hub-section-head">
          <h3>Top Fans Right Now</h3>
          <button type="button" className="hub-link" onClick={() => trackHubNav('ranks')}>See all →</button>
        </div>
        {!rank && (
          <p style={{ margin: '0 0 10px', color: C.muted, fontSize: 11 }}>Cast your first vote to appear on the leaderboard</p>
        )}
        <GlassCard style={isT20 ? {
          background: '#ffffff',
          borderColor: '#dbe5f3',
          boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
        } : undefined}>
          {topFans.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>No rankings yet — be first!</p>
          ) : (
            topFans.map((fan, i) => (
              <div key={fan.id} className="hub-fan-row">
                <span className="hub-fan-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <FanAvatar name={fan.name} size={36} emoji={PODIUM_EMOJI[i]} />
                <span className="hub-fan-name">{fan.name}{user && fan.id === profile?.id ? ' (you)' : ''}</span>
                <span className="hub-fan-xp">{fan.total_xp?.toLocaleString()} XP</span>
              </div>
            ))
          )}
        </GlassCard>
      </section>

      <PlayMoreGamesSheet
        open={showGames}
        onClose={() => setShowGames(false)}
        onNavigate={trackHubNav}
        qCount={qCount}
        quizCount={quizCount}
        rank={rank}
      />

      {/*
        <div className="hub-games-backdrop" onClick={() => setShowGames(false)}>
          <section className="hub-games-sheet" onClick={e => e.stopPropagation()}>
            <div className="hub-games-handle" />
            <div className="hub-section-head">
              <h3>More games</h3>
              <button type="button" className="hub-link" onClick={() => setShowGames(false)}>Close</button>
            </div>
            <div className="hub-grid">
              <HubCard
                icon="🎯"
                title="Predict"
                sub="Win XP + badges"
                badge={qCount > 0 ? `${qCount} OPEN` : 'SOON'}
                badgeColor={C.blue}
                glow={C.blue}
                onClick={() => trackHubNav('predict')}
              />
              <HubCard
                icon="🏆"
                title="Player Picks"
                sub="MOTM & more"
                badge="NEW"
                badgeColor={C.yellow}
                glow={C.yellow}
                onClick={() => trackHubNav('players')}
              />
              <HubCard
                icon="📝"
                title="Quiz"
                sub="Test your knowledge"
                badge={quizCount > 0 ? `${quizCount} Q` : 'SOON'}
                badgeColor={C.purple}
                glow={C.purple}
                onClick={() => trackHubNav('quiz')}
              />
              <HubCard
                icon="🏆"
                title="Ranks"
                sub={rank ? `You are #${rank}` : 'Top fans'}
                badge="LIVE"
                badgeColor={C.green}
                glow={C.green}
                onClick={() => trackHubNav('ranks')}
              />
            </div>
          </section>
        </div>
      */}

    </div>
  )
}
