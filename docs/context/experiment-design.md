---
name: experiment-design
description: Structure of the Vocality in Guitar Timbre listening test, decoded from V.3 Max patch (17 questions, 2 parts, file mapping, response format)
type: project
---

Louis's perceptual listening experiment, originally a Max 8 patch (V.3_Vocality_in_Guitar_Timbre.maxpat), being ported to a mobile website that records responses. Stimuli live in media/Vocality_in_Guitar_Timbre_V.3/ (43 WAVs, ~61 MB, gitignored).

Decoded from the patch logic on 2026-10-04 (the patch's own "instructions" subpatch is stale — it describes an older 41-question/groups-of-6/A–F template; trust the logic, not those comments):

- **17 questions total** ("There are 17 questions" on-screen). Fixed order, no randomization in Max.
- **Part 1 (Q1–5), melodies:** test sample = NNNVoice_melodyN (001,006,011,016,021); options A–D = the four Guitar_melodyN{A..D} files that follow. Prompt: "Choose one of the following sounds that resembles most the test sample" / "Which answer corresponds best?". Clips 5–11 s.
- **Part 2 (Q6–17), vowels vs. guitar pluck position:** one question per voice file 032–043 (voice1/voice2 × pitch B/G × vowel ah/eh/u). Options A/B/C = guitar samples at 1 cm / 16 cm / 32 cm on string II (files 026–028) for B-pitch voices, string III (029–031) for G-pitch voices. Pressing an option plays voice THEN the guitar sample (a pair). In the patch, Part 2 has NO standalone voice button: the three play buttons are relabelled "A-A"/"A-B"/"A-C" (Test Sample, A, B buttons) and each plays voice→guitar; answer buttons A/B/C. On-screen header said "Part 2 : Choose which pair sounds more alike"; "Which of these groups of two melodies is more vocal ?" exists in the patch but is wired to show only from Q34 on, so V.3 never displays it (the line above the buttons always reads "Clic to play Test sample and corresponding sound"). The web version adds a standalone "Vowel sound" button. Louis settled on "which guitar sound most closely matches the vowel sound" — see [web-port-direction](web-port-direction.md).
- 999_Initialize_1.wav = silent audio-unlock file; not a stimulus.
- Free replay in any order; prev/next navigation; can revisit/change answers; track bar marks answered questions.
- Saves per answer to a [coll] as "<question#> <letter>", exported to a file named from participant "LASTNAME FIRSTNAME" + date/time.

Interpretation (mine, unconfirmed): Part 1 = which guitar rendering is heard as most voice-like; Part 2 = whether listeners map vowel quality onto plucking position (distance likely from bridge). Meaning of guitar variants A–D in Part 1 is unknown — ask Louis.

Related: [web-port-direction](web-port-direction.md)
