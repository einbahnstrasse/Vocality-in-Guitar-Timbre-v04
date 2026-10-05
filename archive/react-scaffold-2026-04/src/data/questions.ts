import type { Question } from '../types'

const MEDIA_BASE =
  import.meta.env.VITE_MEDIA_BASE_URL ??
  '/media/Vocality_in_Guitar_Timbre_V.3'

function url(filename: string): string {
  return `${MEDIA_BASE}/${filename}`
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'Melody 1',
    target: {
      file: url('001Voice_melody1.wav'),
      displayLabel: 'Voice Melody 1',
    },
    choices: [
      { label: 'A', file: url('002Guitar_melody1A.wav'), displayLabel: 'Guitar Melody 1A' },
      { label: 'B', file: url('003Guitar_melody1B.wav'), displayLabel: 'Guitar Melody 1B' },
      { label: 'C', file: url('004Guitar_melody1C.wav'), displayLabel: 'Guitar Melody 1C' },
      { label: 'D', file: url('005Guitar_melody1D.wav'), displayLabel: 'Guitar Melody 1D' },
    ],
  },
  {
    id: 2,
    title: 'Melody 2',
    target: {
      file: url('006Voice_melody2.wav'),
      displayLabel: 'Voice Melody 2',
    },
    choices: [
      { label: 'A', file: url('007Guitar_melody2A.wav'), displayLabel: 'Guitar Melody 2A' },
      { label: 'B', file: url('008Guitar_melody2B.wav'), displayLabel: 'Guitar Melody 2B' },
      { label: 'C', file: url('009Guitar_melody2C.wav'), displayLabel: 'Guitar Melody 2C' },
      { label: 'D', file: url('010Guitar_melody2D.wav'), displayLabel: 'Guitar Melody 2D' },
    ],
  },
  {
    id: 3,
    title: 'Melody 3',
    target: {
      file: url('011Voice_melody3.wav'),
      displayLabel: 'Voice Melody 3',
    },
    choices: [
      { label: 'A', file: url('012Guitar_melody3A.wav'), displayLabel: 'Guitar Melody 3A' },
      { label: 'B', file: url('013Guitar_melody3B.wav'), displayLabel: 'Guitar Melody 3B' },
      { label: 'C', file: url('014Guitar_melody3C.wav'), displayLabel: 'Guitar Melody 3C' },
      { label: 'D', file: url('015Guitar_melody3D.wav'), displayLabel: 'Guitar Melody 3D' },
    ],
  },
  {
    id: 4,
    title: 'Melody 4',
    target: {
      file: url('016Voice_melody4.wav'),
      displayLabel: 'Voice Melody 4',
    },
    choices: [
      { label: 'A', file: url('017Guitar_melody4A.wav'), displayLabel: 'Guitar Melody 4A' },
      { label: 'B', file: url('018Guitar_melody4B.wav'), displayLabel: 'Guitar Melody 4B' },
      { label: 'C', file: url('019Guitar_melody4C.wav'), displayLabel: 'Guitar Melody 4C' },
      { label: 'D', file: url('020Guitar_melody4D.wav'), displayLabel: 'Guitar Melody 4D' },
    ],
  },
  {
    id: 5,
    title: 'Melody 5',
    target: {
      file: url('021Voice_melody5.wav'),
      displayLabel: 'Voice Melody 5',
    },
    choices: [
      { label: 'A', file: url('022Guitar_melody5A.wav'), displayLabel: 'Guitar Melody 5A' },
      { label: 'B', file: url('023Guitar_melody5B.wav'), displayLabel: 'Guitar Melody 5B' },
      { label: 'C', file: url('024Guitar_melody5C.wav'), displayLabel: 'Guitar Melody 5C' },
      { label: 'D', file: url('025Guitar_melody5D.wav'), displayLabel: 'Guitar Melody 5D' },
    ],
  },
]
