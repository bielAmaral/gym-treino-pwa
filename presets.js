/**
 * Planilha personalizada (jul. 2026) — 5 fichas.
 * Cada item: name, nSets (P + V), reps, restSec (padrão 60), nota opcional.
 */
const D = 60;
const S90 = 90;

function rows(n, reps) {
  const r = reps === 0 || reps == null ? null : reps;
  return Array.from({ length: n }, () => ({ reps: r, kg: "", done: false }));
}

/** @param {{ nSets: number, reps: number, name: string, restSec?: number, note?: string }} c */
function item(c) {
  return { ...c, restSec: c.restSec != null ? c.restSec : D };
}

/**
 * Gera o array de exercícios para a sessão (id + sets).
 * @param {(Omit<ReturnType<typeof item>,'restSec'> & { restSec?: number })[] } items
 */
export function buildExercisesList(items) {
  return items.map((c) => {
    const { name, nSets, reps, note, restSec: rs } = item(c);
    const restSec = rs;
    return {
      id: "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
      name,
      note: note || null,
      suggestedRestSec: restSec,
      sets: rows(nSets, reps),
    };
  });
}

const treino1 = buildExercisesList([
  {
    name: "Puxada alta (pega neutra)",
    nSets: 5,
    reps: 10,
    restSec: D,
    note: "2P + 3V · 10–12 reps nas válidas",
  },
  {
    name: "Remada curvada (máquina)",
    nSets: 4,
    reps: 8,
    restSec: D,
    note: "1P + 3V · 8–10 reps nas válidas",
  },
  {
    name: "Remada baixa (pega neutra)",
    nSets: 3,
    reps: 7,
    restSec: S90,
    note: "3V · Drop 7+7+7 só na última série",
  },
  { name: "Crucifixo inverso polia (unilateral)", nSets: 3, reps: 12, restSec: D },
  { name: "Encolhimento escapular", nSets: 3, reps: 15, restSec: D },
  {
    name: "Rosca Scott (halter unilateral)",
    nSets: 3,
    reps: 10,
    restSec: D,
    note: "3V · 10–12 reps",
  },
]);

const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (halter)",
    nSets: 5,
    reps: 8,
    restSec: S90,
    note: "2P + 3V",
  },
  {
    name: "Supino reto (máq. articulada)",
    nSets: 4,
    reps: 10,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Crucifixo (polia em pé)", nSets: 3, reps: 12, restSec: D },
  { name: "Desenvolvimento (máq. articulada)", nSets: 3, reps: 10, restSec: D },
  { name: "Elevação lateral (halter em pé)", nSets: 4, reps: 12, restSec: D },
  {
    name: "Tríceps testa (barra W)",
    nSets: 3,
    reps: 10,
    restSec: D,
    note: "3V · 10–12 reps",
  },
]);

const treino3 = buildExercisesList([
  {
    name: "Tríceps francês (polia)",
    nSets: 6,
    reps: 10,
    restSec: D,
    note: "2P + 4V · 10–12 reps · Intercalar com bíceps",
  },
  {
    name: "Rosca alternada c/ halter",
    nSets: 6,
    reps: 10,
    restSec: D,
    note: "2P + 4V · 10–12 reps · Intercalar com tríceps",
  },
  {
    name: "Tríceps corda (polia)",
    nSets: 3,
    reps: 12,
    restSec: D,
    note: "3V · 12–15 reps",
  },
  {
    name: "Rosca direta (barra polia)",
    nSets: 3,
    reps: 7,
    restSec: S90,
    note: "3V · Drop 7+7+7 em todas as séries válidas",
  },
  { name: "Rosca punho (barra)", nSets: 3, reps: 15, restSec: D },
  {
    name: "Cardio — esteira inclinada ou corrida",
    nSets: 1,
    reps: 0,
    restSec: D,
    note: "30 min contínuos",
  },
]);

const treino4 = buildExercisesList([
  {
    name: "Agachamento (barra livre)",
    nSets: 6,
    reps: 10,
    restSec: S90,
    note: "3P + 3V",
  },
  {
    name: "Leg press 45°",
    nSets: 4,
    reps: 10,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Cadeira extensora (unilateral)", nSets: 3, reps: 15, restSec: D },
  { name: "Cadeira flexora", nSets: 3, reps: 15, restSec: D },
  { name: "Elevação pélvica (máquina)", nSets: 3, reps: 12, restSec: D },
  { name: "Panturrilha banco (solear)", nSets: 4, reps: 20, restSec: D },
]);

const treino5 = buildExercisesList([
  {
    name: "Rosca direta (barra livre)",
    nSets: 4,
    reps: 12,
    restSec: D,
    note: "1P + 3V · Segure 3 s na descida",
  },
  { name: "Tríceps coice (polia) unilateral", nSets: 3, reps: 12, restSec: D },
  {
    name: "Remada “cavalo” (máq., pega pronada)",
    nSets: 4,
    reps: 12,
    restSec: D,
    note: "1P + 3V",
  },
  { name: "Supino declinado (barra livre)", nSets: 3, reps: 12, restSec: D },
  { name: "Agachamento sumô (máq. triângulo)", nSets: 3, reps: 12, restSec: D },
  { name: "Mesa flexora", nSets: 3, reps: 12, restSec: D },
  {
    name: "Prancha lateral",
    nSets: 3,
    reps: 30,
    restSec: D,
    note: "30 s de cada lado; reps = segundos",
  },
]);

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Costas / ombro post. + bíceps (A)", exercises: treino1 },
  { id: "t2", label: "Peito / ombro + tríceps (B)", exercises: treino2 },
  { id: "t3", label: "Braços completo (C)", exercises: treino3 },
  { id: "t4", label: "Pernas — quadríceps (D)", exercises: treino4 },
  { id: "t5", label: "Full body + core (E)", exercises: treino5 },
];
