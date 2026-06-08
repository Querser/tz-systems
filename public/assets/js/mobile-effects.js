const touchPointerQuery = matchMedia("(hover: none) and (pointer: coarse)");
const finePointerQuery = matchMedia("(hover: hover) and (pointer: fine)");
const hapticSelector = [
  "[data-haptic]",
  ".button-link",
  ".contact-cta-button",
  ".solution-card",
  ".project-card",
  ".graph-node",
  ".mobile-architecture-node",
  ".menu-toggle",
  ".language-option",
  ".project-modal-close",
].join(",");
const rippleSelector = [
  ".button-link",
  ".contact-cta-button",
  ".solution-card",
  ".project-card",
  ".graph-node",
  ".mobile-architecture-node",
].join(",");
const scrambleCharacters = "01#@%*$,_-/<>";

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Touch detection keeps mobile mechanics isolated from fine-pointer desktop effects. */
export function isTouchDevice() {
  const hasTouchApi = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return touchPointerQuery.matches || (hasTouchApi && !finePointerQuery.matches);
}

/** Adds a short tactile confirmation on supported touch devices. */
export function triggerHapticFeedback() {
  if (typeof navigator.vibrate !== "function") {
    return;
  }

  try {
    navigator.vibrate(15);
  } catch {
    // Vibration support can be exposed but blocked by the browser or OS.
  }
}

function getInteractionTarget(event, selector) {
  return event.target instanceof Element ? event.target.closest(selector) : null;
}

function getEventPoint(event) {
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  return {
    x: touch?.clientX ?? event.clientX,
    y: touch?.clientY ?? event.clientY,
  };
}

/** Creates a disposable neon pulse at the user's tap position. */
export function createCyberRipple(event, target) {
  const host = target.matches(".graph-node, .mobile-architecture-node")
    ? target.closest(".system-map")
    : target;
  if (!host) {
    return;
  }

  const point = getEventPoint(event);
  const rect = host.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "cyber-ripple";
  ripple.setAttribute("aria-hidden", "true");
  ripple.style.left = `${point.x - rect.left}px`;
  ripple.style.top = `${point.y - rect.top}px`;
  host.classList.add("cyber-ripple-host");
  host.append(ripple);

  const removeRipple = () => {
    ripple.remove();
    if (!host.querySelector(".cyber-ripple")) {
      host.classList.remove("cyber-ripple-host");
    }
  };
  ripple.addEventListener("animationend", removeRipple, { once: true });
  window.setTimeout(removeRipple, 700);
}

export function scrambleText(element, { duration = 420 } = {}) {
  if (
    !element ||
    element.dataset.scrambleComplete === "true" ||
    element.children.length > 0
  ) {
    return;
  }

  const originalText = element.textContent || "";
  if (!originalText.trim()) {
    return;
  }

  element.dataset.scrambleComplete = "true";
  const previousAriaLabel = element.getAttribute("aria-label");
  element.setAttribute("aria-label", originalText);
  element.setAttribute("aria-busy", "true");
  const startTime = performance.now();

  /** Resolves more original characters on every frame until the final text is restored. */
  function render(timestamp) {
    const progress = clamp((timestamp - startTime) / duration, 0, 1);
    const resolvedCount = Math.floor(progress * originalText.length);
    element.textContent = [...originalText]
      .map((character, index) => {
        if (character.trim() === "" || index < resolvedCount) {
          return character;
        }
        return scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
      })
      .join("");

    if (progress < 1) {
      requestAnimationFrame(render);
      return;
    }

    element.textContent = originalText;
    element.removeAttribute("aria-busy");
    if (previousAriaLabel === null) {
      element.removeAttribute("aria-label");
    } else {
      element.setAttribute("aria-label", previousAriaLabel);
    }
  }

  requestAnimationFrame(render);
}

