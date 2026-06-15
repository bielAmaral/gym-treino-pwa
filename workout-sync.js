import { getSupabase, isSupabaseConfigured } from "./supabase-api.js";

/**
 * @param {string} studentId
 * @param {{ dayKey: string, at: number, sourcePresetId: string | null, presetLabel: string | null, exercises: unknown[] }} entry
 */
export async function pushWorkoutSession(studentId, entry) {
  if (!isSupabaseConfigured() || !studentId) {
    return;
  }
  const sb = getSupabase();
  if (!sb) {
    return;
  }
  const row = {
    student_id: studentId,
    template_id: entry.sourcePresetId || null,
    preset_label: entry.presetLabel || null,
    day_key: entry.dayKey,
    completed_at: new Date(entry.at || Date.now()).toISOString(),
    exercises: entry.exercises,
  };
  const { error } = await sb.from("workout_sessions").upsert(row, {
    onConflict: "student_id,day_key",
  });
  if (error) {
    throw error;
  }
}

/**
 * @param {string} studentId
 * @param {string} templateId
 * @param {Record<string, string[]>} weightsMap nome → [kg por série]
 */
export async function pushLastWeights(studentId, templateId, weightsMap) {
  if (!isSupabaseConfigured() || !studentId || !templateId) {
    return;
  }
  const sb = getSupabase();
  if (!sb) {
    return;
  }
  const { error } = await sb.from("student_last_weights").upsert(
    {
      student_id: studentId,
      template_id: templateId,
      weights: weightsMap,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id,template_id" }
  );
  if (error) {
    throw error;
  }
}

/**
 * @param {string} studentId
 * @returns {Promise<{ history: object[], lastWeights: Record<string, Record<string, string[]>> }>}
 */
export async function pullTrainingData(studentId) {
  if (!isSupabaseConfigured() || !studentId) {
    return { history: [], lastWeights: {} };
  }
  const sb = getSupabase();
  if (!sb) {
    return { history: [], lastWeights: {} };
  }

  const [sessionsRes, weightsRes] = await Promise.all([
    sb
      .from("workout_sessions")
      .select("day_key, completed_at, template_id, preset_label, exercises")
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false })
      .limit(60),
    sb.from("student_last_weights").select("template_id, weights, updated_at").eq("student_id", studentId),
  ]);

  if (sessionsRes.error) {
    throw sessionsRes.error;
  }
  if (weightsRes.error) {
    throw weightsRes.error;
  }

  const history = (sessionsRes.data || []).map((row) => ({
    dayKey: String(row.day_key),
    at: new Date(row.completed_at).getTime(),
    sourcePresetId: row.template_id != null ? String(row.template_id) : null,
    presetLabel: row.preset_label != null ? String(row.preset_label) : null,
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
  }));

  /** @type {Record<string, Record<string, string[]>>} */
  const lastWeights = {};
  for (const row of weightsRes.data || []) {
    const tid = row.template_id != null ? String(row.template_id) : "";
    if (!tid || !row.weights || typeof row.weights !== "object") {
      continue;
    }
    lastWeights[tid] = /** @type {Record<string, string[]>} */ (row.weights);
  }

  return { history, lastWeights };
}

/**
 * @param {object[]} local
 * @param {object[]} cloud
 */
export function mergeHistoryEntries(local, cloud) {
  const byDay = new Map();
  for (const h of [...local, ...cloud]) {
    if (!h || !h.dayKey) {
      continue;
    }
    const prev = byDay.get(h.dayKey);
    if (!prev || (h.at || 0) >= (prev.at || 0)) {
      byDay.set(h.dayKey, h);
    }
  }
  return [...byDay.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
}

/**
 * @param {Record<string, Record<string, string[]>>} local
 * @param {Record<string, Record<string, string[]>>} cloud
 */
export function mergeLastWeights(local, cloud) {
  const out = { ...local };
  for (const [presetId, map] of Object.entries(cloud)) {
    if (!map || typeof map !== "object") {
      continue;
    }
    out[presetId] = { ...(out[presetId] || {}), ...map };
  }
  return out;
}
