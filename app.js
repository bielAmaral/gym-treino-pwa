import { PRESET_WORKOUTS } from "./presets.js";

/**
 * Treino PWA — estado em localStorage (offline, só neste aparelho).
 */
const STORAGE = "gym-treino-pwa-v1";

const defaultState = () => ({
  session: {
    dayKey: dayKeyFromDate(new Date()),
    exercises: [],
    sourcePresetId: null,
  },
  history: [],
  /** @type {Record<string, Record<string, string[]>>} presetId → nome do ex. → [kg por série] */
  lastWeights: {},
});

function readLastWeights(parsed) {
  const w = parsed && parsed.lastWeights;
  if (!w || typeof w !== "object" || Array.isArray(w)) {
    return {};
  }
  return w;
}

function dayKeyFromDate(d) {
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.session) return defaultState();
    const today = dayKeyFromDate(new Date());
    const hist = Array.isArray(parsed.history) ? parsed.history : [];
    if (parsed.session.dayKey === today) {
      return {
        session: {
          dayKey: parsed.session.dayKey,
          exercises: Array.isArray(parsed.session.exercises) ? parsed.session.exercises : [],
          sourcePresetId: typeof parsed.session.sourcePresetId === "string" ? parsed.session.sourcePresetId : null,
        },
        history: hist,
        lastWeights: readLastWeights(parsed),
      };
    }
    if (Array.isArray(parsed.session.exercises) && parsed.session.exercises.length) {
      hist.unshift({
        dayKey: parsed.session.dayKey,
        at: Date.now(),
        exercises: JSON.parse(JSON.stringify(parsed.session.exercises)),
      });
    }
    return {
      session: { dayKey: today, exercises: [], sourcePresetId: null },
      history: hist,
      lastWeights: readLastWeights(parsed),
    };
  } catch {
    return defaultState();
  }
}

let state = loadState();
if (!state.lastWeights) {
  state.lastWeights = {};
}

function recordLastWeightsFromSession(presetId, exercises) {
  if (!presetId || !exercises || !exercises.length) {
    return;
  }
  if (!state.lastWeights) {
    state.lastWeights = {};
  }
  const map = {};
  for (const ex of exercises) {
    map[ex.name] = (ex.sets || []).map((s) => (s.kg == null || s.kg === "" ? "" : String(s.kg).trim()));
  }
  state.lastWeights[presetId] = map;
}

/**
 * Aplica cargas do último treino concluído desta ficha (apenas coincidentes com nome nº de séries).
 * @param {string} presetId
 * @param {Array<{ name: string, sets: { kg?: string }[] }>} exercises
 */
function applyLastWeightsToExercises(presetId, exercises) {
  const byName = state.lastWeights && state.lastWeights[presetId];
  if (!byName || typeof byName !== "object") {
    return;
  }
  for (const ex of exercises) {
    const arr = byName[ex.name];
    if (!Array.isArray(arr)) {
      continue;
    }
    (ex.sets || []).forEach((s, i) => {
      if (i < arr.length) {
        const w = arr[i];
        if (w != null && String(w).trim() !== "") {
          s.kg = String(w).trim();
        }
      }
    });
  }
}

function persistState() {
  if (state.session && state.session.sourcePresetId && state.session.exercises && state.session.exercises.length) {
    recordLastWeightsFromSession(state.session.sourcePresetId, state.session.exercises);
  }
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch (e) {
    console.warn("localStorage", e);
  }
}

/** Evita JSON.stringify + dispositivo a cada tecla (no iPhone bloqueia o teclado e “fecha” o input). */
const PERSIST_INPUT_MS = 500;
let persistDebounce = null;

function schedulePersist() {
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    persistDebounce = null;
    persistState();
  }, PERSIST_INPUT_MS);
}

/** Grava já (cancela debounce do teclado) — usar antes de render ou ao sair. */
function flushPendingPersist() {
  if (persistDebounce !== null) {
    clearTimeout(persistDebounce);
    persistDebounce = null;
  }
  persistState();
}

/** Grava tudo e redesenha. */
function save() {
  flushPendingPersist();
  render();
}

function uid() {
  return "e-" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function formatDayLabel() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

/** @param {number} s */
function formatRestSec(s) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0 && r > 0) return `${m}'${String(r).padStart(2, "0")}"`;
  if (m > 0) return `${m}'`;
  if (r > 0) return `${r}"`;
  return "0\"";
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function formatRepsDisplay(reps) {
  if (reps == null || reps === "") {
    return "—";
  }
  return String(reps);
}

