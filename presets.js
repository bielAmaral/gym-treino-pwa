/**
 * Planilha hipertrofia est\u00e9tica (set. 2026) \u2014 6 fichas.
 *
 * Atleta: homem, 1,83 m, 100 kg \u2014 recomposi\u00e7\u00e3o + condropatia + ombros/bra\u00e7os maiores + perna (quad/post./gl\u00fateo).
 * Base: double progression, faixas de reps, RIR 2\u20133 nas v\u00e1lidas, P s\u00f3 em compostos.
 *
 * Semana h\u00edbrida (default set/2026):
 *   Seg/Qua/Dom \u2192 Mira Bootcamp 7h30 (cardio + corpo inteiro)
 *   Ter         \u2192 t1 Costas + ombros + b\u00edceps
 *   Qui         \u2192 t2 Peito + tr\u00edceps + ombro lat.
 *   Sex         \u2192 t3 Pernas quad/post./gl\u00fateo
 *   S\u00e1b        \u2192 t5 Bra\u00e7os 3\u00d7 tri-set (ombro + bra\u00e7o)
 *   t4, t6      \u2192 opcional (perna extra / gl\u00fateo B)
 *
 * Arquitetura: buildSets \u2192 exercise \u2192 buildExercisesList \u2192 PRESET_WORKOUTS.
 */

// --- Descanso (segundos) ---------------------------------------------------
/** Grandes compostos: 90\u2013120 s */
const REST_HEAVY = 105;
/** Compostos m\u00e9dios: ~90 s */
const REST_COMPOUND = 90;
/** Isoladores: 60\u201375 s */
const REST_ISO = 67;
/** Panturrilha: 45\u201360 s */
const REST_CALF = 52;

/** @deprecated alias legado \u2014 isolador padr\u00e3o */
const D = REST_ISO;
/** @deprecated alias legado \u2014 composto padr\u00e3o */
const S90 = REST_COMPOUND;

// --- Faixas de repeti\u00e7\u00e3o (v\u00e1lidas) -----------------------------------------
const REP = {
  COMPOUND_HEAVY: [6, 8],
  COMPOUND_MOD: [8, 10],
  ROW: [8, 10],
  PULL: [8, 12],
  CHEST_ISO: [12, 15],
  LAT_DELT: [12, 15],
  REAR_DELT: [12, 15],
  BICEPS: [10, 12],
  TRICEPS: [10, 12],
  ISO: [12, 15],
  CALF: [15, 20],
  GLUTE: [8, 10],
  GLUTE_HI: [8, 12],
  CORE_SEC: [30, 45],
  /** Finisher pump — RIR 0–1, fluxo sanguíneo */
  PUMP: [12, 15],
};

/**
 * Define reps de exibi\u00e7\u00e3o + faixa para double progression.
 * @param {number} min
 * @param {number} max
 */
function withRange(min, max) {
  return { reps: min, repsMin: min, repsMax: max };
}

/**
 * Exerc\u00edcio em bloco (tri-set, bi-set, super-s\u00e9rie).
 * @param {"tri-set"|"bi-set"|"superset"} type
 * @param {string} groupId
 * @param {number} step 1-based
 * @param {number} steps total no bloco
 * @param {{ rounds?: number, restAfterSec?: number, block?: number }} [opts]
 */
function techniqueGroup(type, groupId, step, steps, opts = {}) {
  return {
    type,
    groupId,
    step,
    steps,
    block: opts.block != null ? opts.block : 1,
    rounds: opts.rounds != null ? opts.rounds : 3,
    restAfterSec: opts.restAfterSec != null ? opts.restAfterSec : REST_COMPOUND,
  };
}

/**
 * Drop-set na \u00faltima s\u00e9rie v\u00e1lida.
 * @param {number} drops
 * @param {number} dropRepsMin
 * @param {number} dropRepsMax
 */
function techniqueDropset(drops, dropRepsMin, dropRepsMax) {
  return { type: "dropset", drops, dropRepsMin, dropRepsMax };
}

/**
 * Cardio (minutos, sem tabela de s\u00e9ries).
 * @param {number} durationMin
 * @param {number} durationMax
 * @param {string} [zone]
 */
function techniqueCardio(durationMin, durationMax, zone) {
  return { type: "cardio", durationMin, durationMax, zone: zone || "Zona 2" };
}

