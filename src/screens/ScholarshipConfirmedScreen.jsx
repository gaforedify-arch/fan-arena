import { navigateArena } from '../lib/hashRouter'
import { C } from '../components/UI'

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function ScholarshipConfirmedScreen({ matchSlug }) {
  function referAnother() {
    gtagEvent('referral_cta_clicked', {})
    sessionStorage.setItem('scholarship_person_type', 'referral')
    navigateArena(matchSlug, 'scholarship')
  }

  function backToBattle() {
    gtagEvent('back_to_battle_clicked', {})
    navigateArena(matchSlug, 'home')
  }

  return (
    <div className="arena-page" style={{ paddingBottom: 90 }}>
      <section style={{ borderRadius: 18, padding: 16, background: `linear-gradient(135deg, ${C.green}, #16a34a)`, color: '#fff', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>🎓 YOU&apos;RE IN · Scholarship Access Unlocked</p>
      </section>

      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
        Our team will reach you on WhatsApp with scholarship opportunities matched to your course and city.
      </p>

      <section style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, background: C.card, marginBottom: 14 }}>
        <h2 style={{ margin: '0 0 12px', color: '#fff', fontSize: 18 }}>What happens next</h2>
        {[
          ['Our team reviews your details', 'Within 48–72 hours we will get back to you'],
          ['You receive matched scholarship options on WhatsApp', 'Personalised list'],
          ['Choose what interests you — no pressure', 'You decide'],
        ].map(([title, sub], i) => (
          <div key={title} style={{ display: 'flex', gap: 10, marginBottom: i === 2 ? 0 : 12 }}>
            <strong style={{ color: C.green }}>{i + 1}.</strong>
            <div>
              <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 800 }}>{title}</p>
              <p style={{ margin: '3px 0 0', color: C.muted, fontSize: 11 }}>{sub}</p>
            </div>
          </div>
        ))}
      </section>

      <section style={{ border: `1px solid ${C.yellow}60`, borderRadius: 16, padding: 14, background: `${C.yellow}12`, marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 7px', color: C.yellow, fontSize: 17 }}>Know someone who could benefit? 🤝</h3>
        <p style={{ margin: '0 0 12px', color: C.muted, fontSize: 12, lineHeight: 1.55 }}>
          Refer a sibling, friend, or classmate — they get the same scholarship access.
        </p>
        <button
          type="button"
          onClick={referAnother}
          style={{ width: '100%', border: 'none', borderRadius: 12, padding: '12px 14px', background: `linear-gradient(135deg, ${C.yellow}, #f59e0b)`, color: '#121212', fontFamily: 'inherit', fontSize: 13, fontWeight: 900 }}
        >
          Refer Another Student →
        </button>
      </section>

      <button
        type="button"
        onClick={backToBattle}
        style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.055)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 900 }}
      >
        ← Back to the Finals Battle
      </button>
    </div>
  )
}
