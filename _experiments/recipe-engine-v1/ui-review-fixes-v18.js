(() => {
  "use strict";

  function relocateLibraryNotice() {
    document.querySelectorAll(".library-page").forEach((page) => {
      const header = page.querySelector(":scope > .page-header");
      const note = page.querySelector("[data-local-image-note]");
      if (!header || !note || note.parentElement === header) return;
      header.append(note);
    });
  }

  const app = document.getElementById("app");
  if (!app) return;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      relocateLibraryNotice();
    });
  };

  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  schedule();
})();
