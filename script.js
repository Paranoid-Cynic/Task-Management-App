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

  // Timer UI
  timerTime: $("#timerTime"),
  timerPhase: $("#timerPhase"),
  timerEmoji: $("#timerEmoji"),
  timerStart: $("#timerStart"),
  timerPause: $("#timerPause"),

  timerMinutes: $("#timerMinutes"),
  timerMinutesLabel: $("#timerMinutesLabel"),
  timerModeButtons: $$(".timerModes .timerSeg[data-mode]"),
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

// ---- Kawaii Focus Timer ----
const TIMER_KEY = "kawaii_focus_timer_v1";

let timer = loadTimer();
let timerInterval = null;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function secondsToClock(totalSeconds) {
  totalSeconds = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function defaultTimerState() {
  return {
    durationMinutes: 25,
    phase: "focus", // focus | break (we keep cozy single-phase, but show label)
    running: false,
    // For running timers
    startedAtMs: null,
    // For accurate remaining
    endsAtMs: null,
  };
}

function loadTimer() {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return defaultTimerState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultTimerState();
    return {
      ...defaultTimerState(),
      ...parsed,
    };
  } catch {
    return defaultTimerState();
  }
}

function persistTimer() {
  localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}

function currentRemainingSeconds() {
  if (timer.running && timer.endsAtMs) {
    const msLeft = timer.endsAtMs - Date.now();
    return Math.max(0, Math.ceil(msLeft / 1000));
  }
  if (!timer.running) {
    // When paused, resume from the exact stored remainingSeconds.
    const rem = Number(timer.remainingSeconds);
    if (Number.isFinite(rem) && rem >= 0) return Math.floor(rem);
    // Fallback
    return Math.max(0, Math.floor((timer.durationMinutes || 25) * 60));
  }
  return 0;
}



function setTimerDuration(minutes) {
  const nextMinutes = clamp(Number(minutes) || 25, 5, 60);
  timer.durationMinutes = nextMinutes - (nextMinutes % 5);
  // If not running, update immediately. If running, reset for simplicity.
  resetTimer(false);
  persistTimer();
}

function resetTimer(keepRunning) {
  stopTimer();
  const durationMinutes = timer.durationMinutes || 25;
  timer.running = Boolean(keepRunning);
  timer.startedAtMs = null;
  timer.endsAtMs = null;
  renderTimer(durationMinutes * 60, timer.running ? "Focus" : "Ready");
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timer.running = false;
  timer.startedAtMs = null;
  timer.endsAtMs = null;
}

function renderTimer(secondsLeft, phaseLabel) {
  const clock = els.timerTime;
  if (clock) clock.textContent = secondsToClock(secondsLeft);

  const emoji = els.timerEmoji;
  const phaseEl = els.timerPhase;
  if (phaseEl) phaseEl.textContent = phaseLabel;

  // Mood based on remaining
  const remaining = secondsLeft;
  if (emoji) {
    if (remaining <= 5) emoji.textContent = "(˶˃ ᵕ ˂˶)";
    else if (remaining <= 60) emoji.textContent = "(っ◔◡◔)っ";
    else emoji.textContent = "(っ•ᴥ•)っ";
  }
}

function startTimer() {
  // If resuming from paused state, use remainingSeconds. Otherwise use selected duration.
  stopTimer();

  const remainingFromPause = timer.remainingSeconds;
  const durationSeconds =
    timer.running || (timer.endsAtMs && timer.endsAtMs > Date.now())
      ? (timer.durationMinutes || 25) * 60
      : Number.isFinite(Number(remainingFromPause)) && Number(remainingFromPause) > 0
        ? Math.floor(Number(remainingFromPause))
        : (timer.durationMinutes || 25) * 60;

  timer.running = true;
  timer.startedAtMs = Date.now();
  timer.endsAtMs = timer.startedAtMs + durationSeconds * 1000;

  // When we start, clear any stored remainingSeconds and let endsAtMs drive time.
  timer.remainingSeconds = null;

  persistTimer();
  renderTimer(durationSeconds, "Focus");

  timerInterval = setInterval(() => {
    const left = currentRemainingSeconds();
    renderTimer(left, timer.running ? "Focus" : "Ready");

    if (left <= 0) {
      stopTimer();
      persistTimer();
      onTimerDone();
      renderTimer(0, "Time!");
    }
  }, 250);
}


