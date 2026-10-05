(function () {
  'use strict';

  const { SHEET_URL, AUDIO_BASE, CALIBRATION_FILE, PAIR_GAP_SEC, VERSION } = window.CONFIG;
  const QUESTIONS = window.QUESTIONS;
  const PART_TEXT = window.PART_TEXT;
  const TOTAL = QUESTIONS.length;
  const STORE_KEY = 'vigt-v04-state';

  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- state
  // Persisted in localStorage so a reload or a dropped connection loses nothing.

  let state = loadState();

  function newState(lastName, firstName) {
    return {
      sessionId: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)),
      lastName,
      firstName,
      setup: null,           // listening equipment + volume answers from the setup screen
      referencePlays: 0,     // times the volume reference was played
      volumeChanged: null,   // asked on the review screen
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'in progress',
      screen: 'setup',
      index: 0,
      answers: {},   // question number → letter
      plays: {},     // question number → { T: n, A: n, ... }
      changes: {},   // question number → times the answer was changed
      timeMs: {},    // question number → time spent on the question
      synced: false,
    };
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode: keep going */ }
  }

  // ---------------------------------------------------------------- audio
  // Web Audio so Part 2 can play voice → guitar back to back without a second tap
  // (iOS blocks HTMLAudio.play() outside a tap handler).

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  // Safari 17+: play through the silent switch, like a media app.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }

  const buffers = new Map();   // url → Promise<AudioBuffer>
  let playing = null;          // { sources, button }

  function getBuffer(url) {
    if (!buffers.has(url)) {
      const p = fetch(url)
        .then((r) => { if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.arrayBuffer(); })
        .then((data) => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)));
      p.catch(() => buffers.delete(url));    // allow a retry on the next tap
      buffers.set(url, p);
    }
    return buffers.get(url);
  }

  const stim = (file) => AUDIO_BASE + file;

  function urlsFor(q) {
    return [q.test, ...Object.values(q.options).flat()].map(stim);
  }

  // Keep decoded audio only for the current question and its neighbours.
  function prefetchAround(index) {
    const keep = new Set();
    for (const i of [index - 1, index, index + 1]) {
      if (QUESTIONS[i]) urlsFor(QUESTIONS[i]).forEach((u) => keep.add(u));
    }
    for (const f of buffers.keys()) if (!keep.has(f)) buffers.delete(f);
    keep.forEach((f) => getBuffer(f).catch(() => {}));
  }

  function stopPlayback() {
    if (!playing) return;
    playing.sources.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } });
    playing.button.classList.remove('playing');
    playing = null;
  }

  // Plays the urls back to back; onPlayed runs once playback actually starts.
  async function play(urls, button, onPlayed) {
    const wasThisButton = playing && playing.button === button;
    stopPlayback();
    if (wasThisButton) return;               // second tap on the same button = stop
    if (ctx.state !== 'running') ctx.resume();

    button.classList.add('loading');
    let decoded;
    try {
      decoded = await Promise.all(urls.map(getBuffer));
    } catch (err) {
      button.classList.remove('loading');
      setSync(`Could not load audio (${err.message}). Check your connection and tap again.`);
      return;
    }
    button.classList.remove('loading');
    stopPlayback();                          // another button may have started while loading

    let t = ctx.currentTime + 0.05;
    const sources = decoded.map((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(t);
      t += buf.duration + PAIR_GAP_SEC;
      return src;
    });
    const session = { sources, button };
    sources[sources.length - 1].onended = () => {
      if (playing === session) { button.classList.remove('playing'); playing = null; }
    };
    playing = session;
    button.classList.add('playing');

    onPlayed();
    saveState();
  }

  function countPlay(key) {
    return () => {
      const q = QUESTIONS[state.index];
      const counts = (state.plays[q.number] ||= {});
      counts[key] = (counts[key] || 0) + 1;
    };
  }

  // ---------------------------------------------------------------- sync
  // One row per participant in the Google Sheet, updated in place on every save.

  let syncTimer = null;
  let syncing = false;

  function payload() {
    return {
      sessionId: state.sessionId,
      lastName: state.lastName,
      firstName: state.firstName,
      status: state.status,
      answers: state.answers,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      setup: state.setup,
      referencePlays: state.referencePlays,
      volumeChanged: state.volumeChanged,
      device: navigator.userAgent,
      version: VERSION,
      detail: { plays: state.plays, changes: state.changes, timeMs: state.timeMs },
    };
  }

  function setSync(text) { $('sync').textContent = text; }

  function scheduleSync(delay = 1500) {
    state.synced = false;
    saveState();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay);
  }

  async function sync() {
    clearTimeout(syncTimer);
    if (!SHEET_URL) {
      console.log('[no SHEET_URL configured] would send:', payload());
      setSync('Not saving: no Google Sheet configured');
      return false;
    }
    if (syncing) { scheduleSync(); return false; }
    syncing = true;
    setSync('Saving…');
    const body = JSON.stringify(payload());
    try {
      // text/plain keeps this a "simple" request, so the browser skips the CORS preflight
      // that Apps Script cannot answer.
      const res = await fetch(SHEET_URL, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'rejected');
      state.synced = true;
      saveState();
      setSync('Saved ✓');
      return true;
    } catch (err) {
      console.warn('Sync failed:', err);
      setSync('Offline: answers kept on this device, will retry');
      return false;
    } finally {
      syncing = false;
    }
  }

  window.addEventListener('online', () => { if (state && !state.synced) sync(); });

  // ---------------------------------------------------------------- screens

  const screens = ['register', 'setup', 'question', 'review', 'done'];

  function show(name) {
    stopPlayback();
    screens.forEach((s) => ($(`screen-${s}`).hidden = s !== name));
    if (state) { state.screen = name; saveState(); }
    window.scrollTo(0, 0);
  }

  // Time on question: counted while the question screen is visible.
  let enteredAt = null;
  function startTimer() { enteredAt = Date.now(); }
  function stopTimer() {
    if (enteredAt == null || !state) return;
    const n = QUESTIONS[state.index].number;
    state.timeMs[n] = (state.timeMs[n] || 0) + (Date.now() - enteredAt);
    enteredAt = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (!state || state.screen !== 'question') return;
    if (document.hidden) { stopTimer(); saveState(); } else startTimer();
  });

  // ------------------------------------------------ registration

  $('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const last = String(f.get('lastName')).trim();
    const first = String(f.get('firstName')).trim();
    if (!last || !first) return;
    ctx.resume();                            // unlock audio inside the tap
    state = newState(last.toUpperCase(), first);
    saveState();
    sync();                                  // create the row right away
    showSetup();
  });

  // ------------------------------------------------ listening setup

  const setupForm = $('setup-form');

  function showSetup() {
    show('setup');
    getBuffer(CALIBRATION_FILE).catch(() => {});
    prefetchAround(0);
    updateSetupForm();
  }

  function updateSetupForm() {
    const f = new FormData(setupForm);
    const listening = f.get('listening');
    $('setup-headphones').hidden = listening !== 'headphones';
    $('setup-speakers').hidden = listening !== 'speakers';
    const type = listening === 'headphones' ? f.get('hpType') : f.get('spType');
    $('setup-model').hidden = !listening;
    $('setup-model-label').textContent = type === 'other'
      ? 'Please describe them'
      : 'Make and model, or a short description (optional)';
    const unknown = f.get('volumeUnknown') === 'on';
    setupForm.volume.disabled = unknown;
    setupForm.volume.parentElement.classList.toggle('disabled', unknown);
    $('volume-out').textContent = unknown ? '—' : `${setupForm.volume.value}%`;
  }

  setupForm.addEventListener('input', updateSetupForm);
  setupForm.addEventListener('change', updateSetupForm);

  $('ref-btn').addEventListener('click', () =>
    play([CALIBRATION_FILE], $('ref-btn'), () => { state.referencePlays++; $('setup-error').hidden = true; }));

  setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(setupForm);
    const listening = f.get('listening');
    const type = listening === 'headphones' ? f.get('hpType') : f.get('spType');
    const model = String(f.get('model') || '').trim();
    const problem =
      !listening ? 'Please say whether you are using headphones.' :
      !type ? `Please choose what kind of ${listening === 'headphones' ? 'headphones' : 'speakers'} you are using.` :
      listening === 'headphones' && !f.get('connection') ? 'Please say how your headphones are connected.' :
      type === 'other' && !model ? 'Please describe what you are listening through.' :
      state.referencePlays === 0 ? 'Please play the volume reference and set a comfortable volume.' :
      '';
    $('setup-error').hidden = !problem;
    $('setup-error').textContent = problem;
    if (problem) return;

    state.setup = {
      listening,
      type,
      connection: listening === 'headphones' ? f.get('connection') : '',
      model,
      volumeEstimate: f.get('volumeUnknown') === 'on' ? 'unknown' : Number(f.get('volume')),
    };
    scheduleSync(0);
    goTo(0);
  });

  // ------------------------------------------------ question

  function goTo(index) {
    stopTimer();
    state.index = index;
    show('question');
    renderQuestion();
    prefetchAround(index);
    startTimer();
    saveState();
  }

  function renderProgress() {
    const nav = $('progress');
    nav.innerHTML = '';
    QUESTIONS.forEach((q, i) => {
      if (i > 0 && q.part !== QUESTIONS[i - 1].part) {
        const d = document.createElement('span');
        d.className = 'divider';
        nav.append(d);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q.number;
      b.setAttribute('aria-label', `Question ${q.number}${state.answers[q.number] ? ', answered' : ''}`);
      if (state.answers[q.number]) b.classList.add('answered');
      if (i === state.index) { b.classList.add('current'); b.setAttribute('aria-current', 'step'); }
      b.addEventListener('click', () => goTo(i));
      nav.append(b);
    });
  }

  function renderQuestion() {
    const q = QUESTIONS[state.index];
    const text = PART_TEXT[q.part];

    $('q-part').textContent = text.title;
    $('q-num').textContent = q.number;
    $('q-total').textContent = TOTAL;
    $('q-instructions').textContent = text.instructions;
    $('q-prompt').textContent = text.prompt;
    renderProgress();

    const testBtn = $('test-btn');
    testBtn.classList.remove('playing', 'loading');
    testBtn.querySelector('.label').textContent = text.testLabel;
    testBtn.onclick = () => play([stim(q.test)], testBtn, countPlay('T'));

    const box = $('options');
    box.innerHTML = '';
    for (const [letter, files] of Object.entries(q.options)) {
      const row = document.createElement('div');
      row.className = 'option';
      if (state.answers[q.number] === letter) row.classList.add('chosen');

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'play';
      playBtn.innerHTML = `<span class="icon" aria-hidden="true"></span><span>${letter}</span><span class="hint">${text.optionHint}</span>`;
      playBtn.setAttribute('aria-label', `Play ${letter}`);
      playBtn.addEventListener('click', () => play(files.map(stim), playBtn, countPlay(letter)));

      const choose = document.createElement('button');
      choose.type = 'button';
      choose.className = 'choose';
      choose.textContent = state.answers[q.number] === letter ? `✓ ${letter}` : `Choose ${letter}`;
      choose.addEventListener('click', () => answer(q, letter));

      row.append(playBtn, choose);
      box.append(row);
    }

    $('prev-btn').disabled = state.index === 0;
    $('next-btn').textContent = state.index === TOTAL - 1 ? 'Review' : 'Next';
  }

  function answer(q, letter) {
    const prev = state.answers[q.number];
    if (prev === letter) return;
    if (prev) state.changes[q.number] = (state.changes[q.number] || 0) + 1;
    state.answers[q.number] = letter;
    // Update in place so any sound that is playing keeps playing.
    document.querySelectorAll('#options .option').forEach((row, i) => {
      const l = Object.keys(q.options)[i];
      row.classList.toggle('chosen', l === letter);
      row.querySelector('.choose').textContent = l === letter ? `✓ ${l}` : `Choose ${l}`;
    });
    renderProgress();
    scheduleSync();
  }

  $('prev-btn').addEventListener('click', () => { if (state.index > 0) goTo(state.index - 1); });
  $('next-btn').addEventListener('click', () => {
    if (state.index < TOTAL - 1) goTo(state.index + 1);
    else showReview();
  });

  // ------------------------------------------------ review

  function showReview() {
    stopTimer();
    show('review');
    const list = $('review-list');
    list.innerHTML = '';
    QUESTIONS.forEach((q, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const a = state.answers[q.number];
      b.innerHTML = `<span>Question ${q.number} <small>(${PART_TEXT[q.part].title})</small></span>` +
        (a ? `<strong>${a}</strong>` : '<span class="missing">No answer</span>');
      b.addEventListener('click', () => goTo(i));
      li.append(b);
      list.append(li);
    });
    document.querySelectorAll('input[name=volumeChanged]').forEach((r) => (r.checked = r.value === state.volumeChanged));
    $('review-error').hidden = true;
    const missing = QUESTIONS.filter((q) => !state.answers[q.number]).length;
    const warn = $('review-warning');
    warn.hidden = missing === 0;
    warn.textContent = `${missing} question${missing === 1 ? ' is' : 's are'} unanswered. You can still submit.`;
  }

  $('review-back').addEventListener('click', () => goTo(TOTAL - 1));

  $('submit-btn').addEventListener('click', () => {
    const changed = document.querySelector('input[name=volumeChanged]:checked');
    $('review-error').hidden = !!changed;
    $('review-error').textContent = 'Please say whether you changed your volume during the test.';
    if (!changed) return;
    state.volumeChanged = changed.value;
    state.status = 'complete';
    state.completedAt = new Date().toISOString();
    saveState();
    showDone();
  });

  // ------------------------------------------------ done

  async function showDone() {
    show('done');
    $('fallback').hidden = true;
    $('done-status').textContent = SHEET_URL ? 'Sending your answers…' : '';
    const ok = await sync();
    if (ok) {
      $('done-status').textContent = 'Your answers have been saved.';
    } else if (SHEET_URL) {
      $('done-status').textContent = '';
      $('fallback-text').value = JSON.stringify(payload());
      $('fallback').hidden = false;
    }
  }

  $('retry-btn').addEventListener('click', showDone);
  $('copy-btn').addEventListener('click', async () => {
    const ta = $('fallback-text');
    try { await navigator.clipboard.writeText(ta.value); $('copy-btn').textContent = 'Copied'; }
    catch { ta.select(); document.execCommand('copy'); }
  });

  $('new-participant').addEventListener('click', () => {
    if (!state.synced && SHEET_URL) {
      $('done-status').textContent = 'These answers have not been sent yet. Tap again to discard them.';
      if (!$('new-participant').dataset.confirm) { $('new-participant').dataset.confirm = '1'; return; }
    }
    delete $('new-participant').dataset.confirm;
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    state = null;
    $('register-form').reset();
    setupForm.reset();
    document.querySelectorAll('input[name=volumeChanged]').forEach((r) => (r.checked = false));
    setSync('');
    show('register');
  });

  // ---------------------------------------------------------------- start

  if (!state) {
    show('register');
  } else if (state.screen === 'done') {
    showDone();
  } else if (state.screen === 'setup') {
    showSetup();
  } else if (state.screen === 'review') {
    showReview();
  } else {
    goTo(state.index || 0);
    if (!state.synced) sync();
  }
})();
