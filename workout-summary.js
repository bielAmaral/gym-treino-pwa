import { sanitizeKgInput } from "./sanitize-kg.js";

/** Grupos musculares destacados por ficha (ilustracao simplificada). */
export const PRESET_MUSCLE_GROUPS = {
  t1: ["lats", "traps", "rear_delts", "biceps", "forearms"],
  t2: ["chest", "delts", "calves"],
  t3: ["biceps", "triceps", "forearms"],
  t4: ["quads", "hamstrings", "glutes", "calves"],
  t5: ["lats", "chest", "delts", "biceps", "triceps"],
  t6: ["glutes", "hamstrings", "calves", "abs"],
};

const TXT = {
  lats: "Costas",
  traps: "Trapezio",
  rear_delts: "Ombro post.",
  chest: "Peito",
  delts: "Ombros",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Antebraco",
  abs: "Abdomen",
  quads: "Quadriceps",
  hamstrings: "Posterior",
  glutes: "Gluteos",
  calves: "Panturrilha",
  titleDone: "Treino concluido!",
  titleSaved: "Treino guardado",
  introFallback: "Resumo do que voce registrou hoje.",
  statSets: "series concluidas",
  statVolume: "volume total levantado",
  musclesPrefix: "Musculos trabalhados:",
  musclesFallback: "Marque uma ficha da planilha para ver o mapa muscular.",
  note: "Volume = carga x reps nas series marcadas. Halteres contam as duas maos. Cardio nao entra no total.",
  front: "Frente",
  back: "Costas",
};

/** @param {string | null | undefined} name */
export function isDumbbellExercise(name) {
  return typeof name === "string" && /halter/i.test(name);
}

/** @param {{ technique?: { type?: string } | null, sets?: Array<{ isCardio?: boolean }> }} ex */
export function isCardioExercise(ex) {
  if (!ex) {
    return false;
  }
  if (ex.technique && ex.technique.type === "cardio") {
    return true;
  }
  const sets = ex.sets;
  return Array.isArray(sets) && sets.some((s) => s && s.isCardio);
}

