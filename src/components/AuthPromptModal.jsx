import { useEffect } from 'react'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C } from './UI'

export default function AuthPromptModal({
  open,
  match,
  icon = '⚡',
  title,
  message,
  cta = 'Login & earn XP',
  screen,
  trigger,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    trackEvent('fan_arena_login_prompt_shown', {
      ...matchAnalyticsParams(match),
      screen,
      trigger,
    })
  }, [match, open, screen, trigger])

  if (!open) return null

  function handleLoginClick() {
    trackEvent('fan_arena_login_prompt_click', {
      ...matchAnalyticsParams(match),
      screen,
      trigger,
      cta,
    })
    window.location.hash = `#/match/${match.slug}/login`
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(160deg, #1a0a2e, #0c1838)',
          border: `1px solid ${C.purple}80`,
          borderRadius: 20,
          padding: 22,
          textAlign: 'center',
          boxShadow: `0 20px 60px ${C.purple}55`,
        }}
      >
        <div style={{ fontSize: 46, marginBottom: 10 }}>{icon}</div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
          {message}
        </p>
        <button
          type="button"
          onClick={handleLoginClick}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 14,
            padding: '13px 16px',
            background: `linear-gradient(135deg, ${C.orange}, ${C.purple})`,
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          {cta}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            background: 'none',
            border: 'none',
            color: C.muted,
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Keep watching
        </button>
      </div>
    </div>
  )
}
