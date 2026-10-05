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
      sessionId: participantId(lastName, firstName, new Date()),
      lastName,
      firstName,
      setup: null,           // listening equipment + volume answers from the setup screen
      reference: { n: 0, full: 0, ms: 0 },   // volume-reference listening, as in `listen`
      volumeChanged: null,   // asked on the review screen
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'in progress',
      screen: 'setup',
      index: 0,
      answers: {},   // question number → letter
      listen: {},    // question number → { test|A|B…: { n: plays, full: plays heard to the end, ms: time heard } }
      changes: {},   // question number → times the answer was changed
      timeMs: {},    // question number, 'setup' or 'review' → time on that page (tab hidden = not counted)
      synced: false,
    };
  }

  // Readable, unique per session: LAST-First-YYYYMMDD-HHMMSS (participant's local time).
  function participantId(last, first, d) {
    const clean = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '');
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return `${clean(last) || 'X'}-${clean(first) || 'X'}-${stamp}`;
  }

  function loadState() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { /* unreadable: start fresh */ }
    if (!s) return null;
    // Sessions saved by an earlier version of the site lack these fields.
    s.listen ||= {};
    s.reference ||= { n: s.referencePlays || 0, full: 0, ms: 0 };
    s.timeMs ||= {};
    s.changes ||= {};
    return s;
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

  // Credits the time heard to the play's stats; `completed` = it reached the end.
  function finish(session, completed) {
    const heard = completed ? session.durMs : (ctx.currentTime - session.startAt) * 1000;
    session.stat.ms += Math.round(Math.min(Math.max(heard, 0), session.durMs));
    if (completed) session.stat.full++;
    saveState();
  }

  function stopPlayback() {
    if (!playing) return;
    playing.sources.forEach((s) => { s.onended = null; try { s.stop(); } catch { /* already stopped */ } });
    playing.button.classList.remove('playing');
    finish(playing, false);
    playing = null;
  }

  // Plays the urls back to back. getStat() returns the { n, full, ms } record to update.
  async function play(urls, button, getStat) {
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

    const startAt = ctx.currentTime + 0.05;
    let t = startAt;
    const sources = decoded.map((buf) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(t);
      t += buf.duration + PAIR_GAP_SEC;
      return src;
    });
    const stat = getStat();
    stat.n++;
    const durMs = (t - PAIR_GAP_SEC - startAt) * 1000;
    const session = { sources, button, stat, startAt, durMs };
    sources[sources.length - 1].onended = () => {
      if (playing !== session) return;
      button.classList.remove('playing');
      playing = null;
      finish(session, true);
    };
    playing = session;
    button.classList.add('playing');
    saveState();
  }

  function statFor(key) {
    return () => {
      const q = QUESTIONS[state.index];
      const byButton = (state.listen[q.number] ||= {});
      return (byButton[key] ||= { n: 0, full: 0, ms: 0 });
    };
  }

  // ---------------------------------------------------------------- sync
  // One row per participant in the Google Sheet, updated in place on every save.

  let syncTimer = null;
  let syncing = false;
  let failures = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
      referencePlays: state.reference.n,
      volumeChanged: state.volumeChanged,
      device: navigator.userAgent,
      version: VERSION,
      summary: summary(),
      rows: state.status === 'complete' ? listeningRows() : undefined,   // Listening tab: on submit only
      detail: { listen: state.listen, reference: state.reference, changes: state.changes, timeMs: state.timeMs },
    };
  }

  const sec = (ms) => Math.round((ms || 0) / 100) / 10;

  // One row per question for the sheet's "Listening" tab; each play button gets
  // <button>_plays, <button>_full (plays heard to the end) and <button>_sec (seconds heard).
  // Keys match the tab's column names.
  function listeningRows() {
    return QUESTIONS.map((q) => {
      const row = {
        question: q.number,
        part: q.part,
        test_file: q.test,
        answer: state.answers[q.number] || '',
        answer_changes: state.changes[q.number] || 0,
        question_time_sec: sec(state.timeMs[q.number]),
      };
      for (const button of ['test', ...Object.keys(q.options)]) {
        const st = (state.listen[q.number] || {})[button] || { n: 0, full: 0, ms: 0 };
        row[`${button}_plays`] = st.n;
        row[`${button}_full`] = st.full;
        row[`${button}_sec`] = sec(st.ms);
      }
      return row;
    });
  }

  function summary() {
    let plays = 0, full = 0;
    for (const byButton of Object.values(state.listen)) {
      for (const st of Object.values(byButton)) { plays += st.n; full += st.full; }
    }
    const totalMs = Object.values(state.timeMs).reduce((a, b) => a + b, 0);
    return {
      setupSec: sec(state.timeMs.setup),
      reviewSec: sec(state.timeMs.review),
      totalMinutes: Math.round(totalMs / 6000) / 10,
      totalPlays: plays,
      fullListenPct: plays ? Math.round((full / plays) * 100) : '',
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
    let busy = false;
    try {
      // text/plain keeps this a "simple" request, so the browser skips the CORS preflight
      // that Apps Script cannot answer.
      const res = await fetch(SHEET_URL, { method: 'POST', body, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      const json = await res.json();
      busy = !!json.busy;
      if (!json.ok) throw new Error(json.error || 'rejected');
      state.synced = true;
      failures = 0;
      saveState();
      setSync('Saved ✓');
      if (state.screen === 'done') {
        $('done-status').textContent = 'Your answers have been saved.';
        $('fallback').hidden = true;
      }
      return true;
    } catch (err) {
      console.warn('Sync failed:', err);
      setSync(busy ? 'Server busy: answers kept on this device, retrying' : 'Offline: answers kept on this device, retrying');
      // Retry in the background with growing, jittered waits (5 s, 10 s, 20 s … up to 2 min)
      // so a crowd of participants doesn't hit the server in lockstep.
      failures++;
      const wait = Math.min(5000 * 2 ** (failures - 1), 120000) * (0.75 + Math.random() * 0.5);
      clearTimeout(syncTimer);
      syncTimer = setTimeout(sync, wait);
      return false;
    } finally {
      syncing = false;
    }
  }

  // For the final submit: a few quick attempts before showing the copy-and-email fallback.
  async function syncNow(attempts = 4) {
    for (let i = 0; i < attempts; i++) {
      while (syncing) await sleep(300);
      if (await sync()) return true;
      if (i < attempts - 1) await sleep(2000 * 2 ** i);   // 2 s, 4 s, 8 s
    }
    return false;
  }

  window.addEventListener('online', () => { if (state && !state.synced) sync(); });

  // ---------------------------------------------------------------- screens

  const screens = ['register', 'setup', 'question', 'review', 'done'];

  function show(name) {
    stopPlayback();
    stopTimer();
    screens.forEach((s) => ($(`screen-${s}`).hidden = s !== name));
    if (state) { state.screen = name; startTimer(); saveState(); }
    // Overview is available once setup is done and until the answers are submitted.
    $('overview-btn').hidden = name !== 'question';
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------ privacy notice

  const privacy = $('privacy');
  $('privacy-open').addEventListener('click', () => {
    privacy.showModal();
    $('privacy-title').focus();              // start at the top, not at the Close button
    privacy.scrollTop = 0;
  });
  $('privacy-close').addEventListener('click', () => privacy.close());
  // Tapping the dimmed area outside the notice closes it too.
  privacy.addEventListener('click', (e) => {
    const r = privacy.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) privacy.close();
  });

  // ------------------------------------------------ toolbar

  $('overview-btn').addEventListener('click', () => showReview());

  // Light/dark: follows the device until the participant picks one; the choice is remembered.
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  }
  function renderThemeButton() {
    const dark = currentTheme() === 'dark';
    $('theme-btn').textContent = dark ? '☀ Light mode' : '☾ Dark mode';
  }
  $('theme-btn').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('vigt-theme', next); } catch { /* not remembered, still applied */ }
    renderThemeButton();
  });
  darkQuery.addEventListener?.('change', renderThemeButton);
  renderThemeButton();

  // Time on page: counted while the setup, question or review screen is visible.
  let timer = null;   // { key, since }
  function timerKey() {
    if (state.screen === 'question') return QUESTIONS[state.index].number;
    return state.screen === 'setup' || state.screen === 'review' ? state.screen : null;
  }
  function startTimer() {
    const key = timerKey();
    timer = key == null || document.hidden ? null : { key, since: Date.now() };
  }
  function stopTimer() {
    if (!timer || !state) return;
    state.timeMs[timer.key] = (state.timeMs[timer.key] || 0) + (Date.now() - timer.since);
    timer = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (!state) return;
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
    play([CALIBRATION_FILE], $('ref-btn'), () => { $('setup-error').hidden = true; return state.reference; }));

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
      state.reference.n === 0 ? 'Please play the volume reference and set a comfortable volume.' :
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
    stopTimer();                             // credit the page being left before the index changes
    state.index = index;
    show('question');
    renderQuestion();
    prefetchAround(index);
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
    testBtn.onclick = () => play([stim(q.test)], testBtn, statFor('test'));

    const box = $('options');
    box.innerHTML = '';
    for (const [letter, files] of Object.entries(q.options)) {
      const row = document.createElement('div');
      row.className = 'option';
      if (state.answers[q.number] === letter) row.classList.add('chosen');

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'play';
      const name = text.optionLabel ? `${text.optionLabel} ${letter}` : letter;
      playBtn.innerHTML = `<span class="icon" aria-hidden="true"></span><span>${name}</span><span class="hint">${text.optionHint}</span>`;
      playBtn.setAttribute('aria-label', `Play ${name}`);
      playBtn.addEventListener('click', () => play(files.map(stim), playBtn, statFor(letter)));

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

  // Back to the question the participant came from.
  $('review-back').addEventListener('click', () => goTo(state.index));

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
    // Already saved (e.g. the page was reloaded after submitting): don't send again.
    if (state.synced) { $('done-status').textContent = 'Your answers have been saved.'; return; }
    $('done-status').textContent = SHEET_URL ? 'Sending your answers…' : '';
    const ok = await syncNow();
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
