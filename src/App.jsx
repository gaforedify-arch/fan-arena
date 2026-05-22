import { lazy, Suspense, useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { MatchProvider, useMatch, MATCH_STATE } from './hooks/useMatch'
import { parseHash } from './lib/hashRouter'
import { captureAttribution, trackEvent } from './lib/analytics'
import LoginPage from './pages/LoginPage'
import { C } from './components/UI'

const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const ArenaShell = lazy(() => import('./pages/ArenaShell'))
const AdminPanel = lazy(() => import('./admin/AdminPanel'))
const MatchHomePage = lazy(() => import('./pages/StatusPages').then((m) => ({ default: m.MatchHomePage })))
const NotFoundPage = lazy(() => import('./pages/StatusPages').then((m) => ({ default: m.NotFoundPage })))

function LoadingScreen({ label = 'Loading arena...' }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(168,85,247,0.3)', borderTop: `3px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: C.muted, marginTop: 16, fontSize: 13 }}>{label}</p>
    </div>
  )
}

function AppInner() {
  const route = parseHash()
  const slug = route.type === 'match' ? route.slug : null
  const tab = route.type === 'match' ? route.tab : 'home'
  const wantsLogin = route.type === 'match' && tab === 'login'

  const { user, profile, loading: authLoading } = useAuth()
  const { match, matchState, nextMatch, loading: matchLoading } = useMatch()

  if (route.type === 'admin') {
    return (
      <Suspense fallback={<LoadingScreen label="Loading admin..." />}>
        <AdminPanel />
      </Suspense>
    )
  }
  if (authLoading) return <LoadingScreen label="Loading..." />
  if (wantsLogin && !user) return <LoginPage />
  if (wantsLogin && !profile) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading..." />}>
        <OnboardingPage />
      </Suspense>
    )
  }
  if (!slug) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <MatchHomePage />
      </Suspense>
    )
  }
  if (matchLoading) return <LoadingScreen />

  const arena = (
    <Suspense fallback={<LoadingScreen />}>
      <ArenaShell match={match} tab={tab} />
    </Suspense>
  )

  switch (matchState) {
    case MATCH_STATE.ACTIVE:
    case MATCH_STATE.NOT_STARTED:
    case MATCH_STATE.COMPLETED:
      return arena
    case MATCH_STATE.NOT_FOUND:
      return (
        <Suspense fallback={<LoadingScreen />}>
          <NotFoundPage nextMatch={nextMatch} />
        </Suspense>
      )
    default:
      return arena
  }
}

