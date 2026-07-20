/**
 * Planilha hipertrofia est\u00e9tica (jul. 2026) \u2014 5 fichas.
 *
 * Atleta: homem, 1,83 m, 100 kg \u2014 recomposi\u00e7\u00e3o + V-shape + ombros.
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
 * Nota padronizada: P/V \u00b7 faixa \u00b7 RIR \u00b7 progress\u00e3o.
 * @param {{ nPrep?: number, nValid: number, repsMin: number, repsMax: number, rir?: string, extra?: string }} o
 */
function noteBlock(o) {
  const nPrep = o.nPrep != null ? o.nPrep : 0;
  const { nValid, repsMin, repsMax } = o;
  const pv = nPrep > 0 ? `${nPrep}P+${nValid}V` : `${nValid}V`;
  let rir = o.rir;
  if (!rir) {
    rir = nValid >= 4 ? "2\u21921\u21921\u21920" : "2\u21921\u21920";
  }
  let text = `${pv} \u00b7 ${repsMin}\u2013${repsMax} reps nas v\u00e1lidas \u00b7 RIR ${rir}`;
  text += " \u00b7 Double progression: topo da faixa em todas as v\u00e1lidas \u2192 +carga";
  if (o.extra) {
    text += ` \u00b7 ${o.extra}`;
  }
  return text;
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
 * @param {{
 *   name: string,
 *   nPrep?: number,
 *   nValid: number,
 *   reps?: number,
 *   repsMin?: number,
 *   repsMax?: number,
 *   repsPrep?: number,
 *   restSec?: number,
 *   note?: string,
 * }} c
 */
function exercise(c) {
  const nPrep = c.nPrep != null ? c.nPrep : 0;
  const nValid = c.nValid;
  const reps = c.reps != null ? c.reps : 10;
  return {
    id: "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: c.name,
    note: c.note || null,
    suggestedRestSec: c.restSec != null ? c.restSec : D,
    nPrep,
    nValid,
    maxSets: nPrep + nValid,
    sets: buildSets({
      nPrep,
      nValid,
      reps,
      repsMin: c.repsMin,
      repsMax: c.repsMax,
      repsPrep: c.repsPrep,
    }),
  };
}

/**
 * @param {Parameters<typeof exercise>[0][]} items
 */
export function buildExercisesList(items) {
  return items.map((c) => exercise(c));
}

// =============================================================================
// TREINO A \u2014 Costas (largura + espessura) + esc\u00e1pula / posterior + b\u00edceps
// Prioridade: V-shape, densidade de costas, deltoide posterior, pouco b\u00edceps.
// =============================================================================
const treino1 = buildExercisesList([
  {
    name: "Puxada alta (pega neutra)",
    nPrep: 3,
    nValid: 3,
    ...withRange(...REP.PULL),
    repsPrep: 10,
    restSec: REST_HEAVY,
    note: noteBlock({
      nPrep: 3,
      nValid: 3,
      repsMin: REP.PULL[0],
      repsMax: REP.PULL[1],
      extra: "Largura \u2014 cotovelos em dire\u00e7\u00e3o ao quadril",
    }),
  },
  {
    name: "Remada curvada (m\u00e1quina)",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 2,
      nValid: 3,
      repsMin: REP.ROW[0],
      repsMax: REP.ROW[1],
      extra: "Espessura \u2014 retrair esc\u00e1pulas no pico",
    }),
  },
  {
    name: "Remada sentada (cabo, pega neutra)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 1,
      nValid: 3,
      repsMin: REP.ROW[0],
      repsMax: REP.ROW[1],
      extra: "Espessura \u2014 sem balan\u00e7o de tronco",
    }),
  },
  {
    name: "Face pull (cabo)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.REAR_DELT[0],
      repsMax: REP.REAR_DELT[1],
      extra: "Posterior de ombro + esc\u00e1pula \u2014 cotovelos altos",
    }),
  },
  {
    name: "Crucifixo inverso polia (unilateral)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.REAR_DELT),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.REAR_DELT[0],
      repsMax: REP.REAR_DELT[1],
      extra: "Rear delt fly \u2014 pausa 1 s no pico",
    }),
  },
  {
    name: "Encolhimento escapular",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.ISO[0],
      repsMax: REP.ISO[1],
      extra: "Trap\u00e9zio superior / esc\u00e1pula \u2014 sem rota\u00e7\u00e3o",
    }),
  },
  {
    name: "Rosca Scott (halter unilateral)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.BICEPS[0],
      repsMax: REP.BICEPS[1],
      extra: "\u00danico b\u00edceps do dia \u2014 intensidade alta",
    }),
  },
]);

