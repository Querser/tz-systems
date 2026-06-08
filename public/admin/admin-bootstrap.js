document.documentElement.classList.add("admin-loading");

window.__adminPreloaderFallback = window.setTimeout(() => {
  document.documentElement.classList.remove("admin-loading");
  document.querySelector("#admin-preloader")?.setAttribute("hidden", "");
}, 4000);
