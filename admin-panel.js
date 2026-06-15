import {
  adminCreateStudent,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  fetchAllTemplatesAdmin,
  fetchStudentsAdmin,
  fetchTemplateById,
  fetchTemplatesForStudent,
  reorderStudentTemplates,
  updateTemplate,
} from "./supabase-api.js";

/** @typedef {{ showToast: Function, openConfirm: Function, getCurrentProfile: () => { id: string } | null }} AdminDeps */

let deps = /** @type {AdminDeps | null} */ (null);
let mounted = false;
/** @type {{ id: string, name: string } | null} */
let activeStudent = null;

/** @param {unknown} item */
function normalizePrescriptionItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const o = /** @type {Record<string, unknown>} */ (item);
  const name = o.name != null ? String(o.name).trim() : "";
  if (!name) {
    return null;
  }
  return {
    name,
    nSets: Number(o.nSets) > 0 ? Number(o.nSets) : 1,
    reps: o.reps != null && o.reps !== "" ? Number(o.reps) : 0,
    suggestedRestSec: o.suggestedRestSec != null ? Number(o.suggestedRestSec) : 60,
    note: o.note != null && String(o.note).trim() !== "" ? String(o.note).trim() : null,
  };
}

/** @param {HTMLElement} container */
function readExercisesFromEditor(container) {
  const rows = container.querySelectorAll(".admin-ex-row");
  const out = [];
  rows.forEach((row) => {
    const nameEl = row.querySelector('[data-field="name"]');
    const nSetsEl = row.querySelector('[data-field="nSets"]');
    const repsEl = row.querySelector('[data-field="reps"]');
    const restEl = row.querySelector('[data-field="rest"]');
    const noteEl = row.querySelector('[data-field="note"]');
    const name = nameEl && "value" in nameEl ? String(nameEl.value).trim() : "";
    if (!name) {
      return;
    }
    out.push({
      name,
      nSets: Math.max(1, parseInt(nSetsEl && "value" in nSetsEl ? String(nSetsEl.value) : "1", 10) || 1),
      reps: parseInt(repsEl && "value" in repsEl ? String(repsEl.value) : "0", 10) || 0,
      suggestedRestSec: parseInt(restEl && "value" in restEl ? String(restEl.value) : "60", 10) || 60,
      note:
        noteEl && "value" in noteEl && String(noteEl.value).trim() !== "" ? String(noteEl.value).trim() : null,
    });
  });
  return out;
}

/**
 * @param {HTMLElement} container
 * @param {unknown[]} exercises
 */
function renderExerciseEditorRows(container, exercises) {
  container.replaceChildren();
  const list = Array.isArray(exercises) ? exercises : [];
  if (!list.length) {
    appendExerciseRow(container, null);
    return;
  }
  for (const raw of list) {
    appendExerciseRow(container, normalizePrescriptionItem(raw));
  }
}

/** @param {HTMLElement} container @param {ReturnType<typeof normalizePrescriptionItem> | null} item */
function appendExerciseRow(container, item) {
  const row = document.createElement("div");
  row.className = "admin-ex-row";
  row.innerHTML = `
    <label class="admin-ex-field admin-ex-field--wide">
      <span class="admin-ex-field__label">Exercício</span>
      <input class="input" type="text" data-field="name" value="${item ? escapeAttr(item.name) : ""}" required />
    </label>
    <label class="admin-ex-field">
      <span class="admin-ex-field__label">Séries</span>
      <input class="input" type="number" min="1" max="20" data-field="nSets" value="${item ? item.nSets : 4}" />
    </label>
    <label class="admin-ex-field">
      <span class="admin-ex-field__label">Reps</span>
      <input class="input" type="number" min="0" max="999" data-field="reps" value="${item ? item.reps : 10}" />
    </label>
    <label class="admin-ex-field">
      <span class="admin-ex-field__label">Desc (s)</span>
      <input class="input" type="number" min="0" max="600" data-field="rest" value="${item ? item.suggestedRestSec : 60}" />
    </label>
    <label class="admin-ex-field admin-ex-field--wide">
      <span class="admin-ex-field__label">Nota</span>
      <input class="input" type="text" data-field="note" value="${item && item.note ? escapeAttr(item.note) : ""}" />
    </label>
    <button type="button" class="btn btn--icon admin-ex-remove" aria-label="Remover exercício">×</button>
  `;
  row.querySelector(".admin-ex-remove")?.addEventListener("click", () => {
    row.remove();
    if (!container.querySelector(".admin-ex-row")) {
      appendExerciseRow(container, null);
    }
  });
  container.appendChild(row);
}

