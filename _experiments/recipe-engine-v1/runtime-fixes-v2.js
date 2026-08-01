(() => {
  const TOAST_VISIBLE_MS = 2600;
  const TOAST_FADE_MS = 320;
  let lastDismissedToast = "";
  let lastDismissedAt = 0;

  function forceWorkspaceRoute() {
    const hash = location.hash.slice(1);
    if (!hash || hash === "home") {
      history.replaceState(null, "", `${location.pathname}${location.search}#workspace`);
      activeView = "workspace";
      render();
      return true;
    }
    return false;
  }

  function patchHomeLinks() {
    document.querySelectorAll('a[href="#home"]').forEach((link) => {
      link.setAttribute("href", "#workspace");
      if (link.classList.contains("product-brand")) {
        link.setAttribute("aria-label", "前往調製台");
      }
    });
  }

  function manageToast() {
    const toast = document.querySelector(".page-toast");
    if (!toast) return;

    const text = toast.textContent.trim();
    const recentlyDismissed = text && text === lastDismissedToast && Date.now() - lastDismissedAt < 10000;
    if (recentlyDismissed) {
      toast.remove();
      return;
    }

    if (toast.dataset.autoDismissBound === "true") return;
    toast.dataset.autoDismissBound = "true";

    window.setTimeout(() => {
      if (!toast.isConnected) return;
      toast.classList.add("is-dismissing");
      window.setTimeout(() => {
        if (!toast.isConnected) return;
        lastDismissedToast = text;
        lastDismissedAt = Date.now();
        toast.remove();
      }, TOAST_FADE_MS);
    }, TOAST_VISIBLE_MS);
  }

  function applyRuntimeFixes() {
    patchHomeLinks();
    manageToast();
  }

  const baseRender = render;
  render = function runtimeFixedRender() {
    baseRender();
    applyRuntimeFixes();
  };

  window.addEventListener("hashchange", () => {
    if (!forceWorkspaceRoute()) applyRuntimeFixes();
  });

  if (!forceWorkspaceRoute()) applyRuntimeFixes();
})();
