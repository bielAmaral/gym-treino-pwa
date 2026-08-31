import { sanitizeKgInput } from "./sanitize-kg.js";
import { sanitizeRepsInput } from "./sanitize-reps.js";

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
  musclesFallback: "Marque uma ficha da planilha para ver os grupos trabalhados.",
  note: "Volume = carga x reps nas series marcadas. Halteres contam as duas maos. Cardio nao entra no total.",
  compareTitle: "vs treino anterior",
  compareVolume: "Volume total",
  compareFirst: "Primeiro treino desta ficha registrado — sem comparativo de carga.",
  compareNoPreset: "Sem ficha associada — comparativo usa o ultimo treino concluido.",
  compareNoPrevious: "Nenhum treino anterior para comparar.",
  compareNoData: "Nao ha cargas comparaveis com o treino anterior.",
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

/** @param {{ reps?: unknown, repsMin?: unknown, actualReps?: string | number | null }} set */
function repsForVolume(set) {
  const logged = set && set.actualReps != null ? sanitizeRepsInput(String(set.actualReps)) : "";
  if (logged) {
    return Number.parseInt(logged, 10);
  }
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
  return uniq.map((id) => TXT[id] || id).join(" | ");
}

/**
 * @param {string[]} muscleIds
 */
export function buildMuscleSectionHtml(muscleIds) {
  const ids = [...new Set(muscleIds || [])];
  if (!ids.length) {
    return "";
  }
  const items = ids
    .map((id) => `<li class="muscle-legend__chip">${TXT[id] || id}</li>`)
    .join("");
  return `<section class="summary-modal__muscles-block">
  <h3 class="summary-modal__muscles-title">${TXT.musclesPrefix}</h3>
  <ul class="muscle-legend" aria-label="${TXT.musclesPrefix}">${items}</ul>
</section>`;
}

/** @param {string[]} muscleIds */
export function buildMuscleLegendHtml(muscleIds) {
  return buildMuscleSectionHtml(muscleIds);
}



/** @param {number} n */
export function formatVolumeKg(n) {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return `${v.toLocaleString("pt-BR")} kg`;
}

export const WORKOUT_SUMMARY_STAT_LABELS = {
  sets: TXT.statSets,
  volume: TXT.statVolume,
};

/**
 * Stats para historico: usa campos salvos ou recalcula a partir dos exercicios.
 * @param {{ setCount?: number, totalVolumeKg?: number, exercises?: unknown[] } | null | undefined} entry
 */
export function getWorkoutSummaryFromHistoryEntry(entry) {
  if (!entry) {
    return { setCount: 0, totalVolumeKg: 0 };
  }
  const setCount = Number(entry.setCount);
  const totalVolumeKg = Number(entry.totalVolumeKg);
  if (Number.isFinite(setCount) && Number.isFinite(totalVolumeKg)) {
    return { setCount, totalVolumeKg: Math.round(totalVolumeKg) };
  }
  return computeWorkoutSummary(entry.exercises || []);
}

/**
 * @param {{ setCount: number, totalVolumeKg: number }} stats
 */
export function buildWorkoutSummaryStatsHtml(stats) {
  const setCount = Number.isFinite(stats?.setCount) ? stats.setCount : 0;
  const totalVolumeKg = Number.isFinite(stats?.totalVolumeKg) ? stats.totalVolumeKg : 0;
  return `<div class="summary-modal__stats" role="group" aria-label="Resumo do treino">
  <div class="summary-stat">
    <span class="summary-stat__value">${setCount}</span>
    <span class="summary-stat__label">${WORKOUT_SUMMARY_STAT_LABELS.sets}</span>
  </div>
  <div class="summary-stat">
    <span class="summary-stat__value">${formatVolumeKg(totalVolumeKg)}</span>
    <span class="summary-stat__label">${WORKOUT_SUMMARY_STAT_LABELS.volume}</span>
  </div>
</div>`;
}

