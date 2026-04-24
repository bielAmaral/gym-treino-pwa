/**
 * Planilha personalizada (abr. 2026) — 5 fichas.
 * Cada item: name, nSets, reps, restSec (padrão 60), nota opcional.
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
  { name: "Puxada alta articulada", nSets: 4, reps: 10, restSec: D },
  { name: "Puxada alta (pega neutra)", nSets: 4, reps: 12, restSec: D },
  { name: "Abdômen infra paralelo (flexão de joelhos)", nSets: 4, reps: 12, restSec: D },
  { name: "Puxada alta articulada (pega pronada)", nSets: 4, reps: 12, restSec: D },
  { name: "Remada baixa (pega neutra)", nSets: 3, reps: 7, restSec: S90, note: "Drop set 7+7+7 em cada série" },
  { name: "Pull down", nSets: 4, reps: 12, restSec: D },
  { name: "Remada curvada (máquina)", nSets: 4, reps: 10, restSec: D },
  { name: "Encolhimento / elevação escapular", nSets: 4, reps: 15, restSec: D },
  { name: "Crucifixo inverso polia (unilateral)", nSets: 4, reps: 12, restSec: D },
]);

const treino2 = buildExercisesList([
  {
    name: "Supino inclinado (halter)",
    nSets: 4,
    reps: 8,
    restSec: S90,
    note: "1ª série de aquec.: 30–40% da carga máx.",
  },
  { name: "Crucifixo (polia em pé)", nSets: 4, reps: 12, restSec: D },
  { name: "Supino reto (máq. articulada)", nSets: 4, reps: 10, restSec: D },
  { name: "Flexão de braço (entre 2 step)", nSets: 4, reps: 15, restSec: D },
  { name: "Crucifixo (máquina)", nSets: 3, reps: 7, restSec: S90, note: "Drop 7+7+7" },
  { name: "Desenvolvimento (máq. articulada)", nSets: 4, reps: 10, restSec: D },
  { name: "Elevação frontal (rotação neutra → pronada)", nSets: 4, reps: 12, restSec: D },
  { name: "Elevação lateral (halter em pé)", nSets: 3, reps: 12, restSec: D },
  { name: "Remada alta (polia)", nSets: 3, reps: 12, restSec: D },
]);

const treino3 = buildExercisesList([
  { name: "Tríceps testa (barra W)", nSets: 5, reps: 12, restSec: D },
  { name: "Tríceps francês (polia)", nSets: 5, reps: 12, restSec: D },
  { name: "Tríceps corda (polia)", nSets: 4, reps: 15, restSec: D },
  { name: "Rosca Scott (halter unilateral)", nSets: 5, reps: 12, restSec: D },
  { name: "Rosca alternada c/ halter (isometria)", nSets: 5, reps: 12, restSec: D },
  { name: "Rosca direta (barra polia)", nSets: 4, reps: 7, restSec: D, note: "Drop 7+7+7 em cada série" },
  { name: "Rosca punho (barra)", nSets: 3, reps: 15, restSec: D },
  { name: "Cardio — corrida (esteira)", nSets: 1, reps: 0, restSec: D, note: "Duração: 30 min" },
]);

const treino4 = buildExercisesList([
  { name: "Agachamento (barra livre)", nSets: 4, reps: 10, restSec: D },
  { name: "Leg press 45°", nSets: 4, reps: 10, restSec: D },
  { name: "Cadeira extensora (unilateral)", nSets: 4, reps: 15, restSec: D },
  { name: "Cadeira flexora", nSets: 4, reps: 15, restSec: D },
  { name: "Elevação pélvica (máquina)", nSets: 4, reps: 12, restSec: D },
  { name: "Abdutor (máquina)", nSets: 4, reps: 15, restSec: D },
  { name: "Adutor (máquina)", nSets: 4, reps: 15, restSec: D },
  { name: "Panturrilha banco (solear)", nSets: 4, reps: 20, restSec: D },
]);

const treino5 = buildExercisesList([
  { name: "Supino declinado (barra livre)", nSets: 4, reps: 15, restSec: D },
  { name: "Remada “cavalo” (máq., pega pronada)", nSets: 4, reps: 15, restSec: D },
  { name: "Elevação frontal (polia)", nSets: 4, reps: 15, restSec: D },
  { name: "Tríceps coice (polia) unilateral", nSets: 4, reps: 15, restSec: D },
  { name: "Rosca direta (barra livre)", nSets: 4, reps: 15, restSec: D },
  { name: "Prancha lateral", nSets: 4, reps: 30, restSec: D, note: "30 s por lado; reps no campo = segundos" },
  { name: "Recuo alternado (ou com carga)", nSets: 4, reps: 12, restSec: D },
  { name: "Agachamento sumô (máq. triângulo)", nSets: 4, reps: 12, restSec: D },
  { name: "Mesa flexora", nSets: 4, reps: 12, restSec: D },
]);

export const PRESET_WORKOUTS = [
  { id: "t1", label: "Puxada / costas (A)", exercises: treino1 },
  { id: "t2", label: "Peito / ombro (B)", exercises: treino2 },
  { id: "t3", label: "Braço + cardio (C)", exercises: treino3 },
  { id: "t4", label: "Pernas (D)", exercises: treino4 },
  { id: "t5", label: "Full body (E)", exercises: treino5 },
];
