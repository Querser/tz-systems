import { createTextElement, localize } from "./utils.js";

/** Creates the reusable project dialog controller and its accessibility behavior. */
export function createProjectModal({ projectGrid, getLanguage }) {
  const modal = document.querySelector("#project-modal");
  const panel = modal?.querySelector(".project-modal-panel");
  const closeButton = modal?.querySelector(".project-modal-close");
  const tags = document.querySelector("#project-modal-tags");
  const title = document.querySelector("#project-modal-title");
  const description = document.querySelector("#project-modal-description");
  const media = document.querySelector("#project-modal-media");
  let projectsById = new Map();
  let activeProjectId = null;
  let lastTrigger = null;

  function createPlaceholder(label, language) {
    const placeholder = document.createElement("div");
    placeholder.className = "project-media-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute(
      "aria-label",
      language === "en" ? `Screenshot placeholder: ${label}` : `Плейсхолдер скриншота: ${label}`
    );
    placeholder.append(createTextElement("span", "", label));
    return placeholder;
  }

  function createMediaItem(source, language) {
    if (source.startsWith("placeholder:")) {
      const labels = source.slice("placeholder:".length).split("|");
      const label = language === "en" ? labels[1] || labels[0] : labels[0];
      return createPlaceholder(`${label} — placeholder`, language);
    }

    const figure = document.createElement("figure");
    const image = document.createElement("img");
    figure.className = "project-media-image";
    image.src = source;
    image.alt = language === "en" ? "Project screenshot" : "Скриншот проекта";
    image.loading = "lazy";
    image.addEventListener(
      "error",
      () => {
        figure.replaceWith(
          createPlaceholder(
            language === "en" ? "Screenshot unavailable" : "Скриншот недоступен",
            language
          )
        );
      },
      { once: true }
    );
    figure.append(image);
    return figure;
  }

  function render(projectId) {
    const project = projectsById.get(projectId);
    if (!project) {
      return;
    }

    const language = getLanguage();
    const screenshots = project.screenshots || [];
    title.textContent = localize(project.title, language);
    description.textContent = localize(project.description, language);
    tags.setAttribute("aria-label", language === "en" ? "Technology stack" : "Технологический стек");
    tags.replaceChildren(
      ...(project.stack || []).map((technology) => createTextElement("li", "", technology))
    );
    media.replaceChildren(
      ...(screenshots.length
        ? screenshots.map((source) => createMediaItem(source, language))
        : [
            createPlaceholder(
              language === "en" ? "Screenshots have not been added yet" : "Скриншоты пока не добавлены",
              language
            ),
          ])
    );
  }

  function open(projectId, trigger) {
    if (!modal || !panel || !projectsById.has(projectId)) {
      return;
    }

    activeProjectId = projectId;
    lastTrigger = trigger;
    render(projectId);
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => (closeButton || panel).focus({ preventScroll: true }));
  }

  function close() {
    if (!modal?.classList.contains("is-open")) {
      return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeProjectId = null;
    lastTrigger?.focus({ preventScroll: true });
    lastTrigger = null;
  }

  projectGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".project-card[data-project-id]");
    if (card) {
      open(card.dataset.projectId, card);
    }
  });

  projectGrid.addEventListener("keydown", (event) => {
    const card = event.target.closest(".project-card[data-project-id]");
    if (!card || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    open(card.dataset.projectId, card);
  });

  closeButton?.addEventListener("click", close);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!modal?.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = [
      ...panel.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
    ];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  return {
    setProjects(projects) {
      projectsById = new Map(projects.map((project) => [project.id, project]));
    },
    refreshLanguage() {
      if (activeProjectId) {
        render(activeProjectId);
      }
    },
  };
}
