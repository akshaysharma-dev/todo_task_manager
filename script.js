const STORAGE_KEY = "tasks-v1";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const errorMsg = document.getElementById("errorMsg");
const taskList = document.getElementById("taskList");
const emptyMsg = document.getElementById("emptyMsg");
const filtersEl = document.getElementById("filters");
const pill = document.getElementById("pill");
const clearBtn = document.getElementById("clearCompleted");
const ringFg = document.getElementById("ringFg");
const ringText = document.getElementById("ringText");

let tasks = loadTasks();
let currentFilter = "all";
let editingId = null;
let animateIds = new Set(tasks.map(t => t.id)); // stagger-in on first load
let firstRender = true;

// ---------- Storage ----------
function loadTasks() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
}

// ---------- Actions ----------
function addTask(text, priority) {
  const task = { id: Date.now().toString(), text, priority, completed: false };
  tasks.unshift(task);
  animateIds = new Set([task.id]);
  saveTasks();
  render();
}

function toggleTask(id, originEl) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.completed = !t.completed;
  if (t.completed && originEl) burstConfetti(originEl);
  saveTasks();
  // short delay so the checkbox animation is visible before re-render
  setTimeout(render, 280);
}

function deleteTask(id, li) {
  li.classList.add("removing");
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    animateIds = new Set();
    render();
  }, 380);
}

function updateTask(id, newText) {
  const text = newText.trim();
  if (text) {
    const t = tasks.find(t => t.id === id);
    if (t) t.text = text;
  }
  editingId = null;
  saveTasks();
  animateIds = new Set();
  render();
}

// ---------- Rendering ----------
function render() {
  const visible = tasks.filter(t =>
    currentFilter === "all" ? true :
    currentFilter === "active" ? !t.completed : t.completed
  );

  taskList.innerHTML = "";

  visible.forEach((task, i) => {
    const li = document.createElement("li");
    li.className = "task " + task.priority + (task.completed ? " done" : "");
    if (animateIds.has(task.id)) {
      li.classList.add("enter");
      li.style.setProperty("--d", (firstRender ? i * 0.07 : 0) + "s");
    }

    li.appendChild(makeCheckbox(task));

    if (editingId === task.id) {
      const edit = document.createElement("input");
      edit.type = "text";
      edit.className = "task-edit";
      edit.value = task.text;
      edit.maxLength = 120;
      edit.addEventListener("keydown", e => {
        if (e.key === "Enter") updateTask(task.id, edit.value);
        if (e.key === "Escape") { editingId = null; animateIds = new Set(); render(); }
      });
      li.appendChild(edit);
      setTimeout(() => edit.focus(), 0);

      const saveBtn = makeBtn("💾", "Save", () => updateTask(task.id, edit.value));
      li.appendChild(wrapActions(true, saveBtn));
    } else {
      const span = document.createElement("span");
      span.className = "task-text";
      span.textContent = task.text; // textContent avoids HTML injection
      li.appendChild(span);

      const editBtn = makeBtn("✏️", "Edit", () => { editingId = task.id; animateIds = new Set(); render(); });
      const delBtn = makeBtn("🗑️", "Delete", () => deleteTask(task.id, li));
      delBtn.classList.add("del");
      li.appendChild(wrapActions(false, editBtn, delBtn));
    }

    taskList.appendChild(li);
  });

  animateIds = new Set();
  firstRender = false;
  emptyMsg.classList.toggle("show", visible.length === 0);
  updateStats();
}

function makeCheckbox(task) {
  const label = document.createElement("label");
  label.className = "check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = task.completed;
  input.setAttribute("aria-label", "Mark task complete");
  input.addEventListener("change", () => toggleTask(task.id, label));
  const box = document.createElement("span");
  box.className = "box";
  box.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  label.appendChild(input);
  label.appendChild(box);
  return label;
}

function makeBtn(label, title, handler) {
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.textContent = label;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.addEventListener("click", handler);
  return b;
}

function wrapActions(alwaysVisible, ...btns) {
  const div = document.createElement("div");
  div.className = "task-actions";
  if (alwaysVisible) { div.style.opacity = 1; div.style.transform = "none"; }
  btns.forEach(b => div.appendChild(b));
  return div;
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.classList.remove("bump");
    void el.offsetWidth; // restart animation
    el.classList.add("bump");
  }
}

function updateStats() {
  const done = tasks.filter(t => t.completed).length;
  setStat("statTotal", tasks.length);
  setStat("statActive", tasks.length - done);
  setStat("statDone", done);

  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  ringText.textContent = pct + "%";
  ringFg.style.strokeDashoffset = 113.1 - (113.1 * pct) / 100;
}

// ---------- Sliding filter pill ----------
function movePill() {
  const active = filtersEl.querySelector(".filter-btn.active");
  pill.style.width = active.offsetWidth + "px";
  pill.style.transform = "translateX(" + (active.offsetLeft - 5) + "px)";
}

// ---------- Confetti ----------
function burstConfetti(el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ["#7c5cff", "#22d3ee", "#34d399", "#fbbf24", "#fb7185"];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("span");
    p.className = "confetti";
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--x", Math.cos(angle) * dist + "px");
    p.style.setProperty("--y", Math.sin(angle) * dist + "px");
    p.style.setProperty("--r", Math.random() * 540 + "deg");
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 950);
  }
}

// ---------- Events ----------
taskForm.addEventListener("submit", e => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) {
    errorMsg.textContent = "Please type a task before adding.";
    taskForm.classList.remove("shake");
    void taskForm.offsetWidth;
    taskForm.classList.add("shake");
    return;
  }
  errorMsg.textContent = "";
  addTask(text, priorityInput.value);
  taskInput.value = "";
  taskInput.focus();
});

filtersEl.addEventListener("click", e => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  filtersEl.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b === btn));
  movePill();
  animateIds = new Set(tasks.map(t => t.id)); // replay entrance when switching filter
  render();
});

clearBtn.addEventListener("click", () => {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  animateIds = new Set();
  render();
});

window.addEventListener("resize", movePill);

// ---------- Init ----------
const hour = new Date().getHours();
document.getElementById("greeting").textContent =
  hour < 12 ? "Good morning 👋" : hour < 17 ? "Good afternoon 👋" : "Good evening 👋";
document.getElementById("today").textContent =
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

render();
requestAnimationFrame(movePill);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