function setRowTemplate(exerciseId, idx, reps, kg, done) {
  const repsLabel = formatRepsDisplay(reps);
  const repsAria = reps == null || reps === "" ? "sem meta numérica" : `meta de ${reps} repetições`;
  const doneClass = done ? " set-table__row--done" : "";
  return el(`
    <div class="set-row set-table__row${doneClass}" data-ex-id="${exerciseId}" data-set-idx="${idx - 1}">
      <span class="set-idx" aria-label="Série ${idx}">${idx}</span>
      <span class="set-reps-display" aria-label="Reps (fixo do plano), ${repsAria}, série ${idx}">${escapeHtml(repsLabel)}</span>
      <input type="text" inputmode="decimal" name="kg" placeholder="—" value="${kg == null || kg === "" ? "" : escapeHtml(String(kg))}" aria-label="Carga (kg), série ${idx}" />
      <input type="checkbox" name="done" title="Série concluída" aria-label="Série ${idx} concluída" ${done ? "checked" : ""} />
    </div>
  `);
}

/** Índice do 1.º exercício ainda com série por marcar (foco de treino). -1 = todos concluídos. */
function getCurrentExerciseIndex(list) {
  for (let i = 0; i < list.length; i++) {
    const sets = list[i].sets || [];
    if (sets.some((s) => !s.done)) {
      return i;
    }
  }
  return -1;
}

function onSetInput(e) {
  const t = e.target;
  if (t.name !== "kg") return;
  const row = t.closest(".set-row");
  if (!row) return;
  const eid = row.getAttribute("data-ex-id");
  const sidx = parseInt(row.getAttribute("data-set-idx"), 10);
  const ex = state.session.exercises.find((x) => x.id === eid);
  if (!ex || !ex.sets || !ex.sets[sidx]) return;
  const v = t.value.replace(",", ".").trim();
  ex.sets[sidx].kg = v === "" ? "" : v;
  schedulePersist();
}

function onSetChange(e) {
  if (e.target.name !== "done") return;
  const row = e.target.closest(".set-row");
  if (!row) return;
  const eid = row.getAttribute("data-ex-id");
  const sidx = parseInt(row.getAttribute("data-set-idx"), 10);
  const ex = state.session.exercises.find((x) => x.id === eid);
  if (ex && ex.sets && ex.sets[sidx]) {
    ex.sets[sidx].done = e.target.checked;
    save();
  }
}

function renderExerciseList() {
  const root = document.getElementById("exercise-list");
  const empty = document.getElementById("empty-exercises");
  root.replaceChildren();
  const list = state.session.exercises;
  if (list.length === 0) {
    empty.hidden = false;
    const h0 = document.getElementById("ex-hint");
    if (h0) {
      h0.hidden = true;
    }
    return;
  }
  empty.hidden = true;
  const currentIdx = getCurrentExerciseIndex(list);
  const hint = document.getElementById("ex-hint");
  if (hint) {
    hint.hidden = list.length === 0 || currentIdx < 0;
  }
  list.forEach((ex, n) => {
    if (!ex.sets || !ex.sets.length) {
      ex.sets = [{ reps: 10, kg: "", done: false }];
    }
    const num = String(n + 1).padStart(2, "0");
    const isCurrent = n === currentIdx;
    const noteBlock = ex.note
      ? `<p class="exercise-note">${escapeHtml(ex.note)}</p>`
      : "";
    const restBtn =
      ex.suggestedRestSec != null
        ? `<button type="button" class="btn btn-rest" data-rest-sec="${ex.suggestedRestSec}" aria-label="Iniciar timer de descanso de ${escapeHtml(
            formatRestSec(ex.suggestedRestSec)
          )}">Descanso ${escapeHtml(formatRestSec(ex.suggestedRestSec))}</button>`
        : "";
    const card = el(`
      <article class="exercise-card${isCurrent ? " exercise-card--current" : ""}" data-id="${ex.id}" ${
        isCurrent ? 'aria-current="true"' : ""
      }>
        <div class="exercise-card__top">
          <span class="exercise-card__index" aria-hidden="true">${num}</span>
          <div class="exercise-card__title">
            <h3 class="exercise-card__name">${escapeHtml(ex.name)}</h3>
          </div>
          <button type="button" class="btn btn--text-danger" data-action="remove-ex" aria-label="Remover exercício do treino de hoje">Remover</button>
        </div>
        ${noteBlock}
        ${restBtn}
        <div class="set-table" data-sets>
          <div class="set-table__head" aria-hidden="true">
            <span>S</span>
            <span title="Repetições (fixas no plano)">Reps</span>
            <span>Carga (kg)</span>
            <span class="set-table__head-ok" title="Série concluída">✓</span>
          </div>
        </div>
        <button type="button" class="btn btn--dashed add-line" data-action="add-set" aria-label="Adicionar série a este exercício">+ série</button>
      </article>
    `);
    const setsWrap = card.querySelector("[data-sets]");
    ex.sets.forEach((row, i) => {
      setsWrap.appendChild(setRowTemplate(ex.id, i + 1, row.reps, row.kg, row.done));
    });
    card.querySelector("[data-action=remove-ex]").addEventListener("click", () => {
      state.session.exercises = state.session.exercises.filter((e) => e.id !== ex.id);
      save();
    });
    card.querySelector("[data-action=add-set]").addEventListener("click", () => {
      const base = ex.sets[0];
      const targetReps = base && base.reps != null && base.reps !== "" ? base.reps : 10;
      ex.sets.push({ reps: targetReps, kg: "", done: false });
      save();
    });
    card.addEventListener("input", onSetInput);
    card.addEventListener("change", onSetChange);
    root.appendChild(card);
  });
}