/**
 * @param {{ nPrep?: number, nValid: number, reps?: number, repsMin?: number, repsMax?: number, repsPrep?: number }} plan
 */
function buildSets(plan) {
  const { nPrep = 0, nValid, reps = 10, repsMin, repsMax, repsPrep } = plan;
  const sets = [];
  const prepReps = repsPrep != null ? repsPrep : reps;
  const vMin = repsMin != null ? repsMin : reps;
  const vMax = repsMax != null ? repsMax : reps;
  for (let i = 0; i < nPrep; i++) {
    sets.push({ kind: "P", reps: prepReps, repsMin: null, repsMax: null, kg: "", done: false });
  }
  for (let i = 0; i < nValid; i++) {
    sets.push({ kind: "V", reps, repsMin: vMin, repsMax: vMax, kg: "", done: false });
  }
  return sets;
}

/**
 * Carga alvo da 1\u00aa s\u00e9rie v\u00e1lida (RIR ~2\u20133, homem 100 kg, recomposi\u00e7\u00e3o).
 * Halter: kg por m\u00e3o. Polia/m\u00e1quina: carga do aparelho. Barra: total (barra + anilhas).
 * Ajuste na 1\u00aa semana se passar de 2 reps acima ou abaixo da faixa.
 * @type {Record<string, number>}
 */
const PRESET_DEFAULT_KG = {
  "Puxada alta peg. pronada": 50,
  "Remada m\u00e1quina peg. pronada": 45,
  "Remada baixa peg. pronada": 42,
  "Crucifixo inverso m\u00e1quina": 22,
  "Encolhimento \u2014 eleva\u00e7\u00e3o escapular": 50,
  "Rosca alternada c/ halter isometria": 10,
  "Supino inclinado (m\u00e1q. articulada)": 35,
  "Supino reto barra livre": 60,
  "Crucifixo (polia em p\u00e9)": 12,
  "Crucifixo com halter": 12,
  "Supino reto com halter": 24,
  "Eleva\u00e7\u00e3o lateral m\u00e1quina": 18,
  "Tr\u00edceps testa halter": 12,
  "Tr\u00edceps corda polia": 26,
  "Tr\u00edceps franc\u00eas halter": 14,
  "Rosca Scott m\u00e1quina": 22,
  "Rosca direta barra polia": 20,
  "Agachamento barra guiada": 40,
  "Eleva\u00e7\u00e3o p\u00e9lvica (m\u00e1quina)": 85,
  "Mesa flexora": 32,
  "Stiff / levantamento romeno (barra)": 50,
  "Abdu\u00e7\u00e3o articulada agacho iso.": 45,
  "Panturrilha em p\u00e9 m\u00e1quina": 90,
  "Puxada alta peg. neutra": 52,
  "Remada art. peg. neutra (diagonal)": 44,
  "Gl\u00fateo polia c/ ISO pico de contra\u00e7\u00e3o": 12,
};

const DROP_STEP = 0.8;

function roundKg(n) {
  return Math.round(n * 2) / 2;
}

function formatKg(n) {
  const s = String(roundKg(n));
  return s.includes(".") ? s.replace(".", ",") : s;
}

function prepKgRamp(validKg, nPrep) {
  const out = [];
  for (let i = 1; i <= nPrep; i++) {
    const ratio = 0.55 + (i / (nPrep + 1)) * 0.35;
    out.push(roundKg(validKg * ratio));
  }
  return out;
}

/**
 * Placeholders de carga quando ainda n\u00e3o h\u00e1 hist\u00f3rico no aparelho.
 * @param {string} exerciseName
 * @param {Array<{ kind: string, drop?: number }>} sets
 * @returns {string[]}
 */
export function getPresetKgHints(exerciseName, sets) {
  if (!Array.isArray(sets)) {
    return [];
  }
  const validKg = PRESET_DEFAULT_KG[exerciseName];
  if (validKg == null) {
    return sets.map(() => "");
  }
  const nPrep = sets.filter((s) => s.kind === "P").length;
  const prepWeights = prepKgRamp(validKg, nPrep);
  let prepIdx = 0;
  return sets.map((s) => {
    if (s.kind === "P") {
      return formatKg(prepWeights[prepIdx++] ?? roundKg(validKg * 0.7));
    }
    if (s.drop) {
      return formatKg(validKg * DROP_STEP ** s.drop);
    }
    return formatKg(validKg);
  });
}

