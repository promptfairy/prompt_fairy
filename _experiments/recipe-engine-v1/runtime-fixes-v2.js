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
      if (!parsed?.id || !parsed?.text || !parsed?.expiresAt) return null;
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
    const now = Date.now();
    const toast = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: now,
      expiresAt: now + TOAST_VISIBLE_MS
    };
    sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(toast));
    return toast;
  }

  function clearToastTimers() {
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastExitTimer);
    toastTimer = 0;
    toastExitTimer = 0;
  }

  function ensureToastLayer() {
    let layer = document.querySelector("#runtime-toast-layer");
    if (layer) return layer;

    layer = document.createElement("div");
    layer.id = "runtime-toast-layer";
    layer.className = "runtime-toast-layer";
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-atomic", "true");
    document.body.appendChild(layer);
    return layer;
  }

  function scheduleToastDismiss(record, toast) {
    clearToastTimers();
    const remaining = Math.max(0, record.expiresAt - Date.now());

    toastTimer = window.setTimeout(() => {
      if (!toast.isConnected) return;
      toast.classList.add("is-dismissing");
      toastExitTimer = window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
        const current = readToast();
        if (!current || current.id === record.id) sessionStorage.removeItem(TOAST_STORAGE_KEY);
      }, TOAST_EXIT_MS);
    }, remaining);
  }

  function renderPersistentToast() {
    const record = readToast();
    const layer = ensureToastLayer();
    let toast = layer.querySelector(".runtime-toast");

    if (!record) {
      clearToastTimers();
      toast?.remove();
      return;
    }

    /* Keep the same DOM node alive across #app re-renders and route changes. */
    if (toast?.dataset.toastId === record.id) {
      const message = toast.querySelector(".runtime-toast-message");
      if (message && message.textContent !== record.text) message.textContent = record.text;
      scheduleToastDismiss(record, toast);
      return;
    }

    clearToastTimers();
    toast?.remove();

    toast = document.createElement("div");
    toast.className = "page-toast runtime-toast is-entering";
    toast.dataset.toastId = record.id;
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="runtime-toast-signal" aria-hidden="true">✦</span>
      <span class="runtime-toast-message">${escapeHtml(record.text)}</span>
    `;
    layer.appendChild(toast);

    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove("is-entering")));
    scheduleToastDismiss(record, toast);
  }

  function suppressLegacyToast() {
    document.querySelectorAll("#app .page-toast").forEach((toast) => toast.remove());
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

    /* Stay on the current library page. The toast lives outside #app and survives re-renders. */
    render();
    renderPersistentToast();
  }

  function applyRuntimeFixes() {
    patchHomeLinks();
    suppressLegacyToast();
    renderPersistentToast();
  }

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
