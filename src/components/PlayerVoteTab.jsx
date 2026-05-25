import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getMatchPlayers, castPlayerVote, getUserPlayerVotes } from '../lib/supabase'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C } from '../components/UI'
import { formatPlayerRole } from '../lib/playerRoles'
import AuthPromptModal from './AuthPromptModal'

const CATEGORIES = [
  { key: 'man_of_match', label: 'Man of the Match', icon: '👑' },
  { key: 'best_bowler',  label: 'Best Bowler',       icon: '🎳' },
  { key: 'best_catch',   label: 'Best Catch',        icon: '🙌' },
]

export default function PlayerVoteTab({ match, onXPEarned }) {
  const { user } = useAuth()
  const [players, setPlayers]         = useState([])
  const [myVotes, setMyVotes]         = useState({})
  const [activeCategory, setActive]   = useState('man_of_match')
  const [loading, setLoading]         = useState(true)
  const [casting, setCasting]         = useState(false)
  const [loginNotice, setLoginNotice] = useState('')
  const [showLoginPop, setShowLoginPop] = useState(false)

  useEffect(() => {
    async function load() {
      const [mp, uv] = await Promise.all([
        getMatchPlayers(match.id),
        user?.id ? getUserPlayerVotes(user.id, match.id) : Promise.resolve([]),
      ])
      setPlayers(mp)
      const map = {}; uv.forEach(v => { map[v.category] = v.player_id })
      setMyVotes(map); setLoading(false)
    }
    load()
  }, [match.id, user?.id])

  async function handleVote(playerId) {
    if (casting || !match.voting_open) return
    const picked = players.find(({ players: p }) => p.id === playerId)?.players
    trackEvent('fan_arena_player_pick_click', {
      ...matchAnalyticsParams(match, user),
      contest_type: 'player_pick',
      category: activeCategory,
      player_id: playerId,
      player_name: picked?.name,
    })
    if (!user?.id) {
      setLoginNotice('Login to lock player picks and earn XP.')
      setShowLoginPop(true)
      return
    }
    setCasting(true)
    try {
      await castPlayerVote(user.id, match.id, playerId, activeCategory)
      setMyVotes(prev => ({ ...prev, [activeCategory]: playerId }))
      onXPEarned?.()
      trackEvent('fan_arena_player_pick_submitted', {
        ...matchAnalyticsParams(match, user),
        contest_type: 'player_pick',
        category: activeCategory,
        player_id: playerId,
        player_name: picked?.name,
      })
    } catch (e) { alert(e.message) }
    finally { setCasting(false) }
  }

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading players...</div>

  if (!match.voting_open) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
      <p style={{ color: C.muted, fontSize: 14 }}>Voting is closed.</p>
    </div>
  )

  if (players.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
      <p style={{ color: C.muted, fontSize: 14 }}>Player roster not uploaded yet.</p>
    </div>
  )

  const currentCat = CATEGORIES.find(c => c.key === activeCategory)
  const myVoteForCat = myVotes[activeCategory]

  return (
    <div>
      <AuthPromptModal
        open={showLoginPop}
        match={match}
        icon="🏆"
        title="Back your star player"
        message="Good pick. Login to lock your player vote, build your fan profile, and earn XP if your player wins."
        cta="Login & lock pick"
        screen="players"
        trigger="guest_player_pick"
        onClose={() => setShowLoginPop(false)}
      />
      {/* Category tabs */}
      <div style={{ marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setActive(cat.key)} style={{
            display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8, background: activeCategory === cat.key ? `${C.purple}20` : C.card,
            border: `1px solid ${activeCategory === cat.key ? C.purple : C.border}`,
            borderRadius: 14, padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: activeCategory === cat.key ? '#fff' : C.muted }}>
              {cat.icon} {cat.label}
            </span>
            <span style={{ fontSize: 11, color: myVotes[cat.key] ? C.green : C.yellow }}>
              {myVotes[cat.key] ? '✓ Voted' : '+100 XP'}
            </span>
          </button>
        ))}
      </div>

      <p style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
        {currentCat.icon} Pick: {currentCat.label}
      </p>
      {loginNotice && (
        <p style={{ fontSize: 12, color: C.yellow, marginBottom: 12, fontWeight: 700, textAlign: 'center' }}>{loginNotice}</p>
      )}

      {players.map(({ team_side, players: p }) => (
        <button key={p.id} onClick={() => handleVote(p.id)} disabled={casting}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, width: '100%',
            background: myVoteForCat === p.id ? `${C.purple}20` : C.card,
            border: `1px solid ${myVoteForCat === p.id ? C.purple : C.border}`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 8,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: team_side === 'team_a' ? 'rgba(168,85,247,0.2)' : 'rgba(249,115,22,0.2)',
            border: `1px solid ${team_side === 'team_a' ? C.purple : C.orange}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900,
            color: team_side === 'team_a' ? C.purple : C.orange,
          }}>
            {p.jersey_no || p.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{formatPlayerRole(p.role)} · {p.teams?.short_name}</div>
          </div>
          {myVoteForCat === p.id && <span style={{ color: C.green, fontSize: 18 }}>✓</span>}
        </button>
      ))}

      <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 8 }}>
        {user ? '+100 XP if your pick wins. Change anytime before match ends.' : 'You can browse the roster. Login before picking to earn XP.'}
      </p>
    </div>
  )
}