/**
 * Adiciona linhas de drop ap\u00f3s as v\u00e1lidas normais.
 * @param {object[]} sets
 * @param {{ drops: number, dropRepsMin: number, dropRepsMax: number }} technique
 */
function appendDropSets(sets, technique) {
  const { drops, dropRepsMin, dropRepsMax } = technique;
  if (!drops || drops < 1) {
    return sets;
  }
  const out = sets.slice();
  for (let d = 1; d <= drops; d++) {
    out.push({
      kind: "V",
      drop: d,
      reps: dropRepsMin,
      repsMin: dropRepsMin,
      repsMax: dropRepsMax,
      kg: "",
      done: false,
    });
  }
  return out;
}

/**
 * @param {{
 *   name: string,
 *   nPrep?: number,
 *   nValid: number,
 *   reps?: number,
 *   repsMin?: number,
 *   repsMax?: number,
 *   repsPrep?: number,
 *   restSec?: number,
 *   extra?: string,
 *   technique?: object,
 * }} c
 */
function exercise(c) {
  const technique = c.technique || null;
  const nPrep = c.nPrep != null ? c.nPrep : 0;
  const nValid = c.nValid != null ? c.nValid : 0;
  const reps = c.reps != null ? c.reps : 10;
  const dropCount = technique && technique.type === "dropset" ? technique.drops || 0 : 0;

  if (technique && technique.type === "cardio") {
    return {
      id: "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: c.name,
      note: c.extra || null,
      technique,
      suggestedRestSec: null,
      nPrep: 0,
      nValid: 0,
      maxSets: 1,
      sets: [{ kind: "V", reps: 0, repsMin: 0, repsMax: 0, kg: "", done: false, isCardio: true }],
    };
  }

  let sets = buildSets({
    nPrep,
    nValid,
    reps,
    repsMin: c.repsMin,
    repsMax: c.repsMax,
    repsPrep: c.repsPrep,
  });
  if (technique && technique.type === "dropset") {
    sets = appendDropSets(sets, technique);
  }

  const inGroup = technique && technique.groupId && technique.type !== "dropset";
  const isLastInGroup = inGroup && technique.step === technique.steps;
  const restSec = inGroup && !isLastInGroup ? null : c.restSec != null ? c.restSec : D;

  return {
    id: "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: c.name,
    note: c.extra || null,
    technique,
    suggestedRestSec: restSec,
    nPrep,
    nValid,
    maxSets: nPrep + nValid + dropCount,
    sets,
  };
}

/**
 * @param {Parameters<typeof exercise>[0][]} items
 */
export function buildExercisesList(items) {
  return items.map((c) => exercise(c));
}

// =============================================================================
// t1 — TERÇA — Costas (protocolo) + ombro lateral/posterior + bíceps
// =============================================================================
const treino1 = buildExercisesList([
  {
    name: "Puxada alta peg. pronada",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.PULL),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Latíssimo — largura; conduza com os cotovelos",
  },
  {
    name: "Puxada alta peg. neutra",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PULL),
    restSec: REST_COMPOUND,
    extra: "Latíssimo — pegada neutra (variação protocolo)",
  },
  {
    name: "Remada máquina peg. pronada",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Romboides/meio das costas — retrair escápulas",
  },
  {
    name: "Elevação lateral máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    extra: "Deltoide lateral — prioridade ombro maior",
  },
  {
    name: "Rosca Scott máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    extra: "Bíceps cabeça curta — braço maior",
  },
  {
    name: "Remada baixa peg. pronada",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set · costas pump",
  },
  {
    name: "Crucifixo com halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set · peito (halter no banco)",
  },
  {
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set · bíceps (halter)",
  },
]);

