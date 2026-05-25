import { useState } from 'react'
import { C } from './UI'

const SLIDES = [
  {
    emoji: '🔥',
    tag: 'WELCOME TO FAN ARENA',
    title: 'Join the live fan battle',
    body: 'Vote for your team, send reactions, and play games — all while the match is happening live.',
  },
  {
    emoji: '🎯',
    tag: 'HOW IT WORKS',
    title: '3 steps to play',
    steps: [
      { n: '1', text: 'Pick your team — vote to boost them' },
      { n: '2', text: 'Play games — earn XP with every action' },
      { n: '3', text: 'Climb the ranks — top fans win' },
    ],
  },
  {
    emoji: '🏆',
    tag: 'WHAT YOU EARN',
    title: 'XP, ranks & scholarships',
    body: 'Every action earns XP. XP builds your rank. Finals fans unlock scholarship access worth up to ₹25,000.',
  },
]

export default function OnboardingModal({ onDone }) {
  const [slide, setSlide] = useState(0)
  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  function next() {
    if (isLast) {
      onDone()
    } else {
      setSlide(s => s + 1)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'flex-end', padding: '0 16px 24px',
    }}>
      <section style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        borderRadius: 22, background: '#1a1d26',
        border: `1px solid ${C.border}`, padding: 22,
      }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 22 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                height: 6, borderRadius: 3,
                width: i === slide ? 24 : 8,
                background: i === slide ? C.purple : C.border,
                transition: 'width 0.3s ease',
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{current.emoji}</div>
          <p style={{ margin: '0 0 6px', color: C.purple, fontSize: 9, fontWeight: 900, letterSpacing: 1.4 }}>
            {current.tag}
          </p>
          <h2 style={{ margin: '0 0 14px', color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
            {current.title}
          </h2>
          {current.body && (
            <p style={{ margin: 0, color: C.muted, fontSize: 14, lineHeight: 1.65 }}>{current.body}</p>
          )}
          {current.steps && (
            <div style={{ textAlign: 'left', display: 'grid', gap: 10 }}>
              {current.steps.map(step => (
                <div key={step.n} style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px',
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: C.purple, color: '#fff',
                    fontSize: 11, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {step.n}
                  </span>
                  <span style={{ color: C.muted, fontSize: 13, lineHeight: 1.45 }}>{step.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={next}
          style={{
            width: '100%', border: 'none', borderRadius: 14,
            padding: '14px 16px', background: C.purple,
            color: '#fff', fontFamily: 'inherit', fontSize: 14,
            fontWeight: 900, cursor: 'pointer', marginBottom: 8,
          }}
        >
          {isLast ? "Let's Play →" : 'Next →'}
        </button>

        <button
          type="button"
          onClick={onDone}
          style={{
            width: '100%', border: 'none', background: 'none',
            color: C.muted, fontFamily: 'inherit', fontSize: 12,
            padding: '6px 0', cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </section>
    </div>
  )
}
