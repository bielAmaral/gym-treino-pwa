import { createClient } from "@supabase/supabase-js";
import { buildExercisesList } from "./presets.js";

/** @type {string} */
let supabaseUrl = "";
/** @type {string} */
let supabaseAnonKey = "";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let client = null;

/** @param {string} url @param {string} anonKey */
export function applySupabaseConfig(url, anonKey) {
  const nextUrl = url != null ? String(url).trim() : "";
  const nextKey = anonKey != null ? String(anonKey).trim() : "";
  if (nextUrl === supabaseUrl && nextKey === supabaseAnonKey) {
    return;
  }
  supabaseUrl = nextUrl;
  supabaseAnonKey = nextKey;
  client = null;
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/**
 * @param {unknown} prescription
 * @returns {ReturnType<typeof buildExercisesList>}
 */
export function prescriptionToExercises(prescription) {
  if (!Array.isArray(prescription)) {
    return [];
  }
  const items = prescription
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const name = item.name != null ? String(item.name) : "";
      if (!name) {
        return null;
      }
      return {
        name,
        nSets: Number(item.nSets) > 0 ? Number(item.nSets) : 1,
        reps: item.reps != null ? Number(item.reps) : null,
        restSec: item.suggestedRestSec != null ? Number(item.suggestedRestSec) : 60,
        note: item.note != null && String(item.note).trim() !== "" ? String(item.note) : undefined,
      };
    })
    .filter(Boolean);
  return buildExercisesList(items);
}

/**
 * @param {import("@supabase/supabase-js").Session} session
 * @returns {Promise<{ id: string, role: "admin" | "student", display_name: string } | null>}
 */
export async function fetchProfile(session) {
  const sb = getSupabase();
  if (!sb || !session?.user?.id) {
    return null;
  }
  const { data, error } = await sb
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  const role = data.role === "admin" ? "admin" : "student";
  return {
    id: data.id,
    role,
    display_name: data.display_name != null ? String(data.display_name) : "",
  };
}

/**
 * @returns {Promise<Array<{ id: string, label: string, exercises: ReturnType<typeof buildExercisesList> }>>}
 */
export async function fetchStudentWorkouts() {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }
  const userId = (await sb.auth.getUser()).data.user?.id;
  if (!userId) {
    return [];
  }
  const { data, error } = await sb
    .from("student_workouts")
    .select("template_id, label, exercises, sort_order")
    .eq("student_id", userId)
    .order("sort_order", { ascending: true });
  if (error) {
    throw error;
  }
  if (!data?.length) {
    return [];
  }
  return data.map((row) => ({
    id: String(row.template_id),
    label: row.label != null ? String(row.label) : "Treino",
    exercises: prescriptionToExercises(row.exercises),
  }));
}

/**
 * @param {{ studentId?: string }} [opts]
 * @returns {Promise<Array<{ id: string, label: string, exerciseCount: number, ownerStudentId: string | null, ownerName: string | null }>>}
 */
export async function fetchAllTemplatesAdmin(opts = {}) {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }
  let q = sb
    .from("workout_templates")
    .select("id, label, exercises, owner_student_id, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  if (opts.studentId) {
    q = q.eq("owner_student_id", opts.studentId);
  }
  const { data, error } = await q;
  if (error) {
    throw error;
  }
  const rows = data || [];
  let nameById = /** @type {Map<string, string>} */ (new Map());
  if (!opts.studentId && rows.some((r) => r.owner_student_id)) {
    const students = await fetchStudentsAdmin();
    nameById = new Map(students.map((s) => [s.id, s.display_name]));
  }
  return rows.map((r) => {
    const ex = Array.isArray(r.exercises) ? r.exercises : [];
    const ownerId = r.owner_student_id != null ? String(r.owner_student_id) : null;
    return {
      id: String(r.id),
      label: r.label != null ? String(r.label) : "—",
      exerciseCount: ex.length,
      ownerStudentId: ownerId,
      ownerName: ownerId ? nameById.get(ownerId) || null : null,
      sortOrder: Number(r.sort_order) || 0,
    };
  });
}

/** @param {string} studentId */
export async function fetchTemplatesForStudent(studentId) {
  return fetchAllTemplatesAdmin({ studentId });
}

/**
 * @param {string} id
 * @returns {Promise<{ id: string, label: string, exercises: unknown[] } | null>}
 */
export async function fetchTemplateById(id) {
  const sb = getSupabase();
  if (!sb) {
    return null;
  }
  const { data, error } = await sb
    .from("workout_templates")
    .select("id, label, exercises, owner_student_id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return {
    id: String(data.id),
    label: data.label != null ? String(data.label) : "",
    exercises: Array.isArray(data.exercises) ? data.exercises : [],
    ownerStudentId: data.owner_student_id != null ? String(data.owner_student_id) : null,
  };
}

/**
 * @param {string} label
 * @param {unknown[]} exercises
 * @param {string} createdBy
 * @param {string} ownerStudentId aluno dono da ficha (individual)
 */
