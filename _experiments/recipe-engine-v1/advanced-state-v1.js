(() => {
  "use strict";

  let advancedOpen = null;

  function advancedDetails() {
    return document.querySelector('.workspace-page details[data-v7-advanced]');
  }

  function restore() {
    const details = advancedDetails();
    if (!details || advancedOpen === null) return;
    details.open = advancedOpen;
  }

  document.addEventListener("toggle", (event) => {
    const details = event.target?.closest?.('details[data-v7-advanced]');
    if (!details) return;
    advancedOpen = details.open;
  }, true);

  const app = document.getElementById("app");
  if (app) {
    new MutationObserver(() => requestAnimationFrame(restore)).observe(app, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener("hashchange", () => requestAnimationFrame(restore));
})();