// =============================================================================
// TREINO B \u2014 Peito (\u00eanfase superior) + deltoide lateral + tr\u00edceps
// Sem desenvolvimento/overhead \u2014 reduz deltoide anterior.
// =============================================================================
const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (halter)",
    nPrep: 3,
    nValid: 3,
    ...withRange(...REP.COMPOUND_HEAVY),
    repsPrep: 8,
    restSec: REST_HEAVY,
    note: noteBlock({
      nPrep: 3,
      nValid: 3,
      repsMin: REP.COMPOUND_HEAVY[0],
      repsMax: REP.COMPOUND_HEAVY[1],
      extra: "Peitoral superior \u2014 banco 30\u201345\u00b0",
    }),
  },
  {
    name: "Supino reto (m\u00e1q. articulada)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 1,
      nValid: 3,
      repsMin: REP.COMPOUND_MOD[0],
      repsMax: REP.COMPOUND_MOD[1],
      extra: "Peitoral m\u00e9dio \u2014 amplitude completa",
    }),
  },
  {
    name: "Crucifixo (polia em p\u00e9)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.CHEST_ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.CHEST_ISO[0],
      repsMax: REP.CHEST_ISO[1],
      extra: "Alongamento peitoral \u2014 cotovelos levemente flexionados",
    }),
  },
  {
    name: "Eleva\u00e7\u00e3o lateral (halter em p\u00e9)",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 4,
      repsMin: REP.LAT_DELT[0],
      repsMax: REP.LAT_DELT[1],
      extra: "Prioridade est\u00e9tica \u2014 ombros largos; inclinar tronco 10\u201315\u00b0",
    }),
  },
  {
    name: "Tr\u00edceps testa (barra W)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.TRICEPS[0],
      repsMax: REP.TRICEPS[1],
      extra: "\u00danico tr\u00edceps do dia \u2014 cotovelos fixos",
    }),
  },
]);

// =============================================================================
// TREINO C \u2014 Bra\u00e7os (volume moderado, intensidade alta) + cardio
// =============================================================================
const treino3 = buildExercisesList([
  {
    name: "Tr\u00edceps franc\u00eas (polia)",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 2,
      nValid: 3,
      repsMin: REP.TRICEPS[0],
      repsMax: REP.TRICEPS[1],
      extra: "Intercalar com rosca alternada (descanso ativo)",
    }),
  },
  {
    name: "Rosca alternada c/ halter",
    nPrep: 2,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 2,
      nValid: 3,
      repsMin: REP.BICEPS[0],
      repsMax: REP.BICEPS[1],
      extra: "Intercalar com tr\u00edceps franc\u00eas (descanso ativo)",
    }),
  },
  {
    name: "Tr\u00edceps corda (polia)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.TRICEPS[0],
      repsMax: REP.TRICEPS[1],
      extra: "Cabe\u00e7a longa \u2014 abrir corda no final",
    }),
  },
  {
    name: "Rosca direta (barra polia)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.BICEPS[0],
      repsMax: REP.BICEPS[1],
      extra: "Sem drop sets \u2014 progress\u00e3o por faixa",
    }),
  },
  {
    name: "Rosca punho (barra)",
    nPrep: 0,
    nValid: 2,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 2,
      repsMin: REP.ISO[0],
      repsMax: REP.ISO[1],
      rir: "2\u21921",
      extra: "Antebra\u00e7o \u2014 volume m\u00ednimo",
    }),
  },
  {
    name: "Cardio \u2014 esteira inclinada ou corrida",
    nPrep: 0,
    nValid: 1,
    reps: 0,
    repsMin: 0,
    repsMax: 0,
    restSec: REST_ISO,
    note: "30 min cont\u00ednuos \u00b7 Zona 2 (conversa poss\u00edvel) \u00b7 Recomposi\u00e7\u00e3o",
  },
]);

