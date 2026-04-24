/**
 * Carga (kg): só algarismos e, no máximo, uma vírgula decimal. Ponto vira vírgula.
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function sanitizeKgInput(raw) {
  if (raw == null) {
    return "";
  }
  const s0 = String(raw).trim();
  if (s0 === "") {
    return "";
  }
  let s = s0.replace(/[^\d.,]/g, "");
  s = s.replace(/\./g, ",");
  const c = s.indexOf(",");
  if (c < 0) {
    return s;
  }
  return s.slice(0, c).replace(/[^\d]/g, "") + "," + s.slice(c + 1).replace(/[^\d]/g, "");
}
