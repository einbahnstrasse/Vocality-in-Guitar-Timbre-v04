import { useState } from 'react'
import type { UserInfo } from '../types'

interface Props {
  onRegister: (user: UserInfo) => void
}

export default function RegistrationScreen({ onRegister }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')

  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onRegister({ firstName: firstName.trim(), lastName: lastName.trim() })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-5 py-10 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-4xl mb-3" aria-hidden>🎸</div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Vocality in Guitar Timbre
        </h1>
        <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          A listening experiment exploring how guitar timbre relates to vocal melody.
        </p>
      </div>

      {/* Card */}
      <div className="glass w-full max-w-sm p-6 animate-slide-up">
        <h2 className="text-base font-semibold text-slate-200 mb-5">
          Enter your name to begin
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              First Name
            </label>
            <input
              className="glass-input"
              type="text"
              placeholder="e.g. Jane"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
              autoCapitalize="words"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Last Name
            </label>
            <input
              className="glass-input"
              type="text"
              placeholder="e.g. Smith"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
              autoCapitalize="words"
              required
            />
          </div>

          <button
            type="submit"
            className="submit-btn mt-2"
            disabled={!canSubmit}
          >
            Start Experiment →
          </button>
        </form>
      </div>

      <p className="text-xs text-slate-500 mt-6 text-center max-w-xs">
        Your responses will be recorded anonymously for research purposes.
      </p>
    </div>
  )
}
