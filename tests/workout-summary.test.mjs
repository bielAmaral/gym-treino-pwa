import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWorkoutSummaryStatsHtml,
  computeLoadComparison,
  computeWorkoutSummary,
  findPreviousWorkoutEntry,
  formatPctChange,
  formatVolumeKg,
  getExercisePeakDoneKg,
  getMuscleGroupsForPreset,
  getWorkoutSummaryFromHistoryEntry,
  isCardioExercise,
  isDumbbellExercise,
  parseKgNumber,
} from "../workout-summary.js";

describe("isDumbbellExercise", () => {
  it("detecta halter no nome", () => {
    assert.equal(isDumbbellExercise("Trceps francs halter"), true);
    assert.equal(isDumbbellExercise("Puxada alta"), false);
  });
});

describe("isCardioExercise", () => {
  it("detecta technique cardio", () => {
    assert.equal(isCardioExercise({ technique: { type: "cardio" }, sets: [] }), true);
    assert.equal(isCardioExercise({ technique: null, sets: [{ isCardio: true }] }), true);
    assert.equal(isCardioExercise({ sets: [{ done: true }] }), false);
  });
});

describe("parseKgNumber", () => {
  it("aceita vrgula decimal", () => {
    assert.equal(parseKgNumber("12,5"), 12.5);
    assert.equal(parseKgNumber(""), 0);
  });
});

describe("computeWorkoutSummary", () => {
  it("ignora sries no marcadas", () => {
    const ex = [
      {
        name: "Remada mquina",
        sets: [
          { done: true, kg: "40", reps: 10 },
          { done: false, kg: "40", reps: 10 },
        ],
      },
    ];
    const s = computeWorkoutSummary(ex);
    assert.equal(s.setCount, 1);
    assert.equal(s.totalVolumeKg, 400);
  });

  it("dobra volume em halter", () => {
    const ex = [
      {
        name: "Rosca alternada c/ halter isometria",
        sets: [{ done: true, kg: "10", reps: 12 }],
      },
    ];
    const s = computeWorkoutSummary(ex);
    assert.equal(s.setCount, 1);
    assert.equal(s.totalVolumeKg, 240);
  });

  it("exclui cardio do volume e das sries", () => {
    const ex = [
      {
        name: "Cardio",
        technique: { type: "cardio" },
        sets: [{ done: true, kg: "", reps: 0, isCardio: true }],
      },
      {
        name: "Supino",
        sets: [{ done: true, kg: "60", reps: 8 }],
      },
    ];
    const s = computeWorkoutSummary(ex);
    assert.equal(s.setCount, 1);
    assert.equal(s.totalVolumeKg, 480);
  });

  it("usa actualReps quando informado", () => {
    const ex = [
      {
        name: "Supino",
        sets: [{ done: true, kg: "50", reps: 8, actualReps: "12" }],
      },
    ];
    const s = computeWorkoutSummary(ex);
    assert.equal(s.totalVolumeKg, 600);
  });
});

describe("getMuscleGroupsForPreset", () => {
  it("retorna grupos da ficha t1", () => {
    const g = getMuscleGroupsForPreset("t1");
    assert.ok(g.includes("lats"));
    assert.ok(g.includes("biceps"));
    assert.ok(g.includes("rear_delts"));
  });
});

describe("buildMuscleSectionHtml", () => {
  it("lista chips dos grupos musculares", async () => {
    const { buildMuscleSectionHtml } = await import("../workout-summary.js");
    const html = buildMuscleSectionHtml(["lats", "biceps"]);
    assert.match(html, /summary-modal__muscles-block/);
    assert.match(html, /muscle-legend__chip/);
    assert.match(html, /Costas/);
    assert.doesNotMatch(html, /muscle-img/);
    assert.equal(buildMuscleSectionHtml([]), "");
  });
});