/** @param {string} s */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function setAdminTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    const on = btn.getAttribute("data-admin-tab") === tab;
    btn.classList.toggle("admin-tab--active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  const alunos = document.getElementById("admin-panel-alunos");
  const arsenal = document.getElementById("admin-panel-arsenal");
  const detail = document.getElementById("admin-student-detail");
  if (tab === "alunos") {
    if (arsenal) {
      arsenal.hidden = true;
    }
    if (activeStudent) {
      if (alunos) {
        alunos.hidden = true;
      }
      if (detail) {
        detail.hidden = false;
      }
    } else {
      if (alunos) {
        alunos.hidden = false;
      }
      if (detail) {
        detail.hidden = true;
      }
    }
  } else {
    activeStudent = null;
    if (alunos) {
      alunos.hidden = true;
    }
    if (detail) {
      detail.hidden = true;
    }
    if (arsenal) {
      arsenal.hidden = false;
    }
    refreshArsenalList();
  }
}

function openStudentDetail(studentId, studentName, meta) {
  activeStudent = { id: studentId, name: studentName };
  const title = document.getElementById("admin-student-title");
  if (title) {
    title.textContent = studentName;
  }
  const sub = document.getElementById("admin-student-subtitle");
  if (sub) {
    const parts = [];
    if (meta?.templateCount != null) {
      parts.push(`${meta.templateCount} ficha(s)`);
    }
    if (meta?.lastWorkoutDay) {
      const label = meta.lastWorkoutLabel ? meta.lastWorkoutLabel : "Treino";
      parts.push(`Último: ${label} (${meta.lastWorkoutDay})`);
    } else {
      parts.push("Ainda sem treino registado na nuvem");
    }
    sub.textContent = parts.join(" · ");
  }
  setAdminTab("alunos");
  refreshStudentTemplatesList();
}

function closeStudentDetail() {
  activeStudent = null;
  const alunos = document.getElementById("admin-panel-alunos");
  const detail = document.getElementById("admin-student-detail");
  if (alunos) {
    alunos.hidden = false;
  }
  if (detail) {
    detail.hidden = true;
  }
}

/**
 * @param {HTMLElement} ul
 * @param {Awaited<ReturnType<typeof fetchAllTemplatesAdmin>>} templates
 * @param {object} opts
 */
function renderTemplateItems(ul, templates, opts) {
  ul.replaceChildren();
  if (!templates.length) {
    const li = document.createElement("li");
    li.className = "admin-entity-list__empty";
    li.textContent = "Nenhuma ficha ainda.";
    ul.appendChild(li);
    return;
  }
  templates.forEach((t, index) => {
    const li = document.createElement("li");
    li.className = "admin-entity-item";
    const ownerMeta =
      opts.showOwner && t.ownerName ? `<span class="admin-entity-item__meta">${escapeHtml(t.ownerName)}</span>` : "";
    const reorderBtns = opts.showReorder
      ? `<button type="button" class="btn btn--sm btn--icon" data-move-up title="Subir" ${index === 0 ? "disabled" : ""}>↑</button>
         <button type="button" class="btn btn--sm btn--icon" data-move-down title="Descer" ${index === templates.length - 1 ? "disabled" : ""}>↓</button>`
      : "";
    li.innerHTML = `
      <div class="admin-entity-item__main">
        <strong class="admin-entity-item__title">${escapeHtml(t.label)}</strong>
        <span class="admin-entity-item__meta">${t.exerciseCount} exercício(s)</span>
        ${ownerMeta}
      </div>
      <div class="admin-entity-item__actions admin-entity-item__actions--wrap">
        ${reorderBtns}
        <button type="button" class="btn btn--sm" data-edit-template>Editar</button>
        ${opts.onDuplicate ? '<button type="button" class="btn btn--sm" data-dup-template>Duplicar</button>' : ""}
        <button type="button" class="btn btn--sm btn--ghost-warn" data-del-template>Excluir</button>
      </div>
    `;
    li.querySelector("[data-edit-template]")?.addEventListener("click", () => opts.onEdit(t.id));
    li.querySelector("[data-del-template]")?.addEventListener("click", () => opts.onDelete(t));
    li.querySelector("[data-dup-template]")?.addEventListener("click", () => opts.onDuplicate?.(t));
    li.querySelector("[data-move-up]")?.addEventListener("click", () => opts.onMoveUp?.(index));
    li.querySelector("[data-move-down]")?.addEventListener("click", () => opts.onMoveDown?.(index));
    ul.appendChild(li);
  });
}