function formatHistoryItem(entry) {
  const date = new Date(entry.dayKey + "T12:00:00");
  const when = date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
  const n = entry.exercises.length;
  return `${when} — ${n} exercício(s)`;
}

function renderHistory() {
  const ul = document.getElementById("history-list");
  const empty = document.getElementById("history-empty");
  ul.replaceChildren();
  if (!state.history.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  state.history.forEach((h, i) => {
    const li = el(`<li class="history-item">
      <span class="history-item__label">${escapeHtml(formatHistoryItem(h))}</span>
      <button type="button" class="btn" data-idx="${i}" aria-label="Ver séries e cargas deste treino">Detalhes</button>
    </li>`);
    li.querySelector("button").addEventListener("click", () => {
      const d = h.exercises
        .map((e) => {
          const lines = (e.sets || [])
            .map((s, j) => `  S${j + 1}: ${s.reps != null ? s.reps : "—"} reps, ${s.kg === "" || s.kg == null ? "—" : s.kg} kg`)
            .join("\n");
          return `• ${e.name}\n${lines}`;
        })
        .join("\n\n");
      alert(d);
    });
    ul.appendChild(li);
  });
}

function showMain() {
  document.getElementById("main-view").hidden = false;
  document.getElementById("history-view").hidden = true;
}

function showHistory() {
  renderHistory();
  document.getElementById("main-view").hidden = true;
  document.getElementById("history-view").hidden = false;
}

/* Timer */
let remainingSec = 0;
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
  updateTimerDisplay();
}

function hideTimer() {
  clearInterval(tickId);
  tickId = null;
  document.getElementById("timer-bar").hidden = true;
  document.body.classList.remove("js-timer-active");
  const pauseBtn = document.getElementById("btn-timer-pause");
  pauseBtn.textContent = "Pausar";
  timerPaused = false;
}

function updateTimerDisplay() {
  const elDisp = document.getElementById("timer-display");
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  elDisp.textContent = m + ":" + String(s).padStart(2, "0");
}

function runTick() {
  if (timerPaused) return;
  if (remainingSec <= 0) {
    setTimerScreenReader("Descanso concluído. Próxima série.");
    try {
      navigator.vibrate(200);
    } catch {
      /* ignore */
    }
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
    clearInterval(tickId);
    tickId = null;
    hideTimer();
    window.setTimeout(() => setTimerScreenReader(""), 2200);
    return;
  }
  remainingSec -= 1;
  updateTimerDisplay();
}

function startCountdown(fromSec) {
  if (fromSec < 0) fromSec = 0;
  remainingSec = fromSec;
  timerPaused = false;
  clearInterval(tickId);
  const pauseBtn = document.getElementById("btn-timer-pause");
  pauseBtn.textContent = "Pausar";
  showTimer();
  const m = Math.floor(fromSec / 60);
  const s = fromSec % 60;
  const human = m ? `${m} min e ${s} s` : `${s} segundos`;
  setTimerScreenReader(`Descanso: ${human}. Pausar ou parar a qualquer momento.`);
  updateTimerDisplay();
  if (fromSec > 0) {
    if (tickId) clearInterval(tickId);
    tickId = setInterval(runTick, 1000);
  } else {
    setTimerScreenReader("Timer a zero. Ajuste com os atalhos ou Pausar e Parar.");
  }
}

