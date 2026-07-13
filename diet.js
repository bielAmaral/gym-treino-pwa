import { DIET_PLAN, getCheckableMealIds } from "./diet-presets.js";

const STORAGE = "gym-treino-diet-v1";
const CHECKABLE = getCheckableMealIds();

/** @type {{ showToast: (msg: string, opts?: { variant?: string }) => void } | null} */
let host = null;

function dayKeyFromDate(d) {
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
  );
}

function defaultDayState(dayKey) {
  const done = {};
  for (const id of CHECKABLE) {
    done[id] = false;
  }
  return { dayKey, done };
}

function loadDietState() {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) {
      return { today: defaultDayState(dayKeyFromDate(new Date())), history: [] };
    }
    const parsed = JSON.parse(raw);
    const history = Array.isArray(parsed.history) ? parsed.history : [];
    let today = parsed.today;
    if (!today || today.dayKey !== dayKeyFromDate(new Date())) {
      if (today && today.dayKey) {
        archiveDay(today, history);
      }
      today = defaultDayState(dayKeyFromDate(new Date()));
    }
    if (!today.done || typeof today.done !== "object") {
      today = defaultDayState(dayKeyFromDate(new Date()));
    }
    for (const id of CHECKABLE) {
      if (typeof today.done[id] !== "boolean") {
        today.done[id] = false;
      }
    }
    return { today, history };
  } catch {
    return { today: defaultDayState(dayKeyFromDate(new Date())), history: [] };
  }
}

function archiveDay(dayState, history) {
  const doneIds = CHECKABLE.filter((id) => dayState.done[id]);
  if (!doneIds.length) {
    return;
  }
  const existing = history.findIndex((h) => h && h.dayKey === dayState.dayKey);
  const entry = {
    dayKey: dayState.dayKey,
    at: Date.now(),
    doneIds: [...doneIds],
    total: CHECKABLE.length,
  };
  if (existing >= 0) {
    history[existing] = entry;
  } else {
    history.unshift(entry);
  }
  if (history.length > 60) {
    history.length = 60;
  }
}

function persistDiet() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(dietState));
  } catch {
    /* ignore */
  }
}

let dietState = loadDietState();

function countDone() {
  return CHECKABLE.filter((id) => dietState.today.done[id]).length;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDayLabel(dayKey) {
  const d = new Date(dayKey + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function renderDietProgress() {
  const el = document.getElementById("diet-progress-text");
  const bar = document.getElementById("diet-progress-bar");
  if (!el || !bar) {
    return;
  }
  const done = countDone();
  const total = CHECKABLE.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  el.textContent = done + " de " + total + " refei\u00e7\u00f5es";
  bar.style.width = pct + "%";
  const track = bar.parentElement;
  if (track) {
    track.setAttribute("aria-valuenow", String(pct));
  }
}

function renderMealBlocks(blocks, tip) {
  let html = "";
  for (const b of blocks) {
    html += `<div class="diet-block">`;
    html += `<div class="diet-block__label">${escapeHtml(b.label)}</div>`;
    if (b.choice) {
      html += `<ul class="diet-block__choices">`;
      for (const line of b.lines) {
        html += `<li>${escapeHtml(line)}</li>`;
      }
      html += `</ul>`;
    } else {
      for (const line of b.lines) {
        html += `<p class="diet-block__line">${escapeHtml(line)}</p>`;
      }
    }
    html += `</div>`;
  }
  if (tip) {
    html += `<p class="diet-meal__tip">${escapeHtml(tip)}</p>`;
  }
  return html;
}

function renderDietMeals() {
  const list = document.getElementById("diet-meal-list");
  if (!list) {
    return;
  }
  list.replaceChildren();
  for (const meal of DIET_PLAN.meals) {
    const card = document.createElement("article");
    const checkable = meal.checkable !== false;
    const isDone = checkable && dietState.today.done[meal.id];
    card.className = "card diet-meal" + (isDone ? " diet-meal--done" : "") + (checkable ? "" : " diet-meal--info");
    card.dataset.mealId = meal.id;

    const head = document.createElement("div");
    head.className = "diet-meal__head";
    head.innerHTML = `
      <div class="diet-meal__meta">
        <span class="diet-meal__time">${escapeHtml(meal.time)}</span>
        ${meal.context ? `<span class="diet-meal__context">${escapeHtml(meal.context)}</span>` : ""}
      </div>
      <h3 class="diet-meal__title">${escapeHtml(meal.label)}</h3>
      ${meal.intro ? `<p class="diet-meal__intro">${escapeHtml(meal.intro)}</p>` : ""}
    `;
    card.appendChild(head);

    const body = document.createElement("div");
    body.className = "diet-meal__body";
    body.innerHTML = renderMealBlocks(meal.blocks, meal.tip);
    card.appendChild(body);

    if (checkable) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn diet-meal__toggle" + (isDone ? " diet-meal__toggle--done" : "");
      btn.setAttribute("aria-pressed", isDone ? "true" : "false");
      btn.textContent = isDone ? "Feito \u2713" : "Marcar como feito";
      btn.addEventListener("click", () => {
        dietState.today.done[meal.id] = !dietState.today.done[meal.id];
        persistDiet();
        renderDiet();
        if (host && countDone() === CHECKABLE.length) {
          host.showToast("Todas as refei\u00e7\u00f5es do dia marcadas.", { variant: "success" });
        }
      });
      card.appendChild(btn);
    }

    list.appendChild(card);
  }
}

function renderDietHistory() {
  const ul = document.getElementById("diet-history-list");
  const empty = document.getElementById("diet-history-empty");
  if (!ul || !empty) {
    return;
  }
  ul.replaceChildren();
  const items = dietState.history.filter((h) => h && h.dayKey);
  empty.hidden = items.length > 0;
  for (const h of items) {
    const li = document.createElement("li");
    li.className = "history-item diet-history-item";
    const pct = h.total ? Math.round((h.doneIds.length / h.total) * 100) : 0;
    const chipClass = pct >= 50 ? "history-item__chip" : "history-item__chip history-item__chip--muted";
    li.innerHTML = `
      <div class="history-item__top">
        <span class="history-item__date">${escapeHtml(formatDayLabel(h.dayKey))}</span>
        <span class="${chipClass}">${h.doneIds.length}/${h.total}</span>
      </div>
      <p class="history-item__preview">${escapeHtml(h.doneIds.length + " refei\u00e7\u00f5es marcadas")}</p>
    `;
    ul.appendChild(li);
  }
}

export function renderDiet() {
  dietState = loadDietState();
  const dateEl = document.getElementById("diet-date-label");
  if (dateEl) {
    dateEl.textContent = formatDayLabel(dietState.today.dayKey);
  }
  renderDietProgress();
  renderDietMeals();
  renderDietHistory();
}

export function showDietMain() {
  const main = document.getElementById("diet-main-view");
  const hist = document.getElementById("diet-history-view");
  if (main) {
    main.hidden = false;
  }
  if (hist) {
    hist.hidden = true;
  }
}

export function showDietHistory() {
  renderDietHistory();
  const main = document.getElementById("diet-main-view");
  const hist = document.getElementById("diet-history-view");
  if (main) {
    main.hidden = true;
  }
  if (hist) {
    hist.hidden = false;
  }
}

export function initDietUi(deps) {
  host = deps;
  document.getElementById("btn-diet-back")?.addEventListener("click", showDietMain);
  renderDiet();
}

export function refreshDietOnShow() {
  dietState = loadDietState();
  renderDiet();
}

export function isDietHistoryVisible() {
  const hist = document.getElementById("diet-history-view");
  return hist && !hist.hidden;
}
