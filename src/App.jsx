import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { MatchProvider, useMatch, MATCH_STATE } from './hooks/useMatch'
import LoginPage      from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MatchPage      from './pages/MatchPage'
import { WaitingPage, RedirectPage, NotFoundPage, MatchHomePage } from './pages/StatusPages'
import AdminPanel     from './admin/AdminPanel'
import { C } from './components/UI'

function getSlugFromHash() {
  const hash = window.location.hash.replace('#', '')
  const parts = hash.split('/')
  if (parts[1] === 'match' && parts[2]) return parts[2]
  if (parts[1] === 'admin') return '__admin__'
  return null
}

function AppInner({ slug }) {
  const { user, profile, loading: authLoading } = useAuth()
  const { match, matchState, nextMatch, loading: matchLoading } = useMatch()

  if (slug === '__admin__') return <AdminPanel />
  if (authLoading) return <LoadingScreen />
  if (!user) return <LoginPage />
  if (!profile) return <OnboardingPage />
  if (!slug) return <MatchHomePage />
  if (matchLoading) return <LoadingScreen />

  switch (matchState) {
    case MATCH_STATE.ACTIVE:      return <MatchPage match={match} />
    case MATCH_STATE.COMPLETED:   return <RedirectPage match={match} nextMatch={nextMatch} />
    case MATCH_STATE.NOT_STARTED: return <WaitingPage match={match} />
    default:                      return <NotFoundPage nextMatch={nextMatch} />
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
  const [slug, setSlug] = useState(getSlugFromHash)

  useEffect(() => {
    function onHash() { setSlug(getSlugFromHash()) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div id="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body { background: #07070f; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
        #app-root { min-height: 100dvh; width: 100%; max-width: 480px; margin: 0 auto; background: ${C.bg}; font-family: 'Sora', sans-serif; color: #fff; overflow-x: hidden; }
        button, input, select { font-size: 16px; }
        .match-shell { display: flex; flex-direction: column; min-height: 100dvh; }
        .match-header { background: linear-gradient(160deg, #170930, #0c1838); padding: max(12px, env(safe-area-inset-top)) 14px 14px; border-bottom: 1px solid ${C.border}; }
        .match-header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
        .match-header-actions { display: flex; align-items: center; gap: 10px; }
        .logout-btn { padding: 8px 12px; border-radius: 10px; border: 1px solid ${C.border}; background: rgba(255,255,255,0.06); color: ${C.muted}; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .score-row { display: flex; align-items: center; gap: 8px; }
        .score-team { flex: 1; text-align: center; min-width: 0; }
        .score-name { font-size: clamp(11px, 3vw, 13px); font-weight: 900; }
        .score-val { font-size: clamp(18px, 5vw, 24px); font-weight: 900; }
        .score-vs { text-align: center; flex-shrink: 0; font-size: 10px; font-weight: 900; color: ${C.muted}; letter-spacing: 2px; }
        .score-over { font-size: 9px; color: ${C.orange}; margin-top: 4px; }
        .tab-bar { display: flex; background: ${C.surface}; border-bottom: 1px solid ${C.border}; overflow-x: auto; }
        .tab-btn { flex: 1; min-width: 72px; padding: 12px 6px; background: none; border: none; border-bottom: 2px solid transparent; color: ${C.muted}; font-size: 10px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .tab-btn-active { color: ${C.purple}; border-bottom-color: ${C.purple}; }
        .match-content { flex: 1; overflow-y: auto; padding: 14px; padding-bottom: max(20px, env(safe-area-inset-bottom)); }
        .admin-shell { min-height: 100dvh; max-width: 640px; margin: 0 auto; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 99px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-120px) scale(1.3);opacity:0} }
        input::placeholder { color: rgba(255,255,255,0.25); }
        select option { background: #121220; }
      `}</style>
      <AuthProvider>
        <MatchProvider slug={slug === '__admin__' ? null : slug}>
          <AppInner slug={slug} />
        </MatchProvider>
      </AuthProvider>
    </div>
  )
}