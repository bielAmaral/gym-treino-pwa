/**
 * Planilha personalizada (jul. 2026) — 5 fichas.
 * Cada exercício: nPrep + nValid, repsMin/repsMax nas válidas.
 */
const D = 60;
const S90 = 90;

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

const treino1 = buildExercisesList([
  {
    name: "Puxada alta (pega neutra)",
    nPrep: 2,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 12,
    restSec: D,
    note: "2P + 3V \u00b7 10\u201312 reps nas v\u00e1lidas",
  },
  {
    name: "Remada curvada (m\u00e1quina)",
    nPrep: 1,
    nValid: 3,
    reps: 8,
    repsMin: 8,
    repsMax: 10,
    restSec: D,
    note: "1P + 3V \u00b7 8\u201310 reps nas v\u00e1lidas",
  },
  {
    name: "Remada baixa (pega neutra)",
    nPrep: 0,
    nValid: 3,
    reps: 7,
    repsMin: 7,
    repsMax: 7,
    restSec: S90,
    note: "3V \u00b7 Drop 7+7+7 s\u00f3 na \u00faltima s\u00e9rie",
  },
  { name: "Crucifixo inverso polia (unilateral)", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  { name: "Encolhimento escapular", nPrep: 0, nValid: 3, reps: 15, restSec: D },
  {
    name: "Rosca Scott (halter unilateral)",
    nPrep: 0,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 12,
    restSec: D,
    note: "3V \u00b7 10\u201312 reps",
  },
]);

const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (halter)",
    nPrep: 2,
    nValid: 3,
    reps: 8,
    repsMin: 8,
    repsMax: 8,
    restSec: S90,
    note: "2P + 3V",
  },
  {
    name: "Supino reto (m\u00e1q. articulada)",
    nPrep: 1,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 10,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Crucifixo (polia em p\u00e9)", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  { name: "Desenvolvimento (m\u00e1q. articulada)", nPrep: 0, nValid: 3, reps: 10, restSec: D },
  { name: "Eleva\u00e7\u00e3o lateral (halter em p\u00e9)", nPrep: 0, nValid: 4, reps: 12, restSec: D },
  {
    name: "Tr\u00edceps testa (barra W)",
    nPrep: 0,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 12,
    restSec: D,
    note: "3V \u00b7 10\u201312 reps",
  },
]);

const treino3 = buildExercisesList([
  {
    name: "Tr\u00edceps franc\u00eas (polia)",
    nPrep: 2,
    nValid: 4,
    reps: 10,
    repsMin: 10,
    repsMax: 12,
    restSec: D,
    note: "2P + 4V \u00b7 10\u201312 reps \u00b7 Intercalar com b\u00edceps",
  },
  {
    name: "Rosca alternada c/ halter",
    nPrep: 2,
    nValid: 4,
    reps: 10,
    repsMin: 10,
    repsMax: 12,
    restSec: D,
    note: "2P + 4V \u00b7 10\u201312 reps \u00b7 Intercalar com tr\u00edceps",
  },
  {
    name: "Tr\u00edceps corda (polia)",
    nPrep: 0,
    nValid: 3,
    reps: 12,
    repsMin: 12,
    repsMax: 15,
    restSec: D,
    note: "3V \u00b7 12\u201315 reps",
  },
  {
    name: "Rosca direta (barra polia)",
    nPrep: 0,
    nValid: 3,
    reps: 7,
    repsMin: 7,
    repsMax: 7,
    restSec: S90,
    note: "3V \u00b7 Drop 7+7+7 em todas as s\u00e9ries v\u00e1lidas",
  },
  { name: "Rosca punho (barra)", nPrep: 0, nValid: 3, reps: 15, restSec: D },
  {
    name: "Cardio \u2014 esteira inclinada ou corrida",
    nPrep: 0,
    nValid: 1,
    reps: 0,
    repsMin: 0,
    repsMax: 0,
    restSec: D,
    note: "30 min cont\u00ednuos",
  },
]);

const treino4 = buildExercisesList([
  {
    name: "Agachamento (barra livre)",
    nPrep: 3,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 10,
    restSec: S90,
    note: "3P + 3V",
  },
  {
    name: "Leg press 45\u00b0",
    nPrep: 1,
    nValid: 3,
    reps: 10,
    repsMin: 10,
    repsMax: 10,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Cadeira extensora (unilateral)", nPrep: 0, nValid: 3, reps: 15, restSec: D },
  { name: "Cadeira flexora", nPrep: 0, nValid: 3, reps: 15, restSec: D },
  { name: "Eleva\u00e7\u00e3o p\u00e9lvica (m\u00e1quina)", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  { name: "Panturrilha banco (solear)", nPrep: 0, nValid: 4, reps: 20, restSec: D },
]);

const treino5 = buildExercisesList([
  {
    name: "Rosca direta (barra livre)",
    nPrep: 1,
    nValid: 3,
    reps: 12,
    repsMin: 12,
    repsMax: 12,
    restSec: D,
    note: "1P + 3V \u00b7 Segure 3 s na descida",
  },
  { name: "Tr\u00edceps coice (polia) unilateral", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  {
    name: "Remada \u201ccavalo\u201d (m\u00e1q., pega pronada)",
    nPrep: 1,
    nValid: 3,
    reps: 12,
    repsMin: 12,
    repsMax: 12,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Supino declinado (barra livre)", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  { name: "Agachamento sum\u00f4 (m\u00e1q. tri\u00e2ngulo)", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  { name: "Mesa flexora", nPrep: 0, nValid: 3, reps: 12, restSec: D },
  {
    name: "Prancha lateral",
    nPrep: 0,
    nValid: 3,
    reps: 30,
    repsMin: 30,
    repsMax: 30,
    restSec: D,
    note: "30 s de cada lado; reps = segundos",
  },
]);

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Costas / ombro post. + b\u00edceps (A)", exercises: treino1 },
  { id: "t2", label: "Peito / ombro + tr\u00edceps (B)", exercises: treino2 },
  { id: "t3", label: "Bra\u00e7os completo (C)", exercises: treino3 },
  { id: "t4", label: "Pernas \u2014 quadr\u00edceps (D)", exercises: treino4 },
  { id: "t5", label: "Full body + core (E)", exercises: treino5 },
];