export default function App() {
  const [, setHashTick] = useState(0)

  useEffect(() => {
    captureAttribution()
  }, [])

  useEffect(() => {
    function onHash() { setHashTick(t => t + 1) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const route = parseHash()
  const slug = route.type === 'match' ? route.slug : null

  useEffect(() => {
    trackEvent('fan_arena_page_view', {
      route_type: route.type,
      match_slug: slug || '',
      tab: route.type === 'match' ? route.tab : '',
      path: window.location.pathname,
      hash: window.location.hash,
    })
  }, [route.type, route.type === 'match' ? route.tab : '', slug])

  return (
    <div id="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body { background: #07070f; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
        #app-root { min-height: 100dvh; width: 100%; max-width: 480px; margin: 0 auto; background: ${C.bg}; font-family: 'Sora', sans-serif; color: #fff; overflow-x: hidden; }
        button, input, select { font-size: 16px; }
        .logout-btn { padding: 8px 12px; border-radius: 10px; border: 1px solid ${C.border}; background: rgba(255,255,255,0.06); color: ${C.muted}; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .admin-shell { min-height: 100dvh; max-width: 640px; margin: 0 auto; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-120px) scale(1.3);opacity:0} }
        @keyframes videoReactionFloat { 0%{transform:translate(-50%, 18px) scale(.8);opacity:0} 12%{opacity:1} 78%{opacity:1} 100%{transform:translate(calc(-50% + var(--reaction-drift)), -145px) scale(1.45);opacity:0} }
        @keyframes votePulse { 0%,100%{transform:translateY(0);box-shadow:0 0 0 rgba(255,255,255,0)} 50%{transform:translateY(-2px);box-shadow:0 0 24px color-mix(in srgb, var(--team-color) 32%, transparent)} }
        @keyframes voteBurst { 0%{transform:translate(-50%, 8px) scale(.8);opacity:0} 16%{opacity:1} 100%{transform:translate(calc(-50% + var(--vote-drift)), -92px) scale(1.25);opacity:0} }
        @keyframes sheetIn { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes battleShove { 0%,100%{filter:brightness(1);background-position:0 0} 50%{filter:brightness(1.18);background-position:18px 0} }
        @keyframes resultPop { from{opacity:0;transform:translateY(14px) scale(.98)} to{opacity:1;transform:none} }
        input::placeholder { color: rgba(255,255,255,0.25); }
        select option { background: #121220; }

        .arena-shell { display: flex; flex-direction: column; min-height: 100dvh; position: relative; }
        .arena-main { flex: 1; overflow-y: auto; padding-bottom: 72px; }
        .arena-main-ranks { padding-bottom: 80px; }
        .arena-page { padding: 14px; }
        .arena-compact-header { display: flex; justify-content: space-between; align-items: center; padding: max(10px, env(safe-area-inset-top)) 14px 10px; background: linear-gradient(160deg, #170930, #0c1838); border-bottom: 1px solid ${C.border}; }
        .arena-compact-actions { display: flex; align-items: center; gap: 10px; }
        .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; display: flex; background: rgba(13,13,27,0.96); border-top: 1px solid ${C.border}; padding: 8px 4px max(8px, env(safe-area-inset-bottom)); z-index: 100; backdrop-filter: blur(12px); }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; background: none; border: none; color: ${C.muted}; font-family: inherit; font-size: 9px; font-weight: 700; cursor: pointer; padding: 6px 2px; border-radius: 10px; }
        .bottom-nav-btn-active { color: ${C.orange}; }
        .bottom-nav-btn-active .bottom-nav-icon { transform: scale(1.1); }
        .bottom-nav-icon { font-size: 20px; line-height: 1; transition: transform 0.2s; }

        .hub-header { background: linear-gradient(165deg, #1a0a2e 0%, #0f1635 50%, #0a1020 100%); margin: -14px -14px 16px; padding: 14px 14px 18px; border-bottom: 1px solid ${C.border}; }
        .hub-top-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .hub-top-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .hub-xp-chip { text-align: right; line-height: 1.2; }
        .hub-xp-label { display: block; font-size: 8px; letter-spacing: 1px; color: ${C.muted}; font-weight: 700; text-transform: uppercase; }
        .hub-xp-val { font-size: 15px; font-weight: 900; color: ${C.yellow}; }
        .hub-meta-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 14px; }
        .hub-event-line { font-size: 10px; color: ${C.muted}; text-align: center; margin-bottom: 10px; letter-spacing: 0.5px; font-weight: 600; }
        .hub-live-strip { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 9px; margin-bottom: 12px; padding: 9px 10px; border-radius: 12px; border: 1px solid rgba(239,68,68,.32); background: linear-gradient(90deg, rgba(239,68,68,.13), rgba(255,255,255,.045)); }
        .hub-live-strip span { display: inline-flex; align-items: center; min-width: 0; color: ${C.red}; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
        .hub-live-strip strong { color: #fff; font-size: 11px; white-space: nowrap; }
        .hub-live-strip button { border: 1px solid rgba(255,255,255,.16); border-radius: 9px; background: rgba(255,255,255,.08); color: #fff; font-family: inherit; font-size: 11px; font-weight: 900; padding: 7px 9px; cursor: pointer; }
        .hub-reaction-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
        .hub-floating-reaction { position: absolute; bottom: 12px; font-size: 28px; line-height: 1; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.75)); animation: videoReactionFloat 3s ease-out forwards; will-change: transform, opacity; }
        .hub-greeting { font-size: 12px; color: ${C.muted}; font-weight: 600; }
        .hub-active-fans { text-align: right; line-height: 1.2; }
        .hub-active-label { display: block; font-size: 8px; letter-spacing: 2px; color: ${C.muted}; font-weight: 700; }
        .hub-active-val { font-size: 16px; font-weight: 900; color: #fff; }
        .hub-scoreboard { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .hub-team { flex: 1; }
        .hub-team-right { text-align: right; }
        .hub-team-name { font-size: 11px; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; }
        .hub-team-score { font-size: 22px; font-weight: 900; color: #fff; }
        .hub-team-over { font-size: 10px; color: ${C.orange}; margin-top: 2px; }
        .hub-vs { font-size: 10px; font-weight: 900; color: ${C.muted}; letter-spacing: 2px; flex-shrink: 0; }
        .hub-support-labels { display: flex; justify-content: space-between; font-size: 10px; color: ${C.muted}; margin-bottom: 6px; font-weight: 600; }
        .hub-vote-stage { position: relative; overflow: hidden; background: rgba(255,255,255,0.055); border: 1px solid ${C.borderBright}; border-radius: 18px; padding: 14px; margin-bottom: 14px; }
        .hub-stage-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .hub-stage-kicker { font-size: 9px; letter-spacing: 1.6px; text-transform: uppercase; color: ${C.green}; font-weight: 900; margin-bottom: 4px; }
        .hub-stage-head h1 { font-size: 22px; line-height: 1.05; margin: 0; color: #fff; font-weight: 900; }
        .hub-mission { min-width: 68px; text-align: center; padding: 8px 10px; border-radius: 12px; background: ${C.yellow}16; border: 1px solid ${C.yellow}45; }
        .hub-mission span { display: block; font-size: 8px; letter-spacing: 1.4px; color: ${C.yellow}; font-weight: 900; }
        .hub-mission strong { display: block; font-size: 18px; color: #fff; line-height: 1.1; }
        .hub-war-alert { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; background: linear-gradient(90deg, ${C.orange}18, ${C.blue}12); border: 1px solid ${C.borderBright}; margin-bottom: 12px; font-size: 11px; font-weight: 900; color: #fff; }
        .hub-war-alert span { color: ${C.orange}; text-transform: uppercase; letter-spacing: 1px; }
        .hub-war-alert strong { color: ${C.yellow}; white-space: nowrap; }
        .hub-pick-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .hub-pick-btn { position: relative; min-height: 138px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 2px solid; border-radius: 16px; background: color-mix(in srgb, var(--team-color) 13%, ${C.card}); color: #fff; cursor: pointer; font-family: inherit; overflow: hidden; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, opacity .16s ease; }
        .hub-pick-btn:disabled { cursor: default; opacity: .62; }
        .hub-pick-btn-live:not(:disabled) { animation: votePulse 1.8s ease-in-out infinite; }
        .hub-pick-btn-picked { animation: none; background: color-mix(in srgb, var(--team-color) 22%, ${C.card}); }
        .hub-pick-btn span { font-size: 15px; font-weight: 900; }
        .hub-pick-btn strong { font-size: 30px; line-height: 1; color: var(--team-color); }
        .hub-pick-btn small { font-size: 10px; color: rgba(255,255,255,.68); font-weight: 800; }
        .hub-battle-meter { margin-top: 12px; }
        .hub-crowd-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 11px; color: ${C.muted}; font-weight: 800; }
        .hub-crowd-head strong { color: #fff; }
        .hub-battle-bar { position: relative; height: 16px; border-radius: 99px; overflow: hidden; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.08); }
        .hub-battle-fill-a, .hub-battle-fill-b { position: absolute; top: 0; bottom: 0; transition: width .7s cubic-bezier(.16,1,.3,1); background-size: 24px 24px; animation: battleShove 1.8s linear infinite; }
        .hub-battle-fill-a { left: 0; background-image: linear-gradient(90deg, var(--team-a), color-mix(in srgb, var(--team-a) 72%, #fff)); }
        .hub-battle-fill-b { right: 0; background-image: linear-gradient(270deg, var(--team-b), color-mix(in srgb, var(--team-b) 72%, #fff)); }
        .hub-battle-clash { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #11111d; border: 1px solid rgba(255,255,255,.2); color: #fff; font-size: 8px; font-weight: 900; box-shadow: 0 0 16px rgba(255,255,255,.22); transition: left .7s cubic-bezier(.16,1,.3,1); }
        .hub-battle-labels { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; margin-top: 8px; font-size: 10px; color: ${C.muted}; font-weight: 900; }
        .hub-battle-labels strong { color: ${C.yellow}; text-align: center; white-space: nowrap; }
        .hub-battle-labels span:last-child { text-align: right; }
        .hub-vote-feedback { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-top: 10px; min-height: 34px; border-radius: 12px; background: rgba(255,255,255,.06); padding: 9px 10px; font-size: 12px; font-weight: 900; color: #fff; }
        .hub-vote-feedback span { color: ${C.green}; white-space: nowrap; }
        .hub-mission-list { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }
        .hub-mission-summary { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 10px; padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.055); border: 1px solid ${C.border}; }
        .hub-mission-summary strong { color: #fff; font-size: 11px; white-space: nowrap; }
        .hub-mission-summary span { color: ${C.muted}; font-size: 10px; text-align: right; line-height: 1.35; }
        .hub-time-step { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 8px; color: ${C.muted}; font-family: inherit; font-size: 11px; font-weight: 800; text-align: left; min-height: 36px; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.045); border: 1px solid ${C.border}; cursor: pointer; }
        .hub-time-step i { width: 18px; height: 18px; border-radius: 50%; border: 1px solid ${C.borderBright}; background: rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 11px; font-weight: 900; }
        .hub-time-step em { font-style: normal; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; color: ${C.muted}; }
        .hub-time-step-done { color: #fff; }
        .hub-time-step-done em { color: ${C.green}; }
        .hub-time-step-done i { background: ${C.green}; border-color: ${C.green}; box-shadow: 0 0 16px ${C.green}70; }
        .hub-rank-move { margin-top: 10px; padding: 9px 10px; border-radius: 12px; background: ${C.green}15; border: 1px solid ${C.green}40; color: ${C.green}; font-size: 12px; font-weight: 900; text-align: center; }
        .hub-vote-burst { position: absolute; bottom: 26px; z-index: 3; font-size: 14px; font-weight: 900; pointer-events: none; text-shadow: 0 3px 10px rgba(0,0,0,.7); animation: voteBurst 2s ease-out forwards; }
        .hub-vote-result { position: fixed; inset: 0; z-index: 160; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.78); backdrop-filter: blur(5px); }
        .hub-vote-result-card { width: 100%; max-width: 370px; position: relative; text-align: center; padding: 24px 18px 18px; border-radius: 18px; background: radial-gradient(circle at 50% 0%, ${C.orange}22, transparent 34%), #090912; border: 1px solid ${C.borderBright}; box-shadow: 0 20px 80px rgba(0,0,0,.55); animation: resultPop .24s cubic-bezier(.16,1,.3,1); }
        .hub-result-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 50%; border: 1px solid ${C.border}; background: rgba(255,255,255,.06); color: ${C.muted}; cursor: pointer; font-weight: 900; }
        .hub-result-badge { font-size: 46px; line-height: 1; margin-bottom: 8px; }
        .hub-result-alert { display: inline-flex; padding: 8px 12px; border-radius: 99px; color: ${C.pink}; background: ${C.pink}15; border: 1px solid ${C.pink}40; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 14px; }
        .hub-vote-result-card h2 { margin: 0 0 10px; color: #fff; font-size: 25px; line-height: 1.18; font-weight: 900; }
        .hub-vote-result-card p { color: ${C.muted}; font-size: 12px; line-height: 1.55; margin: 0 0 14px; }
        .hub-result-xp { display: inline-flex; align-items: center; justify-content: center; min-width: 150px; padding: 12px 16px; border-radius: 99px; color: ${C.yellow}; background: ${C.yellow}15; border: 1px solid ${C.yellow}35; font-size: 15px; font-weight: 900; letter-spacing: 1px; margin-bottom: 14px; }
        .hub-result-cta { width: 100%; border: none; border-radius: 14px; padding: 14px 16px; background: linear-gradient(135deg, ${C.orange}, ${C.yellow}); color: #fff; font-family: inherit; font-size: 14px; font-weight: 900; cursor: pointer; margin-bottom: 12px; }
        .hub-result-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .hub-result-actions button { border: 1px solid ${C.border}; border-radius: 12px; padding: 10px 6px; background: rgba(255,255,255,.06); color: ${C.muted}; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
        .hub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .hub-primary-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .hub-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px; padding: 14px 12px; text-align: left; cursor: pointer; font-family: inherit; color: inherit; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.15s; }
        .hub-card:active { transform: scale(0.97); }
        .hub-card::before { content: ''; position: absolute; top: -20px; right: -20px; width: 60px; height: 60px; background: radial-gradient(circle, color-mix(in srgb, var(--hub-glow) 20%, transparent), transparent 70%); }
        .hub-card-icon { font-size: 26px; margin-bottom: 8px; }
        .hub-card-title { font-size: 13px; font-weight: 900; color: #fff; margin-bottom: 2px; }
        .hub-card-sub { font-size: 10px; color: ${C.muted}; margin-bottom: 10px; }
        .hub-card-badge { display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 0.5px; padding: 4px 8px; border-radius: 6px; border: 1px solid; }
        .hub-section { margin-bottom: 14px; }
        .hub-section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .hub-section-head h3 { font-size: 14px; font-weight: 900; color: #fff; }
        .hub-link { background: none; border: none; color: ${C.purple}; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .hub-fan-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
        .hub-fan-row:last-child { border-bottom: none; }
        .hub-fan-rank { font-size: 16px; width: 24px; text-align: center; }
        .hub-fan-name { flex: 1; font-size: 13px; font-weight: 700; color: #fff; }
        .hub-fan-xp { font-size: 13px; font-weight: 900; color: ${C.yellow}; }
        .hub-activity-feed { display: flex; flex-direction: column; gap: 8px; }
        .hub-activity-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,.055), rgba(255,255,255,.025)); border: 1px solid ${C.border}; }
        .hub-activity-dot { width: 8px; height: 8px; border-radius: 50%; background: ${C.green}; box-shadow: 0 0 14px ${C.green}80; flex-shrink: 0; }
        .hub-activity-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .hub-activity-copy strong { font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hub-activity-copy span { font-size: 10px; color: ${C.muted}; line-height: 1.35; }
        .hub-activity-item em { font-style: normal; font-size: 9px; font-weight: 900; letter-spacing: 1px; color: ${C.yellow}; padding: 4px 7px; border-radius: 99px; background: ${C.yellow}14; border: 1px solid ${C.yellow}35; flex-shrink: 0; }
        .hub-games-backdrop { position: fixed; inset: 0; z-index: 130; background: rgba(0,0,0,.62); display: flex; align-items: flex-end; justify-content: center; }
        .hub-games-sheet { width: 100%; max-width: 480px; max-height: 72dvh; overflow-y: auto; padding: 10px 14px max(18px, env(safe-area-inset-bottom)); background: #0d0d1b; border: 1px solid ${C.borderBright}; border-bottom: 0; border-radius: 20px 20px 0 0; animation: sheetIn .26s cubic-bezier(.16,1,.3,1); box-shadow: 0 -20px 60px rgba(0,0,0,.45); }
        .hub-games-handle { width: 44px; height: 4px; border-radius: 99px; background: rgba(255,255,255,.22); margin: 0 auto 12px; }
        .react-play-more { margin-top: 18px; padding: 14px; border-radius: 16px; background: ${C.card}; border: 1px solid ${C.border}; }
        .react-play-more p { color: #fff; font-size: 14px; font-weight: 900; margin: 10px 0 0; text-align: center; }
        .react-play-more > button { width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; border: none; border-radius: 14px; padding: 13px 14px; background: linear-gradient(135deg, ${C.purple}, #6d28d9); color: #fff; font-family: inherit; font-size: 13px; font-weight: 900; cursor: pointer; }
        .react-game-card { position: relative; min-height: 82px; text-align: left; padding: 12px 10px; border-radius: 12px; border: 1px solid ${C.borderBright}; background: rgba(255,255,255,.055); color: #fff; font-family: inherit; cursor: pointer; }
        .react-game-card strong { display: block; font-size: 12px; font-weight: 900; margin-bottom: 4px; }
        .react-game-card small { display: block; color: ${C.muted}; font-size: 10px; line-height: 1.35; padding-right: 30px; }
        .react-game-card em { position: absolute; right: 8px; bottom: 8px; font-style: normal; color: ${C.yellow}; font-size: 9px; font-weight: 900; padding: 3px 6px; border-radius: 99px; background: ${C.yellow}14; border: 1px solid ${C.yellow}35; }

        .promo-reveal { opacity: 0; transform: translateY(6px); transition: opacity 0.45s ease, transform 0.45s ease; pointer-events: none; }
        .promo-reveal--in { opacity: 1; transform: none; pointer-events: auto; }
        .rewards-page .rewards-header { text-align: center; margin-bottom: 20px; }
        .rewards-page .rewards-header h2 { font-size: 22px; font-weight: 900; color: #fff; margin: 12px 0 6px; }
        .rewards-page .rewards-header p { font-size: 13px; color: ${C.muted}; line-height: 1.6; margin: 0; }
        .edify-promo-stack { display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px; }
        .edify-promo-stack--compact { gap: 8px; margin-bottom: 0; }
        .edify-promo-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px; overflow: hidden; }
        .edify-promo-label { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 10px 12px 8px; border-bottom: 1px solid ${C.border}; }
        .edify-promo-label-title { font-size: 12px; font-weight: 900; color: ${C.yellow}; letter-spacing: 0.3px; }
        .edify-promo-label-sub { font-size: 10px; color: ${C.muted}; font-weight: 600; text-align: right; flex-shrink: 0; max-width: 52%; }
        .edify-promo-body { padding: 12px; }
        .edify-promo-hero-title { font-size: 14px; font-weight: 900; color: ${C.yellow}; margin: 0 0 12px; line-height: 1.35; letter-spacing: 0.2px; }
        .edify-promo-block { margin-bottom: 14px; }
        .edify-promo-block-label { font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${C.muted}; margin: 0 0 8px; }
        .edify-promo-moments { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; }
        .edify-promo-moments li { font-size: 11px; color: rgba(255,255,255,0.82); display: flex; align-items: center; gap: 6px; }
        .edify-promo-moment-icon { font-size: 14px; flex-shrink: 0; }
        .edify-promo-highlight { display: flex; gap: 10px; padding: 10px; border-radius: 12px; background: ${C.purple}12; border: 1px solid ${C.purple}35; margin-bottom: 12px; }
        .edify-promo-highlight-icon { font-size: 22px; flex-shrink: 0; }
        .edify-promo-highlight p { margin: 0 0 6px; font-size: 12px; color: #fff; font-weight: 700; }
        .edify-promo-highlight p:last-child { margin-bottom: 0; }
        .edify-promo-muted { font-size: 11px !important; color: ${C.muted} !important; font-weight: 500 !important; line-height: 1.55; }
        .edify-promo-muted strong { color: rgba(255,255,255,0.75); }
        .edify-promo-excited { font-size: 12px; color: ${C.orange}; font-weight: 700; margin: 0 0 14px; line-height: 1.5; }
        .edify-promo-prizes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .edify-promo-prizes li { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #fff; font-weight: 600; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid ${C.border}; }
        .edify-promo-prizes li span:first-child { font-size: 18px; }
        .edify-promo-rules { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        .edify-promo-rules li { display: flex; align-items: flex-start; gap: 10px; font-size: 11px; color: rgba(255,255,255,0.78); line-height: 1.45; }
        .edify-promo-rule-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: ${C.yellow}22; color: ${C.yellow}; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
        .edify-promo-featured { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: linear-gradient(90deg, ${C.yellow}18, transparent); border: 1px solid ${C.yellow}40; }
        .edify-promo-featured span { font-size: 22px; }
        .edify-promo-featured p { margin: 0; font-size: 11px; font-weight: 700; color: ${C.yellow}; line-height: 1.45; }
        .edify-promo-future { display: flex; flex-direction: column; gap: 12px; }
        .edify-promo-future-row { display: flex; gap: 12px; align-items: flex-start; }
        .edify-promo-future-icon { font-size: 28px; flex-shrink: 0; }
        .edify-promo-future-row p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.85); line-height: 1.55; }
        .edify-promo-future-row strong { color: ${C.yellow}; }
        .edify-promo-future-teaser { text-align: center; padding: 14px 12px; border-radius: 14px; background: linear-gradient(160deg, ${C.purple}22, ${C.blue}15); border: 1px solid ${C.purple}45; }
        .edify-promo-future-badge { display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: ${C.purple}; margin-bottom: 8px; }
        .edify-promo-future-teaser h4 { margin: 0 0 8px; font-size: 16px; font-weight: 900; color: #fff; }
        .edify-promo-compact .edify-promo-hero-title { font-size: 13px; margin-bottom: 8px; }
        .edify-promo-lead { font-size: 11px; color: ${C.muted}; margin: 0 0 10px; line-height: 1.5; }
        .edify-promo-lead strong { color: #e8e4ff; }
        .edify-promo-prize-chips { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .edify-promo-prize-chips li { font-size: 11px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 8px; }
        .edify-promo-cta { padding: 0 2px 4px; }
        .edify-promo-cta p { font-size: 11px; color: ${C.muted}; line-height: 1.55; margin: 0 0 10px; }
        .edify-promo-cta p strong { color: #e8e4ff; font-weight: 800; }
        .edify-promo-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 11px 16px; border-radius: 12px; background: linear-gradient(135deg, ${C.purple}, #6d28d9); color: #fff; font-size: 13px; font-weight: 800; text-decoration: none; border: 1px solid ${C.purple}80; box-shadow: 0 4px 20px ${C.purple}35; box-sizing: border-box; }
        .edify-promo-btn--inline { width: auto; font-size: 12px; padding: 8px 14px; }
        .edify-promo-btn:active { transform: scale(0.98); }

        .ranks-page { padding-top: 8px; }
        .ranks-hero { text-align: center; margin-bottom: 16px; }
        .ranks-title { font-size: 26px; font-weight: 900; color: #fff; margin-top: 12px; }
        .ranks-tabs { display: flex; gap: 8px; overflow-x: auto; margin-bottom: 18px; padding-bottom: 4px; }
        .ranks-tab { flex-shrink: 0; padding: 8px 14px; border-radius: 99px; border: 1px solid ${C.border}; background: transparent; color: ${C.muted}; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .ranks-tab-active { background: ${C.purple}; border-color: ${C.purple}; color: #fff; }
        .ranks-my-rank { display: flex; align-items: center; justify-content: center; gap: 10px; background: ${C.purple}18; border: 1px solid ${C.purple}40; border-radius: 12px; padding: 10px; margin-bottom: 16px; font-size: 13px; color: ${C.muted}; }
        .ranks-my-rank strong { font-size: 22px; color: #fff; }
        .ranks-my-xp { color: ${C.yellow}; font-weight: 800; }
        .ranks-podium { display: flex; align-items: flex-end; justify-content: center; gap: 8px; margin-bottom: 20px; min-height: 160px; }
        .podium-slot { flex: 1; max-width: 110px; display: flex; flex-direction: column; align-items: center; text-align: center; }
        .podium-slot-first { transform: translateY(-12px); }
        .podium-medal { font-size: 20px; margin-bottom: 6px; }
        .podium-name { font-size: 11px; font-weight: 800; color: #fff; margin-top: 8px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .podium-xp { font-size: 11px; font-weight: 900; color: ${C.yellow}; margin-top: 2px; }
        .podium-bar { width: 100%; margin-top: 10px; border-radius: 8px 8px 0 0; }
        .podium-bar-1 { height: 72px; background: linear-gradient(180deg, ${C.yellow}55, ${C.yellow}22); border: 1px solid ${C.yellow}40; }
        .podium-bar-2 { height: 52px; background: linear-gradient(180deg, rgba(192,192,192,0.35), rgba(192,192,192,0.12)); border: 1px solid rgba(192,192,192,0.3); }
        .podium-bar-3 { height: 40px; background: linear-gradient(180deg, rgba(205,127,50,0.35), rgba(205,127,50,0.12)); border: 1px solid rgba(205,127,50,0.3); }
        .ranks-list { display: flex; flex-direction: column; gap: 8px; }
        .ranks-row { display: flex; align-items: center; gap: 12px; background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; padding: 12px 14px; }
        .ranks-row-me { border-color: ${C.purple}50; background: ${C.purple}10; }
        .ranks-row-num { font-size: 12px; font-weight: 800; color: ${C.muted}; width: 28px; }
        .ranks-row-info { flex: 1; min-width: 0; }
        .ranks-row-name { font-size: 13px; font-weight: 800; color: #fff; }
        .ranks-row-badge { font-size: 10px; color: ${C.muted}; margin-top: 2px; }
        .ranks-row-xp { text-align: right; }
        .ranks-row-xp-val { font-size: 14px; font-weight: 900; color: ${C.yellow}; }
        .ranks-row-xp-sub { font-size: 12px; text-align: right; margin-top: 2px; }
      `}</style>
      <AuthProvider>
        <MatchProvider slug={slug}>
          <AppInner />
        </MatchProvider>
      </AuthProvider>
    </div>
  )
}
