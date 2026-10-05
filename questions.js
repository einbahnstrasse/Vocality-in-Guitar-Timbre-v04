// The 17 questions, in the fixed order of the V.3 Max patch.
//
// Each question has:
//   part      1 or 2
//   test      the test-sample file (Part 1) or vowel-sound file (Part 2), played alone by the top button
//   options   { A: [...files], B: [...] } — the files each option plays, in order.
//             Part 1 options play one guitar file; Part 2 options play voice then guitar.

(function () {
  const PART_TEXT = {
    1: {
      title: 'Part 1',
      instructions: 'Choose which of the following sounds most resembles the test sample.',
      prompt: 'Which answer corresponds best?',
      testLabel: 'Test sample',
      optionHint: 'Guitar',
    },
    2: {
      title: 'Part 2',
      instructions: 'Each option plays the vowel sound, then a guitar sound.',
      prompt: 'Which guitar sound most closely matches the vowel sound?',
      testLabel: 'Vowel sound',
      optionHint: 'Vowel + guitar',
    },
  };

  const questions = [];

  // Part 1 — Q1–5: sung melody vs. four guitar renditions (A–D).
  for (let m = 1; m <= 5; m++) {
    const base = (m - 1) * 5 + 1;               // 1, 6, 11, 16, 21
    const n = (i) => String(base + i).padStart(3, '0');
    questions.push({
      part: 1,
      test: `${n(0)}Voice_melody${m}.wav`,
      options: {
        A: [`${n(1)}Guitar_melody${m}A.wav`],
        B: [`${n(2)}Guitar_melody${m}B.wav`],
        C: [`${n(3)}Guitar_melody${m}C.wav`],
        D: [`${n(4)}Guitar_melody${m}D.wav`],
      },
    });
  }

  // Part 2 — Q6–17: sung vowel paired with guitar plucked at 1 / 16 / 32 cm.
  // B-pitch voices use string II (026–028); G-pitch voices use string III (029–031).
  const GUITAR = {
    B: ['026_II_1cm.wav', '027_II_16cm.wav', '028_II_32cm.wav'],
    G: ['029_III_1cm.wav', '030_III_16cm.wav', '031_III_32cm.wav'],
  };
  let file = 32;
  for (const voice of ['voice1', 'voice2']) {
    for (const pitch of ['B', 'G']) {
      for (const vowel of ['ah', 'eh', 'u']) {
        const test = `0${file++}_${voice}_${pitch}_${vowel}.wav`;
        const [a, b, c] = GUITAR[pitch];
        questions.push({
          part: 2,
          test,
          options: { A: [test, a], B: [test, b], C: [test, c] },
        });
      }
    }
  }

  questions.forEach((q, i) => (q.number = i + 1));

  window.PART_TEXT = PART_TEXT;
  window.QUESTIONS = questions;
})();
