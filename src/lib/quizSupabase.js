// Quiz-specific Supabase helpers.
// Kept separate so existing code paths remain untouched.

import { supabase } from './supabase'


function ensureArray(v) {
  return Array.isArray(v) ? v : []
}

export async function getQuizQuestions(matchId, { useRest = false } = {}) {
  if (useRest) {
    // Not implemented: current app uses the main supabase.js restRequest helpers.
    // Keeping this path unimplemented avoids accidental broken behavior.
  }

  try {
    const { data } = await supabase
      .from('quiz_questions')
      .select('id, match_id, question_text, options, correct_answer')
      .eq('match_id', matchId)

    return ensureArray(data)
  } catch {
    // fallback without strict select
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('match_id', matchId)

    return ensureArray(data)
  }
}

export async function submitQuizAnswer(userId, matchId, questionId, answer) {
  const { data: existing } = await supabase
    .from('quiz_answers')
    .select('answer, submitted')
    .eq('user_id', userId)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing?.submitted) throw new Error('Quiz answers are locked')
  if (existing?.answer) throw new Error('You already picked an answer for this quiz question')

  const { data, error } = await supabase
    .from('quiz_answers')
    .insert({
      user_id: userId,
      match_id: matchId,
      question_id: questionId,
      answer,
      submitted: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserQuizAnswers(userId, matchId) {
  const { data } = await supabase
    .from('quiz_answers')
    .select('question_id, answer, is_correct, xp_awarded, submitted')
    .eq('user_id', userId)
    .eq('match_id', matchId)

  return ensureArray(data)
}

