/** Chave em localStorage — só este aparelho, após desbloqueio com URL secreta. */
const STORAGE_KEY = "gym-treino-pwa-personal-device";

let configuredUnlock = "";

/** @param {string} token */
export function setPersonalUnlockToken(token) {
  configuredUnlock = token ? String(token).trim() : "";
}

export function isPersonalUnlockConfigured() {
  return configuredUnlock.length > 0;
}

export function isPersonalDevice() {
  if (!configuredUnlock) {
    return false;
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Lê ?personal= ou ?me= na URL; se bater com o token do servidor, marca este aparelho. */
export function tryUnlockFromUrl() {
  if (!configuredUnlock) {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  const got = (params.get("personal") || params.get("me") || "").trim();
  if (!got || got !== configuredUnlock) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    return false;
  }
  if (params.has("personal") || params.has("me")) {
    params.delete("personal");
    params.delete("me");
    const qs = params.toString();
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState({}, "", next);
  }
  return true;
}
