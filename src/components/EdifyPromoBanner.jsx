import { useEffect, useState } from 'react'

const MOMENT_TYPES = [
  { icon: '6️⃣', label: 'Sixes' },
  { icon: '🏏', label: 'Boundaries' },
  { icon: '💥', label: 'Boldouts' },
  { icon: '🎯', label: 'Runouts' },
  { icon: '🧤', label: 'Wickets taken' },
  { icon: '🎉', label: 'Celebrations' },
  { icon: '📣', label: 'Crowd reactions' },
]

const PRIZES = [
  { icon: '🛒', label: '2 × ₹500 Amazon coupons' },
  { icon: '👗', label: '2 × ₹500 Myntra coupons' },
  { icon: '⌚', label: '1 × Fitband' },
  { icon: '🎵', label: '2 × MP3 players' },
]

const RULES = [
  'Capture any exciting moment from the match',
  'Post on Instagram or Facebook',
  'Use hashtag #EdifyFanMoment',
  'Tag @Edify in your post',
  'Your account must be public',
]

/** Quick stagger — feels natural, not a loading screen */
export function usePromoReveal(stepCount, intervalMs = 90) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= stepCount) return undefined
    const id = window.setTimeout(() => setStep((s) => s + 1), intervalMs)
    return () => clearTimeout(id)
  }, [step, stepCount, intervalMs])
  return step
}

function Reveal({ show, children, className = '' }) {
  return (
    <div className={`promo-reveal${show ? ' promo-reveal--in' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

/** variant: 'contest' | 'career' | 'all' */
export default function EdifyPromoBanner({ variant = 'all', compact = false, revealStep = 99 }) {
  const showContest = variant === 'all' || variant === 'contest'
  const showCareer = variant === 'all' || variant === 'career'

  const contestVisible = compact || revealStep >= 1
  const ctaVisible = revealStep >= 2
  const careerVisible = revealStep >= 3

  return (
    <div className={`edify-promo-stack${compact ? ' edify-promo-stack--compact' : ''}`}>
      {showContest && (
        <Reveal show={contestVisible}>
          <PromoShell label={compact ? '#EdifyFanMoment' : 'Capture & Win'} sub={compact ? 'Post & win prizes' : '#EdifyFanMoment on Instagram'}>
            <FanMomentContent compact={compact} />
          </PromoShell>
        </Reveal>
      )}
      {showContest && !compact && (
        <Reveal show={ctaVisible}>
          <ContestCta />
        </Reveal>
      )}
      {showCareer && !compact && (
        <Reveal show={careerVisible}>
          <PromoShell label="Your future" sub="Career guidance & scholarships">
            <FutureTeaserContent />
          </PromoShell>
        </Reveal>
      )}
    </div>
  )
}

function PromoShell({ label, sub, children }) {
  return (
    <div className="edify-promo-card">
      <div className="edify-promo-label">
        <span className="edify-promo-label-title">{label}</span>
        <span className="edify-promo-label-sub">{sub}</span>
      </div>
      <div className="edify-promo-body">{children}</div>
    </div>
  )
}

function FanMomentContent({ compact }) {
  if (compact) {
    return (
      <div className="edify-promo-compact">
        <p className="edify-promo-hero-title">#EdifyFanMoment — Capture &amp; Win</p>
        <p className="edify-promo-lead">
          Record a live moment, post with <strong>#EdifyFanMoment</strong>, tag <strong>@Edify</strong>.
        </p>
        <ul className="edify-promo-prize-chips">
          {PRIZES.slice(0, 3).map((p) => (
            <li key={p.label}>
              <span>{p.icon}</span> {p.label}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="edify-promo-fan">
      <h4 className="edify-promo-hero-title">#EdifyFanMoment — Capture &amp; Win</h4>

      <div className="edify-promo-block">
        <p className="edify-promo-block-label">Capture best moments</p>
        <ul className="edify-promo-moments">
          {MOMENT_TYPES.map((m) => (
            <li key={m.label}>
              <span className="edify-promo-moment-icon">{m.icon}</span>
              {m.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="edify-promo-highlight">
        <span className="edify-promo-highlight-icon">📱</span>
        <div>
          <p>
            Don&apos;t forget <strong>#EdifyFanMoment</strong>
          </p>
          <p className="edify-promo-muted">
            Out of the ground? <strong>108 Live</strong> streams the action — screen-record your favourite moment
            (or film from another phone). Those uploads count too.
          </p>
        </div>
      </div>

      <p className="edify-promo-excited">Rewards are running out — book your moment and your name now.</p>

      <div className="edify-promo-block">
        <p className="edify-promo-block-label">Giveaway rewards</p>
        <ul className="edify-promo-prizes">
          {PRIZES.map((p) => (
            <li key={p.label}>
              <span>{p.icon}</span>
              {p.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="edify-promo-block">
        <p className="edify-promo-block-label">How to participate</p>
        <ol className="edify-promo-rules">
          {RULES.map((r, i) => (
            <li key={r}>
              <span className="edify-promo-rule-num">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
      </div>

      <div className="edify-promo-featured">
        <span>🏆</span>
        <p>Best moments will be featured on our official pages!</p>
      </div>
    </div>
  )
}

function FutureTeaserContent() {
  return (
    <div className="edify-promo-future">
      <div className="edify-promo-future-row">
        <span className="edify-promo-future-icon">🎓</span>
        <p>
          Are you a student looking for <strong>career guidance</strong>, <strong>scholarships</strong> &amp;{' '}
          <strong>future opportunities</strong>?
        </p>
      </div>
      <div className="edify-promo-future-teaser">
        <span className="edify-promo-future-badge">Future teaser</span>
        <h4>Something exciting is coming soon!</h4>
        <p className="edify-promo-muted">Stay tuned with Edify for programs built around your next step.</p>
      </div>
    </div>
  )
}

function ContestCta() {
  return (
    <div className="edify-promo-cta">
      <p>
        Post on Instagram or Facebook with <strong>#EdifyFanMoment</strong> and tag <strong>@Edify</strong> (public
        account).
      </p>
      <a
        className="edify-promo-btn"
        href="https://www.instagram.com/explore/tags/edifyfanmoment/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Join on Instagram
      </a>
    </div>
  )
}
