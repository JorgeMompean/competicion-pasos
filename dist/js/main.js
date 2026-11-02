import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const PEOPLE = ["Jorge", "Gema", "José", "Rosalia", "Manuel Andrés", "Jose Antonio", "Pablo"];
const KM_PER_STEP = 0.00075;
const PROFILE_KEY = "paso-a-paso-profile";
const THEME_KEY = "paso-a-paso-theme";
const today = new Date();
const dateKey = (date) => date.toISOString().slice(0, 10);
const todayKey = dateKey(today);
const formatSteps = (value) => new Intl.NumberFormat("es-ES").format(value);
const formatDistance = (steps) => new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(steps * KM_PER_STEP);
const initials = (name) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let stepsData = [];
let activePerson = localStorage.getItem(PROFILE_KEY);
let activePeriod = "day";
let editingEntry = null;

function showMessage(message, isError = false) {
  const element = document.querySelector("#form-message");
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function permissionMessage() {
  return "Firestore ha rechazado la operación. Publica firestore.rules en el proyecto competicion-pasos y vuelve a cargar la página.";
}

function sumFor(name, start, end = todayKey) {
  return stepsData.reduce((total, entry) =>
    entry.person === name && entry.date >= start && entry.date <= end ? total + entry.steps : total, 0);
}

function periodStart(period) {
  if (period === "day") return todayKey;
  if (period === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return dateKey(start);
  }
  return "0000-01-01";
}

function renderPeople() {
  document.querySelector("#people-grid").innerHTML = PEOPLE.map((name) =>
    `<button class="person-card" type="button" data-person="${name}">
      <span class="avatar">${initials(name)}</span><span class="person-name">${name}</span>
    </button>`).join("");
  document.querySelectorAll(".person-card").forEach((button) =>
    button.addEventListener("click", () => selectPerson(button.dataset.person)));
}

function selectPerson(name) {
  activePerson = name;
  localStorage.setItem(PROFILE_KEY, name);
  document.querySelector("#change-person").classList.remove("hidden");
  document.querySelector("#welcome-screen").classList.add("hidden");
  document.querySelector("#dashboard").classList.remove("hidden");
  document.querySelector("#current-person").textContent = name;
  document.querySelector("#person-select").value = name;
  renderDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPersonSelect() {
  document.querySelector("#person-select").innerHTML =
    PEOPLE.map((name) => `<option value="${name}">${name}</option>`).join("");
  document.querySelector("#person-select").value = activePerson || PEOPLE[0];
}

function renderPersonalStats() {
  const steps = sumFor(activePerson, todayKey);
  document.querySelector("#personal-today").textContent = formatSteps(steps);
  document.querySelector("#personal-distance").textContent = `${formatDistance(steps)} km aprox.`;
}

function renderRanking() {
  const start = periodStart(activePeriod);
  const scores = PEOPLE.map((name) => ({ name, steps: sumFor(name, start) }))
    .sort((a, b) => b.steps - a.steps);
  const max = Math.max(scores[0].steps, 1);
  document.querySelector("#ranking-list").innerHTML = scores.map(({ name, steps }, index) =>
    `<div class="ranking-row rank-${index + 1}">
      <span class="rank-number ${index < 3 ? "top" : ""}">0${index + 1}</span>
      <span class="rank-person"><span class="mini-avatar">${initials(name)}</span>${name}${name === activePerson ? " · tú" : ""}</span>
      <span class="rank-bar"><span style="width:${Math.round((steps / max) * 100)}%"></span></span>
      <span class="rank-steps">${formatSteps(steps)} <small>pasos · ${formatDistance(steps)} km aprox.</small></span>
      ${index === scores.length - 1 ? '<span class="lazy-badge">Más vago</span>' : ""}
    </div>`).join("");
}

function renderDashboard() {
  if (!activePerson) return;
  renderPersonalStats();
  renderRanking();
  renderHistory();
}

function renderHistory() {
  const entries = stepsData.filter((entry) => entry.person === activePerson)
    .sort((a, b) => b.date.localeCompare(a.date));
  const historyList = document.querySelector("#history-list");
  document.querySelector("#empty-history").classList.toggle("hidden", entries.length > 0);
  historyList.innerHTML = entries.map((entry) => `
    <div class="history-row">
      <span class="history-date">${new Intl.DateTimeFormat("es-ES", {
        day: "numeric", month: "short", year: "numeric"
      }).format(new Date(`${entry.date}T12:00:00`))}</span>
      <span class="history-steps">${formatSteps(entry.steps)} <small>pasos · ${formatDistance(entry.steps)} km aprox.</small></span>
      <button class="edit-entry" type="button" data-entry-id="${entry.id}" aria-label="Editar entrada del ${entry.date}">↗</button>
    </div>`).join("");
  historyList.querySelectorAll(".edit-entry").forEach((button) =>
    button.addEventListener("click", () => openModal(button.dataset.entryId)));
}

function subscribeToSteps() {
  onSnapshot(collection(db, "steps"), (snapshot) => {
    stepsData = snapshot.docs.map((step) => ({ id: step.id, ...step.data() })).filter((step) =>
      PEOPLE.includes(step.person) && typeof step.date === "string" && Number.isFinite(step.steps));
    renderDashboard();
  }, (error) => {
    console.error("No se pudieron cargar los pasos de Firestore.", error);
    showMessage(error.code === "permission-denied" ? permissionMessage() :
      "No se han podido cargar los pasos. Revisa la configuración de Firestore.", true);
  });
}

document.querySelector("#change-person").addEventListener("click", () => {
  document.querySelector("#dashboard").classList.add("hidden");
  document.querySelector("#welcome-screen").classList.remove("hidden");
  document.querySelector("#change-person").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll(".period-tab").forEach((tab) => tab.addEventListener("click", () => {
  activePeriod = tab.dataset.period;
  document.querySelectorAll(".period-tab").forEach((item) => item.classList.toggle("active", item === tab));
  renderRanking();
}));

function openModal(entryId = null) {
  editingEntry = entryId ? stepsData.find((entry) => entry.id === entryId) : null;
  const modal = document.querySelector("#steps-modal");
  const form = document.querySelector("#steps-form");
  document.querySelector("#modal-title").textContent = editingEntry ? "Editar datos" : "Añadir datos";
  document.querySelector("#modal-submit span:first-child").textContent = editingEntry ? "Guardar cambios" : "Guardar pasos";
  document.querySelector("#person-select").value = editingEntry?.person || activePerson || PEOPLE[0];
  document.querySelector("#steps-date").value = editingEntry?.date || todayKey;
  document.querySelector("#steps-input").value = editingEntry?.steps ?? "";
  document.querySelector("#person-select").disabled = Boolean(editingEntry);
  document.querySelector("#steps-date").disabled = Boolean(editingEntry);
  showMessage("");
  modal.classList.remove("hidden");
  document.querySelector("#steps-input").focus();
  form.querySelector("button[type='submit']").disabled = false;
}

function closeModal() {
  document.querySelector("#steps-modal").classList.add("hidden");
  editingEntry = null;
}

document.querySelector("#open-add-modal").addEventListener("click", () => openModal());
document.querySelector("#close-modal").addEventListener("click", closeModal);
document.querySelector("#steps-modal").addEventListener("click", (event) => {
  if (event.target.id === "steps-modal") closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("#steps-modal").classList.contains("hidden")) closeModal();
});

document.querySelector("#steps-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const person = document.querySelector("#person-select").value;
  const date = document.querySelector("#steps-date").value;
  const steps = Number(document.querySelector("#steps-input").value);
  if (!date || steps < 0 || !Number.isInteger(steps) || steps > 200000) {
    showMessage("Introduce un número entero de pasos entre 0 y 200.000.", true);
    return;
  }
  const existingEntry = stepsData.find((entry) => entry.person === person && entry.date === date);
  if (existingEntry && !editingEntry) {
    showMessage("Ya existe una entrada para esa persona y fecha. Puedes editarla desde el historial.", true);
    return;
  }
  try {
    await setDoc(doc(db, "steps", `${person}-${date}`), {
      person, date, steps, updatedAt: serverTimestamp()
    });
    document.querySelector("#steps-input").value = "";
    showMessage(`Guardado: ${formatSteps(steps)} pasos para ${person}.`);
    closeModal();
    if (person !== activePerson) selectPerson(person);
  } catch (error) {
    console.error("No se pudieron guardar los pasos en Firestore.", error);
    showMessage(error.code === "permission-denied" ? permissionMessage() :
      "No se han podido guardar los pasos. Inténtalo de nuevo.", true);
  }
});

document.querySelector("#theme-toggle").addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
});

const topButton = document.querySelector("#back-to-top");
window.addEventListener("scroll", () => topButton.classList.toggle("visible", window.scrollY > 420), { passive: true });
topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

document.querySelector("#steps-date").value = todayKey;
document.querySelector("#footer-year").textContent = new Date().getFullYear();
document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || "dark";
renderPeople();
renderPersonSelect();
subscribeToSteps();
if (activePerson && PEOPLE.includes(activePerson)) selectPerson(activePerson);
