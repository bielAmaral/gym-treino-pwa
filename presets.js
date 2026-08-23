/**
 * Planilha hipertrofia est\u00e9tica (ago. 2026) \u2014 6 fichas.
 *
 * Atleta: homem, 1,83 m, 100 kg \u2014 recomposi\u00e7\u00e3o + condropatia patelar + bra\u00e7os + V-shape.
 * Base: double progression, faixas de reps, RIR nas v\u00e1lidas, P s\u00f3 em compostos.
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
  PULL: [10, 12],
  CHEST_ISO: [12, 15],
  LAT_DELT: [12, 20],
  REAR_DELT: [12, 20],
  BICEPS: [10, 12],
  TRICEPS: [10, 12],
  ISO: [12, 15],
  CALF: [12, 20],
  GLUTE: [8, 10],
  GLUTE_HI: [8, 12],
  CORE_SEC: [30, 45],
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
// DIA 1 \u2014 Costas + b\u00edceps (pull principal)
// =============================================================================
const treino1 = buildExercisesList([
  {
    name: "Puxada alta peg. pronada",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.PULL),
    repsPrep: 10,
    restSec: REST_HEAVY,
    extra: "Largura \u2014 cotovelos em dire\u00e7\u00e3o ao quadril",
  },
  {
    name: "Remada m\u00e1quina peg. pronada",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "Espessura \u2014 retrair esc\u00e1pulas no pico",
  },
  {
    name: "Remada baixa peg. pronada",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    extra: "2\u00aa remada do dia \u2014 sem balan\u00e7o de tronco",
  },
  {
    name: "Crucifixo inverso m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    extra: "Posterior de ombro \u2014 pausa 1 s no pico",
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
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    extra: "\u00danico b\u00edceps do dia",
  },
]);

// =============================================================================
// DIA 2 \u2014 Peito + deltoide lateral + cardio
// =============================================================================
const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (m\u00e1q. articulada)",
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
    extra: "Peitoral m\u00e9dio \u2014 \u00fanico supino reto da semana",
  },
  {
    name: "Crucifixo (polia em p\u00e9)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.CHEST_ISO),
    restSec: REST_ISO,
    extra: "Alongamento peitoral",
  },
  {
    name: "Eleva\u00e7\u00e3o lateral m\u00e1quina",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    extra: "Prioridade est\u00e9tica \u2014 ombros largos",
  },
  {
    name: "Cardio \u2014 caminhada esteira inclinada",
    technique: techniqueCardio(25, 35, "Zona 2 \u00b7 Recomposi\u00e7\u00e3o"),
    extra: "Mantenha ritmo convers\u00e1vel",
  },
]);

// =============================================================================
// DIA 3 \u2014 Bra\u00e7os (tri-sets)
// =============================================================================
const treino3 = buildExercisesList([
  {
    name: "Tr\u00edceps testa halter",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b1", 1, 3, { block: 1, rounds: 3, restAfterSec: REST_COMPOUND }),
    extra: "Cotovelos fixos",
  },
  {
    name: "Rosca alternada c/ halter isometria",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b1", 2, 3, { block: 1, rounds: 3, restAfterSec: REST_COMPOUND }),
  },
  {
    name: "Tr\u00edceps corda polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b1", 3, 3, { block: 1, rounds: 3, restAfterSec: REST_COMPOUND }),
    extra: "Abra a corda no final",
  },
  {
    name: "Tr\u00edceps franc\u00eas halter",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b2", 1, 3, { block: 2, rounds: 3, restAfterSec: REST_COMPOUND }),
  },
  {
    name: "Rosca Scott m\u00e1quina",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b2", 2, 3, { block: 2, rounds: 3, restAfterSec: REST_COMPOUND }),
  },
  {
    name: "Rosca direta barra polia",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_COMPOUND,
    technique: techniqueGroup("tri-set", "t3-b2", 3, 3, { block: 2, rounds: 3, restAfterSec: REST_COMPOUND }),
    extra: "Sem balan\u00e7o de tronco",
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
    technique: techniqueDropset(2, 12, 20),
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
    nValid: 4,
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
    technique: techniqueDropset(2, 12, 20),
    extra: "Amplitude m\u00e1xima \u2014 2 drops na \u00faltima v\u00e1lida",
  },
  {
    name: "Cardio \u2014 caminhada esteira inclinada (finisher)",
    technique: techniqueCardio(15, 20, "Zona 2 \u00b7 Ap\u00f3s muscula\u00e7\u00e3o"),
    extra: "Finisher leve",
  },
]);

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Dia 1 \u2014 Costas + b\u00edceps", exercises: treino1 },
  { id: "t2", label: "Dia 2 \u2014 Peito + lateral + cardio", exercises: treino2 },
  { id: "t3", label: "Dia 3 \u2014 Bra\u00e7os (tri-set)", exercises: treino3 },
  { id: "t4", label: "Dia 4 \u2014 Pernas A (quad leve)", exercises: treino4 },
  { id: "t5", label: "Dia 5 \u2014 Upper B + bra\u00e7os", exercises: treino5 },
  { id: "t6", label: "Dia 6 \u2014 Pernas B (gl\u00fateo/post.)", exercises: treino6 },
];
