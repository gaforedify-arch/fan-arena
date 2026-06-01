import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { C } from '../components/UI'
import {
  getReferralStats,
  getPassiveXPStats,
  getTopReferrers,
  getTournamentEndDate,
  isBonusWindow,
  buildReferralLink,
} from '../lib/referral'

const XP_BREAKDOWN = [
  { label: 'Refer a friend',        xp: 200, bonus: 400, isReferral: true },
  { label: 'Signup bonus',          xp: 900 },
  { label: 'Correct team vote',     xp: 100 },
  { label: 'Correct prediction',    xp: 100 },
  { label: 'Quiz correct answer',   xp: 100 },
]

export default function ReferralPage({ match }) {
  const { user, profile } = useAuth()
  const slug = match?.slug || ''

  const [stats, setStats]             = useState(null)
  const [passiveStats, setPassive]     = useState(null)
  const [leaders, setLeaders]         = useState([])
  const [tournamentEnd, setTournEnd]  = useState(null)
  const [loading, setLoading]         = useState(true)
  const [copied, setCopied]           = useState(false)
  const [shareErr, setShareErr]       = useState('')

  const refCode = profile?.ref_code || stats?.ref_code || ''
  const referralLink = refCode ? buildReferralLink(refCode, slug, 'referral_page') : ''
  const bonusActive = isBonusWindow(tournamentEnd)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([
      getReferralStats(user.id),
      getTopReferrers(10),
      getTournamentEndDate(),
      getPassiveXPStats(user.id),
    ]).then(([s, l, end, p]) => {
      setStats(s)
      setLeaders(l || [])
      setTournEnd(end)
      setPassive(p)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(refCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareErr('Could not copy — try manually selecting the code.')
    }
  }

  async function handleShare() {
    setShareErr('')
    const text = `Join me on Fan Arena! Use my code ${refCode} when you sign up and we both earn XP. 🏏🔥`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fan Arena — Join with my code', text, url: referralLink })
      } catch (e) {
        if (e?.name !== 'AbortError') setShareErr('Share failed. Try copying the link instead.')
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${referralLink}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setShareErr('Share not supported on this browser. Copy the code manually.')
      }
    }
  }

  // ── Not logged in ────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="arena-page" style={{ textAlign: 'center', paddingTop: 48 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px' }}>Refer & Earn</h2>
        <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Log in to get your personal referral code and start earning XP.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="arena-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <p style={{ color: C.muted, fontSize: 13 }}>Loading...</p>
      </div>
    )
  }

  const myRank = leaders.findIndex(l => l.user_id === user.id)

  return (
    <div className="arena-page" style={{ paddingBottom: 32 }}>

      {/* Bonus window banner */}
      {bonusActive && (
        <div style={{
          margin: '-14px -14px 16px', padding: '14px 16px',
          background: 'linear-gradient(90deg, rgba(251,191,36,0.18), rgba(249,115,22,0.12))',
          borderBottom: `1px solid ${C.yellow}40`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <p style={{ margin: 0, color: C.yellow, fontSize: 13, fontWeight: 900 }}>DOUBLE XP BONUS ACTIVE</p>
            <p style={{ margin: 0, color: C.muted, fontSize: 11 }}>Last 2 days of the tournament — referrals earn 400 XP instead of 200</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🔗</div>
        <h2 style={{ margin: '0 0 4px', color: '#fff', fontSize: 22, fontWeight: 900 }}>Invite & Earn</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          Invite friends · Earn {bonusActive ? '400' : '200'} XP per referral{bonusActive ? ' (2× bonus!)' : ''}
        </p>
      </div>

      {/* Your referral stats — friends, XP, passive XP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Friends referred', value: stats?.referred_count ?? 0,             color: C.purple, icon: '👥' },
          { label: 'Referral XP',      value: `+${stats?.xp_earned ?? 0}`,            color: C.yellow, icon: '⭐' },
          { label: 'Passive XP',       value: `+${passiveStats?.total_passive_xp ?? 0}`, color: C.green, icon: '⚡' },
        ].map(item => (
          <div key={item.label} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '14px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 5 }}>{item.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontWeight: 700, lineHeight: 1.3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* How it works — visual explainer */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))',
        border: `1px solid rgba(168,85,247,0.25)`,
        borderRadius: 18,
        padding: '16px 14px',
        marginBottom: 16,
      }}>
        <p style={{ margin: '0 0 14px', color: '#fff', fontSize: 13, fontWeight: 900, textAlign: 'center' }}>
          How it works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { icon: '📲', step: '1', title: 'Share your code or link', sub: 'Send it on WhatsApp, Instagram, or anywhere' },
            { icon: '✍️', step: '2', title: 'Friend signs up', sub: 'They enter your code or open your link' },
            { icon: '⭐', step: '3', title: `You earn ${bonusActive ? '400' : '200'} XP instantly`, sub: bonusActive ? 'Double XP bonus is live right now!' : 'Highest single XP action in the app' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: i < 2 ? 14 : 0, position: 'relative' }}>
              {/* connector line */}
              {i < 2 && (
                <div style={{
                  position: 'absolute',
                  left: 18,
                  top: 36,
                  width: 2,
                  height: 22,
                  background: 'rgba(168,85,247,0.3)',
                  borderRadius: 99,
                }} />
              )}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: i === 2 && bonusActive
                  ? `linear-gradient(135deg, ${C.yellow}, ${C.orange})`
                  : `linear-gradient(135deg, ${C.purple}, #6d28d9)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, boxShadow: `0 4px 14px rgba(168,85,247,0.3)`,
              }}>
                {item.icon}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: i === 2 && bonusActive ? C.yellow : '#fff', marginBottom: 2 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 12,
          background: bonusActive ? `rgba(251,191,36,0.1)` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${bonusActive ? C.yellow + '40' : 'rgba(255,255,255,0.08)'}`,
          textAlign: 'center',
          fontSize: 12, fontWeight: 700,
          color: bonusActive ? C.yellow : C.muted,
        }}>
          {bonusActive ? '⚡ Double XP active — share now before it ends!' : `Every friend you invite = +${bonusActive ? '400' : '200'} XP for you`}
        </div>
      </div>

      {/* Your code */}
      <div style={{
        background: C.card, border: `1px solid ${bonusActive ? C.yellow + '60' : C.border}`,
        borderRadius: 18, padding: '18px 16px', marginBottom: 14,
        boxShadow: bonusActive ? `0 0 28px ${C.yellow}18` : 'none',
      }}>
        <p style={{ margin: '0 0 10px', color: C.muted, fontSize: 10, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>Your referral code</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.borderBright}`,
            borderRadius: 12, padding: '14px 16px',
            color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: 4, textAlign: 'center',
            fontFamily: 'monospace',
          }}>
            {refCode || '—'}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              border: `1px solid ${copied ? C.green : C.border}`,
              borderRadius: 12, padding: '14px 16px',
              background: copied ? `${C.green}18` : 'rgba(255,255,255,0.06)',
              color: copied ? C.green : C.muted, fontFamily: 'inherit',
              fontSize: 12, fontWeight: 900, cursor: 'pointer', flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <button
          type="button"
          onClick={handleShare}
          style={{
            width: '100%', border: 'none', borderRadius: 14,
            padding: '15px 16px',
            background: bonusActive
              ? `linear-gradient(135deg, ${C.orange}, ${C.yellow})`
              : `linear-gradient(135deg, ${C.purple}, #6d28d9)`,
            color: '#fff', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 900, cursor: 'pointer',
            boxShadow: bonusActive ? `0 6px 24px ${C.orange}40` : `0 6px 24px ${C.purple}40`,
          }}
        >
          📲 Share with friends
        </button>
        {shareErr && <p style={{ margin: '8px 0 0', color: C.red, fontSize: 11, textAlign: 'center' }}>{shareErr}</p>}
      </div>

      {/* Friends activity — passive XP breakdown */}
      {passiveStats?.friends?.length > 0 && (
        <div style={{
          background: `${C.green}0a`, border: `1px solid ${C.green}25`,
          borderRadius: 16, padding: '14px', marginBottom: 14,
        }}>
          <p style={{ margin: '0 0 4px', color: C.green, fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>
            EARNING FROM FRIENDS' ACTIVITY
          </p>
          <p style={{ margin: '0 0 12px', color: C.muted, fontSize: 11, lineHeight: 1.4 }}>
            Every time your friend votes, predicts, or plays quiz — you earn the same XP too.
          </p>
          {passiveStats.friends.map((f, i) => (
            <div key={f.friend_id || i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: `${C.green}20`, border: `1px solid ${C.green}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 900, color: C.green,
              }}>
                {(f.friend_name || 'F')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
                  {f.friend_name || 'Friend'}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                  {f.activity_count} {f.activity_count === 1 ? 'activity' : 'activities'}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.green, flexShrink: 0 }}>
                +{f.xp_total} XP
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no passive XP yet */}
      {(!passiveStats?.friends || passiveStats.friends.length === 0) && (stats?.referred_count ?? 0) > 0 && (
        <div style={{
          background: `${C.green}08`, border: `1px solid ${C.green}20`,
          borderRadius: 16, padding: '14px', marginBottom: 14, textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 4px', color: C.green, fontSize: 10, fontWeight: 900, letterSpacing: 2 }}>
            PASSIVE XP
          </p>
          <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
            Your friends haven't played yet. Once they vote, predict, or answer a quiz — you earn the same XP they do.
          </p>
        </div>
      )}

      {/* XP breakdown */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', color: '#fff', fontSize: 13, fontWeight: 900 }}>XP comparison</p>
        {XP_BREAKDOWN.map((item, i) => {
          const displayXp = item.isReferral && bonusActive ? item.bonus : item.xp
          const maxXp = bonusActive ? 400 : 200
          const pct = Math.round((displayXp / maxXp) * 100)
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: item.isReferral ? '#fff' : C.muted, fontWeight: item.isReferral ? 900 : 600 }}>
                  {item.label}
                  {item.isReferral && bonusActive && (
                    <span style={{ marginLeft: 6, fontSize: 9, color: C.yellow, fontWeight: 900, background: `${C.yellow}18`, border: `1px solid ${C.yellow}40`, borderRadius: 99, padding: '2px 6px' }}>2× BONUS</span>
                  )}
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: item.isReferral ? C.yellow : C.muted }}>+{displayXp} XP</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${pct}%`,
                  background: item.isReferral
                    ? `linear-gradient(90deg, ${C.purple}, ${C.yellow})`
                    : 'rgba(255,255,255,0.2)',
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Top referrers leaderboard */}
      {leaders.length > 0 && (
        <div>
          <p style={{ margin: '0 0 10px', color: '#fff', fontSize: 13, fontWeight: 900 }}>Top referrers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaders.map((l, i) => {
              const isMe = l.user_id === user.id
              return (
                <div key={l.user_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isMe ? `${C.purple}12` : C.card,
                  border: `1px solid ${isMe ? C.purple + '50' : C.border}`,
                  borderRadius: 14, padding: '10px 14px',
                }}>
                  <span style={{ fontSize: 14, width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? C.purple : '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isMe ? 'You' : (l.name || 'Fan')}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{l.referred_count} referred</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: C.yellow, flexShrink: 0 }}>+{l.xp_earned}</span>
                </div>
              )
            })}
          </div>
          {myRank === -1 && (stats?.referred_count ?? 0) === 0 && (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 11, marginTop: 10 }}>
              Refer your first friend to appear here
            </p>
          )}
        </div>
      )}

    </div>
  )
}
