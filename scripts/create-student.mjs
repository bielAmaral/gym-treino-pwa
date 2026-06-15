#!/usr/bin/env node
/**
 * Cria aluno via service role (CLI). Não coloque SERVICE_ROLE no PWA.
 * Uso: node scripts/create-student.mjs --email x@y.com --password '***' --name "Nome"
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const path = resolve(root, ".env");
  if (!existsSync(path)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) {
      out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return out;
}

function loadConfigJson() {
  const path = resolve(root, "config.json");
  if (!existsSync(path)) {
    return {};
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return {
      SUPABASE_URL: raw.SUPABASE_URL || raw.supabaseUrl || "",
      SUPABASE_ANON_KEY: raw.SUPABASE_ANON_KEY || raw.supabaseAnonKey || "",
    };
  } catch {
    return {};
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : "";
}

const email = arg("email").trim().toLowerCase();
const password = arg("password");
const displayName = arg("name").trim() || email.split("@")[0];

const env = { ...loadConfigJson(), ...loadEnv() };
const url = env.SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || password.length < 8) {
  console.error("Uso: npm run create-student -- --email x@y.com --password 'min8chars' [--name Nome]");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error(`
Falta configuração no arquivo gym-treino-pwa/.env

1) Dashboard Supabase → Project Settings → API
2) Copie Project URL → SUPABASE_URL
3) Copie service_role (secret) → SUPABASE_SERVICE_ROLE_KEY
   ⚠️  Nunca coloque service_role no config.json nem no PWA — só no .env local.

Exemplo .env:
SUPABASE_URL=https://SEU-REF.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

(SUPABASE_URL também pode vir do config.json; a service role só no .env.)
`);
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: "student", display_name: displayName },
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

if (data.user?.id) {
  await admin
    .from("profiles")
    .update({ role: "student", display_name: displayName })
    .eq("id", data.user.id);
}

console.log("OK", data.user?.id, email);
