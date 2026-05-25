import { useEffect, useState } from 'react'
import {
  adminGetQuizQuestions,
  adminCreateQuizQuestion,
  adminUpdateQuizQuestion,
  adminDeleteQuizQuestion,
  adminUpdateMatch,
  adminPayQuizQuestion,
} from '../lib/supabase'
import { C, SectionLabel } from '../components/UI'

const inpStyle = { background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: "'Sora', sans-serif", outline: 'none', boxSizing: 'border-box' }
const smallBtn = { background: 'none', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.42)', fontSize: 11, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }

export default function QuizQuestionsManager({ match, onUpdated, flash }) {
  const matchId = match.id
  const [questions, setQuestions] = useState([])
  const [adding, setAdding] = useState(false)
  const [qform, setQForm] = useState({ question_key: '', question_text: '', options: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ question_text: '', options: '' })

  async function load() {
    setQuestions(await adminGetQuizQuestions(matchId))
  }

  useEffect(() => { load() }, [matchId])

  function qset(k) { return e => setQForm(f => ({ ...f, [k]: e.target.value })) }

  async function addQuestion() {
    if (!qform.question_key.trim() || !qform.question_text.trim() || !qform.options.trim()) {
      alert('Fill in key, question text, and options.')
      return
    }
    try {
      const opts = [...new Set(qform.options.split(',').map(o => o.trim()).filter(Boolean))]
      if (opts.length < 2) { alert('Add at least 2 unique options.'); return }
      await adminCreateQuizQuestion({
        match_id: matchId,
        question_key: qform.question_key.trim(),
        question_text: qform.question_text.trim(),
        options: opts,
      })
      if (!match.quiz_open) {
        await adminUpdateMatch(matchId, { quiz_open: true })
        flash('Quiz question added — quiz opened for fans')
      } else {
        flash('Quiz question added')
      }
      setAdding(false)
      setQForm({ question_key: '', question_text: '', options: '' })
      load()
      onUpdated()
    } catch (e) { alert(e.message) }
  }

  async function setCorrect(questionId, answer) {
    try {
      await adminUpdateQuizQuestion(questionId, { correct_answer: answer })
      let paid = 0
      try {
        paid = await adminPayQuizQuestion(questionId)
      } catch { /* trigger may have paid */ }
      flash(
        paid > 0
          ? `Correct: "${answer}" — +100 XP to ${paid} fan(s)`
          : `Correct answer set: "${answer}" (green). Fans with this pick get +100 XP.`
      )
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  function startEdit(question) {
    setEditingId(question.id)
    setEditForm({
      question_text: question.question_text || '',
      options: Array.isArray(question.options) ? question.options.join(', ') : JSON.parse(question.options).join(', '),
    })
  }

  async function saveEdit(questionId) {
    const opts = [...new Set(editForm.options.split(',').map(o => o.trim()).filter(Boolean))]
    if (!editForm.question_text.trim() || opts.length < 2) {
      alert('Add question text and at least 2 unique options.')
      return
    }
    try {
      await adminUpdateQuizQuestion(questionId, {
        question_text: editForm.question_text.trim(),
        options: opts,
      })
      setEditingId(null)
      flash('Quiz question updated')
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  async function deleteQuestion(questionId) {
    if (!window.confirm('Delete this quiz question?')) return
    try {
      await adminDeleteQuizQuestion(questionId)
      flash('Quiz question deleted')
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel>Match Quiz</SectionLabel>
        <button type="button" onClick={() => setAdding(a => !a)} style={smallBtn}>{adding ? 'Cancel' : '+ Add'}</button>
      </div>
      {!match.quiz_open && questions.length > 0 && (
        <p style={{ fontSize: 11, color: C.orange, marginBottom: 8 }}>
          Fans cannot answer until you tap <strong>Open Quiz</strong> above.
        </p>
      )}
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
        Separate from predictions. Tap the correct option (green ✓) — fans get <strong style={{ color: C.yellow }}>+100 XP</strong> per correct quiz answer.
      </p>

      {adding && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <input placeholder="Key (e.g. q1)" value={qform.question_key} onChange={qset('question_key')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <input placeholder="Question text" value={qform.question_text} onChange={qset('question_text')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <input placeholder="Options (comma separated)" value={qform.options} onChange={qset('options')} style={{ ...inpStyle, width: '100%', marginBottom: 8 }} />
          <button type="button" onClick={addQuestion} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: C.purple, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Add Quiz Question</button>
        </div>
      )}

      {questions.map(q => {
        const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options)
        return (
          <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {editingId === q.id ? (
                <input
                  value={editForm.question_text}
                  onChange={e => setEditForm(f => ({ ...f, question_text: e.target.value }))}
                  style={{ ...inpStyle, flex: 1 }}
                />
              ) : (
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1 }}>{q.question_text}</div>
              )}
              {editingId === q.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => saveEdit(q.id)} style={{ ...smallBtn, color: C.green, borderColor: `${C.green}60` }}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} style={smallBtn}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => startEdit(q)} style={{ ...smallBtn, color: C.blue, borderColor: `${C.blue}60` }}>Edit</button>
                  <button type="button" onClick={() => deleteQuestion(q.id)} style={{ ...smallBtn, color: C.red, borderColor: `${C.red}50` }}>Delete</button>
                </div>
              )}
            </div>
            {editingId === q.id && (
              <input
                placeholder="Options (comma separated)"
                value={editForm.options}
                onChange={e => setEditForm(f => ({ ...f, options: e.target.value }))}
                style={{ ...inpStyle, width: '100%', marginBottom: 10 }}
              />
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {opts.map((opt, i) => (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  onClick={() => setCorrect(q.id, opt)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 11,
                    border: `1px solid ${q.correct_answer === opt ? C.green : C.border}`,
                    background: q.correct_answer === opt ? `${C.green}20` : 'transparent',
                    color: q.correct_answer === opt ? C.green : C.muted,
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: q.correct_answer === opt ? 700 : 400,
                  }}
                >
                  {q.correct_answer === opt ? '✓ ' : ''}{opt}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