function initMobileGyroParallax(reducedMotion) {
  if (reducedMotion || typeof window.DeviceOrientationEvent === "undefined") {
    return;
  }

  const root = document.documentElement;
  const permissionButton = document.querySelector("#motion-permission-button");
  const requestPermission = window.DeviceOrientationEvent.requestPermission;
  let listening = false;
  let frame = 0;
  let baselineBeta = null;
  let baselineGamma = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  function renderGyro() {
    currentX += (targetX - currentX) * 0.14;
    currentY += (targetY - currentY) * 0.14;
    root.style.setProperty("--mobile-gyro-x", `${(currentX * 10).toFixed(2)}px`);
    root.style.setProperty("--mobile-gyro-y", `${(currentY * 8).toFixed(2)}px`);
    root.style.setProperty("--mobile-marker-x", `${(currentX * 7).toFixed(2)}px`);
    root.style.setProperty("--mobile-marker-y", `${(currentY * 6).toFixed(2)}px`);
    root.style.setProperty("--mobile-card-x", `${(currentX * 2.8).toFixed(2)}px`);
    root.style.setProperty("--mobile-card-y", `${(currentY * 2.4).toFixed(2)}px`);
    root.style.setProperty("--mobile-tilt-x", `${(-currentY * 1.4).toFixed(2)}deg`);
    root.style.setProperty("--mobile-tilt-y", `${(currentX * 1.7).toFixed(2)}deg`);

    if (Math.abs(targetX - currentX) > 0.002 || Math.abs(targetY - currentY) > 0.002) {
      frame = requestAnimationFrame(renderGyro);
    } else {
      frame = 0;
    }
  }

  function handleOrientation(event) {
    if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) {
      return;
    }

    baselineBeta ??= event.beta;
    baselineGamma ??= event.gamma;
    targetX = clamp((event.gamma - baselineGamma) / 24, -1, 1);
    targetY = clamp((event.beta - baselineBeta) / 24, -1, 1);
    if (!frame) {
      frame = requestAnimationFrame(renderGyro);
    }
  }

  function startListening() {
    if (listening) {
      return;
    }

    listening = true;
    root.classList.add("mobile-gyro-active");
    addEventListener("deviceorientation", handleOrientation, { passive: true });
  }

  if (typeof requestPermission === "function" && permissionButton) {
    permissionButton.hidden = false;
    permissionButton.addEventListener(
      "click",
      async () => {
        permissionButton.disabled = true;
        try {
          const permission = await requestPermission.call(window.DeviceOrientationEvent);
          if (permission === "granted") {
            startListening();
            permissionButton.hidden = true;
            return;
          }
        } catch {
          // Denied or unavailable motion permission falls back to the CSS mobile effects.
        }

        permissionButton.textContent =
          document.documentElement.lang === "en" ? "Motion unavailable" : "Движение недоступно";
        permissionButton.classList.add("is-denied");
        window.setTimeout(() => {
          permissionButton.hidden = true;
        }, 1800);
      },
      { once: true }
    );
  } else {
    startListening();
  }

  addEventListener(
    "pagehide",
    () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      if (listening) {
        removeEventListener("deviceorientation", handleOrientation);
      }
    },
    { once: true }
  );
}

function initHaptics() {
  let lastHapticAt = 0;
  const eventName = "PointerEvent" in window ? "pointerup" : "click";
  document.addEventListener(
    eventName,
    (event) => {
      if (eventName === "pointerup" && event.pointerType === "mouse") {
        return;
      }
      if (!getInteractionTarget(event, hapticSelector)) {
        return;
      }

      const now = performance.now();
      if (now - lastHapticAt < 120) {
        return;
      }
      lastHapticAt = now;
      triggerHapticFeedback();
    },
    { passive: true }
  );
}

function initCyberRipples(reducedMotion) {
  if (reducedMotion) {
    return;
  }

  const eventName = "PointerEvent" in window ? "pointerup" : "click";
  document.addEventListener(
    eventName,
    (event) => {
      if (eventName === "pointerup" && event.pointerType === "mouse") {
        return;
      }
      const target = getInteractionTarget(event, rippleSelector);
      if (target) {
        createCyberRipple(event, target);
      }
    },
    { passive: true }
  );
}

