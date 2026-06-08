import { createTextElement, fetchJson, localize } from "./utils.js";

/** Loads the persisted project collection from the local API. */
export async function loadProjects() {
  const projects = await fetchJson("/api/projects");
  return [...projects].sort((first, second) => (first.order || 0) - (second.order || 0));
}

function createProjectCard(project, index, language) {
  const card = document.createElement("article");
  const directionClass = index % 2 === 0 ? "slide-left" : "slide-right";
  const titleRu = localize(project.title, "ru");
  const titleEn = localize(project.title, "en");
  const visual = document.createElement("div");
  const cardIndex = document.createElement("div");
  const title = createTextElement("h3", "", localize(project.title, language));
  const tags = document.createElement("ul");

  card.className = `project-card glow-card tilt-card slide-reveal ${directionClass}`;
  card.dataset.delay = String(40 + index * 70);
  card.dataset.projectId = project.id;
  card.dataset.ruAriaLabel = `Открыть детали проекта «${titleRu}»`;
  card.dataset.enAriaLabel = `Open ${titleEn} project details`;
  card.setAttribute("aria-label", card.dataset[`${language}AriaLabel`]);
  card.setAttribute("role", "button");
  card.tabIndex = 0;

  visual.className = "project-visual";
  visual.setAttribute("aria-hidden", "true");
  visual.append(createTextElement("span", "", project.code || `PROJECT / ${index + 1}`));

  cardIndex.className = "card-index";
  cardIndex.append(
    createTextElement("span", "", String(index + 1).padStart(2, "0")),
    createTextElement("span", "node-mark", "")
  );
  cardIndex.lastElementChild.setAttribute("aria-hidden", "true");

  title.dataset.ru = titleRu;
  title.dataset.en = titleEn;

  tags.className = "tag-list";
  tags.append(
    ...(project.stack || []).map((technology) => createTextElement("li", "", technology))
  );

  card.append(visual, cardIndex, title, tags);
  return card;
}

/** Renders project previews with titles and stack tags only. */
export function renderProjects(container, projects, language) {
  if (!projects.length) {
    const emptyState = createTextElement(
      "p",
      "project-loading",
      language === "en" ? "No projects yet." : "Проекты пока не добавлены."
    );
    emptyState.dataset.ru = "Проекты пока не добавлены.";
    emptyState.dataset.en = "No projects yet.";
    container.replaceChildren(emptyState);
    return [];
  }

  const cards = projects.map((project, index) => createProjectCard(project, index, language));
  container.replaceChildren(...cards);
  return cards;
}

export function renderProjectError(container, error, language) {
  const message = language === "en"
    ? "Projects could not be loaded. Refresh the page."
    : "Не удалось загрузить проекты. Обновите страницу.";
  const errorState = createTextElement("p", "project-loading project-loading-error", message);
  errorState.dataset.ru = "Не удалось загрузить проекты. Обновите страницу.";
  errorState.dataset.en = "Projects could not be loaded. Refresh the page.";
  errorState.title = error.message;
  container.replaceChildren(errorState);
}
