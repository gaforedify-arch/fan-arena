import { C } from './UI'

const GROWTH_STUDIO_MAILTO = 'mailto:info@edifyexternship.com?subject=i%20want%20to%20grow%20my%20business%20digitally'

export default function GrowthStudioAd({ onClick }) {
  return (
    <a
      href={GROWTH_STUDIO_MAILTO}
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
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `${C.green}22`,
          border: `1px solid ${C.green}45`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        GS
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
