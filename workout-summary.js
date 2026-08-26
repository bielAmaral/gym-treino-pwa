import { sanitizeKgInput } from "./sanitize-kg.js";

/** Grupos musculares destacados por ficha (ilustração simplificada). */
export const PRESET_MUSCLE_GROUPS = {
  t1: ["lats", "traps", "biceps", "forearms"],
  t2: ["chest", "delts"],
  t3: ["biceps", "triceps", "forearms"],
  t4: ["quads", "hamstrings", "glutes", "calves"],
  t5: ["lats", "chest", "delts", "biceps", "triceps"],
  t6: ["glutes", "hamstrings", "calves", "abs"],
};

const MUSCLE_LABELS = {
  lats: "Costas",
  traps: "Trapézio",
  chest: "Peito",
  delts: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraço",
  abs: "Abdômen",
  quads: "Quadríceps",
  hamstrings: "Posterior",
  glutes: "Glúteos",
  calves: "Panturrilha",
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
  return uniq.map((id) => MUSCLE_LABELS[id] || id).join(" · ");
}

/**
 * SVG simplificado (frente + costas). Regiões ativas recebem classe `is-active`.
 * @param {string[]} activeIds
 */
export function buildMuscleDiagramSvg(activeIds) {
  const active = new Set(activeIds || []);
  const cls = (id) => (active.has(id) ? "muscle-map__part muscle-map__part--active" : "muscle-map__part");

  return `<svg class="muscle-map" viewBox="0 0 220 200" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <text class="muscle-map__label" x="55" y="14">Frente</text>
  <text class="muscle-map__label" x="165" y="14">Costas</text>
  <g class="muscle-map__figure muscle-map__figure--front">
    <ellipse class="muscle-map__silhouette" cx="55" cy="100" rx="28" ry="72"/>
    <circle class="muscle-map__head" cx="55" cy="28" r="14"/>
    <ellipse class="${cls("delts")}" data-muscle="delts" cx="30" cy="48" rx="10" ry="8"/>
    <ellipse class="${cls("delts")}" data-muscle="delts" cx="80" cy="48" rx="10" ry="8"/>
    <ellipse class="${cls("chest")}" data-muscle="chest" cx="55" cy="58" rx="16" ry="12"/>
    <ellipse class="${cls("biceps")}" data-muscle="biceps" cx="28" cy="72" rx="8" ry="14"/>
    <ellipse class="${cls("biceps")}" data-muscle="biceps" cx="82" cy="72" rx="8" ry="14"/>
    <ellipse class="${cls("forearms")}" data-muscle="forearms" cx="24" cy="92" rx="6" ry="12"/>
    <ellipse class="${cls("forearms")}" data-muscle="forearms" cx="86" cy="92" rx="6" ry="12"/>
    <rect class="${cls("abs")}" data-muscle="abs" x="46" y="78" width="18" height="22" rx="6"/>
    <ellipse class="${cls("quads")}" data-muscle="quads" cx="44" cy="128" rx="10" ry="22"/>
    <ellipse class="${cls("quads")}" data-muscle="quads" cx="66" cy="128" rx="10" ry="22"/>
    <ellipse class="${cls("calves")}" data-muscle="calves" cx="44" cy="162" rx="7" ry="14"/>
    <ellipse class="${cls("calves")}" data-muscle="calves" cx="66" cy="162" rx="7" ry="14"/>
  </g>
  <g class="muscle-map__figure muscle-map__figure--back">
    <ellipse class="muscle-map__silhouette" cx="165" cy="100" rx="28" ry="72"/>
    <circle class="muscle-map__head" cx="165" cy="28" r="14"/>
    <ellipse class="${cls("traps")}" data-muscle="traps" cx="165" cy="42" rx="14" ry="8"/>
    <ellipse class="${cls("lats")}" data-muscle="lats" cx="165" cy="68" rx="20" ry="18"/>
    <ellipse class="${cls("triceps")}" data-muscle="triceps" cx="138" cy="72" rx="8" ry="14"/>
    <ellipse class="${cls("triceps")}" data-muscle="triceps" cx="192" cy="72" rx="8" ry="14"/>
    <ellipse class="${cls("glutes")}" data-muscle="glutes" cx="165" cy="98" rx="18" ry="12"/>
    <ellipse class="${cls("hamstrings")}" data-muscle="hamstrings" cx="152" cy="128" rx="9" ry="20"/>
    <ellipse class="${cls("hamstrings")}" data-muscle="hamstrings" cx="178" cy="128" rx="9" ry="20"/>
    <ellipse class="${cls("calves")}" data-muscle="calves" cx="152" cy="162" rx="7" ry="14"/>
    <ellipse class="${cls("calves")}" data-muscle="calves" cx="178" cy="162" rx="7" ry="14"/>
  </g>
</svg>`;
}

/** @param {number} n */
export function formatVolumeKg(n) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return v.toLocaleString("pt-BR") + " kg";
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
  const muscleText = formatMuscleList(muscles);

  titleEl.textContent = payload.presetLabel ? "Treino concluído!" : "Treino guardado";

  body.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "summary-modal__intro";
  intro.textContent = payload.presetLabel
    ? payload.presetLabel
    : "Resumo do que você registrou hoje.";

  const stats = document.createElement("div");
  stats.className = "summary-modal__stats";
  stats.innerHTML = `
    <div class="summary-stat">
      <span class="summary-stat__value">${payload.setCount}</span>
      <span class="summary-stat__label">séries concluídas</span>
    </div>
    <div class="summary-stat">
      <span class="summary-stat__value">${formatVolumeKg(payload.totalVolumeKg)}</span>
      <span class="summary-stat__label">volume total levantado</span>
    </div>
  `;

  const mapWrap = document.createElement("div");
  mapWrap.className = "summary-modal__map-wrap";
  mapWrap.innerHTML = buildMuscleDiagramSvg(muscles);

  const mapCaption = document.createElement("p");
  mapCaption.className = "summary-modal__muscles";
  mapCaption.textContent = muscleText
    ? `Músculos trabalhados: ${muscleText}`
    : "Marque uma ficha da planilha para ver o mapa muscular.";

  const note = document.createElement("p");
  note.className = "summary-modal__note muted";
  note.textContent =
    "Volume = carga × reps nas séries marcadas. Halteres contam as duas mãos. Cardio não entra no total.";

  body.appendChild(intro);
  body.appendChild(stats);
  if (muscles.length) {
    body.appendChild(mapWrap);
  }
  body.appendChild(mapCaption);
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
