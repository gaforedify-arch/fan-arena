import { useAnimatedBarPct } from '../lib/uiUtils'




export const C = {
  bg: '#07070f', surface: '#0d0d1b', card: '#121220',
  border: 'rgba(255,255,255,0.08)', borderBright: 'rgba(255,255,255,0.14)',
  purple: '#a855f7', purpleDim: 'rgba(168,85,247,0.18)',
  blue: '#3b82f6', blueDim: 'rgba(59,130,246,0.18)',
  orange: '#f97316', orangeDim: 'rgba(249,115,22,0.18)',
  green: '#4ade80', pink: '#ec4899', yellow: '#fbbf24',
  white: '#ffffff', muted: 'rgba(255,255,255,0.42)', dim: 'rgba(255,255,255,0.1)',
  red: '#ef4444',
}

export function Pill({ children, color = C.purple, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}20`, border: `1px solid ${color}50`,
      borderRadius: 99, padding: '3px 10px', fontSize: 9,
      letterSpacing: 2, fontWeight: 700, color, textTransform: 'uppercase', ...style
    }}>
      {children}
    </span>
  )
}

export function Bar({ pct = 0, color, h = 6, delay = 300 }) {
  const w = useAnimatedBarPct(pct, delay)
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: h, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
    </div>
  )
}


export function GlassCard({ children, style = {}, glow, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${glow ? `${glow}35` : C.border}`,
      borderRadius: 20, padding: 16, position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default', ...style
    }}>
      {glow && <div style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, background: `radial-gradient(circle, ${glow}18, transparent 70%)`, borderRadius: '50%' }} />}
      {children}
    </div>
  )
}

export function Btn({ children, color = C.purple, onClick, style = {}, secondary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '15px 0',
      background: disabled ? 'rgba(255,255,255,0.08)' : secondary ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${color}, ${color === C.purple ? C.blue : color})`,
      border: secondary ? `1px solid ${C.border}` : 'none',
      borderRadius: 14, color: disabled ? C.muted : secondary ? C.muted : '#fff',
      fontWeight: 900, fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', letterSpacing: 0.5, ...style
    }}>
      {children}
    </button>
  )
}

export function LiveDot({ color = C.green }) {
  return (
    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 5, animation: 'pulse 1.2s ease-in-out infinite' }} />
  )
}

export function SectionLabel({ children, color = C.muted }) {
  return <div style={{ fontSize: 9, letterSpacing: 3, color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
}

export function Input({ label, type = 'text', value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={maxLength}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '14px 16px', color: '#fff', fontSize: 15,
          fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(168,85,247,0.3)', borderTop: '3px solid #a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export function FullPageCenter({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      {children}
    </div>
  )
}
