import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-env.js";
import { applySupabaseConfig } from "./supabase-api.js";

/**
 * Ordem: supabase-env.js (npm run build:supabase-env) → config.json na raiz do app.
 * @returns {Promise<{ url: string, key: string, source: string }>}
 */
export async function loadSupabaseConfig() {
  let url = SUPABASE_URL || "";
  let key = SUPABASE_ANON_KEY || "";
  let source = url && key ? "supabase-env.js" : "";

  if (!url || !key) {
    try {
      const res = await fetch("./config.json", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        url = data.SUPABASE_URL != null ? String(data.SUPABASE_URL).trim() : "";
        key = data.SUPABASE_ANON_KEY != null ? String(data.SUPABASE_ANON_KEY).trim() : "";
        if (url && key) {
          source = "config.json";
        }
      }
    } catch {
      /* offline ou arquivo ausente */
    }
  }

  applySupabaseConfig(url, key);
  return { url, key, source };
}
