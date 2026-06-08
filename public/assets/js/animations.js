/** Applies reveal delays and observes revealable elements once. */
export function setupRevealAnimations(reducedMotion) {
  const elements = [...document.querySelectorAll(".reveal, .slide-reveal")];

  elements.forEach((element) => {
    const delay = Number.parseInt(element.dataset.delay || "0", 10);
    element.style.setProperty("--reveal-delay", `${Number.isNaN(delay) ? 0 : delay}ms`);
  });

  if (reducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );
  elements.forEach((element) => observer.observe(element));
}

/** Animates the business telemetry counters when the section enters the viewport. */
export function setupTelemetry(reducedMotion, renderValue) {
  const section = document.querySelector(".telemetry-section");
  const counters = [...document.querySelectorAll(".metric-value[data-target]")];

  if (!section || !counters.length) {
    return;
  }

  const showTargets = () => {
    counters.forEach((counter) => renderValue(counter, Number(counter.dataset.target)));
    document.dispatchEvent(
      new CustomEvent("portfolio:telemetry-ready", { detail: { counters } })
    );
  };

  if (reducedMotion || !("IntersectionObserver" in window)) {
    showTargets();
    return;
  }

  counters.forEach((counter) => renderValue(counter, 0));
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      observer.disconnect();
      const start = performance.now();
      const duration = 760;

      function update(timestamp) {
        let active = false;
        counters.forEach((counter, index) => {
          const progress = Math.min(1, Math.max(0, (timestamp - start - index * 70) / duration));
          renderValue(counter, Number(counter.dataset.target) * (1 - Math.pow(1 - progress, 3)));
          active ||= progress < 1;
        });
        active ? requestAnimationFrame(update) : showTargets();
      }

      requestAnimationFrame(update);
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.28 }
  );
  observer.observe(section);
}

/** Preserves the existing scroll-linked fade for the development process block. */
export function setupProcessFade(reducedMotion) {
  const processFade = document.querySelector(".process-fade");
  if (!processFade) return;

  if (reducedMotion) {
    processFade.style.setProperty("--process-opacity", "1");
    processFade.style.setProperty("--process-shift", "0px");
    processFade.style.setProperty("--process-blur", "0px");
    return;
  }

  let frame = 0;
  function update() {
    frame = 0;
    const rect = processFade.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const progress = Math.min(1, Math.max(0, (viewportHeight * 0.94 - rect.top) / (viewportHeight * 0.66)));
    processFade.style.setProperty("--process-opacity", (0.12 + progress * 0.88).toFixed(3));
    processFade.style.setProperty("--process-shift", `${((1 - progress) * 24).toFixed(2)}px`);
    processFade.style.setProperty("--process-blur", `${((1 - progress) * 1.8).toFixed(2)}px`);
  }
  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", requestUpdate);
  update();
}

/** Highlights the navigation item for the section currently in view. */
export function setupNavigationObserver(navLinks, sections) {
  if (!("IntersectionObserver" in window)) return;
  const linkBySection = new Map(navLinks.map((link) => [link.getAttribute("href").slice(1), link]));
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => link.classList.remove("is-active"));
      linkBySection.get(visible.target.id)?.classList.add("is-active");
    },
    { rootMargin: "-32% 0px -58% 0px", threshold: [0.12, 0.3, 0.55] }
  );
  sections.forEach((section) => observer.observe(section));
}
