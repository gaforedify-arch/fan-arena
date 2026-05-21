import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getLeaderboard, getUserRank } from '../lib/supabase'
import { C, Pill, Spinner } from '../components/UI'
import FanAvatar from './FanAvatar'

const MEDALS = ['🥇', '🥈', '🥉']
const BADGES = [
  { title: 'Cricket Oracle', icon: '🏟️' },
  { title: 'Stadium Analyst', icon: '📋' },
  { title: 'Chaos Merchant', icon: '🌪️' },
  { title: 'Highlight Hunter', icon: '⚡' },
  { title: 'Super Fan', icon: '🔥' },
  { title: 'Edge Lord', icon: '🎯' },
]
const PODIUM_EMOJI = ['🦁', '🦊', '🐱']
const TABS = ['Top Fans', 'Predictors', 'Most Active', 'Booth']

function badgeFor(i) {
  return BADGES[i % BADGES.length]
}

export default function LeaderboardTab() {
  const { user, profile } = useAuth()
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Top Fans')

  useEffect(() => {
    async function load() {
      try {
        const [lb, rank] = await Promise.all([
          getLeaderboard(20),
          user?.id ? getUserRank(user.id) : Promise.resolve(null),
        ])
        setLeaders(lb || [])
        setMyRank(rank)
      } catch (e) {
        console.error('[Leaderboard]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [user?.id])

  const top3 = leaders.slice(0, 3)
  const rest = leaders.slice(3)
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

  if (loading) return <Spinner />

  return (
    <div className="arena-page ranks-page">
      <div className="ranks-hero">
        <Pill color={C.yellow}>LEADERBOARD</Pill>
        <h1 className="ranks-title">Who&apos;s dominating?</h1>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>Same XP? Earlier fans rank higher (first come, first served).</p>
      </div>

      <div className="ranks-tabs" role="tablist">
        {TABS.map(label => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={activeTab === label}
            className={`ranks-tab ${activeTab === label ? 'ranks-tab-active' : ''}`}
            onClick={() => setActiveTab(label)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab !== 'Top Fans' ? (
        <div className="ranks-coming-soon">
          <p style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '32px 16px' }}>
            {activeTab} rankings coming soon. View <strong style={{ color: '#fff' }}>Top Fans</strong> for live XP standings.
          </p>
        </div>
      ) : (
        <>
          {user && myRank != null && (
            <div className="ranks-my-rank">
              <span>Your rank</span>
              <strong>#{myRank}</strong>
              <span className="ranks-my-xp">{profile?.total_xp?.toLocaleString() || 0} XP</span>
            </div>
          )}

          {podiumOrder.length > 0 && (
            <div className="ranks-podium">
              {podiumOrder.map((fan, i) => {
                const rank = fan === top3[0] ? 1 : fan === top3[1] ? 2 : 3
                const isFirst = rank === 1
                return (
                  <div
                    key={fan.id}
                    className={`podium-slot ${isFirst ? 'podium-slot-first' : ''}`}
                  >
                    <div className="podium-medal">{MEDALS[rank - 1]}</div>
                    <FanAvatar name={fan.name} size={isFirst ? 52 : 44} emoji={PODIUM_EMOJI[rank - 1]} />
                    <div className="podium-name">{fan.name}</div>
                    <div className="podium-xp">{fan.total_xp?.toLocaleString()} XP</div>
                    <div className={`podium-bar podium-bar-${rank}`} />
                  </div>
                )
              })}
            </div>
          )}

          <div className="ranks-list">
            {rest.map((fan, i) => {
              const rank = i + 4
              const badge = badgeFor(rank)
              const isMe = user && fan.id === user.id
              return (
                <div key={fan.id} className={`ranks-row ${isMe ? 'ranks-row-me' : ''}`}>
                  <span className="ranks-row-num">#{rank}</span>
                  <FanAvatar name={fan.name} size={40} />
                  <div className="ranks-row-info">
                    <div className="ranks-row-name">
                      {fan.name}{isMe ? ' (you)' : ''}
                    </div>
                    <div className="ranks-row-badge">
                      {badge.icon} {badge.title}
                    </div>
                  </div>
                  <div className="ranks-row-xp">
                    <div className="ranks-row-xp-val">{fan.total_xp?.toLocaleString()} XP</div>
                    <div className="ranks-row-xp-sub">🏅</div>
                  </div>
                </div>
              )
            })}
            {leaders.length === 0 && (
              <p style={{ color: C.muted, textAlign: 'center', padding: 24 }}>No fans on the board yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