function initTimerUi() {
  const bar = document.getElementById("timer-bar");
  document.getElementById("exercise-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rest-sec]");
    if (!b) return;
    e.preventDefault();
    const sec = parseInt(b.getAttribute("data-rest-sec"), 10);
    if (!Number.isFinite(sec) || sec < 0) return;
    startCountdown(sec);
  });
  bar.addEventListener("click", (e) => {
    if (e.target.getAttribute("data-sec") != null) {
      e.preventDefault();
      startCountdown(parseInt(e.target.getAttribute("data-sec"), 10));
    }
  });
  document.getElementById("btn-timer-pause").addEventListener("click", () => {
    if (remainingSec <= 0) return;
    timerPaused = !timerPaused;
    const b = document.getElementById("btn-timer-pause");
    b.textContent = timerPaused ? "Continuar" : "Pausar";
  });
  document.getElementById("btn-timer-stop").addEventListener("click", () => {
    clearInterval(tickId);
    tickId = null;
    setTimerScreenReader("Descanso interrompido.");
    hideTimer();
    window.setTimeout(() => setTimerScreenReader(""), 2000);
  });
}

function isIosStandalone() {
  return (window.navigator).standalone === true;
}

function installHint() {
  const p = document.getElementById("install-prompt");
  const hide = isIosStandalone() || !/iPhone|iPad|iPod/i.test(navigator.userAgent);
  p.hidden = hide;
  return hide;
}

function initMainActions() {
  document.getElementById("btn-finish").addEventListener("click", () => {
    if (!state.session.exercises.length) {
      alert("Não há exercícios no treino de hoje.");
      return;
    }
    const pid = state.session.sourcePresetId;
    if (pid) {
      recordLastWeightsFromSession(pid, state.session.exercises);
    }
    state.history.unshift({
      dayKey: state.session.dayKey,
      at: Date.now(),
      exercises: JSON.parse(JSON.stringify(state.session.exercises)),
    });
    state.session = { dayKey: state.session.dayKey, exercises: [], sourcePresetId: null };
    save();
    alert("Treino concluído. As cargas desta ficha ficaram guardadas para a próxima vez que a carregar.");
  });

  document.getElementById("btn-history").addEventListener("click", showHistory);
  document.getElementById("btn-back").addEventListener("click", showMain);
  document.getElementById("btn-help").addEventListener("click", () => {
    document.getElementById("install-prompt").hidden = false;
    document.getElementById("install-prompt").scrollIntoView({ behavior: "smooth" });
  });
}

function applyPresetFromSelect(id) {
  if (!id) {
    return;
  }
  if (id === state.session.sourcePresetId && state.session.exercises.length) {
    return;
  }
  const preset = PRESET_WORKOUTS.find((x) => x.id === id);
  if (!preset) {
    return;
  }
  if (state.session.exercises.length) {
    if (
      !confirm(
        "Substituir o treino de hoje pelo selecionado? A lista atual deixa de aparecer (não vai para o histórico). Confirma?"
      )
    ) {
      const s = document.getElementById("preset-select");
      if (s) {
        s.value = state.session.sourcePresetId || "";
      }
      return;
    }
  }
  if (state.session.exercises.length && state.session.sourcePresetId) {
    recordLastWeightsFromSession(state.session.sourcePresetId, state.session.exercises);
  }
  const nextEx = preset.exercises.map((ex) => ({
    ...JSON.parse(JSON.stringify(ex)),
    id: uid(),
  }));
  applyLastWeightsToExercises(id, nextEx);
  state.session.exercises = nextEx;
  state.session.sourcePresetId = id;
  save();
}

function initPresets() {
  const sel = document.getElementById("preset-select");
  if (!sel) {
    return;
  }
  for (const p of PRESET_WORKOUTS) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    const id = sel.value;
    if (!id) {
      if (state.session.exercises.length && state.session.sourcePresetId) {
        sel.value = state.session.sourcePresetId;
      }
      return;
    }
    applyPresetFromSelect(id);
  });
}

function registerSw() {
  if (!("serviceWorker" in navigator)) return;
  const sw = new URL("sw.js", import.meta.url);
  navigator.serviceWorker.register(sw).catch((err) => console.warn("Service worker:", err));
}

registerSw();

function syncPresetSelect() {
  const sel = document.getElementById("preset-select");
  if (!sel) {
    return;
  }
  const id = state.session.sourcePresetId;
  if (id && PRESET_WORKOUTS.some((p) => p.id === id)) {
    sel.value = id;
  } else {
    sel.value = "";
  }
}

function render() {
  document.getElementById("date-label").textContent = formatDayLabel();
  renderExerciseList();
  syncPresetSelect();
}

initTimerUi();
initMainActions();
initPresets();
initPersistFlushes();
render();
installHint();

function initPersistFlushes() {
  const flush = () => flushPendingPersist();
  window.addEventListener("pagehide", flush, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });
  const list = document.getElementById("exercise-list");
  if (list) {
    list.addEventListener(
      "focusout",
      (e) => {
        const t = e.target;
        if (t && t.getAttribute("name") === "kg" && t.closest && t.closest(".exercise-card")) {
          flush();
        }
      },
      true
    );
  }
}
