(() => {
  "use strict";

  // Keep the source-prompt typing path light without changing the v19 data model.
  // Core state still updates on every keystroke; only the synchronous localStorage write
  // and Change Set v8's expensive control rebuild are delayed until the user pauses.
  const CORE_KEY = "prompt-fairy-arcane-v2";
  const SAVE_DELAY_MS = 140;
  const REBUILD_DELAY_MS = 180;

  const nativeSetItem = Storage.prototype.setItem;
  const nativeDocumentAddEventListener = document.addEventListener;

  let sourceInputBurst = false;
  let pendingCoreValue = null;
  let saveTimer = 0;
  let rebuildTimer = 0;
  let registrationPatchRestored = false;

  function flushCore() {
    if (pendingCoreValue === null) return;
    const value = pendingCoreValue;
    pendingCoreValue = null;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = 0;
    }
    try {
      nativeSetItem.call(localStorage, CORE_KEY, value);
    } catch (error) {
      console.warn("Unable to persist Prompt Fairy draft", error);
    }
  }

  function scheduleCoreFlush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushCore, SAVE_DELAY_MS);
  }

  // Runs before the core bubble-phase input handler so its persistState() call can be deferred.
  nativeDocumentAddEventListener.call(document, "input", (event) => {
    if (event.target?.id !== "sourcePrompt") return;
    sourceInputBurst = true;
    queueMicrotask(() => { sourceInputBurst = false; });
  }, true);

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const storageKey = String(key);
    if (this === localStorage && storageKey === CORE_KEY && sourceInputBurst) {
      pendingCoreValue = String(value);
      scheduleCoreFlush();
      return;
    }

    // Preserve ordering if another core-state write happens while a draft save is pending.
    if (this === localStorage && storageKey === CORE_KEY && pendingCoreValue !== null) flushCore();
    return nativeSetItem.call(this, key, value);
  };

  // Never let a delayed draft outrun an explicit user action or page lifecycle boundary.
  const flushBeforeBoundary = () => flushCore();
  nativeDocumentAddEventListener.call(document, "click", flushBeforeBoundary, true);
  nativeDocumentAddEventListener.call(document, "change", flushBeforeBoundary, true);
  nativeDocumentAddEventListener.call(document, "submit", flushBeforeBoundary, true);
  nativeDocumentAddEventListener.call(document, "visibilitychange", () => {
    if (document.hidden) flushCore();
  });
  window.addEventListener("hashchange", flushBeforeBoundary);
  window.addEventListener("pagehide", flushBeforeBoundary);
  window.addEventListener("beforeunload", flushBeforeBoundary);

  // This file is loaded immediately before Change Set v8. Wrap only listeners registered
  // during that short window, then input-performance-v1-post.js restores registration.
  document.addEventListener = function patchedDocumentAddEventListener(type, listener, options) {
    if (type === "input" && typeof listener === "function") {
      const wrapped = function deferredSourcePromptListener(event) {
        if (event?.target?.id !== "sourcePrompt") return listener.call(this, event);
        const target = event.target;
        if (rebuildTimer) clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
          rebuildTimer = 0;
          flushCore();
          // Change Set v8 only reads event.target in this listener.
          listener.call(document, { target });
        }, REBUILD_DELAY_MS);
      };
      return nativeDocumentAddEventListener.call(this, type, wrapped, options);
    }
    return nativeDocumentAddEventListener.call(this, type, listener, options);
  };

  window.__promptFairyInputPerformanceV1 = {
    flush: flushCore,
    restoreRegistrationPatch() {
      if (registrationPatchRestored) return;
      document.addEventListener = nativeDocumentAddEventListener;
      registrationPatchRestored = true;
    },
  };
})();
