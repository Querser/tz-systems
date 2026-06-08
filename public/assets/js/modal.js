import { createTextElement, localize } from "./utils.js";

/** Creates the reusable project dialog controller and its accessibility behavior. */
export function createProjectModal({ projectGrid, getLanguage }) {
  const modal = document.querySelector("#project-modal");
  const panel = modal?.querySelector(".project-modal-panel");
  const closeButton = modal?.querySelector(".project-modal-close");
  const tags = document.querySelector("#project-modal-tags");
  const title = document.querySelector("#project-modal-title");
  const metrics = document.querySelector("#project-modal-metrics");
  const description = document.querySelector("#project-modal-description");
  const media = document.querySelector("#project-modal-media");
  const liveLink = document.querySelector("#project-modal-live");
  const githubLink = document.querySelector("#project-modal-github");
  let projectsById = new Map();
  let activeProjectId = null;
  let lastTrigger = null;

  function configureLink(link, href) {
    const hasRealLink = Boolean(href && href !== "#");
    link.href = hasRealLink ? href : "#";
    link.setAttribute("aria-disabled", String(!hasRealLink));
    link.toggleAttribute("target", hasRealLink);
    link.toggleAttribute("rel", hasRealLink);

    if (hasRealLink) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
  }

  function createMediaItem(source, language) {
    if (source.startsWith("placeholder:")) {
      const labels = source.slice("placeholder:".length).split("|");
      const label = language === "en" ? labels[1] || labels[0] : labels[0];
      const placeholder = document.createElement("div");
      placeholder.className = "project-media-placeholder";
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute(
        "aria-label",
        language === "en"
          ? `Screenshot placeholder: ${label}`
          : `Плейсхолдер скриншота: ${label}`
      );
      placeholder.append(createTextElement("span", "", `${label} — placeholder`));
      return placeholder;
    }

    const figure = document.createElement("figure");
    const image = document.createElement("img");
    figure.className = "project-media-image";
    image.src = source;
    image.alt = language === "en" ? "Project screenshot" : "Скриншот проекта";
    image.loading = "lazy";
    figure.append(image);
    return figure;
  }

  function render(projectId) {
    const project = projectsById.get(projectId);

    if (!project) {
      return;
    }

    const language = getLanguage();
    title.textContent = localize(project.title, language);
    description.textContent = localize(project.description, language);
    tags.setAttribute("aria-label", language === "en" ? "Technology stack" : "Технологический стек");
    tags.replaceChildren(
      ...(project.stack || []).map((technology) => createTextElement("li", "", technology))
    );
    metrics.replaceChildren(
      ...(project.metrics || []).map((metric) => {
        const item = document.createElement("div");
        item.className = "project-modal-metric";
        item.append(
          createTextElement("strong", "", metric.value),
          createTextElement("span", "", localize(metric.label, language))
        );
        return item;
      })
    );
    media.replaceChildren(
      ...(project.screenshots || []).map((source) => createMediaItem(source, language))
    );
    configureLink(liveLink, project.liveUrl);
    configureLink(githubLink, project.githubUrl);
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

  [liveLink, githubLink].forEach((link) => {
    link?.addEventListener("click", (event) => {
      if (link.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
      }
    });
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
