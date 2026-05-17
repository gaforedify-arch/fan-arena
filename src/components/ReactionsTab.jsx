import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { sendReaction, getReactionCounts } from '../lib/supabase'
import { C, GlassCard, Pill, LiveDot } from '../components/UI'

const BTNS = [
  { id: 'fire',   emoji: '🔥', label: 'FIRE',   color: C.orange },
  { id: 'king',   emoji: '👑', label: 'KING',   color: C.yellow },
  { id: 'choke',  emoji: '💀', label: 'CHOKE',  color: '#6366f1' },
  { id: 'robbed', emoji: '😭', label: 'ROBBED', color: C.pink },
]

function fmt(n) { return n > 999 ? `${(n / 1000).toFixed(1)}K` : n }

export default function ReactionsTab({ match }) {
  const { user } = useAuth()
  const [counts, setCounts]       = useState({ fire: 0, king: 0, choke: 0, robbed: 0 })
  const [particles, setParticles] = useState([])
  const [energy, setEnergy]       = useState(0)
  const [myCount, setMyCount]     = useState(0)
  const [capped, setCapped]       = useState(false)

  useEffect(() => {
    getReactionCounts(match.id).then(c => {
      setCounts(c)
      const total = Object.values(c).reduce((a, b) => a + b, 0)
      setEnergy(Math.min(100, total % 100))
    })
    const t = setInterval(() => getReactionCounts(match.id).then(setCounts), 8_000)
    return () => clearInterval(t)
  }, [match.id])

  async function handleReact(r) {
    if (capped) return
    // Optimistic UI
    setCounts(prev => ({ ...prev, [r.id]: prev[r.id] + 1 }))
    setEnergy(e => Math.min(100, e + 3))
    const burst = Array.from({ length: 3 }).map((_, i) => ({
      id: `${Date.now()}-${i}`, emoji: r.emoji, x: 20 + Math.random() * 60
    }))
    setParticles(p => [...p.slice(-12), ...burst])
    setTimeout(() => setParticles(p => p.filter(px => !burst.find(b => b.id === px.id))), 2000)

    try {
      const result = await sendReaction(user.id, match.id, r.id)
      if (result.capped) { setCapped(true); return }
      setMyCount(c => c + 1)
    } catch { // ignore errors

      // Revert optimistic
      setCounts(prev => ({ ...prev, [r.id]: Math.max(0, prev[r.id] - 1) }))
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: 'fixed', bottom: '35%', left: `${p.x}%`, fontSize: 24, animation: 'floatUp 2s ease-out forwards', pointerEvents: 'none', zIndex: 50 }}>
          {p.emoji}
        </div>
      ))}

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Pill color={C.orange} style={{ marginBottom: 8 }}><LiveDot color={C.orange} />Live Reactions</Pill>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Make your voice heard</h2>
        {capped && <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Max 20 reactions per match reached</p>}
      </div>

      {/* Momentum meter */}
      <GlassCard style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 9, letterSpacing: 2, color: C.orange, fontWeight: 700 }}>⚡ CROWD MOMENTUM</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.orange }}>{energy}<span style={{ fontSize: 10, color: C.muted }}>/100</span></span>
        </div>
        <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${energy}%`, height: '100%', borderRadius: 99, transition: 'width 0.4s', background: `linear-gradient(90deg, ${C.green}, ${C.orange}, #ef4444)` }} />
        </div>
        <p style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: 'center' }}>
          Your reactions: {myCount}/20 · No XP — just for fun
        </p>
      </GlassCard>

      {/* Reaction grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {BTNS.map(r => (
          <button key={r.id} onClick={() => handleReact(r)}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            style={{
              background: `${r.color}14`, border: `2px solid ${r.color}45`,
              borderRadius: 20, padding: '18px 10px', cursor: capped ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5, transition: 'transform 0.1s',
              opacity: capped ? 0.5 : 1,
            }}>
            <span style={{ fontSize: 34 }}>{r.emoji}</span>
            <span style={{ fontSize: 9, letterSpacing: 2, color: r.color, fontWeight: 700 }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{fmt(counts[r.id])}</span>
          </button>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 12 }}>
        Tap to react · Crowd energy only (no points)
      </p>
    </div>
  )
}
