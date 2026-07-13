import { SUPABASE_URL, SUPABASE_ANON_KEY, PERSONAL_LOCAL_UNLOCK } from "./supabase-env.js";
import { applySupabaseConfig } from "./supabase-api.js";
import { setPersonalUnlockToken } from "./personal-device.js";

/**
 * Ordem: supabase-env.js (npm run build:supabase-env) → config.json na raiz do app.
 * @returns {Promise<{ url: string, key: string, source: string, personalUnlock: string }>}
 */
export async function loadSupabaseConfig() {
  let url = SUPABASE_URL || "";
  let key = SUPABASE_ANON_KEY || "";
  let source = url && key ? "supabase-env.js" : "";
  let personalUnlock = PERSONAL_LOCAL_UNLOCK != null ? String(PERSONAL_LOCAL_UNLOCK).trim() : "";

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
        if (!personalUnlock && data.PERSONAL_LOCAL_UNLOCK != null) {
          personalUnlock = String(data.PERSONAL_LOCAL_UNLOCK).trim();
        }
      }
    } catch {
      /* offline ou arquivo ausente */
    }
  }

  applySupabaseConfig(url, key);
  setPersonalUnlockToken(personalUnlock);
  return { url, key, source, personalUnlock };
}
