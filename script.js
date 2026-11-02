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
const GOAL = 10000;
const PROFILE_KEY = "paso-a-paso-profile";
const THEME_KEY = "paso-a-paso-theme";
const today = new Date();
const dateKey = (date) => date.toISOString().slice(0, 10);
const todayKey = dateKey(today);
const formatSteps = (value) => new Intl.NumberFormat("es-ES").format(value);
const initials = (name) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let stepsData = [];
let activePerson = localStorage.getItem(PROFILE_KEY);
let activePeriod = "day";

function showMessage(message, isError = false) {
  const element = document.querySelector("#form-message");
  element.textContent = message;
  element.classList.toggle("error", isError);
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
  const percentage = Math.min(100, Math.round((steps / GOAL) * 100));
  document.querySelector("#personal-today").textContent = formatSteps(steps);
  document.querySelector("#goal-progress").textContent = `${percentage}%`;
  document.querySelector("#personal-progress").style.width = `${percentage}%`;
}

function renderRanking() {
  const start = periodStart(activePeriod);
  const scores = PEOPLE.map((name) => ({ name, steps: sumFor(name, start) }))
    .sort((a, b) => b.steps - a.steps);
  const max = Math.max(scores[0].steps, 1);
  document.querySelector("#ranking-list").innerHTML = scores.map(({ name, steps }, index) =>
    `<div class="ranking-row">
      <span class="rank-number ${index < 3 ? "top" : ""}">0${index + 1}</span>
      <span class="rank-person"><span class="mini-avatar">${initials(name)}</span>${name}${name === activePerson ? " · tú" : ""}</span>
      <span class="rank-bar"><span style="width:${Math.round((steps / max) * 100)}%"></span></span>
      <span class="rank-steps">${formatSteps(steps)}<small>pasos</small></span>
    </div>`).join("");
}

function renderDashboard() {
  if (!activePerson) return;
  renderPersonalStats();
  renderRanking();
}

function subscribeToSteps() {
  onSnapshot(collection(db, "steps"), (snapshot) => {
    stepsData = snapshot.docs.map((step) => step.data()).filter((step) =>
      PEOPLE.includes(step.person) && typeof step.date === "string" && Number.isFinite(step.steps));
    renderDashboard();
  }, (error) => {
    console.error("No se pudieron cargar los pasos de Firestore.", error);
    showMessage("No se han podido cargar los pasos. Revisa la configuración de Firestore.", true);
  });
}

document.querySelector("#change-person").addEventListener("click", () => {
  document.querySelector("#dashboard").classList.add("hidden");
  document.querySelector("#welcome-screen").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll(".period-tab").forEach((tab) => tab.addEventListener("click", () => {
  activePeriod = tab.dataset.period;
  document.querySelectorAll(".period-tab").forEach((item) => item.classList.toggle("active", item === tab));
  renderRanking();
}));

document.querySelector("#steps-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const person = document.querySelector("#person-select").value;
  const date = document.querySelector("#steps-date").value;
  const steps = Number(document.querySelector("#steps-input").value);
  if (!date || steps < 0 || !Number.isInteger(steps) || steps > 200000) {
    showMessage("Introduce un número entero de pasos entre 0 y 200.000.", true);
    return;
  }
  try {
    await setDoc(doc(db, "steps", `${person}-${date}`), {
      person, date, steps, updatedAt: serverTimestamp()
    });
    document.querySelector("#steps-input").value = "";
    showMessage(`Guardado: ${formatSteps(steps)} pasos para ${person}.`);
    if (person !== activePerson) selectPerson(person);
  } catch (error) {
    console.error("No se pudieron guardar los pasos en Firestore.", error);
    showMessage("No se han podido guardar los pasos. Inténtalo de nuevo.", true);
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
document.documentElement.dataset.theme = localStorage.getItem(THEME_KEY) || "light";
renderPeople();
renderPersonSelect();
subscribeToSteps();
if (activePerson && PEOPLE.includes(activePerson)) selectPerson(activePerson);