/** @param {string | number | null | undefined} raw */
export function parseKgNumber(raw) {
  const s = sanitizeKgInput(raw == null ? "" : String(raw));
  if (!s) {
    return 0;
  }
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** @param {{ reps?: unknown, repsMin?: unknown }} set */
function repsForVolume(set) {
  const r = Number(set && set.reps);
  if (Number.isFinite(r) && r > 0) {
    return r;
  }
  const min = Number(set && set.repsMin);
  if (Number.isFinite(min) && min > 0) {
    return min;
  }
  return 0;
}

/**
 * @param {Array<{ name?: string, technique?: object, sets?: Array<{ done?: boolean, kg?: string, reps?: number, repsMin?: number, isCardio?: boolean }> }>} exercises
 */
export function computeWorkoutSummary(exercises) {
  let setCount = 0;
  let totalVolumeKg = 0;

  for (const ex of exercises || []) {
    if (isCardioExercise(ex)) {
      continue;
    }
    const dumbbell = isDumbbellExercise(ex.name);
    const sideMult = dumbbell ? 2 : 1;
    for (const s of ex.sets || []) {
      if (!s || !s.done) {
        continue;
      }
      setCount += 1;
      const kg = parseKgNumber(s.kg);
      const reps = repsForVolume(s);
      if (kg > 0 && reps > 0) {
        totalVolumeKg += kg * reps * sideMult;
      }
    }
  }

  return {
    setCount,
    totalVolumeKg: Math.round(totalVolumeKg),
  };
}

/** @param {string | null | undefined} presetId */
export function getMuscleGroupsForPreset(presetId) {
  if (!presetId || !PRESET_MUSCLE_GROUPS[presetId]) {
    return [];
  }
  return PRESET_MUSCLE_GROUPS[presetId].slice();
}

/** @param {string[]} muscleIds */
export function formatMuscleList(muscleIds) {
  const uniq = [...new Set(muscleIds || [])];
  return uniq.map((id) => TXT[id] || id).join(" · ");
}

/**
 * @param {string} id
 * @param {Set<string>} active
 */
function partClass(id, active) {
  return active.has(id) ? "muscle-map__part muscle-map__part--active" : "muscle-map__part";
}

/**
 * Silhueta frente (viewBox 0 0 120 220).
 * @param {Set<string>} active
 */
function buildFrontSvg(active) {
  const c = (id) => partClass(id, active);
  return `<svg class="muscle-map muscle-map--front" viewBox="0 0 120 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path class="muscle-map__torso" d="M60 34c14 0 24 8 26 18v8c-2 6-4 28-4 52v42c0 6-18 10-22 10s-22-4-22-10V112c0-24-2-46-4-52v-8c2-10 12-18 26-18z"/>
  <circle class="muscle-map__head" cx="60" cy="20" r="13"/>
  <path class="${c("delts")}" data-muscle="delts" d="M34 42c-8 2-12 10-10 18 4-2 8-4 12-6 2-6 0-10-2-12zm52 0c8 2 12 10 10 18-4-2-8-4-12-6-2-6 0-10 2-12z"/>
  <path class="${c("chest")}" data-muscle="chest" d="M44 48h32c2 8 0 18-6 24-6 4-14 6-20 6s-14-2-20-6c-6-6-8-16-6-24z"/>
  <path class="${c("biceps")}" data-muscle="biceps" d="M28 58c-6 8-8 22-6 34 4-2 8-4 10-8 2-10 0-20-4-26zm64 0c6 8 8 22 6 34-4-2-8-4-10-8-2-10 0-20 4-26z"/>
  <path class="${c("forearms")}" data-muscle="forearms" d="M24 92c-4 10-4 24 0 36 6-2 10-6 12-12 2-12 0-22-4-24zm72 0c4 10 4 24 0 36-6-2-10-6-12-12-2-12 0-22 4-24z"/>
  <path class="${c("abs")}" data-muscle="abs" d="M48 88h24c2 6 2 14 0 20h-24c-2-6-2-14 0-20z"/>
  <path class="${c("quads")}" data-muscle="quads" d="M42 118c-4 18-4 38 0 56 8-2 12-8 14-16 2-14 0-28-4-40zm36 0c4 18 4 38 0 56-8-2-12-8-14-16-2-14 0-28 4-40z"/>
  <path class="${c("calves")}" data-muscle="calves" d="M44 176c-2 12 0 24 4 32 6 0 10-4 12-10 2-10 0-20-2-22zm32 0c2 12 0 24-4 32-6 0-10-4-12-10-2-10 0-20 2-22z"/>
</svg>`;
}

/**
 * Silhueta costas (viewBox 0 0 120 220).
 * @param {Set<string>} active
 */
function buildBackSvg(active) {
  const c = (id) => partClass(id, active);
  return `<svg class="muscle-map muscle-map--back" viewBox="0 0 120 220" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path class="muscle-map__torso" d="M60 34c14 0 24 8 26 18v8c-2 6-4 28-4 52v42c0 6-18 10-22 10s-22-4-22-10V112c0-24-2-46-4-52v-8c2-10 12-18 26-18z"/>
  <circle class="muscle-map__head" cx="60" cy="20" r="13"/>
  <path class="${c("traps")}" data-muscle="traps" d="M42 36h36l-6 14-12 4-12-4z"/>
  <path class="${c("rear_delts")}" data-muscle="rear_delts" d="M32 46c-8 4-10 14-8 22 6-4 10-8 12-14-2-4-2-6-4-8zm56 0c8 4 10 14 8 22-6-4-10-8-12-14 2-4 2-6 4-8z"/>
  <path class="${c("lats")}" data-muscle="lats" d="M38 54c-10 8-14 28-12 44 8 6 16 8 24 8h4c8 0 16-2 24-8 2-16-2-36-12-44-6 4-12 6-18 6s-12-2-18-6z"/>
  <path class="${c("triceps")}" data-muscle="triceps" d="M26 58c-6 10-8 24-6 36 4-2 8-4 10-8 2-12 0-22-4-28zm68 0c6 10 8 24 6 36-4-2-8-4-10-8-2-12 0-22 4-28z"/>
  <path class="${c("glutes")}" data-muscle="glutes" d="M40 108c4 10 12 16 20 16s16-6 20-16c-6 8-14 12-20 12s-14-4-20-12z"/>
  <path class="${c("hamstrings")}" data-muscle="hamstrings" d="M42 124c-4 18-4 38 0 54 8-2 12-8 14-14 2-14 0-28-4-40zm36 0c4 18 4 38 0 54-8-2-12-8-14-14-2-14 0-28 4-40z"/>
  <path class="${c("calves")}" data-muscle="calves" d="M44 180c-2 12 0 22 4 28 6 0 10-4 12-8 2-8 0-16-2-20zm32 0c2 12 0 22-4 28-6 0-10-4-12-8-2-8 0-16 2-20z"/>
</svg>`;
}

/**
 * @param {string[]} activeIds
 */
export function buildMuscleDiagramSvg(activeIds) {
  const active = new Set(activeIds || []);
  return `${buildFrontSvg(active)}${buildBackSvg(active)}`;
}

/**
 * @param {string[]} muscleIds
 */
export function buildMuscleLegendHtml(muscleIds) {
  const ids = [...new Set(muscleIds || [])];
  if (!ids.length) {
    return "";
  }
  const items = ids
    .map((id) => `<li class="muscle-legend__chip">${TXT[id] || id}</li>`)
    .join("");
  return `<ul class="muscle-legend" aria-label="${TXT.musclesPrefix}">${items}</ul>`;
}

/**
 * @param {string[]} activeIds
 */
export function buildMuscleMapHtml(activeIds) {
  const active = new Set(activeIds || []);
  return `<div class="muscle-map-grid">
  <div class="muscle-map-panel">
    <p class="muscle-map-panel__title">${TXT.front}</p>
    ${buildFrontSvg(active)}
  </div>
  <div class="muscle-map-panel">
    <p class="muscle-map-panel__title">${TXT.back}</p>
    ${buildBackSvg(active)}
  </div>
</div>`;
}

/** @param {number} n */
export function formatVolumeKg(n) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return `${v.toLocaleString("pt-BR")} kg`;
}

