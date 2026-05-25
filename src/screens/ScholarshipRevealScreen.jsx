import { useEffect, useRef, useState } from 'react'
import { navigateArena } from '../lib/hashRouter'
import { C } from '../components/UI'
import LeadCaptureForm from '../components/LeadCaptureForm'

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function ScholarshipRevealScreen({ matchSlug, teamVoted }) {
  const initialType = sessionStorage.getItem('scholarship_person_type') === 'referral' ? 'referral' : 'self'
  const [personType, setPersonType] = useState(initialType)
  const [showForm, setShowForm] = useState(false)
  const formRef = useRef(null)

  useEffect(() => {
    gtagEvent('scholarship_reveal_view', { person_type: personType })
    sessionStorage.removeItem('scholarship_person_type')
    // The load event should fire once with the initially selected person type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeType(next) {
    setPersonType(next)
    gtagEvent('scholarship_person_type_change', { person_type: next })
  }

  function openForm() {
    setShowForm(true)
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  return (
    <div className="arena-page" style={{ paddingBottom: 90 }}>
      <button
        type="button"
        onClick={() => navigateArena(matchSlug, 'home')}
        style={{ border: 'none', background: 'none', color: C.muted, fontFamily: 'inherit', fontSize: 12, fontWeight: 800, marginBottom: 14 }}
      >
        ← Battle / Scholarship
      </button>

      <section style={{ borderRadius: 18, padding: 16, background: `linear-gradient(135deg, ${C.yellow}, #f59e0b)`, color: '#121212', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: 1.1 }}>🎓 FINALS SCHOLARSHIP ACCESS · Up to ₹25,000</p>
      </section>

      <section style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, background: C.card, marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 20 }}>What is this?</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
          Fan Arena has partnered with colleges to provide scholarship opportunities and admission fee support for students participating in the Finals.
        </p>
      </section>

      <section style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, background: C.card, marginBottom: 12 }}>
        <h3 style={{ margin: '0 0 10px', color: '#fff', fontSize: 15 }}>Who can access?</h3>
        {[
          '🎓 Students actively looking for college admission',
          '👨‍👩‍👧 Anyone with a sibling, cousin, or friend who needs support',
          '📚 Students exploring scholarships across courses & cities',
        ].map(item => (
          <p key={item} style={{ margin: '0 0 8px', color: C.muted, fontSize: 12, lineHeight: 1.5 }}>{item}</p>
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          ['self', 'Myself'],
          ['referral', 'Someone I know'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => changeType(value)}
            style={{
              border: `1px solid ${personType === value ? C.yellow : C.border}`,
              borderRadius: 12,
              padding: '12px 10px',
              background: personType === value ? `${C.yellow}22` : 'rgba(255,255,255,0.045)',
              color: personType === value ? C.yellow : C.muted,
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {personType === 'referral' && (
        <p style={{ margin: '0 0 12px', color: C.yellow, fontSize: 12, lineHeight: 1.5 }}>
          💡 You can refer a sibling, cousin, classmate, or friend — even if they&apos;re in a different city.
        </p>
      )}

      <button
        type="button"
        onClick={openForm}
        style={{ width: '100%', border: 'none', borderRadius: 14, padding: '14px 16px', background: `linear-gradient(135deg, ${C.yellow}, #f59e0b)`, color: '#121212', fontFamily: 'inherit', fontSize: 14, fontWeight: 900, marginBottom: 10 }}
      >
        Unlock Scholarship Access →
      </button>
      <p style={{ margin: 0, color: C.muted, fontSize: 10, textAlign: 'center' }}>No application fee · Verified opportunities only</p>

      {showForm && (
        <section ref={formRef} style={{ marginTop: 18, border: `1px solid ${C.yellow}50`, borderRadius: 16, padding: 14, background: 'rgba(255,255,255,0.045)' }}>
          <LeadCaptureForm personType={personType} matchSlug={matchSlug} teamVoted={teamVoted} />
        </section>
      )}
    </div>
  )
}
