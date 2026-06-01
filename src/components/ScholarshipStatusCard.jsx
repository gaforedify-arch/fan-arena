import { useEffect, useState } from 'react'
import { C } from './UI'

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function ScholarshipStatusCard({ onReferral, onViewDetails }) {
  const [visible, setVisible] = useState(false)
  const isIPL = typeof document !== 'undefined' && document.body?.dataset?.sport === 'ipl'

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
        border: isIPL ? '1px solid rgba(22,163,74,0.32)' : `1px solid ${C.green}60`,
        background: isIPL
          ? 'linear-gradient(145deg, rgba(22,163,74,0.12), #ffffff 72%)'
          : `linear-gradient(145deg, ${C.green}18, rgba(255,255,255,0.04))`,
        boxShadow: isIPL ? '0 12px 28px rgba(15,23,42,0.08)' : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 26, lineHeight: 1 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', color: isIPL ? '#16a34a' : C.green, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>
            SCHOLARSHIP · APPLICATION SUBMITTED
          </p>
          <h3 style={{ margin: '0 0 5px', color: isIPL ? '#0f172a' : '#fff', fontSize: 16, lineHeight: 1.2, fontWeight: 900 }}>
            You&apos;re in — we&apos;ll reach you on WhatsApp
          </h3>
          <p style={{ margin: '0 0 11px', color: isIPL ? '#475569' : C.muted, fontSize: 12, lineHeight: 1.5, fontWeight: isIPL ? 700 : 400 }}>
            Our team will send scholarship options matched to your course and city within 24 hours.
          </p>

          <button
            type="button"
            onClick={() => {
              gtagEvent('scholarship_status_details_click', {})
              onViewDetails?.()
            }}
            style={{
              border: isIPL ? '1px solid rgba(22,163,74,0.35)' : `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '10px 14px',
              background: isIPL ? 'rgba(22,163,74,0.12)' : 'rgba(255,255,255,0.055)',
              color: isIPL ? '#166534' : '#fff',
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