export async function createTemplate(label, exercises, createdBy, ownerStudentId) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  if (!ownerStudentId) {
    throw new Error("Selecione o aluno da ficha");
  }
  const existing = await fetchTemplatesForStudent(ownerStudentId);
  const sortOrder = existing.length ? Math.max(...existing.map((t) => t.sortOrder || 0)) + 1 : 1;
  const { data, error } = await sb
    .from("workout_templates")
    .insert({
      label,
      exercises,
      created_by: createdBy,
      owner_student_id: ownerStudentId,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  const templateId = String(data.id);
  const { error: linkErr } = await sb.from("student_assignments").insert({
    student_id: ownerStudentId,
    template_id: templateId,
    sort_order: sortOrder,
    assigned_by: createdBy,
  });
  if (linkErr && linkErr.code !== "23505") {
    throw linkErr;
  }
  return templateId;
}

/**
 * @param {string} id
 * @param {string} label
 * @param {unknown[]} exercises
 */
export async function updateTemplate(id, label, exercises) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  const { error } = await sb.from("workout_templates").update({ label, exercises }).eq("id", id);
  if (error) {
    throw error;
  }
}

/** @param {string} id */
export async function deleteTemplate(id) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  await sb.from("student_assignments").delete().eq("template_id", id);
  const { error } = await sb.from("workout_templates").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

/**
 * @param {string} studentId
 * @param {string[]} templateIds ordem no app do aluno
 */
export async function reorderStudentTemplates(studentId, templateIds) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  for (let i = 0; i < templateIds.length; i++) {
    const templateId = templateIds[i];
    const sortOrder = i + 1;
    const { error: tErr } = await sb
      .from("workout_templates")
      .update({ sort_order: sortOrder })
      .eq("id", templateId)
      .eq("owner_student_id", studentId);
    if (tErr) {
      throw tErr;
    }
    const { error: aErr } = await sb
      .from("student_assignments")
      .update({ sort_order: sortOrder })
      .eq("template_id", templateId)
      .eq("student_id", studentId);
    if (aErr && aErr.code !== "PGRST116") {
      throw aErr;
    }
  }
}

/**
 * @returns {Promise<Array<{ id: string, display_name: string, templateCount: number, lastWorkoutLabel: string | null, lastWorkoutDay: string | null }>>}
 */
export async function fetchStudentsAdmin() {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name")
    .eq("role", "student")
    .order("display_name", { ascending: true });
  if (error) {
    throw error;
  }
  const students = data || [];
  if (!students.length) {
    return [];
  }

  const ids = students.map((s) => s.id);
  const countByStudent = new Map();
  const lastByStudent = new Map();

  const { data: templates, error: tErr } = await sb
    .from("workout_templates")
    .select("owner_student_id")
    .in("owner_student_id", ids);
  if (!tErr && templates) {
    for (const row of templates) {
      const sid = row.owner_student_id != null ? String(row.owner_student_id) : "";
      if (sid) {
        countByStudent.set(sid, (countByStudent.get(sid) || 0) + 1);
      }
    }
  }

  try {
    const { data: sessions, error: sErr } = await sb
      .from("workout_sessions")
      .select("student_id, preset_label, day_key, completed_at")
      .in("student_id", ids)
      .order("completed_at", { ascending: false });
    if (!sErr && sessions) {
      for (const row of sessions) {
        const sid = String(row.student_id);
        if (!lastByStudent.has(sid)) {
          lastByStudent.set(sid, {
            label: row.preset_label != null ? String(row.preset_label) : null,
            dayKey: row.day_key != null ? String(row.day_key) : null,
          });
        }
      }
    }
  } catch {
    /* tabela workout_sessions ausente até rodar 006 */
  }

  return students.map((r) => {
    const id = String(r.id);
    const last = lastByStudent.get(id);
    return {
      id,
      display_name: r.display_name != null ? String(r.display_name) : "—",
      templateCount: countByStudent.get(id) || 0,
      lastWorkoutLabel: last?.label || null,
      lastWorkoutDay: last?.dayKey || null,
    };
  });
}

/**
 * @param {string} sourceId
 * @param {string} targetStudentId
 * @param {string} createdBy
 */
export async function duplicateTemplate(sourceId, targetStudentId, createdBy) {
  const src = await fetchTemplateById(sourceId);
  if (!src) {
    throw new Error("Ficha origem não encontrada");
  }
  const base = src.label.trim();
  const label = base.includes("(cópia)") ? `${base} 2` : `${base} (cópia)`;
  return createTemplate(label, src.exercises, createdBy, targetStudentId);
}

/**
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 */
export async function adminCreateStudent(email, password, displayName) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado");
  }
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sessão admin inválida");
  }
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/create-student`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, displayName }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload.error || payload.message || `Erro ${res.status}`;
    if (res.status === 404) {
      throw new Error(
        "Função create-student não encontrada. Faça deploy da Edge Function (ver docs/deploy.md)."
      );
    }
    throw new Error(msg);
  }
  return payload;
}

/** @param {string} email */
export async function requestPasswordReset(email) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  const redirectTo = typeof window !== "undefined" ? window.location.origin + "/" : undefined;
  const { error } = await sb.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) {
    throw error;
  }
}

export async function signInWithPassword(email, password) {
  const sb = getSupabase();
  if (!sb) {
    throw new Error("Supabase não configurado");
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) {
    return;
  }
  await sb.auth.signOut();
}

export async function getSession() {
  const sb = getSupabase();
  if (!sb) {
    return null;
  }
  const { data, error } = await sb.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export function onAuthStateChange(callback) {
  const sb = getSupabase();
  if (!sb) {
    return () => {};
  }
  const { data } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