/** @param {Awaited<ReturnType<typeof fetchTemplatesForStudent>>} templates */
async function moveTemplateOrder(templates, index, direction) {
  if (!activeStudent) {
    return;
  }
  const next = index + direction;
  if (next < 0 || next >= templates.length) {
    return;
  }
  const ids = templates.map((t) => t.id);
  const tmp = ids[index];
  ids[index] = ids[next];
  ids[next] = tmp;
  try {
    await reorderStudentTemplates(activeStudent.id, ids);
    await refreshStudentTemplatesList();
    deps.showToast("Ordem atualizada.", { variant: "success" });
  } catch (err) {
    deps.showToast(err?.message || "Erro ao reordenar.", { variant: "error" });
  }
}

async function refreshStudentTemplatesList() {
  const ul = document.getElementById("admin-student-templates-list");
  if (!ul || !activeStudent) {
    return;
  }
  const templates = await fetchTemplatesForStudent(activeStudent.id);
  renderTemplateItems(ul, templates, {
    showOwner: false,
    showReorder: true,
    onEdit: (id) => openTemplateEditor(id, activeStudent.id),
    onDuplicate: async (t) => {
      try {
        const profile = deps.getCurrentProfile();
        if (!profile?.id) {
          throw new Error("Sessão inválida");
        }
        await duplicateTemplate(t.id, activeStudent.id, profile.id);
        deps.showToast("Ficha duplicada.", { variant: "success" });
        await refreshStudentTemplatesList();
        await refreshArsenalList();
      } catch (err) {
        deps.showToast(err?.message || "Erro ao duplicar.", { variant: "error" });
      }
    },
    onMoveUp: (i) => moveTemplateOrder(templates, i, -1),
    onMoveDown: (i) => moveTemplateOrder(templates, i, 1),
    onDelete: async (t) => {
      const ok = await deps.openConfirm({
        title: "Excluir ficha?",
        message: `“${t.label}” será removida só deste aluno.`,
        confirmLabel: "Excluir",
        cancelLabel: "Cancelar",
      });
      if (!ok) {
        return;
      }
      try {
        await deleteTemplate(t.id);
        deps.showToast("Ficha excluída.", { variant: "success" });
        await refreshStudentTemplatesList();
        await refreshArsenalList();
      } catch (err) {
        deps.showToast(err?.message || "Erro ao excluir.", { variant: "error" });
      }
    },
  });
}

async function refreshArsenalList() {
  const ul = document.getElementById("admin-arsenal-list");
  if (!ul) {
    return;
  }
  const templates = await fetchAllTemplatesAdmin();
  renderTemplateItems(ul, templates, {
    showOwner: true,
    onEdit: (id) => openTemplateEditor(id, null),
    onDelete: async (t) => {
      const ok = await deps.openConfirm({
        title: "Excluir ficha?",
        message: `“${t.label}” será removida (ficha individual do aluno).`,
        confirmLabel: "Excluir",
        cancelLabel: "Cancelar",
      });
      if (!ok) {
        return;
      }
      try {
        await deleteTemplate(t.id);
        deps.showToast("Ficha excluída.", { variant: "success" });
        await refreshArsenalList();
        if (activeStudent) {
          await refreshStudentTemplatesList();
        }
      } catch (err) {
        deps.showToast(err?.message || "Erro ao excluir.", { variant: "error" });
      }
    },
  });
}

