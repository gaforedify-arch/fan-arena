import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, getPredictionQuestions, submitPrediction, getUserPredictions } from '../lib/supabase'
import { matchAnalyticsParams, trackEvent } from '../lib/analytics'
import { C, GlassCard } from '../components/UI'
import AuthPromptModal from './AuthPromptModal'

export default function PredictTab({ match }) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [myAnswers, setMyAnswers] = useState({})
  const [resultByQ, setResultByQ] = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loginNotice, setLoginNotice] = useState('')
  const [showLoginPop, setShowLoginPop] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [qs, preds] = await Promise.all([
          getPredictionQuestions(match.id),
          user?.id ? getUserPredictions(user.id, match.id) : Promise.resolve([]),
        ])
        setQuestions(qs)
        const map = {}
        const results = {}
        preds.forEach(p => {
          map[p.question_id] = p.answer
          results[p.question_id] = {
            is_correct: p.is_correct,
            xp_awarded: p.xp_awarded,
          }
          if (p.submitted) setSubmitted(true)
        })
        setMyAnswers(map)
        setResultByQ(results)
      } catch (e) {
        console.error('[PredictTab] load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [match.id, user?.id])

  async function handleAnswer(questionId, answer) {
    if (!match.predictions_open || saving === questionId || submitted || myAnswers[questionId]) return
    trackEvent('fan_arena_predict_option_click', {
      ...matchAnalyticsParams(match, user),
      contest_type: 'prediction',
      question_id: questionId,
      answer,
    })
    if (!user?.id) {
      setLoginNotice('Login to lock predictions and earn XP instantly.')
      setShowLoginPop(true)
      return
    }
    setSaving(questionId)
    try {
      await submitPrediction(user.id, match.id, questionId, answer)
      setMyAnswers(prev => ({ ...prev, [questionId]: answer }))
      trackEvent('fan_arena_predict_option_saved', {
        ...matchAnalyticsParams(match, user),
        contest_type: 'prediction',
        question_id: questionId,
        answer,
      })
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }


  async function handleSubmitPredictions() {
  if (!user?.id) {
    setLoginNotice('Login to submit predictions and earn XP.')
    setShowLoginPop(true)
    return
  }
  try {
    const { error } = await supabase
      .from('predictions')
      .update({ submitted: true })
      .eq('user_id', user.id)
      .eq('match_id', match.id)
    if (error) throw error
    setSubmitted(true)
    trackEvent('fan_arena_predictions_submitted', {
      ...matchAnalyticsParams(match, user),
      contest_type: 'prediction',
      answered_count: answered,
      question_count: questions.length,
    })
    alert('Predictions submitted successfully!')
  } catch (e) {
    alert(e.message)
  }
}

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading predictions...</div>

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: C.muted, fontSize: 14 }}>Prediction questions not added yet.<br />Check back shortly.</p>
      </div>
    )
  }

  const canAnswer = !!match.predictions_open
  const answered = Object.keys(myAnswers).length

  return (
    <div>
      <AuthPromptModal
        open={showLoginPop}
        match={match}
        icon="🎯"
        title="Lock your prediction"
        message="Your cricket instinct is ready. Login to save predictions, join the leaderboard, and earn XP when your calls are correct."
        cta="Login & predict"
        screen="predict"
        trigger="guest_prediction"
        onClose={() => setShowLoginPop(false)}
      />
      {!canAnswer && (
        <div style={{
          background: `${C.orange}15`, border: `1px solid ${C.orange}40`,
          borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: C.orange, lineHeight: 1.5,
        }}>
          Predictions are not open yet. Preview questions below — tap answers once staff opens predictions.
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>Match Predictions</h2>
        <p style={{ fontSize: 12, color: C.muted }}>
          {user ? '+100 XP instantly for every prediction · each pick is final' : 'Preview all questions · login to submit and earn XP'}
        </p>
        {loginNotice && (
          <p style={{ fontSize: 12, color: C.yellow, marginTop: 8, fontWeight: 700 }}>{loginNotice}</p>
        )}
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
          <GlassCard key={q.id} style={{ marginBottom: 14 }}>
            {q.players?.name && (
              <p style={{ fontSize: 10, fontWeight: 800, color: C.purple, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>
                About {q.players.name}{q.players.jersey_no ? ` #${q.players.jersey_no}` : ''}
              </p>
            )}
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{q.question_text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  onClick={() => handleAnswer(q.id, opt)}
                  disabled={!canAnswer || saving === q.id || submitted || !!myAnswer}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    cursor: canAnswer ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                    opacity: canAnswer ? 1 : 0.65,
                    background: myAnswer === opt ? `${C.purple}25` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${myAnswer === opt ? C.purple : C.border}`,
                    color: myAnswer === opt ? '#fff' : C.muted,
                    fontWeight: myAnswer === opt ? 700 : 400, transition: 'all 0.2s',
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
      {canAnswer && (
  <div style={{ marginTop: 18 }}>

    <button
      type="button"
      disabled={submitted || answered !== questions.length}
      onClick={handleSubmitPredictions}
      style={{
        width: '100%',
        padding: '14px 0',
        borderRadius: 12,
        border: 'none',
        background:
          submitted
            ? 'rgba(255,255,255,0.08)'
            : `linear-gradient(135deg, ${C.green}, ${C.blue})`,
        color: '#fff',
        fontWeight: 800,
        fontSize: 14,
        cursor:
          submitted
            ? 'not-allowed'
            : 'pointer',
        opacity:
          answered !== questions.length && !submitted
            ? 0.5
            : 1,
      }}
    >
      {submitted
        ? 'Predictions Submitted'
        : 'Submit Predictions'}
    </button>

    {!submitted && (
      <p style={{
        textAlign: 'center',
        fontSize: 11,
        color: C.muted,
        marginTop: 10
      }}>
        Once submitted, answers cannot be changed.
      </p>
    )}

  </div>
)}
    </div>
  )
}
