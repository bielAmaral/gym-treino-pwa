/* Timer de descanso: UI acoplada aos IDs do index.html.
 * Contagem baseada em timestamp para sobreviver a throttling do Safari em background. */

let endAtMs = null;
/** Segundos restantes quando pausado (fonte de verdade em pausa). */
let pausedRemainingSec = 0;
/** Duração total da contagem atual (para barra de progresso). */
let totalSec = 0;
let tickId = null;
let timerPaused = false;
/** @type {AudioContext | null} */
let audioCtx = null;

function $(id) {
  return document.getElementById(id);
}

function setTimerScreenReader(msg) {
  const el = $("timer-aria");
  if (el) {
    el.textContent = msg || "";
  }
}

function updateProgressBar(sec) {
  const bar = $("timer-progress");
  const ring = $("timer-ring");
  const pct = totalSec > 0 ? Math.max(0, Math.min(1, sec / totalSec)) : 0;
  if (bar) {
    bar.style.transform = `scaleX(${pct})`;
  }
  if (ring) {
    ring.style.setProperty("--timer-pct", String(pct));
  }
}

function setTimerPausedUi(paused) {
  const bar = $("timer-bar");
  if (bar) {
    bar.classList.toggle("timer-bar--paused", paused);
  }
}

function showTimer() {
  const bar = $("timer-bar");
  if (!bar) {
    return;
  }
  bar.hidden = false;
  bar.classList.remove("timer-bar--paused");
  document.body.classList.add("js-timer-active");
  requestAnimationFrame(() => {
    bar.classList.add("timer-bar--open");
  });
  syncRemainingFromClock();
  updateTimerDisplay();
}

function hideTimer() {
  clearInterval(tickId);
  tickId = null;
  endAtMs = null;
  pausedRemainingSec = 0;
  totalSec = 0;
  const bar = $("timer-bar");
  if (bar) {
    bar.hidden = true;
    bar.classList.remove("timer-bar--open", "timer-bar--paused");
  }
  document.body.classList.remove("js-timer-active");
  const pauseBtn = $("btn-timer-pause");
  if (pauseBtn) {
    pauseBtn.textContent = "Pausar";
  }
  timerPaused = false;
  updateProgressBar(0);
}

/** Segundos restantes arredondados para cima (relógio de parede). */
function wallRemainingSec() {
  if (timerPaused) {
    return Math.max(0, pausedRemainingSec);
  }
  if (endAtMs == null) {
    return 0;
  }
  return Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000));
}

function syncRemainingFromClock() {
  if (timerPaused) {
    return;
  }
  if (endAtMs != null) {
    pausedRemainingSec = wallRemainingSec();
  }
}

function updateTimerDisplay() {
  const elDisp = $("timer-display");
  if (!elDisp) {
    return;
  }
  const sec = wallRemainingSec();
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  elDisp.textContent = m + ":" + String(s).padStart(2, "0");
  elDisp.classList.toggle("timer-display--urgent", sec > 0 && sec <= 10 && !timerPaused);
  updateProgressBar(sec);
}

function shouldPlayBeep() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

function shouldVibrate() {
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/** iOS/Safari exige gesto do usuário — chamamos no clique de descanso antes de iniciar. */
export async function primeAudioForTimer() {
  if (!shouldPlayBeep()) {
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    return;
  }
  if (!audioCtx) {
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      /* ignore */
    }
  }
}

function playTone(ctx, freq, startAt, duration) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.connect(g);
  g.connect(ctx.destination);
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(0.2, startAt + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  o.start(startAt);
  o.stop(startAt + duration + 0.02);
}

async function playCompletionBeep() {
  if (!shouldPlayBeep()) {
    return;
  }
  await primeAudioForTimer();
  if (!audioCtx || audioCtx.state !== "running") {
    return;
  }
  try {
    const t = audioCtx.currentTime;
    playTone(audioCtx, 880, t, 0.16);
    playTone(audioCtx, 1100, t + 0.22, 0.2);
  } catch {
    /* ignore */
  }
}

function completeCountdown() {
  setTimerScreenReader("Descanso concluído. Próxima série.");
  if (shouldVibrate()) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {
      /* ignore */
    }
  }
  clearInterval(tickId);
  tickId = null;
  endAtMs = null;
  pausedRemainingSec = 0;
  timerPaused = false;

  const disp = $("timer-display");
  if (disp) {
    disp.classList.remove("timer-display--urgent");
    disp.classList.add("timer-display--done");
  }

  void playCompletionBeep().finally(() => {
    window.setTimeout(() => {
      if (disp) {
        disp.classList.remove("timer-display--done");
      }
      hideTimer();
      setTimerScreenReader("");
    }, 450);
  });
}

