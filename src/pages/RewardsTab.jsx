import { C, GlassCard, Pill } from '../components/UI'
import EdifyPromoBanner from '../components/EdifyPromoBanner'

export default function RewardsTab() {
  return (
    <div className="arena-page rewards-page">
      <div className="rewards-header">
        <Pill color={C.yellow}>REWARDS</Pill>
        <h2>Edify perks</h2>
        <p>Earn XP from correct votes &amp; predictions. Top fans unlock fee reductions.</p>
      </div>

      <EdifyPromoBanner variant="all" />

      <GlassCard glow={C.yellow} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🎓</div>
        <h3 style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Scholarship pool</h3>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
          More XP = bigger reduction at Edify. Final standings announced at tournament end.
        </p>
      </GlassCard>

      <GlassCard>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 10 }}>How to earn XP</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.muted, lineHeight: 1.9 }}>
          <li>+100 XP — correct team vote (after match)</li>
          <li>+75 XP — each correct prediction</li>
          <li>+50 XP — each correct quiz answer</li>
          <li>+50 XP — welcome bonus (once)</li>
          <li>Reactions — fun only, no XP</li>
        </ul>
      </GlassCard>
    </div>
  )
}
