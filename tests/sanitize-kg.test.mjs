import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeKgInput } from "../sanitize-kg.js";

describe("sanitizeKgInput", () => {
  it("vazio", () => {
    assert.equal(sanitizeKgInput(null), "");
    assert.equal(sanitizeKgInput("  "), "");
  });
  it("dígitos e vírgula", () => {
    assert.equal(sanitizeKgInput("12,5"), "12,5");
    assert.equal(sanitizeKgInput("100"), "100");
  });
  it("ponto vira vírgula", () => {
    assert.equal(sanitizeKgInput("10.5"), "10,5");
  });
  it("remove lixo", () => {
    assert.equal(sanitizeKgInput("5kg"), "5");
    assert.equal(sanitizeKgInput("ab12cd"), "12");
  });
});