function onTimerDone() {
  // Cheer: briefly toggle all done animations by adding done class to overdue? Instead do a global flash.
  const originalTitle = document.title;
  document.title = "Time! 🎉🩷";

  // Little kawaii effect: pulse background gradients via body class
  document.body.classList.add("timerDonePulse");
  setTimeout(() => {
    document.body.classList.remove("timerDonePulse");
    document.title = originalTitle;
  }, 1200);

  // Also make due/active bunnies cheer by temporarily forcing .cheer visibility.
  for (const li of $$("#taskList .task")) {
    if (li.classList.contains("isDone")) continue;
    const cheer = li.querySelector(".cheer");
    if (!cheer) continue;
    cheer.style.opacity = "1";
    cheer.style.transform = "translateY(0)";
    cheer.style.animation = "pop .6s ease both";
    setTimeout(() => {
      cheer.style.opacity = "0";
      cheer.style.transform = "translateY(6px)";
      cheer.style.animation = "";
    }, 650);
  }
}

function syncTimerUI() {
  // Range
  if (els.timerMinutes) {
    els.timerMinutes.value = String(timer.durationMinutes || 25);
  }
  if (els.timerMinutesLabel) {
    els.timerMinutesLabel.textContent = String(timer.durationMinutes || 25);
  }

  // Mode buttons aria-pressed
  if (els.timerModeButtons) {
    for (const b of els.timerModeButtons) {
      const m = Number(b.dataset.mode === "focus" ? 25 : b.dataset.mode === "short" ? 5 : 15);
      const pressed = m === (timer.durationMinutes || 25);
      b.setAttribute("aria-pressed", pressed ? "true" : "false");
    }
  }

  const left = currentRemainingSeconds();
  renderTimer(left, timer.running ? "Focus" : "Ready");

  if (els.timerPause) els.timerPause.disabled = !timer.running;
}

// Events
if (els.timerModeButtons) {
  for (const b of els.timerModeButtons) {
    b.addEventListener("click", () => {
      // Map modes to minutes
      const nextMinutes = b.dataset.mode === "focus" ? 25 : b.dataset.mode === "short" ? 5 : 15;
      setTimerDuration(nextMinutes);
      syncTimerUI();

      // Focus the button for accessibility
      b.blur();
    });
  }
}

if (els.timerMinutes) {
  els.timerMinutes.addEventListener("input", () => {
    const v = Number(els.timerMinutes.value);
    const snapped = v - (v % 5);
    timer.durationMinutes = clamp(snapped, 5, 60);
    if (els.timerMinutesLabel) els.timerMinutesLabel.textContent = String(timer.durationMinutes);
    // If running, reset to keep it simple/coherent.
    if (timer.running) {
      resetTimer(false);
    } else {
      renderTimer(timer.durationMinutes * 60, "Ready");
    }
    persistTimer();
  });
}

if (els.timerStart) {
  els.timerStart.addEventListener("click", () => {
    if (timer.running) return;
    startTimer();
    syncTimerUI();
  });
}

if (els.timerPause) {
  els.timerPause.addEventListener("click", () => {
    // Pause: keep remaining time exactly. Do NOT snap/round to slider increments.
    if (!timer.running) return;

    const leftSeconds = currentRemainingSeconds();
    stopTimer();

    // Store remaining as a "durationMinutes" that is consistent with the remaining seconds.
    // We use minutes with resolution of 1 minute, but preserve seconds rounding behavior via seconds->clock.
    // Store remaining seconds exactly so Resume continues from the exact paused moment.
    // We keep durationMinutes for the slider label, but we also store exact remainingSeconds.
    timer.remainingSeconds = leftSeconds;
    timer.running = false;
    persistTimer();

    // Keep exact remaining time for pause/resume.
    // Use durationMinutes only for UI label/slider; do not let it affect the resume seconds.
    const approxMinutes = clamp(Math.round(leftSeconds / 60), 5, 60);
    const snapped = approxMinutes - (approxMinutes % 5) || 5;
    timer.durationMinutes = snapped;

    if (els.timerMinutes) {
      els.timerMinutes.value = String(timer.durationMinutes);
    }
    if (els.timerMinutesLabel) els.timerMinutesLabel.textContent = String(timer.durationMinutes);



    syncTimerUI();
  });
}





// Start initial timer render
syncTimerUI();



