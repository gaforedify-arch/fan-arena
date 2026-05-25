import { C } from './UI'

const GROWTH_STUDIO_URL = 'https://growthsystems.edifyexternship.com/'

export default function GrowthStudioAd({ onClick }) {
  return (
    <a
      href={GROWTH_STUDIO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="growth-studio-ad"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '12px 14px',
        borderRadius: 14,
        border: `1px solid ${C.green}45`,
        background: `linear-gradient(135deg, ${C.green}18, rgba(255,255,255,0.04))`,
        color: '#fff',
        textDecoration: 'none',
        boxShadow: `0 12px 26px ${C.green}12`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 46,
          height: 34,
          borderRadius: 10,
          background: '#050505',
          border: `1px solid ${C.red}45`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <img
          src="/promos/growth-studio-logo.jpeg"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 9, color: C.green, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>
          Sponsored
        </span>
        <span style={{ display: 'block', fontSize: 12, color: '#fff', fontWeight: 800, lineHeight: 1.45 }}>
          Today's ads sponsored by Growth Studio - connect to grow your business digitally
        </span>
      </span>
      <span style={{ color: C.green, fontSize: 18, fontWeight: 900, flexShrink: 0 }}>&gt;</span>
    </a>
  )
}
