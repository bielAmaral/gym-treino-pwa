import { PRESET_WORKOUTS } from "./presets.js";
import { sanitizeKgInput } from "./sanitize-kg.js";
import { initTimerUi } from "./timer.js";

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
  const prevMap = state.lastWeights[presetId] && typeof state.lastWeights[presetId] === "object" ? state.lastWeights[presetId] : {};
  const map = {};
  for (const ex of exercises) {
    const oldArr = Array.isArray(prevMap[ex.name]) ? prevMap[ex.name] : [];
    map[ex.name] = (ex.sets || []).map((s, i) => {
      const typed = s.kg == null || String(s.kg).trim() === "" ? "" : sanitizeKgInput(String(s.kg));
      if (typed !== "") {
        return typed;
      }
      const fallback = oldArr[i] != null && String(oldArr[i]).trim() !== "" ? sanitizeKgInput(String(oldArr[i])) : "";
      return fallback;
    });
  }
  state.lastWeights[presetId] = map;
}

/**
 * Pesos de referência por série: último treino **concluído** (histórico) desta ficha;
 * se ainda não houver, usa `lastWeights` guardados na sessão anterior.
 * Serve só para placeholder / lembrete — não altera `s.kg` no estado.
 * @param {string | null} presetId
 * @param {string} exerciseName
 * @returns {string[]}
 */
function getReferenceKgStrings(presetId, exerciseName) {
  if (!presetId || !exerciseName) {
    return [];
  }
  for (const h of state.history) {
    if (!h || h.sourcePresetId !== presetId) {
      continue;
    }
    const ex = (h.exercises || []).find((e) => e.name === exerciseName);
    if (ex && Array.isArray(ex.sets)) {
      return ex.sets.map((s) =>
        s.kg == null || String(s.kg).trim() === "" ? "" : sanitizeKgInput(String(s.kg))
      );
    }
  }
  const byName = state.lastWeights && state.lastWeights[presetId];
  if (!byName || typeof byName !== "object") {
    return [];
  }
  const arr = byName[exerciseName];
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map((w) => (w == null || String(w).trim() === "" ? "" : sanitizeKgInput(String(w))));
}

/**
 * Mantém chamada ao escolher ficha (antes preenchia kg); agora só referência via placeholder na UI.
 * @param {string} presetId
 * @param {Array<{ name: string, sets: { kg?: string }[] }>} exercises
 */
function applyLastWeightsToExercises(_presetId, _exercises) {
  /* intencionalmente vazio — cargas sugeridas vêm de getReferenceKgStrings + placeholder */
}

