const page = document.body.dataset.adminPage;
let csrfToken = "";

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

/** Sends a same-origin request and attaches the session-bound CSRF token when required. */
async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();

  if (options.body) {
    headers.set("content-type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: "same-origin",
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && page === "dashboard") {
      location.replace("/");
    }
    throw new Error(data?.error || `Ошибка запроса: ${response.status}`);
  }

  return data;
}

function parseLines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseStack(value) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseMetrics(value) {
  return parseLines(value).map((line) => {
    const [metricValue = "", labelRu = "", labelEn = ""] = line
      .split("|")
      .map((item) => item.trim());
    return {
      value: metricValue,
      label: { ru: labelRu, en: labelEn || labelRu },
    };
  }).filter((metric) => metric.value && metric.label.ru);
}

function formatMetrics(metrics = []) {
  return metrics
    .map((metric) => `${metric.value} | ${metric.label?.ru || ""} | ${metric.label?.en || ""}`)
    .join("\n");
}

/** Initializes the password form after the server validates the hidden-entry cookie. */
function initializeLogin() {
  const form = document.querySelector("#login-form");
  const message = document.querySelector("#login-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    setMessage(message, "Проверка доступа...");

    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: form.elements.password.value }),
      });
      csrfToken = result.csrfToken;
      location.replace("/admin/dashboard.html");
    } catch (error) {
      setMessage(message, error.message, true);
      form.elements.password.select();
    } finally {
      submitButton.disabled = false;
    }
  });
}

/** Initializes the protected project editor and all CRUD operations. */
async function initializeDashboard() {
  const projectList = document.querySelector("#admin-project-list");
  const form = document.querySelector("#project-form");
  const formHeading = document.querySelector("#form-heading");
  const saveButton = document.querySelector("#save-project-button");
  const cancelButton = document.querySelector("#cancel-edit-button");
  const newButton = document.querySelector("#new-project-button");
  const logoutButton = document.querySelector("#logout-button");
  const message = document.querySelector("#dashboard-message");
  let projects = [];
  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    form.elements.liveUrl.value = "#";
    form.elements.githubUrl.value = "#";
    formHeading.textContent = "Новый проект";
    saveButton.textContent = "Добавить проект";
    cancelButton.hidden = true;
  }

  function fillForm(project) {
    editingId = project.id;
    form.elements.titleRu.value = project.title?.ru || "";
    form.elements.titleEn.value = project.title?.en || "";
    form.elements.descriptionRu.value = project.description?.ru || "";
    form.elements.descriptionEn.value = project.description?.en || "";
    form.elements.code.value = project.code || "";
    form.elements.stack.value = (project.stack || []).join(", ");
    form.elements.screenshots.value = (project.screenshots || []).join("\n");
    form.elements.liveUrl.value = project.liveUrl || "#";
    form.elements.githubUrl.value = project.githubUrl || "#";
    form.elements.metrics.value = formatMetrics(project.metrics);
    formHeading.textContent = `Редактирование: ${project.title?.ru || "Проект"}`;
    saveButton.textContent = "Сохранить изменения";
    cancelButton.hidden = false;
    form.elements.titleRu.focus();
  }

  function createProjectCard(project) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    card.className = "admin-project-card";
    title.textContent = project.title?.ru || project.title?.en || "Без названия";
    meta.textContent = (project.stack || []).join(" / ") || "Стек не указан";
    actions.className = "admin-project-actions";
    editButton.className = "admin-button";
    editButton.type = "button";
    editButton.textContent = "Редактировать";
    deleteButton.className = "admin-button admin-button-danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Удалить";

    editButton.addEventListener("click", () => fillForm(project));
    deleteButton.addEventListener("click", async () => {
      if (!confirm(`Удалить проект «${title.textContent}»?`)) {
        return;
      }

      try {
        await apiRequest(`/api/projects/${encodeURIComponent(project.id)}`, { method: "DELETE" });
        if (editingId === project.id) {
          resetForm();
        }
        setMessage(message, "Проект удалён.");
        await loadAndRenderProjects();
      } catch (error) {
        setMessage(message, error.message, true);
      }
    });

    actions.append(editButton, deleteButton);
    card.append(title, meta, actions);
    return card;
  }

  function renderProjectList() {
    if (!projects.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "admin-empty";
      emptyState.textContent = "Проекты пока не добавлены.";
      projectList.replaceChildren(emptyState);
      return;
    }

    projectList.replaceChildren(...projects.map(createProjectCard));
  }

  async function loadAndRenderProjects() {
    projects = await apiRequest("/api/projects");
    renderProjectList();
  }

  function serializeForm() {
    const titleRu = form.elements.titleRu.value.trim();
    const descriptionRu = form.elements.descriptionRu.value.trim();
    return {
      title: {
        ru: titleRu,
        en: form.elements.titleEn.value.trim() || titleRu,
      },
      description: {
        ru: descriptionRu,
        en: form.elements.descriptionEn.value.trim() || descriptionRu,
      },
      code: form.elements.code.value.trim() || "SYSTEM / PROJECT",
      stack: parseStack(form.elements.stack.value),
      screenshots: parseLines(form.elements.screenshots.value),
      liveUrl: form.elements.liveUrl.value.trim() || "#",
      githubUrl: form.elements.githubUrl.value.trim() || "#",
      metrics: parseMetrics(form.elements.metrics.value),
    };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    setMessage(message, editingId ? "Сохранение изменений..." : "Добавление проекта...");

    try {
      const url = editingId ? `/api/projects/${encodeURIComponent(editingId)}` : "/api/projects";
      await apiRequest(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(serializeForm()),
      });
      setMessage(message, editingId ? "Изменения сохранены." : "Проект добавлен.");
      resetForm();
      await loadAndRenderProjects();
    } catch (error) {
      setMessage(message, error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  cancelButton.addEventListener("click", resetForm);
  newButton.addEventListener("click", () => {
    resetForm();
    form.elements.titleRu.focus();
  });
  logoutButton.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      location.replace("/");
    }
  });

  try {
    const session = await apiRequest("/api/auth/session");
    csrfToken = session.csrfToken;
    await loadAndRenderProjects();
  } catch (error) {
    setMessage(message, error.message, true);
  }
}

if (page === "login") {
  initializeLogin();
} else if (page === "dashboard") {
  initializeDashboard();
}