function initMobileFocusObserver(reducedMotion) {
  if (reducedMotion || !("IntersectionObserver" in window)) {
    return;
  }

  const targets = [
    ...document.querySelectorAll(
      ".process-step, .solution-card, .project-card, .graph-node, .mobile-architecture-node"
    ),
  ];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("active-mobile", entry.isIntersecting);
      });
    },
    { rootMargin: "-35% 0px -35% 0px", threshold: 0.12 }
  );
  targets.forEach((target) => observer.observe(target));
}

function initTextScramble(reducedMotion) {
  if (reducedMotion || !("IntersectionObserver" in window)) {
    return;
  }

  const targets = [
    ...document.querySelectorAll(
      "main section h2, .metric-label, .project-card h3"
    ),
  ].filter((element) => element.children.length === 0);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        scrambleText(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -14% 0px", threshold: 0.34 }
  );
  targets.forEach((target) => observer.observe(target));

  document.addEventListener(
    "portfolio:telemetry-ready",
    (event) => {
      event.detail?.counters?.forEach((counter, index) => {
        window.setTimeout(() => scrambleText(counter, { duration: 360 }), index * 70);
      });
    },
    { once: true }
  );
}

function initScrollVelocityGlitch(reducedMotion) {
  if (reducedMotion) {
    return;
  }

  let previousScrollY = scrollY;
  let frame = 0;
  let clearTimer = 0;

  function measureVelocity() {
    frame = 0;
    const currentScrollY = scrollY;
    const delta = currentScrollY - previousScrollY;
    previousScrollY = currentScrollY;

    if (Math.abs(delta) < 42) {
      return;
    }

    document.documentElement.style.setProperty(
      "--scroll-glitch-x",
      `${delta > 0 ? 1 : -1}px`
    );
    document.body.classList.add("scroll-velocity-glitch");
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      document.body.classList.remove("scroll-velocity-glitch");
    }, 90);
  }

  addEventListener(
    "scroll",
    () => {
      if (!frame) {
        frame = requestAnimationFrame(measureVelocity);
      }
    },
    { passive: true }
  );
  addEventListener(
    "pagehide",
    () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.clearTimeout(clearTimer);
    },
    { once: true }
  );
}

function initAutonomousMobileGlow(reducedMotion) {
  if (reducedMotion) {
    return;
  }

  document
    .querySelectorAll(".solution-card, .project-card, .telemetry-card")
    .forEach((card, index) => {
      card.style.setProperty("--mobile-glow-delay", `${(-index * 1.35).toFixed(2)}s`);
      card.style.setProperty("--mobile-glow-duration", `${7.2 + (index % 4) * 0.8}s`);
    });
}

function initGraphDataStreams(reducedMotion) {
  const graph = document.querySelector(".system-map");
  const mobileGraph = document.querySelector(".architecture-mobile");
  if (!graph) {
    return;
  }

  graph.classList.add("graph-streams-active");
  if (reducedMotion || !mobileGraph || mobileGraph.querySelector(".mobile-data-packet")) {
    return;
  }

  const packets = Array.from({ length: 3 }, (_, index) => {
    const packet = document.createElement("span");
    packet.className = "mobile-data-packet";
    packet.setAttribute("aria-hidden", "true");
    packet.style.setProperty("--packet-delay", `${-index * 1.15}s`);
    return packet;
  });
  mobileGraph.append(...packets);
}

export function setupMobileEffects({ reducedMotion = false } = {}) {
  if (!isTouchDevice()) {
    return;
  }

  document.documentElement.classList.add("touch-effects-enabled");
  initHaptics();
  initCyberRipples(reducedMotion);
  initMobileGyroParallax(reducedMotion);
  initMobileFocusObserver(reducedMotion);
  initTextScramble(reducedMotion);
  initScrollVelocityGlitch(reducedMotion);
  initAutonomousMobileGlow(reducedMotion);
  initGraphDataStreams(reducedMotion);
}
