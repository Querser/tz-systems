const logLines = [
  ">> Initializing core system...",
  ">> Loading database schema...",
  ">> Backend logic optimization (Python)...",
  ">> Multi-agent AI orchestration...",
  ">> Frontend assets compilation...",
  ">> Containerizing with Docker...",
  ">> Setting up Nginx proxy...",
  ">> Full stack integration test...",
  ">> SYSTEM STATUS: OK",
  ">> HTTP 200 | OK",
  ">> Starting user interface...",
];

function triggerGlitch(title, className, duration) {
  title.classList.remove(className);
  void title.offsetWidth;
  title.classList.add(className);
  window.setTimeout(() => title.classList.remove(className), duration);
}

/** Runs the kernel-style preloader, then assembles the Hero and schedules glitch bursts. */
export function setupSystemInterface(reducedMotion) {
  const preloader = document.querySelector("#system-preloader");
  const percentage = document.querySelector("#preloader-percentage");
  const progressBar = document.querySelector("#preloader-progress-bar");
  const logs = document.querySelector("#preloader-logs");
  const status = document.querySelector("#preloader-status");
  const heroTitle = document.querySelector("#hero-title");

  if (!preloader || !percentage || !progressBar || !logs || !status || !heroTitle) {
    document.body.classList.add("app-ready");
    return;
  }

  document.body.classList.add("preloader-active", "hero-assembly-pending");
  preloader.classList.add("is-running");
  const duration = reducedMotion ? 180 : 1280;
  const finalHold = reducedMotion ? 20 : 220;
  const fadeDuration = reducedMotion ? 20 : 440;
  const visibleLogLimit = 6;
  let animationFrame = 0;
  let periodicTimer = 0;
  let completed = false;
  let renderedLineCount = 0;
  const startTime = performance.now();

  function renderLogs(lineCount) {
    if (lineCount === renderedLineCount) {
      return;
    }

    renderedLineCount = lineCount;
    const visibleLines = logLines.slice(0, lineCount).slice(-visibleLogLimit);
    logs.replaceChildren(
      ...visibleLines.map((line) => {
        const element = document.createElement("p");
        element.className = "preloader-log-line";
        element.textContent = line;
        return element;
      })
    );
  }

  function schedulePeriodicGlitch() {
    if (reducedMotion) {
      return;
    }

    periodicTimer = window.setTimeout(() => {
      triggerGlitch(heroTitle, "is-glitching", 440);
      schedulePeriodicGlitch();
    }, 15000);
  }

  function revealInterface() {
    preloader.hidden = true;
    document.body.classList.remove("preloader-active");
    document.body.classList.add("app-ready");

    if (!reducedMotion) {
      window.setTimeout(() => triggerGlitch(heroTitle, "is-strong-glitch", 540), 180);
      schedulePeriodicGlitch();
    }
  }

  function completePreloader() {
    if (completed) {
      return;
    }

    completed = true;
    percentage.textContent = "100%";
    progressBar.style.width = "100%";
    renderLogs(logLines.length);
    status.textContent = "SYSTEM STATUS: OK | HTTP 200";
    status.classList.add("is-ready");

    window.setTimeout(() => {
      preloader.classList.add("preloader-hidden");
      window.setTimeout(revealInterface, fadeDuration);
    }, finalHold);
  }

  function updatePreloader(timestamp) {
    const progress = Math.min(1, (timestamp - startTime) / duration);
    const easedProgress = 1 - Math.pow(1 - progress, 2.4);
    const value = Math.min(100, Math.floor(easedProgress * 100));
    const lineCount = Math.min(logLines.length, Math.max(1, Math.ceil(progress * logLines.length)));

    percentage.textContent = `${value}%`;
    progressBar.style.width = `${value}%`;
    renderLogs(lineCount);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(updatePreloader);
    } else {
      completePreloader();
    }
  }

  animationFrame = requestAnimationFrame(updatePreloader);

  addEventListener(
    "pagehide",
    () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (periodicTimer) clearTimeout(periodicTimer);
    },
    { once: true }
  );
}