// =============================================================================
// TREINO D \u2014 Pernas (quadr\u00edceps + posterior + gl\u00fateo + panturrilha)
// =============================================================================
const treino4 = buildExercisesList([
  {
    name: "Agachamento (barra livre)",
    nPrep: 3,
    nValid: 3,
    ...withRange(...REP.COMPOUND_HEAVY),
    repsPrep: 8,
    restSec: REST_HEAVY,
    note: noteBlock({
      nPrep: 3,
      nValid: 3,
      repsMin: REP.COMPOUND_HEAVY[0],
      repsMax: REP.COMPOUND_HEAVY[1],
      extra: "Profundidade controlada \u2014 joelhos alinhados",
    }),
  },
  {
    name: "Leg press 45\u00b0",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 1,
      nValid: 3,
      repsMin: REP.COMPOUND_MOD[0],
      repsMax: REP.COMPOUND_MOD[1],
      extra: "P\u00e9s m\u00e9dios na plataforma",
    }),
  },
  {
    name: "Stiff / levantamento romeno (barra)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 1,
      nValid: 3,
      repsMin: REP.COMPOUND_MOD[0],
      repsMax: REP.COMPOUND_MOD[1],
      extra: "Posterior de coxa + gl\u00fateo \u2014 quadril para tr\u00e1s",
    }),
  },
  {
    name: "Cadeira extensora (unilateral)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.ISO[0],
      repsMax: REP.ISO[1],
      extra: "Quadr\u00edceps \u2014 pausa no pico 1 s",
    }),
  },
  {
    name: "Cadeira flexora",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.ISO[0],
      repsMax: REP.ISO[1],
      extra: "Isquiotibiais \u2014 flex\u00e3o lenta",
    }),
  },
  {
    name: "Eleva\u00e7\u00e3o p\u00e9lvica (m\u00e1quina)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.GLUTE),
    restSec: REST_COMPOUND,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.GLUTE[0],
      repsMax: REP.GLUTE[1],
      extra: "Hip thrust \u2014 pausa 2 s no topo",
    }),
  },
  {
    name: "Panturrilha banco (solear)",
    nPrep: 0,
    nValid: 4,
    ...withRange(...REP.CALF),
    restSec: REST_CALF,
    note: noteBlock({
      nValid: 4,
      repsMin: REP.CALF[0],
      repsMax: REP.CALF[1],
      extra: "Amplitude m\u00e1xima \u2014 alongar 2 s embaixo",
    }),
  },
]);

// =============================================================================
// TREINO E \u2014 Full body est\u00e9tico + core
// Manuten\u00e7\u00e3o de est\u00edmulos sem redund\u00e2ncia; sem peitoral inferior.
// =============================================================================
const treino5 = buildExercisesList([
  {
    name: "Remada \u201ccavalo\u201d (m\u00e1q., pega pronada)",
    nPrep: 1,
    nValid: 3,
    ...withRange(...REP.ROW),
    repsPrep: 10,
    restSec: REST_COMPOUND,
    note: noteBlock({
      nPrep: 1,
      nValid: 3,
      repsMin: REP.ROW[0],
      repsMax: REP.ROW[1],
      extra: "Espessura de costas",
    }),
  },
  {
    name: "Supino inclinado (m\u00e1q. articulada)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    restSec: REST_COMPOUND,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.COMPOUND_MOD[0],
      repsMax: REP.COMPOUND_MOD[1],
      extra: "Peitoral superior \u2014 sem declinado",
    }),
  },
  {
    name: "Eleva\u00e7\u00e3o lateral (halter)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.LAT_DELT),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.LAT_DELT[0],
      repsMax: REP.LAT_DELT[1],
      extra: "Manuten\u00e7\u00e3o lateral",
    }),
  },
  {
    name: "Rosca direta (barra livre)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.BICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.BICEPS[0],
      repsMax: REP.BICEPS[1],
      extra: "3 s na descida (exc\u00eantrico controlado)",
    }),
  },
  {
    name: "Tr\u00edceps coice (polia) unilateral",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.TRICEPS),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.TRICEPS[0],
      repsMax: REP.TRICEPS[1],
      extra: "Cotovelo fixo ao lado do corpo",
    }),
  },
  {
    name: "Agachamento sum\u00f4 (m\u00e1q. tri\u00e2ngulo)",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.COMPOUND_MOD),
    restSec: REST_COMPOUND,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.COMPOUND_MOD[0],
      repsMax: REP.COMPOUND_MOD[1],
      extra: "Adutores + quadr\u00edceps",
    }),
  },
  {
    name: "Mesa flexora",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.ISO),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.ISO[0],
      repsMax: REP.ISO[1],
      extra: "Posterior de coxa",
    }),
  },
  {
    name: "Prancha lateral",
    nPrep: 0,
    nValid: 3,
    ...withRange(...REP.CORE_SEC),
    restSec: REST_ISO,
    note: noteBlock({
      nValid: 3,
      repsMin: REP.CORE_SEC[0],
      repsMax: REP.CORE_SEC[1],
      extra: "Segundos por lado; reps = segundos na app",
    }),
  },
]);

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Costas / ombro post. + b\u00edceps (A)", exercises: treino1 },
  { id: "t2", label: "Peito / ombro lat. + tr\u00edceps (B)", exercises: treino2 },
  { id: "t3", label: "Bra\u00e7os + cardio (C)", exercises: treino3 },
  { id: "t4", label: "Pernas \u2014 quad + posterior (D)", exercises: treino4 },
  { id: "t5", label: "Full body + core (E)", exercises: treino5 },
];