// =============================================================================
// t2 — QUINTA — Peito (protocolo sup./méd./inf.) + tríceps + ombro lateral
// =============================================================================
const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (máq. articulada)",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Peitoral superior — primeiro movimento",
  },
  {
    name: "Supino reto barra livre",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Peitoral médio",
  },
  {
    name: "Crucifixo (polia em pé)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.CHEST_ISO),
    restSec: REST_ISO,
    extra: "Peitoral inferior — polia alta→baixo, squeeze no final",
  },
  {
    name: "Supino reto com halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    restSec: REST_ISO,
    technique: techniqueGroup("bi-set", "t2-bench", 1, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Bi-set no banco · peito",
  },
  {
    name: "Tríceps testa halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("bi-set", "t2-bench", 2, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Bi-set no banco · tríceps (sem pausa entre supino halter e testa)",
  },
  {
    name: "Tríceps francês halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    extra: "Cabeça longa (~70% do tríceps) — braço maior",
  },
  {
    name: "Tríceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    extra: "Cabeça lateral — extensão completa",
  },
  {
    name: "Elevação lateral máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    extra: "Deltoide lateral — volume dedicado",
  },
]);

// =============================================================================
// t3 — SÁBADO — Pernas: quadríceps + posterior + glúteo (protocolo pernas)
// =============================================================================
const treino3 = buildExercisesList([
  {
    name: "Agachamento barra guiada",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Quadríceps — condropatia: amplitude sem dor",
  },
  {
    name: "Elevação pélvica (máquina)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.GLUTE_HI),
    restSec: REST_COMPOUND,
    extra: "Glúteo — hip thrust, pausa 2 s no topo",
  },
  {
    name: "Mesa flexora",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Isquiotibiais — posterior de coxa",
  },
  {
    name: "Stiff / levantamento romeno (barra)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Posterior + glúteo — hinge; pule se lombar incomodar",
  },
  {
    name: "Abdução articulada agacho iso.",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Glúteo médio — estabilidade quadril",
  },
  {
    name: "Panturrilha em pé máquina",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.CALF),
    restSec: REST_CALF,
    technique: techniqueDropset(2, 15, 20),
    extra: "Panturrilha — 2 drops na última válida",
  },
]);

// =============================================================================
// DIA 4 \u2014 Pernas A (quad leve + gl\u00fateo \u2014 joelho-friendly)
// =============================================================================
const treino4 = buildExercisesList([
  {
    name: "Agachamento barra guiada",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Condropatia \u2014 s\u00f3 amplitude sem dor; RIR 2\u20133 nas primeiras semanas",
  },
  {
    name: "Eleva\u00e7\u00e3o p\u00e9lvica (m\u00e1quina)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.GLUTE_HI),
    restSec: REST_COMPOUND,
    extra: "Hip thrust \u2014 pausa 2 s no topo",
  },
  {
    name: "Mesa flexora",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Posterior de coxa",
  },
  {
    name: "Stiff / levantamento romeno (barra)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Opcional se lombar OK \u2014 hinge leve; sen\u00e3o pule",
  },
  {
    name: "Abdu\u00e7\u00e3o articulada agacho iso.",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Gl\u00fateo m\u00e9dio",
  },
  {
    name: "Panturrilha em p\u00e9 m\u00e1quina",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.CALF),
    restSec: REST_CALF,
    technique: techniqueDropset(2, 15, 20),
    extra: "Amplitude m\u00e1xima \u2014 2 drops na \u00faltima v\u00e1lida (\u221220% carga, sem descanso)",
  },
]);

// =============================================================================
// t5 \u2014 Extra: bra\u00e7os (3\u00d7 tri-set protocolo) \u2014 volume opcional
// =============================================================================
const treino5 = buildExercisesList([
  {
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b1", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 \u00b7 b\u00edceps",
  },
  {
    name: "Tr\u00edceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b1", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 \u00b7 tr\u00edceps",
  },
  {
    name: "Eleva\u00e7\u00e3o lateral m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b1", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 \u00b7 ombro lateral",
  },
  {
    name: "Rosca Scott m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b2", 1, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 \u00b7 b\u00edceps",
  },
  {
    name: "Tr\u00edceps franc\u00eas halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b2", 2, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 \u00b7 cabe\u00e7a longa",
  },
  {
    name: "Crucifixo inverso m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b2", 3, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 \u00b7 ombro posterior",
  },
  {
    name: "Rosca direta barra polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b3", 1, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 \u00b7 b\u00edceps",
  },
  {
    name: "Tr\u00edceps testa halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b3", 2, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 \u00b7 tr\u00edceps",
  },
  {
    name: "Eleva\u00e7\u00e3o lateral m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t5-b3", 3, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 \u00b7 finisher ombro",
  },
]);

