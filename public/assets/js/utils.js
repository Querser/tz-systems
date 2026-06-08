const languageKey = "portfolio-language";

/** Returns a supported localized value from a string or {ru, en} object. */
export function localize(value, language) {
  if (typeof value === "string") {
    return value;
  }

  return value?.[language] || value?.ru || value?.en || "";
}

/** Creates a DOM element and assigns text without using unsafe HTML. */
export function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

export function getSavedLanguage() {
  try {
    const savedLanguage = localStorage.getItem(languageKey);
    return savedLanguage === "en" || savedLanguage === "ru" ? savedLanguage : "ru";
  } catch {
    return "ru";
  }
}

export function saveLanguage(language) {
  try {
    localStorage.setItem(languageKey, language);
  } catch {
    // The language switch remains usable when storage is unavailable.
  }
}

/** Fetches JSON and exposes a readable error for the UI. */
export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}