async function refreshStudentsList() {
  const ul = document.getElementById("admin-students-list");
  if (!ul) {
    return;
  }
  ul.replaceChildren();
  const students = await fetchStudentsAdmin();
  if (!students.length) {
    const li = document.createElement("li");
    li.className = "admin-entity-list__empty";
    li.textContent = "Nenhum aluno. Crie usuário no Supabase Auth (role student).";
    ul.appendChild(li);
    return;
  }
  for (const s of students) {
    const li = document.createElement("li");
    li.className = "admin-entity-item";
    const lastLine = s.lastWorkoutDay
      ? `Último treino: ${escapeHtml(s.lastWorkoutLabel || "—")} (${escapeHtml(s.lastWorkoutDay)})`
      : "Sem treino na nuvem ainda";
    li.innerHTML = `
      <div class="admin-entity-item__main">
        <strong class="admin-entity-item__title">${escapeHtml(s.display_name)}</strong>
        <span class="admin-entity-item__meta">${s.templateCount} ficha(s)</span>
        <span class="admin-entity-item__meta">${lastLine}</span>
      </div>
      <div class="admin-entity-item__actions">
        <button type="button" class="btn btn--sm btn--primary" data-manage>Fichas</button>
      </div>
    `;
    li.querySelector("[data-manage]")?.addEventListener("click", () => {
      openStudentDetail(s.id, s.display_name, s);
    });
    ul.appendChild(li);
  }
}

function openCreateStudentModal() {
  const modal = document.getElementById("admin-create-student-modal");
  if (!modal) {
    return;
  }
  const emailEl = document.getElementById("admin-student-email");
  const nameEl = document.getElementById("admin-student-name");
  const passEl = document.getElementById("admin-student-password");
  if (emailEl) {
    emailEl.value = "";
  }
  if (nameEl) {
    nameEl.value = "";
  }
  if (passEl) {
    passEl.value = "";
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  emailEl?.focus();
}

function closeCreateStudentModal() {
  const modal = document.getElementById("admin-create-student-modal");
  if (modal) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }
}

async function saveNewStudent() {
  const emailEl = document.getElementById("admin-student-email");
  const nameEl = document.getElementById("admin-student-name");
  const passEl = document.getElementById("admin-student-password");
  const btn = document.getElementById("admin-student-save");
  const email = emailEl && "value" in emailEl ? String(emailEl.value).trim().toLowerCase() : "";
  const displayName = nameEl && "value" in nameEl ? String(nameEl.value).trim() : "";
  const password = passEl && "value" in passEl ? String(passEl.value) : "";
  if (!email || !password || password.length < 8) {
    deps.showToast("E-mail e senha (mín. 8 caracteres) obrigatórios.", { variant: "warning" });
    return;
  }
  if (btn) {
    btn.disabled = true;
  }
  try {
    await adminCreateStudent(email, password, displayName);
    deps.showToast("Aluno criado.", { variant: "success" });
    closeCreateStudentModal();
    await refreshStudentsList();
  } catch (err) {
    deps.showToast(err?.message || "Erro ao criar aluno.", { variant: "error" });
  } finally {
    if (btn) {
      btn.disabled = false;
    }
  }
}

