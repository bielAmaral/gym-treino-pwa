/**
 * Repeticoes: apenas algarismos (1-999).
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function sanitizeRepsInput(raw) {
  if (raw == null) {
    return "";
  }
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return "";
  }
  return String(Math.min(n, 999));
}
