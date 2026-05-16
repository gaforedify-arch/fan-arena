import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getPredictionQuestions, submitPrediction, getUserPredictions } from '../lib/supabase'
import { C, GlassCard } from '../components/UI'

export default function PredictTab({ match, onXPEarned }) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState([])
  const [myAnswers, setMyAnswers] = useState({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [qs, preds] = await Promise.all([
          getPredictionQuestions(match.id),
          getUserPredictions(user.id, match.id),
        ])
        setQuestions(qs)
        const map = {}
        preds.forEach(p => { map[p.question_id] = p.answer })
        setMyAnswers(map)
      } catch (e) {
        console.error('[PredictTab] load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [match.id, user.id])

  async function handleAnswer(questionId, answer) {
    if (!match.predictions_open || saving === questionId) return
    setSaving(questionId)
    try {
      await submitPrediction(user.id, match.id, questionId, answer)
      setMyAnswers(prev => ({ ...prev, [questionId]: answer }))
      onXPEarned?.()
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
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
        <p style={{ fontSize: 12, color: C.muted }}>+75 XP per correct answer</p>
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
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{q.question_text}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, i) => (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  onClick={() => handleAnswer(q.id, opt)}
                  disabled={!canAnswer || saving === q.id}
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
          </GlassCard>
        )
      })}
      {canAnswer && (
        <p style={{ textAlign: 'center', fontSize: 11, color: C.muted }}>You can change answers before the match ends</p>
      )}
    </div>
  )
}
