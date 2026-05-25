import { useEffect, useState } from 'react'
import { C } from './UI'

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function ScholarshipTeaserCard({ onClick }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    gtagEvent('scholarship_teaser_view', { trigger: 'post_vote' })
    const timer = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  function handleClick() {
    gtagEvent('scholarship_teaser_click', {})
    onClick?.()
  }

  return (
    <section
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(8px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        margin: '0 0 14px',
        padding: 14,
        borderRadius: 16,
        border: `1px solid ${C.yellow}80`,
        background: `linear-gradient(145deg, ${C.yellow}18, rgba(255,255,255,0.045))`,
        boxShadow: `0 16px 34px ${C.yellow}12`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 5px', color: C.yellow, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>
            FINALS SCHOLARSHIP ACCESS
          </p>
          <h3 style={{ margin: '0 0 7px', color: '#fff', fontSize: 18, lineHeight: 1.2, fontWeight: 900 }}>
            You&apos;ve unlocked an opportunity
          </h3>
          <p style={{ margin: '0 0 12px', color: C.muted, fontSize: 12, lineHeight: 1.55 }}>
            Finals participants may qualify for scholarship support up to ₹25,000 — for yourself or someone in your circle.
          </p>
          <button
            type="button"
            onClick={handleClick}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 12,
              padding: '12px 14px',
              background: `linear-gradient(135deg, ${C.yellow}, #f59e0b)`,
              color: '#121212',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            See Scholarship Opportunities →
          </button>
          <p style={{ margin: '9px 0 0', color: C.muted, fontSize: 10, textAlign: 'center' }}>
            No application fee · Legitimate opportunities only
          </p>
        </div>
      </div>
    </section>
  )
}
