/** Initializes the existing global parallax, card tilt, and solution cursor glow effects. */
export function setupPointerEffects(reducedMotion) {
  if (reducedMotion || !matchMedia("(pointer: fine)").matches) {
    return;
  }

  const tiltCards = [...document.querySelectorAll(".tilt-card")];
  let parallaxFrame = 0;

  addEventListener(
    "pointermove",
    (event) => {
      if (parallaxFrame) return;
      parallaxFrame = requestAnimationFrame(() => {
        parallaxFrame = 0;
        const x = event.clientX / innerWidth - 0.5;
        const y = event.clientY / innerHeight - 0.5;
        document.documentElement.style.setProperty("--parallax-x", `${(x * -22).toFixed(2)}px`);
        document.documentElement.style.setProperty("--parallax-y", `${(y * -16).toFixed(2)}px`);
        document.documentElement.style.setProperty("--marker-x", `${(x * 19.8).toFixed(2)}px`);
        document.documentElement.style.setProperty("--marker-y", `${(y * 14.4).toFixed(2)}px`);
        document.documentElement.style.setProperty("--card-parallax-x", `${(x * 7).toFixed(2)}px`);
        document.documentElement.style.setProperty("--card-parallax-y", `${(y * 5).toFixed(2)}px`);
      });
    },
    { passive: true }
  );

  tiltCards.forEach((card) => {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    card.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          const rect = card.getBoundingClientRect();
          const normalizedX = Math.min(1, Math.max(-1, ((pointerX - rect.left) / rect.width) * 2 - 1));
          const normalizedY = Math.min(1, Math.max(-1, ((pointerY - rect.top) / rect.height) * 2 - 1));
          card.style.setProperty("--tilt-x", `${(-normalizedY * 10).toFixed(2)}deg`);
          card.style.setProperty("--tilt-y", `${(normalizedX * 13).toFixed(2)}deg`);

          if (card.classList.contains("solution-card")) {
            card.style.setProperty("--cursor-x", `${(pointerX - rect.left).toFixed(2)}px`);
            card.style.setProperty("--cursor-y", `${(pointerY - rect.top).toFixed(2)}px`);
          }
        });
      },
      { passive: true }
    );

    card.addEventListener("pointerleave", () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      if (card.classList.contains("solution-card")) {
        card.style.setProperty("--cursor-x", "-300px");
        card.style.setProperty("--cursor-y", "-300px");
      }
    });
  });
}
