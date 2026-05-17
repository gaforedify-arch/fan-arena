import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { MatchProvider, useMatch, MATCH_STATE } from './hooks/useMatch'
import { parseHash } from './lib/hashRouter'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import ArenaShell from './pages/ArenaShell'
import { WaitingPage, RedirectPage, NotFoundPage, MatchHomePage } from './pages/StatusPages'
import AdminPanel from './admin/AdminPanel'
import { C } from './components/UI'

function AppInner() {
  const route = parseHash()
  const slug = route.type === 'match' ? route.slug : null
  const tab = route.type === 'match' ? route.tab : 'home'

  const { user, profile, loading: authLoading } = useAuth()
  const { match, matchState, nextMatch, loading: matchLoading } = useMatch()

  if (route.type === 'admin') return <AdminPanel />
  if (authLoading) return <LoadingScreen />
  if (!user) return <LoginPage />
  if (!profile) return <OnboardingPage />
  if (!slug) return <MatchHomePage />
  if (matchLoading) return <LoadingScreen />

  switch (matchState) {
    case MATCH_STATE.ACTIVE:
    case MATCH_STATE.NOT_STARTED:
      return <ArenaShell match={match} tab={tab} />
    case MATCH_STATE.COMPLETED:
      if (tab && tab !== 'home') {
        return <ArenaShell match={match} tab={tab} />
      }
      return <RedirectPage match={match} nextMatch={nextMatch} />
    case MATCH_STATE.NOT_FOUND:
      return <NotFoundPage nextMatch={nextMatch} />
    default:
      return <ArenaShell match={match} tab={tab} />
  }
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(168,85,247,0.3)', borderTop: `3px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: C.muted, marginTop: 16, fontSize: 13 }}>Loading arena...</p>
    </div>
  )
}

export default function App() {
  const [, setHashTick] = useState(0)

  useEffect(() => {
    function onHash() { setHashTick(t => t + 1) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const route = parseHash()
  const slug = route.type === 'match' ? route.slug : null

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
        .hub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
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
