import { useState } from 'react'
import type { AppScreen, UserInfo, Responses, ChoiceLabel } from './types'
import { QUESTIONS } from './data/questions'
import RegistrationScreen from './screens/RegistrationScreen'
import QuestionScreen from './screens/QuestionScreen'
import CompletionScreen from './screens/CompletionScreen'

export default function App() {
  const [screen, setScreen]               = useState<AppScreen>('registration')
  const [user, setUser]                   = useState<UserInfo | null>(null)
  const [currentIndex, setCurrentIndex]   = useState(0)
  const [responses, setResponses]         = useState<Responses>({})

  function handleRegister(info: UserInfo) {
    setUser(info)
    setCurrentIndex(0)
    setScreen('questions')
  }

  function handleAnswer(questionId: number, choice: ChoiceLabel) {
    setResponses(prev => ({ ...prev, [questionId]: choice }))
  }

  function handleNext() {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      setScreen('completion')
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    }
  }

  function handleBackFromCompletion() {
    setCurrentIndex(QUESTIONS.length - 1)
    setScreen('questions')
  }

  if (screen === 'registration') {
    return <RegistrationScreen onRegister={handleRegister} />
  }

  if (screen === 'questions' && user) {
    return (
      <QuestionScreen
        key={currentIndex}               // remounts on navigation → resets audio
        question={QUESTIONS[currentIndex]}
        questionIndex={currentIndex}
        totalQuestions={QUESTIONS.length}
        responses={responses}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    )
  }

  if (screen === 'completion' && user) {
    return (
      <CompletionScreen
        user={user}
        responses={responses}
        onBack={handleBackFromCompletion}
      />
    )
  }

  return null
}
