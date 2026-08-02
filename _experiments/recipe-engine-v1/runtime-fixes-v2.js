(() => {
  const TOAST_STORAGE_KEY = "prompt-fairy-active-toast-v1";
  const TOAST_VISIBLE_MS = 10000;
  const TOAST_EXIT_MS = 420;
  let toastTimer = 0;
  let toastExitTimer = 0;

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
      if (link.classList.contains("product-brand")) link.setAttribute("aria-label", "前往調製台");
    });
  }

  function readToast() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(TOAST_STORAGE_KEY) || "null");
      if (!parsed?.text || !parsed?.expiresAt) return null;
      if (Date.now() >= parsed.expiresAt) {
        sessionStorage.removeItem(TOAST_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      sessionStorage.removeItem(TOAST_STORAGE_KEY);
      return null;
    }
  }

  function saveToast(text) {
    const toast = { text, createdAt: Date.now(), expiresAt: Date.now() + TOAST_VISIBLE_MS };
    sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(toast));
    return toast;
  }

  function clearToastTimers() {
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastExitTimer);
    toastTimer = 0;
    toastExitTimer = 0;
  }

  function removeToastElement() {
    document.querySelector(".page-toast.runtime-toast")?.remove();
  }

  function renderPersistentToast() {
    clearToastTimers();
    removeToastElement();

    const record = readToast();
    if (!record) return;

    const toast = document.createElement("div");
    toast.className = "page-toast runtime-toast is-entering";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `<span class="runtime-toast-signal" aria-hidden="true">✦</span><span>${escapeHtml(record.text)}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove("is-entering")));

    const remaining = Math.max(0, record.expiresAt - Date.now());
    toastTimer = window.setTimeout(() => {
      if (!toast.isConnected) return;
      toast.classList.add("is-dismissing");
      toastExitTimer = window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
        sessionStorage.removeItem(TOAST_STORAGE_KEY);
      }, TOAST_EXIT_MS);
    }, remaining);
  }

  function suppressLegacyToast() {
    document.querySelectorAll(".page-toast:not(.runtime-toast)").forEach((toast) => toast.remove());
  }

  function handleMaterialApply(event) {
    const button = event.target.closest?.("[data-apply-material]");
    if (!button) return;

    const material = state.materials?.find((item) => item.id === button.dataset.applyMaterial);
    if (!material) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    state.mixer.additions = [state.mixer.additions.trim(), material.content].filter(Boolean).join("\n");
    saveState();
    saveToast(`已將「${material.name}」加入調製台。`);

    /* Stay on the current library page. Re-render only to keep UI state synchronized. */
    render();
    renderPersistentToast();
  }

  function applyRuntimeFixes() {
    patchHomeLinks();
    suppressLegacyToast();
    renderPersistentToast();
  }

  /* Capture before unified-shell's existing click handler, which changes the route. */
  document.addEventListener("click", handleMaterialApply, true);

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
