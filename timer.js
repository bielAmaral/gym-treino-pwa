/* Timer de descanso: UI acoplada aos IDs do index.html.
 * Contagem baseada em timestamp para sobreviver a throttling do Safari em background. */

let endAtMs = null;
/** Segundos restantes quando pausado (fonte de verdade em pausa). */
let pausedRemainingSec = 0;
let tickId = null;
let timerPaused = false;

function setTimerScreenReader(msg) {
  const el = document.getElementById("timer-aria");
  if (el) {
    el.textContent = msg || "";
  }
}

function showTimer() {
  document.getElementById("timer-bar").hidden = false;
  document.body.classList.add("js-timer-active");
  syncRemainingFromClock();
  updateTimerDisplay();
}

function hideTimer() {
  clearInterval(tickId);
  tickId = null;
  endAtMs = null;
  pausedRemainingSec = 0;
  document.getElementById("timer-bar").hidden = true;
  document.body.classList.remove("js-timer-active");
  const pauseBtn = document.getElementById("btn-timer-pause");
  pauseBtn.textContent = "Pausar";
  timerPaused = false;
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
  const elDisp = document.getElementById("timer-display");
  const sec = wallRemainingSec();
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  elDisp.textContent = m + ":" + String(s).padStart(2, "0");
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

function completeCountdown() {
  setTimerScreenReader("Descanso concluído. Próxima série.");
  if (shouldVibrate()) {
    try {
      navigator.vibrate(200);
    } catch {
      /* ignore */
    }
  }
  if (shouldPlayBeep()) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch {
      /* ignore */
    }
  }
  clearInterval(tickId);
  tickId = null;
  endAtMs = null;
  pausedRemainingSec = 0;
  timerPaused = false;
  hideTimer();
  window.setTimeout(() => setTimerScreenReader(""), 2200);
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
  const bar = document.getElementById("timer-bar");
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

function startCountdown(fromSec) {
  if (fromSec < 0) fromSec = 0;
  timerPaused = false;
  clearInterval(tickId);
  tickId = null;
  const pauseBtn = document.getElementById("btn-timer-pause");
  pauseBtn.textContent = "Pausar";

  if (fromSec <= 0) {
    endAtMs = null;
    pausedRemainingSec = 0;
    showTimer();
    updateTimerDisplay();
    setTimerScreenReader("Timer a zero. Ajuste com os atalhos ou Parar.");
    return;
  }

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

export function initTimerUi() {
  const bar = document.getElementById("timer-bar");
  document.addEventListener("visibilitychange", onVisibilityChange);

  document.getElementById("exercise-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rest-sec]");
    if (!b) return;
    e.preventDefault();
    const sec = parseInt(b.getAttribute("data-rest-sec"), 10);
    if (!Number.isFinite(sec) || sec < 0) return;
    startCountdown(sec);
  });
  bar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-sec]");
    if (!chip) return;
    e.preventDefault();
    const v = parseInt(chip.getAttribute("data-sec"), 10);
    if (!Number.isFinite(v) || v < 0) return;
    startCountdown(v);
  });
  document.getElementById("btn-timer-pause").addEventListener("click", () => {
    if (document.getElementById("timer-bar").hidden) return;
    const secNow = wallRemainingSec();
    if (secNow <= 0 && !timerPaused) return;

    if (!timerPaused) {
      syncRemainingFromClock();
      pausedRemainingSec = wallRemainingSec();
      endAtMs = null;
      timerPaused = true;
      clearInterval(tickId);
      tickId = null;
      document.getElementById("btn-timer-pause").textContent = "Continuar";
      updateTimerDisplay();
      return;
    }

    timerPaused = false;
    if (pausedRemainingSec <= 0) {
      completeCountdown();
      return;
    }
    endAtMs = Date.now() + pausedRemainingSec * 1000;
    document.getElementById("btn-timer-pause").textContent = "Pausar";
    updateTimerDisplay();
    startTicking();
  });
  document.getElementById("btn-timer-stop").addEventListener("click", () => {
    clearInterval(tickId);
    tickId = null;
    setTimerScreenReader("Descanso interrompido.");
    hideTimer();
    window.setTimeout(() => setTimerScreenReader(""), 2000);
  });
}
