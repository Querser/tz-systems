import { runAdminPreloader } from "./admin-preloader.js";

const page = document.body.dataset.adminPage;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;
const maxFilesPerRequest = 20;
let csrfToken = "";

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

/** Sends a same-origin request and attaches the session-bound CSRF token when required. */
async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();

  if (options.body && !(options.body instanceof FormData)) {
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

function parseStack(value) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
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
  const fileInput = document.querySelector("#project-screenshots");
  const previewGrid = document.querySelector("#project-screenshot-previews");
  const formHeading = document.querySelector("#form-heading");
  const saveButton = document.querySelector("#save-project-button");
  const cancelButton = document.querySelector("#cancel-edit-button");
  const newButton = document.querySelector("#new-project-button");
  const logoutButton = document.querySelector("#logout-button");
  const message = document.querySelector("#dashboard-message");
  let projects = [];
  let editingId = null;
  let existingScreenshots = [];
  let selectedFiles = [];

  function releaseObjectUrls() {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }

  function createScreenshotPreview({ source, label, onRemove, isNew }) {
    const card = document.createElement("article");
    const visual = document.createElement("div");
    const badge = document.createElement("span");
    const removeButton = document.createElement("button");

    card.className = "admin-screenshot-card";
    visual.className = "admin-screenshot-visual";
    badge.className = "admin-screenshot-badge";
    badge.textContent = isNew ? "NEW" : "SAVED";
    removeButton.className = "admin-screenshot-remove";
    removeButton.type = "button";
    removeButton.textContent = "Удалить";
    removeButton.setAttribute("aria-label", `Удалить скриншот ${label}`);
    removeButton.addEventListener("click", onRemove);

    if (source.startsWith("placeholder:")) {
      const placeholder = document.createElement("span");
      placeholder.className = "admin-screenshot-placeholder";
      placeholder.textContent = source.slice("placeholder:".length).split("|")[0] || "Placeholder";
      visual.append(placeholder);
    } else {
      const image = document.createElement("img");
      image.src = source;
      image.alt = label;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        visual.classList.add("is-missing");
        image.remove();
        const missing = document.createElement("span");
        missing.textContent = "Изображение недоступно";
        visual.append(missing);
      }, { once: true });
      visual.append(image);
    }

    card.append(visual, badge, removeButton);
    return card;
  }

  function renderScreenshotPreviews() {
    const items = [
      ...existingScreenshots.map((source, index) =>
        createScreenshotPreview({
          source,
          label: `сохранённый ${index + 1}`,
          isNew: false,
          onRemove: () => {
            existingScreenshots = existingScreenshots.filter((item) => item !== source);
            renderScreenshotPreviews();
          },
        })
      ),
      ...selectedFiles.map((item, index) =>
        createScreenshotPreview({
          source: item.previewUrl,
          label: item.file.name || `новый ${index + 1}`,
          isNew: true,
          onRemove: () => {
            URL.revokeObjectURL(item.previewUrl);
            selectedFiles = selectedFiles.filter((candidate) => candidate.id !== item.id);
            renderScreenshotPreviews();
          },
        })
      ),
    ];

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "admin-upload-empty";
      empty.textContent = "Изображения ещё не выбраны.";
      previewGrid.replaceChildren(empty);
      return;
    }
    previewGrid.replaceChildren(...items);
  }

  function resetForm() {
    editingId = null;
    releaseObjectUrls();
    selectedFiles = [];
    existingScreenshots = [];
    form.reset();
    formHeading.textContent = "Новый проект";
    saveButton.textContent = "Добавить проект";
    cancelButton.hidden = true;
    renderScreenshotPreviews();
  }

  function fillForm(project) {
    releaseObjectUrls();
    editingId = project.id;
    selectedFiles = [];
    existingScreenshots = [...(project.screenshots || [])];
    form.elements.titleRu.value = project.title?.ru || "";
    form.elements.titleEn.value = project.title?.en || "";
    form.elements.descriptionRu.value = project.description?.ru || "";
    form.elements.descriptionEn.value = project.description?.en || "";
    form.elements.stack.value = (project.stack || []).join(", ");
    formHeading.textContent = `Редактирование: ${project.title?.ru || "Проект"}`;
    saveButton.textContent = "Сохранить изменения";
    cancelButton.hidden = false;
    renderScreenshotPreviews();
    form.elements.titleRu.focus();
  }

  function createProjectCard(project) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    const screenshots = document.createElement("small");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    card.className = "admin-project-card";
    title.textContent = project.title?.ru || project.title?.en || "Без названия";
    meta.textContent = (project.stack || []).join(" / ") || "Стек не указан";
    screenshots.textContent = `Скриншотов: ${(project.screenshots || []).length}`;
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
    card.append(title, meta, screenshots, actions);
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

  function createProjectFormData() {
    const titleRu = form.elements.titleRu.value.trim();
    const descriptionRu = form.elements.descriptionRu.value.trim();
    const payload = {
      title: {
        ru: titleRu,
        en: form.elements.titleEn.value.trim() || titleRu,
      },
      description: {
        ru: descriptionRu,
        en: form.elements.descriptionEn.value.trim() || descriptionRu,
      },
      stack: parseStack(form.elements.stack.value),
      existingScreenshots,
    };
    const formData = new FormData();
    formData.append("project", JSON.stringify(payload));
    selectedFiles.forEach(({ file }) => formData.append("screenshots", file, file.name));
    return formData;
  }

  fileInput.addEventListener("change", () => {
    const incomingFiles = [...fileInput.files];
    fileInput.value = "";

    if (selectedFiles.length + incomingFiles.length > maxFilesPerRequest) {
      setMessage(message, `За один раз можно загрузить не более ${maxFilesPerRequest} новых изображений.`, true);
      return;
    }

    const invalidFile = incomingFiles.find(
      (file) => !allowedImageTypes.has(file.type) || file.size > maxFileSize
    );
    if (invalidFile) {
      setMessage(
        message,
        `Файл «${invalidFile.name}» должен быть JPEG, PNG или WebP размером до 8 МБ.`,
        true
      );
      return;
    }

    selectedFiles.push(
      ...incomingFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    );
    setMessage(message, incomingFiles.length ? `Добавлено файлов: ${incomingFiles.length}.` : "");
    renderScreenshotPreviews();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    setMessage(message, editingId ? "Сохранение изменений..." : "Добавление проекта...");

    try {
      const url = editingId ? `/api/projects/${encodeURIComponent(editingId)}` : "/api/projects";
      await apiRequest(url, {
        method: editingId ? "PUT" : "POST",
        body: createProjectFormData(),
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
  window.addEventListener("beforeunload", releaseObjectUrls);

  renderScreenshotPreviews();
  const session = await apiRequest("/api/auth/session");
  csrfToken = session.csrfToken;
  await loadAndRenderProjects();
}

const preloader = runAdminPreloader();
const initialization =
  page === "login"
    ? Promise.resolve(initializeLogin())
    : page === "dashboard"
      ? initializeDashboard()
      : Promise.resolve();

try {
  await Promise.all([preloader, initialization]);
} catch (error) {
  const message = document.querySelector(".admin-message");
  if (message) {
    setMessage(message, error.message, true);
  }
  await preloader;
}
