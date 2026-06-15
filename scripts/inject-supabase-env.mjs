import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const outPath = path.join(root, "supabase-env.js");

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    const i = t.indexOf("=");
    if (i < 1) {
      continue;
    }
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

let url = process.env.SUPABASE_URL || "";
let key = process.env.SUPABASE_ANON_KEY || "";

if (fs.existsSync(envPath)) {
  const parsed = parseEnv(fs.readFileSync(envPath, "utf8"));
  url = url || parsed.SUPABASE_URL || "";
  key = key || parsed.SUPABASE_ANON_KEY || "";
}

const body = `/** Gerado por scripts/inject-supabase-env.mjs — não edite à mão */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
`;

fs.writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${outPath} (url ${url ? "ok" : "vazio"}, key ${key ? "ok" : "vazio"})`);
