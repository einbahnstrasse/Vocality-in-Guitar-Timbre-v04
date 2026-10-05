export type ChoiceLabel = 'A' | 'B' | 'C' | 'D'

export interface Choice {
  label: ChoiceLabel
  file: string
  displayLabel: string
}

export interface Question {
  id: number
  title: string
  target: {
    file: string
    displayLabel: string
  }
  choices: Choice[]
}

export interface UserInfo {
  firstName: string
  lastName: string
}

// questionId (1-based) → chosen label
export type Responses = Record<number, ChoiceLabel>

export type AppScreen = 'registration' | 'questions' | 'completion'
