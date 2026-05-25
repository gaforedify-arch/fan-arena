import { useEffect, useState } from 'react'
import { C } from './UI'

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function ScholarshipStatusCard({ onReferral, onViewDetails }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    gtagEvent('scholarship_status_card_view', {})
    const timer = window.setTimeout(() => setVisible(true), 200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(8px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        margin: '0 0 14px',
        padding: 14,
        borderRadius: 16,
        border: `1px solid ${C.green}60`,
        background: `linear-gradient(145deg, ${C.green}18, rgba(255,255,255,0.04))`,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', color: C.green, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>
            SCHOLARSHIP · APPLICATION SUBMITTED
          </p>
          <h3 style={{ margin: '0 0 5px', color: '#fff', fontSize: 16, lineHeight: 1.2, fontWeight: 900 }}>
            You&apos;re in — we&apos;ll reach you on WhatsApp
          </h3>
          <p style={{ margin: '0 0 11px', color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
            Our team will send scholarship options matched to your course and city within 24 hours.
          </p>

          <button
            type="button"
            onClick={() => {
              gtagEvent('scholarship_status_details_click', {})
              onViewDetails?.()
            }}
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.055)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </section>
  )
}