describe("formatVolumeKg", () => {
  it("formata em pt-BR", () => {
    assert.match(formatVolumeKg(1500), /1\.?500/);
    assert.ok(formatVolumeKg(1500).includes("kg"));
  });
});

describe("getWorkoutSummaryFromHistoryEntry", () => {
  it("usa campos salvos quando existem", () => {
    const s = getWorkoutSummaryFromHistoryEntry({
      setCount: 12,
      totalVolumeKg: 5000,
      exercises: [],
    });
    assert.equal(s.setCount, 12);
    assert.equal(s.totalVolumeKg, 5000);
  });

  it("recalcula entradas antigas sem campos salvos", () => {
    const s = getWorkoutSummaryFromHistoryEntry({
      exercises: [
        {
          name: "Supino",
          sets: [{ done: true, kg: "50", reps: 10 }],
        },
      ],
    });
    assert.equal(s.setCount, 1);
    assert.equal(s.totalVolumeKg, 500);
  });
});

describe("buildWorkoutSummaryStatsHtml", () => {
  it("renderiza os dois cards de stats", () => {
    const html = buildWorkoutSummaryStatsHtml({ setCount: 8, totalVolumeKg: 1200 });
    assert.match(html, /summary-modal__stats/);
    assert.match(html, /series concluidas/);
    assert.match(html, /volume total levantado/);
    assert.match(html, />8</);
    assert.match(html, /1\.?200/);
  });
});

describe("getExercisePeakDoneKg", () => {
  it("usa maior carga valida concluida", () => {
    const peak = getExercisePeakDoneKg({
      name: "Supino",
      sets: [
        { kind: "P", done: true, kg: "20" },
        { kind: "V", done: true, kg: "60" },
        { kind: "V", done: true, kg: "62,5" },
        { kind: "V", done: false, kg: "65" },
      ],
    });
    assert.equal(peak, 62.5);
  });
});

describe("formatPctChange", () => {
  it("formata aumento e queda", () => {
    assert.equal(formatPctChange(10), "+10%");
    assert.equal(formatPctChange(-5.5), "-5,5%");
    assert.equal(formatPctChange(0), "0%");
  });
});

describe("findPreviousWorkoutEntry", () => {
  it("busca treino anterior da mesma ficha", () => {
    const history = [
      { dayKey: "2026-08-31", sourcePresetId: "t1" },
      { dayKey: "2026-08-24", sourcePresetId: "t1" },
      { dayKey: "2026-08-20", sourcePresetId: "t2" },
    ];
    const prev = findPreviousWorkoutEntry(history, { presetId: "t1", dayKey: "2026-08-31" });
    assert.equal(prev.dayKey, "2026-08-24");
  });
});

describe("computeLoadComparison", () => {
  it("calcula percentual por exercicio e volume", () => {
    const previous = {
      dayKey: "2026-08-24",
      exercises: [
        {
          name: "Supino",
          sets: [{ kind: "V", done: true, kg: "60", reps: 10 }],
        },
        {
          name: "Remada",
          sets: [{ kind: "V", done: true, kg: "40", reps: 10 }],
        },
      ],
    };
    const current = [
      {
        name: "Supino",
        sets: [{ kind: "V", done: true, kg: "66", reps: 10 }],
      },
      {
        name: "Remada",
        sets: [{ kind: "V", done: true, kg: "40", reps: 10 }],
      },
    ];
    const cmp = computeLoadComparison(current, previous);
    assert.equal(cmp.hasPrevious, true);
    assert.equal(cmp.items.length, 2);
    const supino = cmp.items.find((i) => i.name === "Supino");
    assert.equal(supino.pctChange, 10);
    assert.equal(cmp.volumePctChange, 6);
  });

  it("sem treino anterior retorna vazio", () => {
    const cmp = computeLoadComparison([], null);
    assert.equal(cmp.hasPrevious, false);
    assert.equal(cmp.items.length, 0);
  });
});