function persistState() {
  if (state.session && state.session.sourcePresetId && state.session.exercises && state.session.exercises.length) {
    recordLastWeightsFromSession(state.session.sourcePresetId, state.session.exercises);
  }
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch (e) {
    console.warn("localStorage", e);
    if (e && (e.name === "QuotaExceededError" || (e instanceof DOMException && e.code === 22))) {
      showToast("Não foi possível guardar: armazenamento cheio. Tente apagar o histórico no Safari (dados do site) ou ficheiros no aparelho.", { variant: "error" });
    } else {
      showToast("Não foi possível guardar. Tente de novo.", { variant: "error" });
    }
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
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return "e-" + globalThis.crypto.randomUUID();
  }
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

const TOAST_MS = 5200;
let toastTimeoutId = null;

/**
 * @param {string} msg
 * @param {{ variant?: "info" | "success" | "error" | "warning" }} [options]
 */
function showToast(msg, options) {
  const o = options || {};
  const variant = o.variant || "info";
  const host = document.getElementById("toast-host");
  if (!host) {
    return;
  }
  clearTimeout(toastTimeoutId);
  host.textContent = msg;
  host.className = "toast" + (variant && variant !== "info" ? ` toast--${variant}` : " toast--info");
  host.hidden = false;
  toastTimeoutId = window.setTimeout(() => {
    host.hidden = true;
    host.textContent = "";
    host.className = "toast";
  }, TOAST_MS);
}

let lastFocusBeforeHistoryModal = null;

/** @param {string} dayKey */
function formatHistoryDetailTitle(dayKey) {
  const date = new Date(dayKey + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** @param {{ dayKey?: string, presetLabel?: string, exercises?: Array<{ name?: string, note?: string, sets?: Array<{ reps?: unknown, kg?: unknown }> }> }} entry */
function openHistoryDetailForEntry(entry) {
  const modal = document.getElementById("history-modal");
  const body = document.getElementById("history-modal-body");
  const titleEl = document.getElementById("history-modal-title");
  if (!modal || !body || !titleEl) {
    return;
  }
  lastFocusBeforeHistoryModal = document.activeElement;

  const dayKey = entry && typeof entry.dayKey === "string" ? entry.dayKey : "";
  titleEl.textContent = dayKey ? `Treino · ${formatHistoryDetailTitle(dayKey)}` : "Detalhe do treino";

  body.replaceChildren();
  const root = document.createElement("div");
  root.className = "history-detail";

  const meta = document.createElement("div");
  meta.className = "history-detail__meta";
  const chip = document.createElement("span");
  const presetRaw = entry && entry.presetLabel != null ? String(entry.presetLabel).trim() : "";
  const hasPreset = !!presetRaw;
  chip.className = hasPreset ? "history-detail__chip" : "history-detail__chip history-detail__chip--muted";
  chip.textContent = hasPreset ? presetRaw : "Ficha não associada";
  const when = document.createElement("p");
  when.className = "history-detail__when";
  when.textContent = dayKey ? formatHistoryCardDate(dayKey) : "—";
  meta.appendChild(chip);
  meta.appendChild(when);
  root.appendChild(meta);

  const exercises = entry && Array.isArray(entry.exercises) ? entry.exercises : [];
  const list = document.createElement("div");
  list.className = "history-detail__exercises";

  if (!exercises.length) {
    const empty = document.createElement("p");
    empty.className = "history-detail__empty";
    empty.textContent = "Nenhum exercício registrado neste treino.";
    list.appendChild(empty);
  } else {
    exercises.forEach((ex, idx) => {
      const sec = document.createElement("section");
      sec.className = "history-detail-ex";

      const h = document.createElement("h3");
      h.className = "history-detail-ex__title";
      const name = ex && ex.name != null ? String(ex.name) : "—";
      h.textContent = `${String(idx + 1).padStart(2, "0")} · ${name}`;
      sec.appendChild(h);

      const noteText = ex && ex.note != null ? String(ex.note).trim() : "";
      if (noteText) {
        const note = document.createElement("p");
        note.className = "history-detail-ex__note";
        note.textContent = noteText;
        sec.appendChild(note);
      }

      const grid = document.createElement("div");
      grid.className = "history-detail-grid";
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-label", `Séries de ${name}`);

      const head = document.createElement("div");
      head.className = "history-detail-grid__head";
      head.setAttribute("aria-hidden", "true");
      const hS = document.createElement("span");
      hS.textContent = "S";
      const hR = document.createElement("span");
      hR.textContent = "Reps";
      const hK = document.createElement("span");
      hK.textContent = "Kg";
      head.appendChild(hS);
      head.appendChild(hR);
      head.appendChild(hK);
      grid.appendChild(head);

      const sets = ex && Array.isArray(ex.sets) ? ex.sets : [];
      sets.forEach((s, j) => {
        const row = document.createElement("div");
        row.className = "history-detail-grid__row";

        const idxCell = document.createElement("span");
        idxCell.className = "history-detail-grid__idx";
        idxCell.textContent = String(j + 1);

        const repsCell = document.createElement("span");
        repsCell.className = "history-detail-grid__reps";
        repsCell.textContent = formatRepsDisplay(s && s.reps != null ? s.reps : null);

        const kgCell = document.createElement("span");
        kgCell.className = "history-detail-grid__kg";
        const rawKg = s && s.kg !== "" && s.kg != null ? String(s.kg) : "";
        kgCell.textContent = rawKg === "" ? "—" : sanitizeKgInput(rawKg) || "—";

        row.appendChild(idxCell);
        row.appendChild(repsCell);
        row.appendChild(kgCell);
        grid.appendChild(row);
      });

      sec.appendChild(grid);
      list.appendChild(sec);
    });
  }

  root.appendChild(list);
  body.appendChild(root);

  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("history-modal-close")?.focus();
}

function closeHistoryDetailModal() {
  const modal = document.getElementById("history-modal");
  const body = document.getElementById("history-modal-body");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (body) {
    body.replaceChildren();
  }
  const f = lastFocusBeforeHistoryModal;
  lastFocusBeforeHistoryModal = null;
  if (f && f.focus) {
    try {
      f.focus();
    } catch {
      /* ignore */
    }
  }
}

function initHistoryModal() {
  const m = document.getElementById("history-modal");
  if (!m) {
    return;
  }
  m.addEventListener("click", (e) => {
    const raw = e.target;
    if (!raw) {
      return;
    }
    const el = raw instanceof Element ? raw : raw.parentElement;
    if (!el) {
      return;
    }
    if (el === m || el.hasAttribute("data-modal-close") || el.closest("[data-modal-close]")) {
      e.preventDefault();
      closeHistoryDetailModal();
    }
  });
}

let lastFocusBeforeConfirmModal = null;
/** @type {((value: boolean) => void) | null} */
let confirmResolve = null;

function closeConfirmModal(result) {
  const modal = document.getElementById("confirm-modal");
  if (modal && !modal.hidden) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }
  const r = confirmResolve;
  confirmResolve = null;
  if (r) {
    r(!!result);
  }
  const f = lastFocusBeforeConfirmModal;
  lastFocusBeforeConfirmModal = null;
  if (f && typeof f.focus === "function") {
    try {
      f.focus();
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string }} opts
 * @returns {Promise<boolean>}
 */
function openConfirm(opts) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const bodyEl = document.getElementById("confirm-modal-body");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");
    if (!modal || !titleEl || !bodyEl || !okBtn || !cancelBtn) {
      resolve(false);
      return;
    }
    lastFocusBeforeConfirmModal = document.activeElement;
    confirmResolve = resolve;
    titleEl.textContent = opts.title;
    bodyEl.textContent = opts.message;
    okBtn.textContent = opts.confirmLabel || "OK";
    cancelBtn.textContent = opts.cancelLabel || "Cancelar";
    modal.hidden = false;
    document.body.classList.add("modal-open");
    cancelBtn.focus();
  });
}

function initConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (!modal) {
    return;
  }
  modal.addEventListener("click", (e) => {
    const raw = e.target;
    if (!raw || !(raw instanceof Element)) {
      return;
    }
    const t = raw;
    if (t.id === "btn-confirm-ok") {
      e.preventDefault();
      closeConfirmModal(true);
      return;
    }
    if (t.id === "btn-confirm-cancel") {
      e.preventDefault();
      closeConfirmModal(false);
      return;
    }
    if (t.hasAttribute("data-confirm-dismiss") || t.closest("[data-confirm-dismiss]")) {
      e.preventDefault();
      closeConfirmModal(false);
    }
  });
}

function initGlobalEscape() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") {
      return;
    }
    const pm = document.getElementById("preset-modal");
    if (pm && !pm.hidden) {
      e.preventDefault();
      closePresetSheet();
      return;
    }
    const cm = document.getElementById("confirm-modal");
    if (cm && !cm.hidden) {
      e.preventDefault();
      closeConfirmModal(false);
      return;
    }
    const m = document.getElementById("history-modal");
    if (m && !m.hidden) {
      e.preventDefault();
      closeHistoryDetailModal();
    }
  });
}

function showUpdateBanner() {
  const ub = document.getElementById("update-banner");
  if (!ub) {
    return;
  }
  ub.hidden = false;
  document.body.classList.add("has-update-banner");
}

function initUpdateReload() {
  const btn = document.getElementById("btn-update-reload");
  if (btn) {
    btn.addEventListener("click", () => {
      location.reload();
    });
  }
}

function formatRepsDisplay(reps) {
  if (reps == null || reps === "") {
    return "—";
  }
  return String(reps);
}

