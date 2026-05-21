import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { C, Btn, Input, FullPageCenter } from '../components/UI'

function goBack() {
  const parts = window.location.hash.replace('#', '').split('/').filter(Boolean)
  if (parts[0] === 'match' && parts[1]) {
    window.location.hash = `#/match/${parts[1]}/home`
  } else {
    window.location.hash = '#/'
  }
}

export default function OnboardingPage() {
  const { completeOnboarding } = useAuth()
  const [form, setForm]       = useState({ name: '', phone: '', city: '', age: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })) }

  function validate() {
    if (form.name.trim().length < 2) return 'Enter your full name'
    if (form.phone.replace(/\D/g, '').length < 10) return 'Enter a valid 10-digit mobile number'
    if (form.city.trim().length < 2) return 'Enter your city'
    if (!form.age || isNaN(form.age) || form.age < 10 || form.age > 80) return 'Enter a valid age'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError('')
    try {
      await completeOnboarding({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        city: form.city.trim(),
        age: parseInt(form.age, 10)
      })
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FullPageCenter>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <button
          type="button"
          onClick={goBack}
          style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18 }}
        >
          ← Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🏏</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Set up your profile</h1>
          <p style={{ fontSize: 13, color: C.muted }}>One time setup · Takes 30 seconds</p>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, marginBottom: 14 }}>
          <Input label="Full name" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} maxLength={50} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Mobile number</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '14px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>+91</span>
              <input
                type="tel" placeholder="9876543210" maxLength={10}
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="City" placeholder="Pune" value={form.city} onChange={set('city')} maxLength={50} />
            <Input label="Age" type="number" placeholder="21" value={form.age} onChange={set('age')} />
          </div>

          {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}
          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? 'Setting up...' : 'Enter the Arena ⚡'}
          </Btn>
        </div>

        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <span>🎉</span>
          <span style={{ color: C.yellow, fontWeight: 900 }}>+50 XP</span>
          <span style={{ color: C.muted, fontSize: 11 }}>welcome bonus on join</span>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 12, lineHeight: 1.6 }}>
          Your details are used for Edify event participation only.
        </p>
      </div>
    </FullPageCenter>
  )
}
