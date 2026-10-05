import { useState } from 'react'
import type { UserInfo, Responses } from '../types'
import { QUESTIONS } from '../data/questions'
import { submitResponses } from '../lib/supabase'

interface Props {
  user: UserInfo
  responses: Responses
  onBack: () => void
}

export default function CompletionScreen({ user, responses, onBack }: Props) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const answeredCount = Object.keys(responses).length
  const totalCount    = QUESTIONS.length

  async function handleSubmit() {
    setStatus('submitting')
    setErrorMsg('')
    try {
      await submitResponses({ user, responses })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-5 text-center animate-fade-in">
        <div className="text-5xl mb-5">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">Thank You!</h1>
        <p className="text-slate-400 max-w-xs leading-relaxed">
          Your responses have been recorded, {user.firstName}. We appreciate your participation in this study.
        </p>
        <div className="glass mt-8 p-4 w-full max-w-sm text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Your Responses
          </p>
          {QUESTIONS.map(q => {
            const answer = responses[q.id]
            return (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-300">{q.title}</span>
                {answer
                  ? <span className="text-sm font-bold text-emerald-400">{answer}</span>
                  : <span className="text-sm text-slate-600 italic">skipped</span>
                }
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-10 animate-slide-up">
      <div className="text-4xl mb-4">🏁</div>
      <h1 className="text-2xl font-bold text-white mb-2 text-center">All Done!</h1>
      <p className="text-slate-400 text-sm text-center max-w-xs mb-8">
        You've reached the end, {user.firstName}. Review your answers below, then submit when ready.
      </p>

      {/* Summary card */}
      <div className="glass w-full max-w-sm p-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Response Summary
          </span>
          <span className="text-xs text-slate-500">
            {answeredCount}/{totalCount} answered
          </span>
        </div>

        {QUESTIONS.map(q => {
          const answer = responses[q.id]
          return (
            <div
              key={q.id}
              className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
            >
              <span className="text-sm text-slate-300">{q.title}</span>
              {answer
                ? (
                  <span className="text-sm font-bold px-3 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(16,185,129,0.2)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(16,185,129,0.4)',
                    }}
                  >
                    {answer}
                  </span>
                )
                : <span className="text-xs text-slate-600 italic">not answered</span>
              }
            </div>
          )
        })}

        {answeredCount < totalCount && (
          <p className="text-xs text-amber-400 mt-3">
            ⚠ {totalCount - answeredCount} question{totalCount - answeredCount > 1 ? 's' : ''} unanswered.
            You can go back and answer them or submit as-is.
          </p>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && (
        <div className="w-full max-w-sm mb-4 px-4 py-3 rounded-xl text-sm text-red-300"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          Submission failed: {errorMsg}. Please try again.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit Responses'}
        </button>
        <button
          className="nav-btn justify-center"
          onClick={onBack}
          disabled={status === 'submitting'}
        >
          ← Review Answers
        </button>
      </div>
    </div>
  )
}
