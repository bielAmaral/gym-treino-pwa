/**
 * Planilha hipertrofia est\u00e9tica (ago. 2026) \u2014 6 fichas.
 *
 * Atleta: homem, 1,83 m, 100 kg \u2014 recomposi\u00e7\u00e3o + condropatia patelar + bra\u00e7os + V-shape.
 * Base: double progression, faixas de reps, RIR 2\u20133 nas v\u00e1lidas, P s\u00f3 em compostos.
 * Faixas calibradas ago/2026: ombro 12\u201315 (n\u00e3o 12\u201320), costas 8\u201312, panturrilha 15\u201320.
 *
 * Arquitetura preservada: buildSets \u2192 exercise \u2192 buildExercisesList \u2192 PRESET_WORKOUTS.
 * Sempre repsMin/repsMax nas v\u00e1lidas; `reps` = valor inicial de exibi\u00e7\u00e3o (piso da faixa).
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
// DIA 1 — Costas + bíceps (pull principal) + tri-set pump costas/bíceps/ombro
// =============================================================================
const treino1 = buildExercisesList([
  {
    name: "Puxada alta peg. pronada",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.PULL),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Largura — cotovelos em direção ao quadril",
  },
  {
    name: "Remada máquina peg. pronada",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Espessura — retrair escápulas no pico",
  },
  {
    name: "Encolhimento — elevação escapular",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Trapézio / escápula",
  },
  {
    name: "Remada baixa peg. pronada",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump costas — carga moderada, pico de contração",
  },
  {
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump bíceps — adjacente à costas",
  },
  {
    name: "Crucifixo inverso máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t1-pump", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump ombro posterior — RIR 0–1 · sem pausa entre os 3",
  },
]);

// =============================================================================
// DIA 2 — Peito + deltoide + cardio + tri-set pump peito/tríceps/ombro
// =============================================================================
const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (máq. articulada)",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Peitoral superior",
  },
  {
    name: "Supino reto barra livre",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Peitoral médio — único supino reto da semana",
  },
  {
    name: "Crucifixo (polia em pé)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t2-pump", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump peito — alongamento + squeeze",
  },
  {
    name: "Tríceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t2-pump", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump tríceps — adjacente ao peito",
  },
  {
    name: "Elevação lateral máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t2-pump", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Pump ombro lateral — RIR 0–1 · sem pausa entre os 3",
  },
  {
    name: "Cardio — caminhada esteira inclinada",
    technique: techniqueCardio(25, 35, "Zona 2 · Recomposição"),
    extra: "Mantenha ritmo conversável",
  },
]);

// =============================================================================
// DIA 3 — Braços: 3 tri-sets (bíceps → tríceps → ombro)
// =============================================================================
const treino3 = buildExercisesList([
  {
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b1", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 · bíceps",
  },
  {
    name: "Tríceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b1", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 · tríceps — abra a corda no final",
  },
  {
    name: "Elevação lateral máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b1", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 1 · ombro lateral",
  },
  {
    name: "Rosca Scott máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b2", 1, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 · bíceps",
  },
  {
    name: "Tríceps francês halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b2", 2, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 · tríceps — cotovelos fixos",
  },
  {
    name: "Crucifixo inverso máquina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b2", 3, 3, { block: 2, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 2 · ombro posterior",
  },
  {
    name: "Rosca direta barra polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b3", 1, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 · bíceps — sem balanço de tronco",
  },
  {
    name: "Tríceps testa halter",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b3", 2, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 · tríceps",
  },
  {
    name: "Encolhimento — elevação escapular",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.PUMP),
    restSec: REST_ISO,
    technique: techniqueGroup("tri-set", "t3-b3", 3, 3, { block: 3, rounds: 3, restAfterSec: REST_ISO }),
    extra: "Tri-set 3 · trapézio/escápula — finisher",
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
// DIA 5 \u2014 Upper B (costas + posterior + bra\u00e7os)
// =============================================================================
const treino5 = buildExercisesList([
  {
    name: "Puxada alta peg. neutra",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.PULL),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Largura \u2014 pegada diferente do Dia 1",
  },
  {
    name: "Remada art. peg. neutra (diagonal)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Espessura de costas",
  },
  {
    name: "Crucifixo inverso m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    extra: "Posterior de ombro \u2014 prioridade",
  },
  {
    name: "Encolhimento \u2014 eleva\u00e7\u00e3o escapular",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    extra: "Trap\u00e9zio / esc\u00e1pula",
  },
  {
    name: "Tr\u00edceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("bi-set", "t5-b1", 1, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "2\u00ba est\u00edmulo de tr\u00edceps na semana",
  },
  {
    name: "Rosca direta barra polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    technique: techniqueGroup("bi-set", "t5-b1", 2, 2, { block: 1, rounds: 3, restAfterSec: REST_ISO }),
    extra: "2\u00ba est\u00edmulo de b\u00edceps na semana",
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

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Dia 1 — Costas + pump (costas/bíceps/ombro)", exercises: treino1 },
  { id: "t2", label: "Dia 2 — Peito + pump + cardio", exercises: treino2 },
  { id: "t3", label: "Dia 3 — Braços (3× tri-set bi/trí/ombro)", exercises: treino3 },
  { id: "t4", label: "Dia 4 \u2014 Pernas A (quad leve)", exercises: treino4 },
  { id: "t5", label: "Dia 5 \u2014 Upper B + bra\u00e7os", exercises: treino5 },
  { id: "t6", label: "Dia 6 \u2014 Pernas B (gl\u00fateo/post.)", exercises: treino6 },
];