let lastFocusBeforeSummary = null;

/**
 * @param {{ setCount: number, totalVolumeKg: number, presetId?: string | null, presetLabel?: string | null }} payload
 */
export function openWorkoutSummaryModal(payload) {
  const modal = document.getElementById("summary-modal");
  const body = document.getElementById("summary-modal-body");
  const titleEl = document.getElementById("summary-modal-title");
  if (!modal || !body || !titleEl) {
    return;
  }

  lastFocusBeforeSummary = document.activeElement;
  const muscles = getMuscleGroupsForPreset(payload.presetId);

  titleEl.textContent = payload.presetLabel ? TXT.titleDone : TXT.titleSaved;

  body.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "summary-modal__intro";
  intro.textContent = payload.presetLabel || TXT.introFallback;

  const stats = document.createElement("div");
  stats.className = "summary-modal__stats";
  const setsVal = document.createElement("div");
  setsVal.className = "summary-stat";
  setsVal.innerHTML = `<span class="summary-stat__value">${payload.setCount}</span><span class="summary-stat__label">${TXT.statSets}</span>`;
  const volVal = document.createElement("div");
  volVal.className = "summary-stat";
  volVal.innerHTML = `<span class="summary-stat__value">${formatVolumeKg(payload.totalVolumeKg)}</span><span class="summary-stat__label">${TXT.statVolume}</span>`;
  stats.append(setsVal, volVal);

  body.appendChild(intro);
  body.appendChild(stats);

  if (muscles.length) {
    const mapWrap = document.createElement("div");
    mapWrap.className = "summary-modal__map-wrap";
    mapWrap.innerHTML = buildMuscleMapHtml(muscles);

    const legendWrap = document.createElement("div");
    legendWrap.className = "summary-modal__legend-wrap";
    legendWrap.innerHTML = buildMuscleLegendHtml(muscles);

    body.appendChild(mapWrap);
    body.appendChild(legendWrap);
  } else {
    const mapCaption = document.createElement("p");
    mapCaption.className = "summary-modal__muscles";
    mapCaption.textContent = TXT.musclesFallback;
    body.appendChild(mapCaption);
  }

  const note = document.createElement("p");
  note.className = "summary-modal__note muted";
  note.textContent = TXT.note;
  body.appendChild(note);

  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("summary-modal-close")?.focus();
}

export function closeWorkoutSummaryModal() {
  const modal = document.getElementById("summary-modal");
  if (!modal || modal.hidden) {
    return;
  }
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  const restore = lastFocusBeforeSummary;
  lastFocusBeforeSummary = null;
  if (restore && typeof restore.focus === "function") {
    restore.focus();
  }
}

export function initWorkoutSummaryModal() {
  const modal = document.getElementById("summary-modal");
  if (!modal) {
    return;
  }
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) {
      return;
    }
    if (t === modal || t.hasAttribute("data-summary-close") || t.closest("[data-summary-close]")) {
      closeWorkoutSummaryModal();
    }
  });
}