/** @param {string | null} templateId @param {string | null} ownerStudentId obrigatório ao criar */
async function openTemplateEditor(templateId, ownerStudentId) {
  const modal = document.getElementById("admin-template-modal");
  const titleEl = document.getElementById("admin-template-modal-title");
  const labelEl = document.getElementById("admin-template-label");
  const listEl = document.getElementById("admin-exercise-list");
  const saveBtn = document.getElementById("admin-template-save");
  const studentWrap = document.getElementById("admin-template-student-wrap");
  const studentSelect = document.getElementById("admin-template-student");
  if (!modal || !titleEl || !labelEl || !listEl || !saveBtn) {
    return;
  }

  let exercises = [];
  let ownerId = ownerStudentId || activeStudent?.id || "";

  if (templateId) {
    titleEl.textContent = "Editar ficha";
    const row = await fetchTemplateById(templateId);
    if (!row) {
      deps.showToast("Ficha não encontrada.", { variant: "error" });
      return;
    }
    labelEl.value = row.label;
    exercises = row.exercises;
    ownerId = row.ownerStudentId || ownerId;
  } else {
    titleEl.textContent = "Nova ficha";
    labelEl.value = "";
    exercises = [];
  }

  if (studentWrap && studentSelect) {
    const students = await fetchStudentsAdmin();
    studentSelect.replaceChildren();
    for (const s of students) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.display_name;
      studentSelect.appendChild(opt);
    }
    const lockOwner = Boolean(ownerStudentId || activeStudent);
    studentWrap.hidden = lockOwner;
    if (ownerId) {
      studentSelect.value = ownerId;
    }
    if (!lockOwner && !ownerId && students.length) {
      studentSelect.value = students[0].id;
    }
  }

  renderExerciseEditorRows(listEl, exercises);
  modal.dataset.templateId = templateId || "";
  modal.dataset.ownerStudentId = ownerId;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  labelEl.focus();

  const onSave = async () => {
    const label = String(labelEl.value).trim();
    if (!label) {
      deps.showToast("Informe o nome da ficha.", { variant: "warning" });
      return;
    }
    const payload = readExercisesFromEditor(listEl);
    if (!payload.length) {
      deps.showToast("Adicione pelo menos um exercício.", { variant: "warning" });
      return;
    }
    const editId = modal.dataset.templateId || "";
    const studentId =
      studentSelect && !studentWrap?.hidden ? String(studentSelect.value) : modal.dataset.ownerStudentId || "";
    if (!studentId) {
      deps.showToast("Selecione o aluno.", { variant: "warning" });
      return;
    }
    saveBtn.disabled = true;
    try {
      const profile = deps.getCurrentProfile();
      if (editId) {
        await updateTemplate(editId, label, payload);
        deps.showToast("Ficha atualizada.", { variant: "success" });
      } else {
        if (!profile?.id) {
          throw new Error("Perfil admin ausente");
        }
        await createTemplate(label, payload, profile.id, studentId);
        deps.showToast("Ficha criada para o aluno.", { variant: "success" });
      }
      closeTemplateEditor();
      await refreshArsenalList();
      if (activeStudent?.id === studentId) {
        await refreshStudentTemplatesList();
      }
    } catch (err) {
      deps.showToast(err?.message || "Erro ao guardar.", { variant: "error" });
    } finally {
      saveBtn.disabled = false;
    }
  };

  saveBtn.replaceWith(saveBtn.cloneNode(true));
  document.getElementById("admin-template-save")?.addEventListener("click", onSave);
}

function closeTemplateEditor() {
  const modal = document.getElementById("admin-template-modal");
  if (modal) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }
}

function bindAdminModals() {
  document.getElementById("admin-template-modal")?.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && (t.hasAttribute("data-admin-modal-close") || t.closest("[data-admin-modal-close]"))) {
      closeTemplateEditor();
    }
  });
  document.getElementById("admin-create-student-modal")?.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && (t.hasAttribute("data-admin-modal-close") || t.closest("[data-admin-modal-close]"))) {
      closeCreateStudentModal();
    }
  });
}

function bindAdminTabs() {
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-admin-tab");
      if (tab === "alunos" || tab === "arsenal") {
        setAdminTab(tab);
      }
    });
  });
}

/** @param {AdminDeps} adminDeps */
export async function mountAdminPanel(adminDeps) {
  deps = adminDeps;
  if (!mounted) {
    mounted = true;
    bindAdminTabs();
    bindAdminModals();
    document.getElementById("btn-admin-student-back")?.addEventListener("click", () => {
      closeStudentDetail();
    });
    document.getElementById("btn-new-student-template")?.addEventListener("click", () => {
      if (!activeStudent) {
        return;
      }
      openTemplateEditor(null, activeStudent.id);
    });
    document.getElementById("btn-new-arsenal-template")?.addEventListener("click", () => {
      openTemplateEditor(null, null);
    });
    document.getElementById("btn-new-student")?.addEventListener("click", () => {
      openCreateStudentModal();
    });
    document.getElementById("admin-student-save")?.addEventListener("click", () => {
      saveNewStudent();
    });
    document.getElementById("btn-add-exercise")?.addEventListener("click", () => {
      const listEl = document.getElementById("admin-exercise-list");
      if (listEl) {
        appendExerciseRow(listEl, null);
      }
    });
    setAdminTab("alunos");
  }
  const line = document.getElementById("admin-user-line");
  const profile = deps.getCurrentProfile();
  if (line && profile) {
    line.textContent = profile.display_name || "Admin";
  }
  try {
    await refreshStudentsList();
    await refreshArsenalList();
  } catch (err) {
    deps.showToast(err?.message || "Erro ao carregar painel.", { variant: "error" });
  }
}
