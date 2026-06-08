const requiredClicks = 7;
const clickWindowMs = 3000;

/** Opens the protected login route only after seven rapid clicks on the TZ mark. */
export function setupHiddenAdminEntry() {
  const brand = document.querySelector(".brand");
  if (!brand) {
    return;
  }

  let clickCount = 0;
  let resetTimer = 0;

  function resetSequence() {
    clickCount = 0;
    clearTimeout(resetTimer);
    resetTimer = 0;
  }

  brand.addEventListener("click", async (event) => {
    clickCount += 1;
    if (clickCount === 1) {
      resetTimer = window.setTimeout(resetSequence, clickWindowMs);
    }
    if (clickCount < requiredClicks) {
      return;
    }

    event.preventDefault();
    resetSequence();
    try {
      const response = await fetch("/api/auth/entry", {
        method: "POST",
        credentials: "same-origin",
      });
      if (response.ok) {
        location.assign("/admin/login.html");
      }
    } catch {
      // The public navigation remains unaffected when the local server is unavailable.
    }
  });
}
