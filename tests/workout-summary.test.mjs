import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeWorkoutSummary,
  formatVolumeKg,
  getMuscleGroupsForPreset,
  isCardioExercise,
  isDumbbellExercise,
  parseKgNumber,
} from "../workout-summary.js";

describe("isDumbbellExercise", () => {
  it("detecta halter no nome", () => {
    assert.equal(isDumbbellExercise("Tríceps francês halter"), true);
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
  it("aceita vírgula decimal", () => {
    assert.equal(parseKgNumber("12,5"), 12.5);
    assert.equal(parseKgNumber(""), 0);
  });
});

describe("computeWorkoutSummary", () => {
  it("ignora séries não marcadas", () => {
    const ex = [
      {
        name: "Remada máquina",
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

  it("exclui cardio do volume e das séries", () => {
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
