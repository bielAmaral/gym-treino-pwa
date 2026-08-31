import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeRepsInput } from "../sanitize-reps.js";

describe("sanitizeRepsInput", () => {
  it("aceita apenas digitos positivos", () => {
    assert.equal(sanitizeRepsInput("12"), "12");
    assert.equal(sanitizeRepsInput("12a"), "12");
    assert.equal(sanitizeRepsInput(""), "");
    assert.equal(sanitizeRepsInput("0"), "");
  });

  it("limita a 999", () => {
    assert.equal(sanitizeRepsInput("1500"), "999");
  });
});
