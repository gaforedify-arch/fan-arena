import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { navigateArena } from '../lib/hashRouter'
import { C } from './UI'
import { trackEvent } from '../lib/analytics'

const COURSES = ['', 'B.Ed.', 'B.P.Ed.', 'M.Ed.', 'ITI Trades', 'D.Pharm', 'Polytechnic Diploma', 'Other']

function gtagEvent(event, params = {}) {
  if (typeof globalThis.gtag !== 'undefined') {
    globalThis.gtag('event', event, params)
  }
}

export default function LeadCaptureForm({ personType, matchSlug, teamVoted }) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [course, setCourse] = useState('')
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isReferral = personType === 'referral'
  const canSubmit = name.trim() && whatsapp.trim() && city.trim() && consent && !saving

  async function handleSubmit(e) {
    e.preventDefault()
    gtagEvent('lead_form_submit_attempt', {})
    setError('')

    if (!canSubmit) {
      setError('Please fill name, WhatsApp, city, and consent.')
      return
    }

    setSaving(true)
    try {
      const { error: insertError } = await supabase.from('scholarship_leads').insert({
        person_type: personType,
        name: name.trim(),
        whatsapp: `+91${whatsapp.trim().replace(/^\+?91/, '')}`,
        city: city.trim(),
        course: course || null,
        consent,
        match_slug: matchSlug,
        team_voted: teamVoted || null,
        source: 'fan_arena_finals',
      })

      if (insertError) throw insertError

      localStorage.setItem('scholarship_opted_in', 'true')
      gtagEvent('lead_form_submit_success', { person_type: personType, has_course: !!course })
      trackEvent('scholarship_cta_clicked', {
        source: 'lead_form_submit',
        person_type: personType,
        has_course: !!course,
      })
      navigateArena(matchSlug, 'scholarship-confirmed')
    } catch (err) {
      const message = err?.message || 'Could not save your details. Please try again.'
      setError(message)
      gtagEvent('lead_form_submit_error', { error_type: message })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.055)',
    color: '#fff',
    padding: '12px 13px',
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    margin: '0 0 6px',
    color: C.muted,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.2,
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 18, display: 'grid', gap: 12 }}>
      <label>
        <span style={labelStyle}>{isReferral ? 'THEIR NAME' : 'YOUR NAME'}</span>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
      </label>

      <label>
        <span style={labelStyle}>{isReferral ? 'THEIR WHATSAPP NUMBER' : 'YOUR WHATSAPP NUMBER'}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 8 }}>
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, fontWeight: 900 }}>
            +91
          </div>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            style={inputStyle}
            inputMode="tel"
          />
        </div>
      </label>

      <label>
        <span style={labelStyle}>CITY</span>
        <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
      </label>

      <label>
        <span style={labelStyle}>COURSE</span>
        <select value={course} onChange={e => setCourse(e.target.value)} style={inputStyle}>
          {COURSES.map(option => (
            <option key={option} value={option}>{option || 'Optional'}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: C.muted, fontSize: 11, lineHeight: 1.5 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          style={{ marginTop: 3, width: 18, height: 18 }}
        />
        <span>
          I agree to receive scholarship updates and student opportunity alerts on WhatsApp. We only message during relevant opportunities.
        </span>
      </label>

      {error && (
        <p style={{ margin: 0, color: C.red, fontSize: 12, lineHeight: 1.45 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          border: 'none',
          borderRadius: 14,
          padding: '14px 16px',
          background: canSubmit ? '#25D366' : '#2f3340',
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 900,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {isReferral ? '📲 Send Referral Details on WhatsApp' : '📲 Get My Scholarship Updates on WhatsApp'}
      </button>

      <p style={{ margin: 0, color: C.muted, fontSize: 10, textAlign: 'center' }}>
        No spam · Scholarship and admission updates only · Opt out anytime
      </p>
    </form>
  )
}
