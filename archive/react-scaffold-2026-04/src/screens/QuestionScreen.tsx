import { useRef, useState, useEffect } from 'react'
import type { Question, ChoiceLabel, Responses } from '../types'

interface Props {
  question: Question
  questionIndex: number
  totalQuestions: number
  responses: Responses
  onAnswer: (questionId: number, choice: ChoiceLabel) => void
  onNext: () => void
  onPrev: () => void
}

// Animated waveform bars shown while a sound is playing
function Waveform() {
  return (
    <span className="waveform" aria-hidden>
      <span /><span /><span /><span /><span />
    </span>
  )
}

// Play icon (triangle)
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
      <path d="M2 1.5l10 5.5-10 5.5z" />
    </svg>
  )
}

export default function QuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  responses,
  onAnswer,
  onNext,
  onPrev,
}: Props) {
  // Which audio id is currently playing: 'target' | 'A' | 'B' | 'C' | 'D' | null
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selectedAnswer = responses[question.id] ?? null
  const isFirstQuestion = questionIndex === 0
  const isLastQuestion  = questionIndex === totalQuestions - 1
  const progressPct     = ((questionIndex + 1) / totalQuestions) * 100

  // Stop audio whenever the question changes
  useEffect(() => {
    stopAudio()
  }, [question.id])

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    setPlayingId(null)
  }

  function playAudio(id: string, src: string) {
    // If the same sound is already playing, restart it
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    setPlayingId(id)
    const audio = new Audio(src)
    audioRef.current = audio
    audio.play().catch(() => {
      // Autoplay blocked or file missing — silently clear state
      setPlayingId(null)
      audioRef.current = null
    })
    audio.onended = () => {
      setPlayingId(null)
      audioRef.current = null
    }
  }

  const choiceColors: Record<ChoiceLabel, string> = {
    A: 'rgba(251,146,60,',   // orange
    B: 'rgba(96,165,250,',   // blue
    C: 'rgba(167,139,250,',  // violet
    D: 'rgba(52,211,153,',   // emerald
  }

  return (
    <div className="flex flex-col min-h-dvh px-4 py-6 max-w-lg mx-auto animate-slide-up">

      {/* ── Top: progress + question counter ── */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-slate-500">
            {question.title}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── Target sound ── */}
      <section className="glass p-4 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          🎵 Target Sound
        </p>
        <button
          className={`play-btn target ${playingId === 'target' ? 'playing' : ''}`}
          onClick={() => playAudio('target', question.target.file)}
        >
          {playingId === 'target' ? <Waveform /> : <PlayIcon />}
          <span>{question.target.displayLabel}</span>
        </button>
        <p className="text-xs text-slate-500 mt-2 pl-1">
          Listen to this first. You can replay it at any time.
        </p>
      </section>

      {/* ── Listen to options ── */}
      <section className="glass p-4 mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          🎸 Listen to Options
        </p>
        <div className="flex flex-col gap-2">
          {question.choices.map(choice => {
            const isPlaying = playingId === choice.label
            const color = choiceColors[choice.label]
            return (
              <button
                key={choice.label}
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={() => playAudio(choice.label, choice.file)}
                style={
                  isPlaying
                    ? undefined
                    : { borderColor: `${color}0.3)`, color: '#e2e8f0' }
                }
              >
                {/* Letter badge */}
                <span
                  className="choice-badge"
                  style={{
                    background: `${color}0.25)`,
                    borderColor: `${color}0.5)`,
                    color: `${color}1)`,
                  }}
                >
                  {choice.label}
                </span>

                {/* Waveform or play icon */}
                {isPlaying ? <Waveform /> : <PlayIcon />}

                <span className="text-left flex-1">{choice.displayLabel}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Choose answer ── */}
      <section className="glass p-4 mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          ✅ Your Answer
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Which option best matches the target sound?
        </p>
        <div className="flex gap-2">
          {(['A', 'B', 'C', 'D'] as ChoiceLabel[]).map(label => {
            const color = choiceColors[label]
            const isSelected = selectedAnswer === label
            return (
              <button
                key={label}
                className={`answer-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onAnswer(question.id, label)}
                style={
                  isSelected
                    ? undefined
                    : { borderColor: `${color}0.25)`, color: `${color}0.7)` }
                }
              >
                {label}
              </button>
            )
          })}
        </div>
        {selectedAnswer && (
          <p className="text-xs text-emerald-400 mt-2 pl-1 animate-fade-in">
            You chose <strong>{selectedAnswer}</strong> — {
              question.choices.find(c => c.label === selectedAnswer)?.displayLabel
            }
          </p>
        )}
      </section>

      {/* ── Navigation ── */}
      <div className="flex gap-3 mt-auto">
        <button
          className="nav-btn flex-1"
          onClick={onPrev}
          disabled={isFirstQuestion}
        >
          ← Previous
        </button>
        <button
          className="nav-btn primary flex-1"
          onClick={onNext}
        >
          {isLastQuestion ? 'Finish' : 'Next →'}
        </button>
      </div>

      {/* Unanswered nudge */}
      {!selectedAnswer && (
        <p className="text-xs text-slate-500 text-center mt-3">
          Select an answer above before continuing, or skip with Next.
        </p>
      )}
    </div>
  )
}