// =============================================================================
// DIA 6 \u2014 Pernas B (gl\u00fateo + posterior)
// =============================================================================
const treino6 = buildExercisesList([
  {
    name: "Eleva\u00e7\u00e3o p\u00e9lvica (m\u00e1quina)",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.GLUTE_HI),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Gl\u00fateo m\u00e1ximo \u2014 joelho-friendly",
  },
  {
    name: "Stiff / levantamento romeno (barra)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Posterior + gl\u00fateo \u2014 ou leg press p\u00e9s altos se stiff incomodar",
  },
  {
    name: "Mesa flexora",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Isquiotibiais",
  },
  {
    name: "Gl\u00fateo polia c/ ISO pico de contra\u00e7\u00e3o",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    technique: techniqueGroup("superset", "t6-s1", 1, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pausa 2 s no pico",
  },
  {
    name: "Abdu\u00e7\u00e3o articulada agacho iso.",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    technique: techniqueGroup("superset", "t6-s1", 2, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Gl\u00fateo m\u00e9dio",
  },
  {
    name: "Panturrilha em p\u00e9 m\u00e1quina",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.CALF),
    restSec: REST_CALF,
    technique: techniqueDropset(2, 15, 20),
    extra: "Amplitude m\u00e1xima \u2014 2 drops na \u00faltima v\u00e1lida",
  },
  {
    name: "Cardio \u2014 caminhada esteira inclinada (finisher)",
    technique: techniqueCardio(15, 20, "Zona 2 \u00b7 Ap\u00f3s muscula\u00e7\u00e3o"),
    extra: "Finisher leve",
  },
]);

/**
 * Calendário h\u00edbrido Mira + academia (getDay: 0=dom \u2026 6=s\u00e1b).
 * @type {Record<number, { type: "rest"|"mira"|"gym", label: string, presetId?: string, note?: string }>}
 */
export const HYBRID_WEEK_SCHEDULE = {
  0: { type: "mira", label: "Domingo", note: "Mira Bootcamp 7h30 — cardio e corpo inteiro." },
  1: { type: "mira", label: "Segunda", note: "Mira Bootcamp 7h30 — cardio e corpo inteiro." },
  2: { type: "gym", presetId: "t1", label: "Terça", note: "Academia: costas + ombros + bíceps." },
  3: { type: "mira", label: "Quarta", note: "Mira Bootcamp 7h30 — cardio e corpo inteiro." },
  4: { type: "gym", presetId: "t2", label: "Quinta", note: "Academia: peito + tríceps + ombro lateral." },
  5: { type: "gym", presetId: "t3", label: "Sexta", note: "Academia: pernas (quad, posterior, glúteo)." },
  6: { type: "gym", presetId: "t5", label: "Sábado", note: "Academia: braços + ombro (3× tri-set)." },
};

export const PRESET_WORKOUTS = [
  {
    id: "t1",
    label: "Terça — Costas + ombros + bíceps",
    group: "core",
    scheduleHint: "Academia · terça",
    focus: "Costas (lat) + ombro lateral + braço",
    exercises: treino1,
  },
  {
    id: "t2",
    label: "Quinta — Peito + tríceps + ombro lat.",
    group: "core",
    scheduleHint: "Academia · quinta",
    focus: "Peito (sup./méd./inf.) + tríceps + lateral",
    exercises: treino2,
  },
  {
    id: "t3",
    label: "Sexta — Pernas (quad/post./glúteo)",
    group: "core",
    scheduleHint: "Academia · sexta",
    focus: "Quadríceps + posterior + glúteo",
    exercises: treino3,
  },
  {
    id: "t5",
    label: "Sábado — Braços (3× tri-set)",
    group: "core",
    scheduleHint: "Academia · sábado",
    focus: "Bíceps + tríceps + ombro (protocolo)",
    exercises: treino5,
  },
  {
    id: "t4",
    label: "Pernas A (quad leve)",
    group: "extra",
    scheduleHint: "Opcional · reforço perna",
    focus: "Reforço joelho-friendly",
    exercises: treino4,
  },
  {
    id: "t6",
    label: "Pernas B (glúteo/post.)",
    group: "extra",
    scheduleHint: "Perna na Mira — uso pontual",
    focus: "Glúteo e posterior",
    exercises: treino6,
  },
];
