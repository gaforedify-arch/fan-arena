import { C } from './UI'

const PALETTE = [C.purple, C.blue, C.orange, C.green, C.pink, C.yellow]

function hashName(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % PALETTE.length
  return h
}

export default function FanAvatar({ name, size = 40, emoji }) {
  const color = PALETTE[hashName(name)]
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}55, ${color}22)`,
        border: `2px solid ${color}80`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 900,
        color: '#fff',
        flexShrink: 0,
      }}
      aria-hidden
    >
      {emoji || initial}
    </div>
  )
}
