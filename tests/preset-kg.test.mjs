import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPresetKgHints } from "../presets.js";

const CALF = "Panturrilha em p\u00e9 m\u00e1quina";

describe("getPresetKgHints", () => {
  it("returns ramp for prep + flat valid", () => {
    const sets = [
      { kind: "P" },
      { kind: "P" },
      { kind: "V" },
      { kind: "V" },
      { kind: "V" },
    ];
    const hints = getPresetKgHints("Puxada alta peg. pronada", sets);
    assert.equal(hints.length, 5);
    assert.equal(hints[2], "50");
    assert.equal(hints[4], "50");
    assert.ok(Number(hints[0].replace(",", ".")) < 50);
  });

  it("applies -20% per drop step", () => {
    const sets = [
      { kind: "V" },
      { kind: "V" },
      { kind: "V" },
      { kind: "V" },
      { kind: "V", drop: 1 },
      { kind: "V", drop: 2 },
    ];
    const hints = getPresetKgHints(CALF, sets);
    assert.equal(hints[3], "90");
    assert.equal(hints[4], "72");
    assert.equal(hints[5], "57,5");
  });

  it("returns empty strings for unknown exercise", () => {
    const sets = [{ kind: "V" }];
    assert.deepEqual(getPresetKgHints("Exercicio inventado", sets), [""]);
  });
});
