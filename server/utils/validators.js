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

/** Validates and normalizes editable project fields before database access. */
export function validateProjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "Неверный формат проекта.");
  }

  return {
    title: readLocalized(payload.title, "Название", 180),
    description: readLocalized(payload.description, "Описание", 5000),
    stack: readStringArray(payload.stack || [], "Стек", { maxItems: 24, maxLength: 80 }),
    existingScreenshots: readStringArray(
      payload.existingScreenshots || [],
      "Существующие скриншоты",
      { maxItems: 100, maxLength: 500 }
    ),
  };
}

/** Parses the JSON project payload embedded into multipart form data. */
export function parseProjectPayload(body) {
  if (typeof body?.project !== "string") {
    throw new HttpError(400, "Не переданы данные проекта.");
  }

  try {
    return JSON.parse(body.project);
  } catch {
    throw new HttpError(400, "Данные проекта содержат некорректный JSON.");
  }
}

/** Rejects malformed identifiers before they reach prepared SQL statements. */
export function validateProjectId(id) {
  if (typeof id !== "string" || !idPattern.test(id)) {
    throw new HttpError(400, "Некорректный идентификатор проекта.");
  }
  return id;
}
