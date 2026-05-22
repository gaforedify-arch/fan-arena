import { useState } from 'react'
import { C } from './UI'

export default function TeamLogo({ team, size = 40, className = '', style }) {
  const [failed, setFailed] = useState(false)
  const logoUrl = team?.logo_url && !failed ? team.logo_url : null
  const color = team?.color_hex || C.purple
  const label = team?.short_name || team?.name || 'Team'

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: logoUrl ? 'rgba(255,255,255,0.08)' : color,
        border: `1px solid ${logoUrl ? 'rgba(255,255,255,0.16)' : `${color}80`}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        color: '#fff',
        fontSize: Math.max(10, Math.round(size * 0.28)),
        fontWeight: 900,
        ...style,
      }}
      title={label}
      aria-label={`${label} logo`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: Math.max(3, Math.round(size * 0.1)) }}
        />
      ) : (
        <span>{label.slice(0, 3).toUpperCase()}</span>
      )}
    </span>
  )
}
