const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const els = {
  form: $("#taskForm"),
  title: $("#title"),
  due: $("#due"),
  clearCompleted: $("#clearCompleted"),

  taskList: $("#taskList"),
  template: $("#taskTemplate"),
  emptyState: $("#emptyState"),

  statTotal: $("#statTotal"),
  statDone: $("#statDone"),
  statOverdue: $("#statOverdue"),

  filterButtons: $$(".seg[data-filter]"),
};

const STORAGE_KEY = "kawaii_todo_v1";

/** @typedef {{id:string,title:string,due?:string|null,done:boolean,createdAt:number}} Task */

/** @type {Task[]} */
let tasks = loadTasks();
let activeFilter = "all";

function uid() {
  return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function normalizeDue(value) {
  if (!value) return null;
  // value from <input type="date"> is YYYY-MM-DD
  return value;
}

function todayLocalISODate() {
  // Local date to match <input type="date"> semantics
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isOverdue(task) {
  if (task.done) return false;
  if (!task.due) return false;
  // Overdue if due date is strictly before today
  return task.due < todayLocalISODate();
}

function filteredTasks() {
  const list = [...tasks];
  switch (activeFilter) {
    case "active":
      return list.filter((t) => !t.done);
    case "done":
      return list.filter((t) => t.done);
    case "overdue":
      return list.filter((t) => isOverdue(t));
    case "all":
    default:
      return list;
  }
}

function formatDueLabel(task) {
  if (!task.due) return "No due date";
  const isOver = isOverdue(task);
  if (task.done) return `Due: ${task.due}`;
  if (isOver) return `Due: ${task.due} (overdue)`;
  return `Due: ${task.due}`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
      .map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due ?? null,
        done: Boolean(t.done),
        createdAt: Number(t.createdAt ?? Date.now()),
      }));
  } catch {
    return [];
  }
}

function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  els.statTotal.textContent = String(total);
  els.statDone.textContent = String(done);
  els.statOverdue.textContent = String(overdue);
}

function render() {
  const list = filteredTasks();
  els.taskList.innerHTML = "";

  // Empty state
  if (list.length === 0) {
    els.emptyState.style.display = "block";
  } else {
    els.emptyState.style.display = "none";
  }

  // Sort: overdue first, then active, then done; within buckets by due desc? cute: soonest first
  const sorted = [...list].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;
    // done last
    if (a.done !== b.done) return a.done ? 1 : -1;
    // due soonest
    const ad = a.due ?? "9999-12-31";
    const bd = b.due ?? "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.createdAt - b.createdAt;
  });

  for (const task of sorted) {
    els.taskList.appendChild(createTaskNode(task));
  }

  updateStats();
}

function createTaskNode(task) {
  const frag = els.template.content.cloneNode(true);
  const li = frag.querySelector("li.task");

  li.dataset.id = task.id;
  const signText = frag.querySelector(".signText");
  const titleEl = frag.querySelector(".title");
  const dueEl = frag.querySelector(".due");

  signText.textContent = task.title;
  titleEl.textContent = task.title;
  dueEl.textContent = formatDueLabel(task);

  // State classes
  const over = isOverdue(task);
  if (task.done) li.classList.add("isDone");
  if (over) li.classList.add("isOverdue");

  // Controls
  const check = frag.querySelector(".doneToggle");
  const label = frag.querySelector(".checkLabel");
  const deleteBtn = frag.querySelector("[data-action='delete']");

  check.checked = task.done;
  label.textContent = task.done ? "Done" : "Done";

  check.addEventListener("change", () => {
    task.done = check.checked;
    persist();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    persist();
    render();
  });

  // Animate cheer based on transition handled by CSS class; if just rendered and done, it will pop.
  return li;
}

function setFilter(next) {
  activeFilter = next;
  for (const b of els.filterButtons) {
    const pressed = b.dataset.filter === activeFilter;
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  render();
}

// Events
els.form.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = els.title.value.trim();
  const due = normalizeDue(els.due.value);

  if (!title) return;

  const task = {
    id: uid(),
    title,
    due,
    done: false,
    createdAt: Date.now(),
  };

  tasks.unshift(task);
  persist();

  els.form.reset();
  render();

  // Put focus back for quick adding
  els.title.focus();
});

els.clearCompleted.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  persist();
  render();
});

for (const b of els.filterButtons) {
  b.addEventListener("click", () => {
    setFilter(b.dataset.filter);
  });
}

// Initial render
render();

