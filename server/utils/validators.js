import { HttpError } from "./httpError.js";

const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function readText(value, field, { required = false, maxLength = 200 } = {}) {
  if (value == null && !required) {
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `Поле «${field}» должно быть строкой.`);
  }

  const normalized = value.trim();
  if (required && !normalized) {
    throw new HttpError(400, `Заполните поле «${field}».`);
  }
  if (normalized.length > maxLength || controlCharacters.test(normalized)) {
    throw new HttpError(400, `Поле «${field}» содержит недопустимое значение.`);
  }
  return normalized;
}

function readLocalized(value, field, maxLength) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `Поле «${field}» имеет неверный формат.`);
  }

  const ru = readText(value.ru, `${field} RU`, { required: true, maxLength });
  const en = readText(value.en, `${field} EN`, { maxLength }) || ru;
  return { ru, en };
}

function readStringArray(value, field, { maxItems, maxLength }) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new HttpError(400, `Поле «${field}» имеет неверный формат.`);
  }

  return value.map((item) => readText(item, field, { required: true, maxLength }));
}

function readUrl(value, field) {
  const url = readText(value, field, { maxLength: 500 }) || "#";
  if (url === "#" || url.startsWith("/") || url.startsWith("placeholder:")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // The common validation error below is safer than exposing parser details.
  }
  throw new HttpError(400, `Поле «${field}» должно содержать безопасный URL.`);
}

function readMetrics(value) {
  if (!Array.isArray(value) || value.length > 12) {
    throw new HttpError(400, "Метрики имеют неверный формат.");
  }

  return value.map((metric) => {
    if (!metric || typeof metric !== "object" || Array.isArray(metric)) {
      throw new HttpError(400, "Метрика имеет неверный формат.");
    }
    return {
      value: readText(metric.value, "Значение метрики", { required: true, maxLength: 40 }),
      label: readLocalized(metric.label, "Подпись метрики", 120),
    };
  });
}

/** Validates and normalizes all project fields before database access. */
export function validateProjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "Неверный формат проекта.");
  }

  return {
    code: readText(payload.code, "Технический код", { maxLength: 120 }) || "SYSTEM / PROJECT",
    title: readLocalized(payload.title, "Название", 180),
    description: readLocalized(payload.description, "Описание", 5000),
    stack: readStringArray(payload.stack || [], "Стек", { maxItems: 24, maxLength: 80 }),
    screenshots: readStringArray(payload.screenshots || [], "Скриншоты", {
      maxItems: 24,
      maxLength: 500,
    }).map((url) => readUrl(url, "Скриншот")),
    liveUrl: readUrl(payload.liveUrl, "Live Project URL"),
    githubUrl: readUrl(payload.githubUrl, "GitHub URL"),
    metrics: readMetrics(payload.metrics || []),
  };
}

/** Rejects malformed identifiers before they reach prepared SQL statements. */
export function validateProjectId(id) {
  if (typeof id !== "string" || !idPattern.test(id)) {
    throw new HttpError(400, "Некорректный идентификатор проекта.");
  }
  return id;
}
