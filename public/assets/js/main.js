import {
  setupNavigationObserver,
  setupProcessFade,
  setupRevealAnimations,
  setupTelemetry,
} from "./animations.js";
import { setupHiddenAdminEntry } from "./admin-entry.js";
import { setupPointerEffects } from "./effects.js";
import { setupSystemInterface, setupTechnicalCursor } from "./interface-effects.js";
import { setupMobileEffects } from "./mobile-effects.js";
import { createProjectModal } from "./modal.js";
import { loadProjects, renderProjectError, renderProjects } from "./projects.js";
import { getSavedLanguage, saveLanguage } from "./utils.js";

document.documentElement.classList.add("js-enabled");

const processSection = document.querySelector("#process");
const projectsSection = document.querySelector("#projects");
const telemetrySection = document.querySelector(".telemetry-section");
const projectGrid = document.querySelector("#project-grid");
const languageButtons = [...document.querySelectorAll("[data-language]")];
const menuToggle = document.querySelector(".menu-toggle");
const navList = document.querySelector(".nav-list");
const navLinks = [...document.querySelectorAll(".nav-list a")];
const sections = [...document.querySelectorAll("main section[id]")];
const telemetryCounters = [...document.querySelectorAll(".metric-value[data-target]")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let currentLanguage = getSavedLanguage();
let projects = [];

setupTechnicalCursor(reducedMotion);
setupSystemInterface(reducedMotion);
setupHiddenAdminEntry();

if (processSection && projectsSection && telemetrySection) {
  projectsSection.before(processSection, telemetrySection);
}

const modal = createProjectModal({
  projectGrid,
  getLanguage: () => currentLanguage,
});

function renderTelemetryValue(counter, value) {
  const prefix = counter.dataset.prefix || "";
  const suffix = currentLanguage === "en" ? counter.dataset.suffixEn : counter.dataset.suffixRu;
  const precision = Number.parseInt(counter.dataset.precision || "0", 10);
  const multiplier = 10 ** precision;
  const roundedValue = Math.max(0, Math.round(value * multiplier) / multiplier);
  counter.dataset.currentValue = String(roundedValue);
  counter.textContent = `${prefix}${roundedValue.toFixed(precision)}${suffix || ""}`;
}

/** Applies the selected locale to static and API-rendered content. */
function applyLanguage(language, persist = false) {
  currentLanguage = language === "en" ? "en" : "ru";
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-ru][data-en]").forEach((element) => {
    element.textContent = element.getAttribute(`data-${currentLanguage}`);
  });

  ["aria-label", "content"].forEach((attribute) => {
    document
      .querySelectorAll(`[data-ru-${attribute}][data-en-${attribute}]`)
      .forEach((element) => {
        element.setAttribute(attribute, element.getAttribute(`data-${currentLanguage}-${attribute}`));
      });
  });

  languageButtons.forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll(".glitch-title").forEach((element) => {
    element.dataset.text = element.textContent;
  });
  telemetryCounters.forEach((counter) => {
    renderTelemetryValue(counter, Number(counter.dataset.currentValue ?? counter.dataset.target));
  });
  modal.refreshLanguage();

  if (persist) saveLanguage(currentLanguage);
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => applyLanguage(button.dataset.language, true));
});

if (menuToggle && navList) {
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    navList.classList.toggle("is-open", !open);
  });
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      navList.classList.remove("is-open");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      menuToggle.setAttribute("aria-expanded", "false");
      navList.classList.remove("is-open");
      menuToggle.focus();
    }
  });
}

try {
  projects = await loadProjects();
  renderProjects(projectGrid, projects, currentLanguage);
  modal.setProjects(projects);
} catch (error) {
  renderProjectError(projectGrid, error, currentLanguage);
  console.error(error);
}

applyLanguage(currentLanguage);
setupRevealAnimations(reducedMotion);
setupMobileEffects({ reducedMotion });
setupTelemetry(reducedMotion, renderTelemetryValue);
setupProcessFade(reducedMotion);
setupPointerEffects(reducedMotion);
setupNavigationObserver(navLinks, sections);
