const loadingSteps = [
  [12, "Проверка интерфейса"],
  [38, "Подключение защищённой сессии"],
  [68, "Синхронизация проектов"],
  [90, "Подготовка редактора"],
  [100, "Система готова"],
];

/** Runs the shared admin boot sequence and always releases the interface. */
export function runAdminPreloader() {
  const overlay = document.querySelector("#admin-preloader");
  const percentage = document.querySelector("#admin-preloader-percentage");
  const progress = document.querySelector("#admin-preloader-progress");
  const status = document.querySelector("#admin-preloader-status");
  const log = document.querySelector("#admin-preloader-log");

  if (!overlay || !percentage || !progress || !status || !log) {
    document.documentElement.classList.remove("admin-loading");
    return Promise.resolve();
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 180 : 850;
  const startedAt = performance.now();
  let shownSteps = 0;

  return new Promise((resolve) => {
    function finish() {
      clearTimeout(window.__adminPreloaderFallback);
      overlay.classList.add("is-finished");
      window.setTimeout(() => {
        overlay.hidden = true;
        document.documentElement.classList.remove("admin-loading");
        resolve();
      }, reducedMotion ? 20 : 220);
    }

    function frame(now) {
      const elapsed = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const value = Math.round(eased * 100);
      percentage.textContent = `${value}%`;
      progress.style.width = `${value}%`;

      while (shownSteps < loadingSteps.length && value >= loadingSteps[shownSteps][0]) {
        const [, text] = loadingSteps[shownSteps];
        status.textContent = text;
        const line = document.createElement("span");
        line.textContent = `> ${text}`;
        log.append(line);
        shownSteps += 1;
      }

      if (elapsed < 1) {
        requestAnimationFrame(frame);
      } else {
        finish();
      }
    }

    requestAnimationFrame(frame);
  });
}
