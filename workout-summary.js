import { sanitizeKgInput } from "./sanitize-kg.js";

/** Caminho da ilustracao estatica por ficha (PNG gerado em scripts/generate-muscle-maps.mjs). */
export const PRESET_MUSCLE_MAP_SRC = {
  t1: "assets/muscle-maps/t1.png",
  t2: "assets/muscle-maps/t2.png",
  t3: "assets/muscle-maps/t3.png",
  t4: "assets/muscle-maps/t4.png",
  t5: "assets/muscle-maps/t5.png",
  t6: "assets/muscle-maps/t6.png",
};

/** Grupos musculares por ficha (lista no resumo pos-treino). */
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
  musclesMapAlt: "Mapa muscular da ficha",
  musclesFallback: "Marque uma ficha da planilha para ver os grupos trabalhados.",
  note: "Volume = carga x reps nas series marcadas. Halteres contam as duas maos. Cardio nao entra no total.",
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

/** @param {string | null | undefined} presetId */
export function getMuscleMapSrc(presetId) {
  if (!presetId) {
    return null;
  }
  return PRESET_MUSCLE_MAP_SRC[presetId] || null;
}

/**
 * @param {string | null | undefined} presetId
 * @param {string[]} muscleIds
 */
export function buildMuscleSectionHtml(presetId, muscleIds) {
  const ids = [...new Set(muscleIds || [])];
  if (!ids.length) {
    return "";
  }
  const src = getMuscleMapSrc(presetId);
  const img = src
    ? `<figure class="summary-modal__map-figure">
  <img class="summary-modal__muscle-img" src="${src}" alt="${TXT.musclesMapAlt}" width="280" height="200" loading="lazy" decoding="async">
</figure>`
    : "";
  const items = ids
    .map((id) => `<li class="muscle-legend__chip">${TXT[id] || id}</li>`)
    .join("");
  return `<section class="summary-modal__muscles-block">
  ${img}
  <h3 class="summary-modal__muscles-title">${TXT.musclesPrefix}</h3>
  <ul class="muscle-legend" aria-label="${TXT.musclesPrefix}">${items}</ul>
</section>`;
}

/** @param {string[]} muscleIds */
export function buildMuscleLegendHtml(muscleIds) {
  return buildMuscleSectionHtml(null, muscleIds);
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
    const musclesWrap = document.createElement("div");
    musclesWrap.innerHTML = buildMuscleSectionHtml(payload.presetId, muscles);
    const block = musclesWrap.querySelector(".summary-modal__muscles-block");
    if (block) {
      body.appendChild(block);
    }
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