function setRowTemplate(exerciseId, idx, reps, kg, done, refKgHint) {
  const repsLabel = formatRepsDisplay(reps);
  const repsAria = reps == null || reps === "" ? "sem meta numérica" : `meta de ${reps} repetições`;
  const doneClass = done ? " set-table__row--done" : "";
  const kgVal = kg == null || kg === "" ? "" : escapeHtml(sanitizeKgInput(String(kg)));
  const ref = refKgHint && String(refKgHint).trim() !== "" ? sanitizeKgInput(String(refKgHint)) : "";
  const placeholder = ref ? `Últ.: ${escapeHtml(ref)}` : "—";
  const ariaKg =
    ref && (!kgVal || kgVal === "")
      ? `Carga (kg), série ${idx}. Sugestão do último treino: ${ref} quilos.`
      : `Carga (kg), série ${idx}`;
  const titleKg = ref ? `Último treino: ${ref} kg. Apenas números e vírgula.` : "Apenas números e vírgula.";
  return el(`
    <div class="set-row set-table__row${doneClass}" data-ex-id="${exerciseId}" data-set-idx="${idx - 1}">
      <span class="set-idx" aria-label="Série ${idx}">${idx}</span>
      <span class="set-reps-display" aria-label="Reps (fixo do plano), ${repsAria}, série ${idx}">${escapeHtml(repsLabel)}</span>
      <input type="text" name="kg" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="${placeholder}" value="${kgVal}" class="set-kg" aria-label="${escapeHtml(ariaKg)}" title="${escapeHtml(titleKg)}" />
      <label class="set-ok-label" title="Marcar série concluída">
        <input type="checkbox" name="done" class="set-done" aria-label="Série ${idx} concluída" ${done ? "checked" : ""} />
      </label>
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

/**
 * Atualiza classes e checkboxes sem recriar a lista (evita perder foco/scroll no iPhone).
 * @returns {boolean} false se a estrutura do DOM não bater com o estado — aí convém `render()` completo.
 */
function syncExerciseListFromState() {
  const root = document.getElementById("exercise-list");
  const list = state.session.exercises;
  if (!root || !list) {
    return false;
  }
  const cards = root.querySelectorAll(".exercise-card");
  if (cards.length !== list.length) {
    return false;
  }
  for (let i = 0; i < list.length; i++) {
    const card = cards[i];
    const ex = list[i];
    if (card.getAttribute("data-id") !== ex.id) {
      return false;
    }
    if (!ex.sets || !ex.sets.length) {
      return false;
    }
    const rows = card.querySelectorAll(".set-row");
    if (rows.length !== ex.sets.length) {
      return false;
    }
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      const done = !!ex.sets[j].done;
      row.classList.toggle("set-table__row--done", done);
      const cb = row.querySelector("input.set-done");
      if (cb) {
        cb.checked = done;
      }
    }
  }
  const currentIdx = getCurrentExerciseIndex(list);
  cards.forEach((card, i) => {
    const isCurrent = i === currentIdx;
    card.classList.toggle("exercise-card--current", isCurrent);
    if (isCurrent) {
      card.setAttribute("aria-current", "true");
    } else {
      card.removeAttribute("aria-current");
    }
  });
  const hint = document.getElementById("ex-hint");
  if (hint) {
    hint.hidden = list.length === 0 || currentIdx < 0;
  }
  return true;
}

function scrollCurrentExerciseIntoView() {
  const card = document.querySelector(".exercise-card--current");
  if (!card) {
    return;
  }
  let smooth = true;
  try {
    smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    smooth = true;
  }
  card.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" });
}

let exerciseLiveClearId = null;

/** Anuncia mudança do exercício “atual” (VoiceOver). */
function announceCurrentExercise(newIdx) {
  const live = document.getElementById("exercise-live");
  if (!live) {
    return;
  }
  if (exerciseLiveClearId != null) {
    clearTimeout(exerciseLiveClearId);
    exerciseLiveClearId = null;
  }
  const list = state.session.exercises;
  if (newIdx < 0) {
    live.textContent = "Treino: todos os exercícios estão concluídos.";
  } else {
    const ex = list[newIdx];
    live.textContent = ex ? `Agora: ${ex.name}.` : "";
  }
  exerciseLiveClearId = window.setTimeout(() => {
    live.textContent = "";
    exerciseLiveClearId = null;
  }, 3500);
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
  const v = sanitizeKgInput(t.value);
  if (t.value !== v) {
    t.value = v;
  }
  ex.sets[sidx].kg = v;
  schedulePersist();
}

function onSetChange(e) {
  if (e.target.name !== "done") return;
  const row = e.target.closest(".set-row");
  if (!row) return;
  const eid = row.getAttribute("data-ex-id");
  const sidx = parseInt(row.getAttribute("data-set-idx"), 10);
  const ex = state.session.exercises.find((x) => x.id === eid);
  if (!(ex && ex.sets && ex.sets[sidx])) {
    return;
  }
  const prevCurrent = getCurrentExerciseIndex(state.session.exercises);
  ex.sets[sidx].done = e.target.checked;
  const newCurrent = getCurrentExerciseIndex(state.session.exercises);
  flushPendingPersist();
  persistState();
  if (!syncExerciseListFromState()) {
    render();
    return;
  }
  if (newCurrent !== prevCurrent) {
    announceCurrentExercise(newCurrent);
    if (newCurrent >= 0) {
      scrollCurrentExerciseIntoView();
    }
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
    const refArr = getReferenceKgStrings(state.session.sourcePresetId, ex.name);
    ex.sets.forEach((row, i) => {
      const refHint = refArr[i] != null && String(refArr[i]).trim() !== "" ? refArr[i] : "";
      setsWrap.appendChild(setRowTemplate(ex.id, i + 1, row.reps, row.kg, row.done, refHint));
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
  const label = entry.presetLabel && String(entry.presetLabel).trim() ? `${entry.presetLabel} · ` : "";
  return `${label}${when} — ${n} exercício(s)`;
}

/** Data legível para o cartão do histórico (uma linha). */
function formatHistoryCardDate(dayKey) {
  const date = new Date(dayKey + "T12:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Primeiros nomes de exercícios para pré-visualização. */
function historyExercisePreview(exercises, max) {
  const m = max == null ? 3 : max;
  if (!exercises || !exercises.length) {
    return "";
  }
  const parts = exercises.slice(0, m).map((e) => (e && e.name ? String(e.name) : ""));
  const s = parts.filter(Boolean).join(" · ");
  if (!s) {
    return "";
  }
  return exercises.length > m ? `${s}…` : s;
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
    const n = (h.exercises && h.exercises.length) || 0;
    const preview = historyExercisePreview(h.exercises, 3);
    const hasPreset = !!(h.presetLabel && String(h.presetLabel).trim());
    const chipLabel = hasPreset ? escapeHtml(String(h.presetLabel).trim()) : escapeHtml("Ficha não associada");
    const chipClass = hasPreset ? "history-item__chip" : "history-item__chip history-item__chip--muted";
    const previewBlock =
      preview !== ""
        ? `<p class="history-item__preview">${escapeHtml(preview)}</p>`
        : `<p class="history-item__preview history-item__preview--empty">Sem pré-visualização</p>`;
    const li = el(`<li class="history-item">
      <div class="history-item__head">
        <time class="history-item__date" datetime="${escapeHtml(h.dayKey)}">${escapeHtml(formatHistoryCardDate(h.dayKey))}</time>
        <span class="history-item__badge">${n} exercício${n === 1 ? "" : "s"}</span>
      </div>
      <span class="${chipClass}">${chipLabel}</span>
      ${previewBlock}
      <button type="button" class="btn history-item__cta" data-idx="${i}" aria-label="${escapeHtml(formatHistoryItem(h))}. Ver séries e cargas.">Ver treino</button>
    </li>`);
    li.querySelector("button").addEventListener("click", () => {
      openHistoryDetailForEntry(h);
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
  document.getElementById("btn-finish").addEventListener("click", async () => {
    if (!state.session.exercises.length) {
      showToast("Não há exercícios no treino de hoje. Escolha um treino na planilha.", { variant: "warning" });
      return;
    }
    const day = state.session.dayKey;
    const alreadyToday = state.history.some((h) => h && h.dayKey === day);
    if (alreadyToday) {
      const whenLabel = new Date(day + "T12:00:00").toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const ok = await openConfirm({
        title: "Substituir treino de hoje?",
        message:
          "Já existe um treino concluído neste dia (" +
          whenLabel +
          ") no histórico. Substituir pelo treino de agora? O registo anterior deste dia deixa de aparecer no histórico.",
        confirmLabel: "Substituir",
        cancelLabel: "Cancelar",
      });
      if (!ok) {
        return;
      }
      state.history = state.history.filter((h) => !h || h.dayKey !== day);
    }
    const pid = state.session.sourcePresetId;
    if (pid) {
      recordLastWeightsFromSession(pid, state.session.exercises);
    }
    const presetMeta = pid ? PRESET_WORKOUTS.find((p) => p.id === pid) : null;
    state.history.unshift({
      dayKey: day,
      at: Date.now(),
      sourcePresetId: pid || null,
      presetLabel: presetMeta ? presetMeta.label : null,
      exercises: JSON.parse(JSON.stringify(state.session.exercises)),
    });
    state.session = { dayKey: day, exercises: [], sourcePresetId: null };
    save();
    showToast("Treino concluído. Cargas da ficha guardadas para a próxima vez que a abrir.", { variant: "success" });
  });

  document.getElementById("btn-history").addEventListener("click", showHistory);
  document.getElementById("btn-back").addEventListener("click", showMain);
  document.getElementById("btn-help").addEventListener("click", () => {
    document.getElementById("install-prompt").hidden = false;
    document.getElementById("install-prompt").scrollIntoView({ behavior: "smooth" });
  });
}

async function applyPresetFromSelect(id) {
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
    const ok = await openConfirm({
      title: "Substituir treino?",
      message:
        "Substituir o treino de hoje pelo selecionado? A lista atual deixa de aparecer (não vai para o histórico).",
      confirmLabel: "Substituir",
      cancelLabel: "Cancelar",
    });
    if (!ok) {
      syncPresetTrigger();
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

function updatePresetListAriaSelected() {
  const id = state.session.sourcePresetId;
  document.querySelectorAll("#preset-option-list .preset-option").forEach((btn) => {
    const pid = btn.getAttribute("data-preset-id");
    btn.setAttribute("aria-selected", pid === id ? "true" : "false");
  });
}

function openPresetSheet() {
  const modal = document.getElementById("preset-modal");
  const trigger = document.getElementById("preset-trigger");
  if (!modal || modal.hidden === false) {
    return;
  }
  updatePresetListAriaSelected();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "true");
  }
  const first = document.querySelector("#preset-option-list .preset-option");
  (first || document.querySelector("[data-preset-sheet-dismiss]"))?.focus();
}

function closePresetSheet() {
  const modal = document.getElementById("preset-modal");
  const trigger = document.getElementById("preset-trigger");
  if (!modal || modal.hidden) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
    try {
      trigger.focus();
    } catch {
      /* ignore */
    }
  }
}

function initPresetSheet() {
  const modal = document.getElementById("preset-modal");
  const ul = document.getElementById("preset-option-list");
  const trigger = document.getElementById("preset-trigger");
  if (!modal || !ul || !trigger) {
    return;
  }
  ul.replaceChildren();
  for (const p of PRESET_WORKOUTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-option";
    btn.setAttribute("role", "option");
    btn.setAttribute("data-preset-id", p.id);
    btn.textContent = p.label;
    btn.addEventListener("click", async () => {
      closePresetSheet();
      await applyPresetFromSelect(p.id);
    });
    ul.appendChild(btn);
  }
  trigger.addEventListener("click", () => {
    openPresetSheet();
  });
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) {
      return;
    }
    if (t.hasAttribute("data-preset-sheet-dismiss") || t.closest("[data-preset-sheet-dismiss]")) {
      e.preventDefault();
      closePresetSheet();
    }
  });
}

function initPresets() {
  initPresetSheet();
}

function registerSw() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const sw = new URL("sw.js", import.meta.url);
  navigator.serviceWorker
    .register(sw)
    .then((reg) => {
      reg.update().catch(() => {});
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner();
      }
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) {
          return;
        }
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      });
    })
    .catch((err) => {
      console.warn("Service worker:", err);
    });
}

registerSw();

function syncPresetTrigger() {
  const labelEl = document.getElementById("preset-trigger-label");
  if (!labelEl) {
    return;
  }
  const id = state.session.sourcePresetId;
  const preset = id && PRESET_WORKOUTS.find((p) => p.id === id);
  labelEl.textContent = preset ? preset.label : "Selecione o treino";
  updatePresetListAriaSelected();
}

function render() {
  document.getElementById("date-label").textContent = formatDayLabel();
  renderExerciseList();
  syncPresetTrigger();
}

initTimerUi();
initUpdateReload();
initMainActions();
initPresets();
initPersistFlushes();
initHistoryModal();
initConfirmModal();
initGlobalEscape();
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