/** @param {string | null | undefined} dayKey */
export function formatCompareDayLabel(dayKey) {
  if (!dayKey || typeof dayKey !== "string") {
    return "";
  }
  const d = new Date(dayKey + "T12:00:00");
  if (Number.isNaN(d.getTime())) {
    return dayKey;
  }
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

/**
 * Carga de referencia do exercicio: maior kg entre series validas concluidas.
 * @param {{ name?: string, technique?: object, sets?: Array<{ done?: boolean, kind?: string, kg?: string }> }} ex
 * @returns {number | null}
 */
export function getExercisePeakDoneKg(ex) {
  if (!ex || isCardioExercise(ex)) {
    return null;
  }
  let maxValid = 0;
  let maxAny = 0;
  for (const s of ex.sets || []) {
    if (!s || !s.done) {
      continue;
    }
    const kg = parseKgNumber(s.kg);
    if (kg <= 0) {
      continue;
    }
    maxAny = Math.max(maxAny, kg);
    if (s.kind !== "P") {
      maxValid = Math.max(maxValid, kg);
    }
  }
  const peak = maxValid > 0 ? maxValid : maxAny;
  return peak > 0 ? peak : null;
}

/** @param {number} pct */
export function formatPctChange(pct) {
  if (!Number.isFinite(pct)) {
    return "—";
  }
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** @param {number} kg */
export function formatLoadKg(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) {
    return "—";
  }
  const text = Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${text} kg`;
}

/**
 * @param {Array<{ dayKey?: string, sourcePresetId?: string | null, exercises?: unknown[] }>} history
 * @param {{ presetId?: string | null, dayKey?: string | null }} opts
 */
export function findPreviousWorkoutEntry(history, opts = {}) {
  const presetId = opts.presetId || null;
  const dayKey = opts.dayKey || null;
  for (const h of history || []) {
    if (!h) {
      continue;
    }
    if (dayKey && h.dayKey === dayKey) {
      continue;
    }
    if (presetId) {
      if (h.sourcePresetId === presetId) {
        return h;
      }
      continue;
    }
    return h;
  }
  return null;
}

/**
 * @param {Array<{ name?: string, technique?: object, sets?: unknown[] }>} currentExercises
 * @param {{ dayKey?: string, exercises?: unknown[] } | null | undefined} previousEntry
 */
export function computeLoadComparison(currentExercises, previousEntry) {
  if (!previousEntry || !Array.isArray(previousEntry.exercises)) {
    return {
      hasPrevious: false,
      previousDayLabel: "",
      items: [],
      volumePrevious: 0,
      volumeCurrent: computeWorkoutSummary(currentExercises || []).totalVolumeKg,
      volumePctChange: null,
    };
  }

  const prevByName = new Map();
  for (const ex of previousEntry.exercises) {
    if (!ex || !ex.name) {
      continue;
    }
    const peak = getExercisePeakDoneKg(ex);
    if (peak != null) {
      prevByName.set(ex.name, peak);
    }
  }

  const items = [];
  for (const ex of currentExercises || []) {
    if (!ex || !ex.name || isCardioExercise(ex)) {
      continue;
    }
    const currentKg = getExercisePeakDoneKg(ex);
    const previousKg = prevByName.get(ex.name);
    if (currentKg == null || previousKg == null) {
      continue;
    }
    const pctChange = previousKg > 0 ? ((currentKg - previousKg) / previousKg) * 100 : null;
    items.push({
      name: ex.name,
      previousKg,
      currentKg,
      pctChange: pctChange == null ? null : Math.round(pctChange * 10) / 10,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const volumePrevious = computeWorkoutSummary(previousEntry.exercises).totalVolumeKg;
  const volumeCurrent = computeWorkoutSummary(currentExercises || []).totalVolumeKg;
  const volumePctChange =
    volumePrevious > 0 ? Math.round(((volumeCurrent - volumePrevious) / volumePrevious) * 1000) / 10 : null;

  return {
    hasPrevious: true,
    previousDayLabel: formatCompareDayLabel(previousEntry.dayKey),
    items,
    volumePrevious,
    volumeCurrent,
    volumePctChange,
  };
}

/**
 * @param {{ hasPrevious: boolean, previousDayLabel?: string, items: Array<{ name: string, previousKg: number, currentKg: number, pctChange: number | null }>, volumePrevious?: number, volumeCurrent?: number, volumePctChange?: number | null }} comparison
 * @param {{ noPreset?: boolean }} opts
 */
export function buildLoadComparisonSection(comparison, opts = {}) {
  const section = document.createElement("section");
  section.className = "summary-modal__compare";
  section.setAttribute("aria-label", TXT.compareTitle);

  const title = document.createElement("h3");
  title.className = "summary-modal__compare-title";
  if (comparison.hasPrevious && comparison.previousDayLabel) {
    title.textContent = `${TXT.compareTitle} (${comparison.previousDayLabel})`;
  } else {
    title.textContent = TXT.compareTitle;
  }
  section.appendChild(title);

  if (!comparison.hasPrevious) {
    const empty = document.createElement("p");
    empty.className = "summary-modal__compare-empty muted";
    empty.textContent = opts.noPreset ? TXT.compareNoPrevious : TXT.compareFirst;
    section.appendChild(empty);
    return section;
  }

  if (opts.noPreset) {
    const hint = document.createElement("p");
    hint.className = "summary-modal__compare-hint muted";
    hint.textContent = TXT.compareNoPreset;
    section.appendChild(hint);
  }

  if (comparison.volumePctChange != null && comparison.volumePrevious > 0) {
    const vol = document.createElement("p");
    vol.className = "summary-compare__volume";
    const volPct = formatPctChange(comparison.volumePctChange);
    const volClass =
      comparison.volumePctChange > 0
        ? "summary-compare__volume-pct--up"
        : comparison.volumePctChange < 0
          ? "summary-compare__volume-pct--down"
          : "summary-compare__volume-pct--same";
    vol.innerHTML = `${TXT.compareVolume}: <span class="summary-compare__volume-nums">${formatVolumeKg(comparison.volumePrevious)} → ${formatVolumeKg(comparison.volumeCurrent)}</span> <span class="summary-compare__volume-pct ${volClass}">${volPct}</span>`;
    section.appendChild(vol);
  }

  if (!comparison.items.length) {
    const empty = document.createElement("p");
    empty.className = "summary-modal__compare-empty muted";
    empty.textContent = TXT.compareNoData;
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "summary-compare__list";

  for (const item of comparison.items) {
    const li = document.createElement("li");
    const pct = item.pctChange;
    const rowClass =
      pct == null ? "" : pct > 0 ? "summary-compare__row--up" : pct < 0 ? "summary-compare__row--down" : "summary-compare__row--same";
    li.className = `summary-compare__row${rowClass ? ` ${rowClass}` : ""}`;

    const name = document.createElement("span");
    name.className = "summary-compare__name";
    name.textContent = item.name;

    const weights = document.createElement("span");
    weights.className = "summary-compare__weights";
    weights.textContent = `${formatLoadKg(item.previousKg)} → ${formatLoadKg(item.currentKg)}`;

    const pctEl = document.createElement("span");
    pctEl.className = "summary-compare__pct";
    pctEl.textContent = formatPctChange(pct);

    li.append(name, weights, pctEl);
    list.appendChild(li);
  }

  section.appendChild(list);
  return section;
}

let lastFocusBeforeSummary = null;

/**
 * @param {{ setCount: number, totalVolumeKg: number, presetId?: string | null, presetLabel?: string | null, loadComparison?: ReturnType<typeof computeLoadComparison> | null }} payload
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

  if (payload.loadComparison) {
    body.appendChild(
      buildLoadComparisonSection(payload.loadComparison, { noPreset: !payload.presetId })
    );
  }

  if (muscles.length) {
    const musclesWrap = document.createElement("div");
    musclesWrap.innerHTML = buildMuscleSectionHtml(muscles);
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