function runTick() {
  if (timerPaused) {
    return;
  }
  const sec = wallRemainingSec();
  if (sec <= 0) {
    completeCountdown();
    return;
  }
  updateTimerDisplay();
}

function startTicking() {
  clearInterval(tickId);
  tickId = setInterval(runTick, 250);
}

function onVisibilityChange() {
  if (document.visibilityState !== "visible") {
    return;
  }
  const bar = $("timer-bar");
  if (!bar || bar.hidden) {
    return;
  }
  if (timerPaused || endAtMs == null) {
    updateTimerDisplay();
    return;
  }
  const sec = wallRemainingSec();
  updateTimerDisplay();
  if (sec <= 0) {
    completeCountdown();
  }
}

export function startCountdown(fromSec) {
  if (fromSec < 0) {
    fromSec = 0;
  }
  timerPaused = false;
  clearInterval(tickId);
  tickId = null;
  const pauseBtn = $("btn-timer-pause");
  if (pauseBtn) {
    pauseBtn.textContent = "Pausar";
  }
  const disp = $("timer-display");
  if (disp) {
    disp.classList.remove("timer-display--done");
  }

  if (fromSec <= 0) {
    endAtMs = null;
    pausedRemainingSec = 0;
    totalSec = 0;
    showTimer();
    updateTimerDisplay();
    setTimerScreenReader("Timer a zero. Ajuste com os atalhos ou Parar.");
    return;
  }

  totalSec = fromSec;
  endAtMs = Date.now() + fromSec * 1000;
  pausedRemainingSec = fromSec;
  showTimer();
  const m = Math.floor(fromSec / 60);
  const s = fromSec % 60;
  const human = m ? `${m} min e ${s} s` : `${s} segundos`;
  setTimerScreenReader(`Descanso: ${human}. Pausar ou parar a qualquer momento.`);
  updateTimerDisplay();
  startTicking();
}

function bindRestClick(e) {
  const cardioBtn = e.target.closest("[data-cardio-sec]");
  if (cardioBtn) {
    e.preventDefault();
    const sec = parseInt(cardioBtn.getAttribute("data-cardio-sec"), 10);
    if (Number.isFinite(sec) && sec > 0) {
      void primeAudioForTimer().then(() => startCountdown(sec));
    }
    return;
  }
  const b = e.target.closest("[data-rest-sec]");
  if (!b) {
    return;
  }
  e.preventDefault();
  const sec = parseInt(b.getAttribute("data-rest-sec"), 10);
  if (!Number.isFinite(sec) || sec < 0) {
    return;
  }
  void primeAudioForTimer().then(() => startCountdown(sec));
}

export function initTimerUi() {
  hideTimer();
  const bar = $("timer-bar");
  if (!bar) {
    return;
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  const list = $("exercise-list");
  if (list) {
    list.addEventListener("click", bindRestClick);
  }

  bar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-sec]");
    if (!chip) {
      return;
    }
    e.preventDefault();
    const v = parseInt(chip.getAttribute("data-sec"), 10);
    if (!Number.isFinite(v) || v < 0) {
      return;
    }
    void primeAudioForTimer().then(() => startCountdown(v));
  });

  const pauseBtn = $("btn-timer-pause");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (bar.hidden) {
        return;
      }
      const secNow = wallRemainingSec();
      if (secNow <= 0 && !timerPaused) {
        return;
      }

      if (!timerPaused) {
        syncRemainingFromClock();
        pausedRemainingSec = wallRemainingSec();
        endAtMs = null;
        timerPaused = true;
        clearInterval(tickId);
        tickId = null;
        pauseBtn.textContent = "Continuar";
        setTimerPausedUi(true);
        updateTimerDisplay();
        return;
      }

      timerPaused = false;
      if (pausedRemainingSec <= 0) {
        completeCountdown();
        return;
      }
      endAtMs = Date.now() + pausedRemainingSec * 1000;
      pauseBtn.textContent = "Pausar";
      setTimerPausedUi(false);
      updateTimerDisplay();
      startTicking();
    });
  }

  const stopBtn = $("btn-timer-stop");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      clearInterval(tickId);
      tickId = null;
      setTimerScreenReader("Descanso interrompido.");
      hideTimer();
      window.setTimeout(() => setTimerScreenReader(""), 2000);
    });
  }
}
