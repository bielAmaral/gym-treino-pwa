/**
 * Gera assets/muscle-maps/t1..t6.svg (ilustracao estatica por ficha).
 * Rodar: node scripts/generate-muscle-maps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRESET_MUSCLE_GROUPS } from "../workout-summary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "assets", "muscle-maps");

const COLORS = {
  bg: "#0e1018",
  body: "#1c2030",
  bodyStroke: "#2e3448",
  idle: "#252a3a",
  idleStroke: "#3a4158",
  active: "#3ee8b5",
  activeStroke: "#6af0c8",
  label: "#8b93a8",
};

/** @param {boolean} on */
function part(on) {
  return on
    ? `fill="${COLORS.active}" stroke="${COLORS.activeStroke}" stroke-width="1.2" opacity="0.92"`
    : `fill="${COLORS.idle}" stroke="${COLORS.idleStroke}" stroke-width="0.8" opacity="0.35"`;
}

/**
 * @param {Set<string>} active
 * @param {"front"|"back"} view
 */
function bodySvg(active, view) {
  const on = (id) => active.has(id);
  if (view === "front") {
    return `
  <g transform="translate(8,28)">
    <circle cx="52" cy="14" r="11" fill="${COLORS.body}" stroke="${COLORS.bodyStroke}" stroke-width="1"/>
    <path fill="${COLORS.body}" stroke="${COLORS.bodyStroke}" stroke-width="1.1"
      d="M52 26c11 0 19 7 21 16v6c-1 5-3 24-3 46v36c0 5-15 9-18 9s-18-4-18-9V94c0-22-2-41-3-46v-6c2-9 10-16 21-16z"/>
    <path ${part(on("delts"))} d="M28 34c-7 2-10 9-9 16 3-2 7-4 10-5 1-5 0-9-1-11zm48 0c7 2 10 9 9 16-3-2-7-4-10-5-1-5 0-9 1-11z"/>
    <path ${part(on("chest"))} d="M38 40h28c2 7 0 15-5 20-5 4-12 5-18 5s-13-1-18-5c-5-5-7-13-5-20z"/>
    <path ${part(on("biceps"))} d="M22 48c-5 7-7 19-5 30 3-2 7-4 9-7 2-9 0-17-4-23zm60 0c5 7 7 19 5 30-3-2-7-4-9-7-2-9 0-17 4-23z"/>
    <path ${part(on("forearms"))} d="M18 78c-3 9-3 21 0 31 5-2 9-5 10-10 2-10 0-18-3-21zm68 0c3 9 3 21 0 31-5-2-9-5-10-10-2-10 0-18 3-21z"/>
    <path ${part(on("abs"))} d="M42 72h20c2 5 2 12 0 17H42c-2-5-2-12 0-17z"/>
    <path ${part(on("quads"))} d="M36 98c-3 15-3 32 0 47 7-2 10-7 12-14 2-12 0-24-3-33zm32 0c3 15 3 32 0 47-7-2-10-7-12-14-2-12 0-24 3-33z"/>
    <path ${part(on("calves"))} d="M38 148c-2 10 0 19 3 26 5 0 9-3 10-8 2-8 0-15-2-18zm28 0c2 10 0 19-3 26-5 0-9-3-10-8-2-8 0-15 2-18z"/>
  </g>`;
  }
  return `
  <g transform="translate(8,28)">
    <circle cx="52" cy="14" r="11" fill="${COLORS.body}" stroke="${COLORS.bodyStroke}" stroke-width="1"/>
    <path fill="${COLORS.body}" stroke="${COLORS.bodyStroke}" stroke-width="1.1"
      d="M52 26c11 0 19 7 21 16v6c-1 5-3 24-3 46v36c0 5-15 9-18 9s-18-4-18-9V94c0-22-2-41-3-46v-6c2-9 10-16 21-16z"/>
    <path ${part(on("traps"))} d="M36 30h32l-5 12-11 4-11-4z"/>
    <path ${part(on("rear_delts"))} d="M26 38c-7 3-9 12-7 19 5-3 9-7 11-12-2-3-2-5-4-7zm52 0c7 3 9 12 7 19-5-3-9-7-11-12 2-3 2-5 4-7z"/>
    <path ${part(on("lats"))} d="M34 46c-9 7-12 24-10 38 7 5 14 7 22 7h4c8 0 15-2 22-7 2-14-1-31-10-38-5 4-11 5-17 5s-12-1-17-5z"/>
    <path ${part(on("triceps"))} d="M20 48c-5 8-7 20-5 31 3-2 7-4 9-7 2-10 0-18-4-24zm64 0c5 8 7 20 5 31-3-2-7-4-9-7-2-10 0-18 4-24z"/>
    <path ${part(on("glutes"))} d="M36 92c3 9 10 14 18 14s15-5 18-14c-5 7-12 10-18 10s-13-3-18-10z"/>
    <path ${part(on("hamstrings"))} d="M36 106c-3 15-3 32 0 45 7-2 10-7 12-12 2-12 0-24-3-33zm32 0c3 15 3 32 0 45-7-2-10-7-12-12-2-12 0-24 3-33z"/>
    <path ${part(on("calves"))} d="M38 154c-2 9 0 17 3 22 5 0 9-3 10-7 2-7 0-13-2-15zm28 0c2 9 0 17-3 22-5 0-9-3-10-7-2-7 0-13 2-15z"/>
  </g>`;
}

/**
 * @param {string} presetId
 * @param {string[]} muscleIds
 */
function renderSvg(presetId, muscleIds) {
  const active = new Set(muscleIds);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 200" role="img" aria-label="Mapa muscular ${presetId}">
  <rect width="280" height="200" rx="14" fill="${COLORS.bg}"/>
  <text x="70" y="22" text-anchor="middle" fill="${COLORS.label}" font-family="system-ui,sans-serif" font-size="10" font-weight="600" letter-spacing="0.12em">FRENTE</text>
  <text x="210" y="22" text-anchor="middle" fill="${COLORS.label}" font-family="system-ui,sans-serif" font-size="10" font-weight="600" letter-spacing="0.12em">COSTAS</text>
  <line x1="140" y1="8" x2="140" y2="192" stroke="${COLORS.bodyStroke}" stroke-width="1" opacity="0.5"/>
  <g transform="translate(0,0)">${bodySvg(active, "front")}</g>
  <g transform="translate(132,0)">${bodySvg(active, "back")}</g>
</svg>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [presetId, muscles] of Object.entries(PRESET_MUSCLE_GROUPS)) {
  const svgPath = path.join(OUT_DIR, `${presetId}.svg`);
  fs.writeFileSync(svgPath, renderSvg(presetId, muscles), "utf8");
  console.log("wrote", svgPath);
}

console.log("\nPNG: macOS -> qlmanage -t -s 640 -o assets/muscle-maps assets/muscle-maps/*.svg");
console.log("Depois renomeie tN.svg.png para tN.png");
