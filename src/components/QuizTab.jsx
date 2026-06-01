import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getQuizQuestions, submitQuizAnswer, getUserQuizAnswers } from '../lib/supabase'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C, GlassCard } from '../components/UI'
import AuthPromptModal from './AuthPromptModal'
import PlayMoreGamesSheet from './PlayMoreGamesSheet'

export default function QuizTab({ match, onNavigate }) {
  const { user } = useAuth()
  const isT20 = match?.sport === 'ipl'
  const [questions, setQuestions] = useState([])
  const [myAnswers, setMyAnswers] = useState({})
  const [resultByQ, setResultByQ] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [loginNotice, setLoginNotice] = useState('')
  const [showLoginPop, setShowLoginPop] = useState(false)
  const [showGames, setShowGames] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [qs, answers] = await Promise.all([
          getQuizQuestions(match.id),
          user?.id ? getUserQuizAnswers(user.id, match.id) : Promise.resolve([]),
        ])
        setQuestions(qs)
        const map = {}
        const results = {}
        answers.forEach(a => {
          map[a.question_id] = a.answer
          results[a.question_id] = {
            is_correct: a.is_correct,
            xp_awarded: a.xp_awarded,
          }
        })
        setMyAnswers(map)
        setResultByQ(results)
      } catch (e) {
        console.error('[QuizTab] load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [match.id, user?.id])

  async function handleAnswer(questionId, answer) {
    if (!match.quiz_open || saving === questionId || myAnswers[questionId]) return
    trackEvent('fan_arena_quiz_answer_click', {
      ...matchAnalyticsParams(match, user),
      contest_type: 'quiz',
      question_id: questionId,
      answer,
    })
    if (!user?.id) {
      setLoginNotice('Login to lock quiz answers and earn XP.')
      setShowLoginPop(true)
      return
    }
    setSaving(questionId)
    try {
      await submitQuizAnswer(user.id, match.id, questionId, answer)
      setMyAnswers(prev => ({ ...prev, [questionId]: answer }))
      trackEvent('fan_arena_quiz_answer_saved', {
        ...matchAnalyticsParams(match, user),
        contest_type: 'quiz',
        question_id: questionId,
        answer,
      })
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading quiz...</div>

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📝</div>
        <p style={{ color: C.muted, fontSize: 14 }}>No quiz questions yet.<br />Check back when the match quiz goes live.</p>
        <section className="react-play-more">
          <button type="button" onClick={() => setShowGames(true)}>Play More Games</button>
          <p>Play, earn and swag</p>
        </section>
        <PlayMoreGamesSheet
          open={showGames}
          onClose={() => setShowGames(false)}
          onNavigate={onNavigate}
        />
      </div>
    )
  }

  const canAnswer = !!match.quiz_open
  const answered = Object.keys(myAnswers).length

  return (
    <div>
      <AuthPromptModal
        open={showLoginPop}
        match={match}
        icon="📝"
        title="Save your quiz answer"
        message="You can preview the quiz freely. Login to submit answers, protect your score, and collect XP for correct picks."
        cta="Login & play quiz"
        screen="quiz"
        trigger="guest_quiz_answer"
        onClose={() => setShowLoginPop(false)}
      />
      {!canAnswer && (
        <div style={{
          background: `${C.purple}15`, border: `1px solid ${C.purple}40`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: C.purple, lineHeight: 1.5,
        }}>
          Quiz is not open yet. You can preview questions below — answers unlock when staff opens the quiz.
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Match Quiz</h2>
        <p style={{ fontSize: 12, color: C.muted }}>
          {user ? '+100 XP instantly for every answer · each pick is final' : 'Preview the quiz · login to submit answers and earn XP'}
        </p>
        {loginNotice && (
          <p style={{ fontSize: 12, color: C.yellow, marginTop: 8, fontWeight: 700 }}>{loginNotice}</p>
        )}
        <section className="react-play-more">
          <button type="button" onClick={() => setShowGames(true)}>Play More Games</button>
          <p>Play, earn and swag</p>
        </section>
        {canAnswer && (
          <>
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${(answered / questions.length) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${C.purple}, ${C.blue})`, transition: 'width 0.6s', borderRadius: 99 }} />
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{answered}/{questions.length} answered</p>
          </>
        )}
      </div>

      {questions.map(q => {
        const options = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')
        const myAnswer = myAnswers[q.id]
        return (
          <GlassCard key={q.id} style={isT20 ? {
            marginBottom: 14,
            background: '#ffffff',
            borderColor: '#cbd5e1',
            boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
          } : { marginBottom: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: isT20 ? '#0f172a' : '#fff', marginBottom: 12 }}>{q.question_text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  onClick={() => handleAnswer(q.id, opt)}
                  disabled={!canAnswer || saving === q.id || !!myAnswer}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    cursor: canAnswer ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                    opacity: isT20 ? 1 : canAnswer ? 1 : 0.65,
                    background: myAnswer === opt
                      ? `${C.purple}25`
                      : isT20 ? '#f8fbff' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${myAnswer === opt ? C.purple : isT20 ? '#cbd5e1' : C.border}`,
                    color: myAnswer === opt ? (isT20 ? '#4c1d95' : '#fff') : isT20 ? '#334155' : C.muted,
                    fontWeight: myAnswer === opt ? 800 : isT20 ? 700 : 400,
                  }}
                >
                  {myAnswer === opt && '✓ '}{opt}
                </button>
              ))}
            </div>
            {myAnswer && (
              <p style={{ fontSize: 11, marginTop: 10, marginBottom: 0, color: C.muted }}>
                Your pick is locked.
                <span style={{ display: 'block', color: C.green, fontWeight: 700, marginTop: 4 }}>
                  +100 XP earned!
                </span>
                {resultByQ[q.id]?.is_correct === true && (
                  <span style={{ display: 'block', color: C.green, marginTop: 2 }}>✓ Correct answer!</span>
                )}
                {resultByQ[q.id]?.is_correct === false && (
                  <span style={{ display: 'block', color: C.muted, marginTop: 2 }}>Incorrect — but XP is yours!</span>
                )}
              </p>
            )}
          </GlassCard>
        )
      })}
      <PlayMoreGamesSheet
        open={showGames}
        onClose={() => setShowGames(false)}
        onNavigate={onNavigate}
      />
    </div>
  )
}
