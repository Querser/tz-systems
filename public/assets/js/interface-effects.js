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

const interactiveSelector = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  ".project-card",
  ".graph-node",
  '[role="button"]',
  '[data-cursor="interactive"]',
].join(",");

function triggerGlitch(title, className, duration) {
  title.classList.remove(className);
  void title.offsetWidth;
  title.classList.add(className);
  window.setTimeout(() => title.classList.remove(className), duration);
}

/** Enables a performant crosshair cursor only for fine-pointer devices. */
export function setupTechnicalCursor(reducedMotion) {
  const finePointer = matchMedia("(pointer: fine)");
  const cursor = document.querySelector("#technical-cursor");

  if (!cursor || !finePointer.matches) {
    return;
  }

  document.documentElement.classList.add("custom-cursor-enabled");
  let currentX = -40;
  let currentY = -40;
  let targetX = -40;
  let targetY = -40;
  let frame = 0;
  let activeGraphNode = null;

  function renderCursor() {
    const easing = reducedMotion ? 1 : 0.28;
    currentX += (targetX - currentX) * easing;
    currentY += (targetY - currentY) * easing;
    cursor.style.setProperty("--cursor-screen-x", `${currentX.toFixed(2)}px`);
    cursor.style.setProperty("--cursor-screen-y", `${currentY.toFixed(2)}px`);

    if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      frame = requestAnimationFrame(renderCursor);
    } else {
      frame = 0;
    }
  }

  function requestCursorFrame() {
    if (!frame) {
      frame = requestAnimationFrame(renderCursor);
    }
  }

  addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const graphNode = event.target.closest(".graph-node");

      if (graphNode !== activeGraphNode) {
        activeGraphNode?.classList.remove("is-node-active");
        graphNode?.classList.add("is-node-active");
        activeGraphNode = graphNode;
      }

      cursor.classList.add("is-visible");
      cursor.classList.toggle("is-interactive", Boolean(event.target.closest(interactiveSelector)));
      requestCursorFrame();
    },
    { passive: true }
  );

  document.addEventListener("pointerout", (event) => {
    cursor.classList.toggle(
      "is-interactive",
      Boolean(event.relatedTarget?.closest?.(interactiveSelector))
    );
  });
  document.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  addEventListener("blur", () => {
    cursor.classList.remove("is-visible");
    activeGraphNode?.classList.remove("is-node-active");
    activeGraphNode = null;
  });
  addEventListener(
    "pagehide",
    () => {
      if (frame) cancelAnimationFrame(frame);
    },
    { once: true }
  );
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
