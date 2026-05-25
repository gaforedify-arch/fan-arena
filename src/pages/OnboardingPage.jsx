import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { C, Btn, FullPageCenter } from '../components/UI'
import { getPendingReferralCode } from '../lib/referral'

function goBack() {
  const parts = window.location.hash.replace('#', '').split('/').filter(Boolean)
  if (parts[0] === 'match' && parts[1]) {
    window.location.hash = `#/match/${parts[1]}/home`
  } else {
    window.location.hash = '#/'
  }
}

async function lookupPin(pin) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const json = await res.json()
    if (json?.[0]?.Status === 'Success' && json[0].PostOffice?.length > 0) {
      const po = json[0].PostOffice[0]
      return `${po.District}, ${po.State}`
    }
    return null
  } catch {
    return null
  }
}

const FIELDS = [
  { key: 'name',   label: 'Full name',      xp: '+100 XP' },
  { key: 'phone',  label: 'Mobile number',  xp: '+100 XP' },
  { key: 'pin',    label: 'PIN code',        xp: '+100 XP' },
  { key: 'age',    label: 'Age',             xp: '+100 XP' },
]

function FieldLabel({ label, xp }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </label>
      <span style={{
        fontSize: 9, fontWeight: 900, color: C.green,
        background: `${C.green}15`, border: `1px solid ${C.green}40`,
        borderRadius: 99, padding: '2px 7px', letterSpacing: 0.5,
      }}>
        {xp}
      </span>
    </div>
  )
}

export default function OnboardingPage() {
  const { completeOnboarding } = useAuth()
  const [form, setForm]         = useState({ name: '', phone: '', pin: '', age: '', refCode: getPendingReferralCode() })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [pinArea, setPinArea]   = useState('')
  const [pinLooking, setPinLooking] = useState(false)

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })) }

  // Auto-lookup PIN → area name
  useEffect(() => {
    const pin = form.pin.replace(/\D/g, '')
    if (pin.length !== 6) { setPinArea(''); return }
    let cancelled = false
    setPinLooking(true)
    lookupPin(pin).then(area => {
      if (!cancelled) {
        setPinArea(area || '')
        setPinLooking(false)
      }
    })
    return () => { cancelled = true }
  }, [form.pin])

  function validate() {
    if (form.name.trim().length < 2)                              return 'Enter your full name'
    if (form.phone.replace(/\D/g, '').length < 10)               return 'Enter a valid 10-digit mobile number'
    if (form.pin.replace(/\D/g, '').length !== 6)                return 'Enter a valid 6-digit PIN code'
    if (!form.age || isNaN(form.age) || form.age < 10 || form.age > 80) return 'Enter a valid age (10–80)'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true); setError('')
    try {
      const trimmedRef = form.refCode.trim().toUpperCase()
      if (trimmedRef) localStorage.setItem('fan_arena_pending_ref', trimmedRef)
      await completeOnboarding({
        name:  form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        pin:   form.pin.replace(/\D/g, ''),
        age:   parseInt(form.age, 10),
      })
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${C.border}`, borderRadius: 12,
    padding: '14px 16px', color: '#fff', fontSize: 15,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
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

          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel label={FIELDS[0].label} xp={FIELDS[0].xp} />
            <input
              type="text" placeholder="Rahul Sharma" maxLength={50}
              value={form.name} onChange={set('name')}
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel label={FIELDS[1].label} xp={FIELDS[1].xp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '14px 12px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.muted, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>+91</span>
              <input
                type="tel" placeholder="9876543210" maxLength={10}
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>

          {/* PIN code */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel label={FIELDS[2].label} xp={FIELDS[2].xp} />
            <input
              type="tel" placeholder="411001" maxLength={6}
              value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
              style={inputStyle}
            />
            {pinLooking && (
              <p style={{ margin: '5px 0 0', color: C.muted, fontSize: 11 }}>Looking up…</p>
            )}
            {!pinLooking && pinArea && (
              <p style={{ margin: '5px 0 0', color: C.green, fontSize: 11, fontWeight: 700 }}>
                📍 {pinArea}
              </p>
            )}
            {!pinLooking && form.pin.length === 6 && !pinArea && (
              <p style={{ margin: '5px 0 0', color: C.muted, fontSize: 11 }}>PIN not found — please check</p>
            )}
          </div>

          {/* Age */}
          <div style={{ marginBottom: 16 }}>
            <FieldLabel label={FIELDS[3].label} xp={FIELDS[3].xp} />
            <input
              type="number" placeholder="21"
              value={form.age} onChange={set('age')}
              style={inputStyle}
            />
          </div>

          {/* Referral code */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                Referral code
              </label>
              <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>optional</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="e.g. AB3X7KM"
                maxLength={10}
                value={form.refCode}
                onChange={e => setForm(f => ({ ...f, refCode: e.target.value.toUpperCase() }))}
                style={{
                  ...inputStyle,
                  fontFamily: 'monospace',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  paddingRight: form.refCode ? 36 : 16,
                  borderColor: form.refCode ? `${C.purple}80` : undefined,
                }}
              />
              {form.refCode && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, refCode: '' }))}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: C.muted, fontSize: 16,
                    cursor: 'pointer', padding: 2, lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {form.refCode && (
              <p style={{ margin: '5px 0 0', fontSize: 11, color: C.purple, fontWeight: 700 }}>
                🔗 Your friend earns 200 XP when you join
              </p>
            )}
          </div>

          {error && <p style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</p>}

          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? 'Setting up...' : 'Enter the Arena ⚡'}
          </Btn>
        </div>

        {/* XP breakdown */}
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
          <p style={{ margin: '0 0 10px', color: C.yellow, fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>YOUR SIGNUP BONUS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: C.muted, fontSize: 12 }}>Login bonus</span>
              <span style={{ color: C.yellow, fontWeight: 900, fontSize: 12 }}>+500 XP</span>
            </div>
            {FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted, fontSize: 12 }}>{f.label}</span>
                <span style={{ color: C.green, fontWeight: 900, fontSize: 12 }}>{f.xp}</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>Total</span>
              <span style={{ color: C.yellow, fontSize: 15, fontWeight: 900 }}>+900 XP</span>
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 12, lineHeight: 1.6 }}>
          Your details are used for Edify event participation only.
        </p>
      </div>
    </FullPageCenter>
  )
}
