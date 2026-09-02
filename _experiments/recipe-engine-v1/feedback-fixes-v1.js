(() => {
  "use strict";

  let syncFrame = 0;
  let loadToken = 0;
  let resetContext = null;

  function scheduleSync() {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      syncActionLabels();
    });
  }

  function decorateAction(button, title, subtitle) {
    if (!button) return;
    const signature = `${title}|${subtitle}`;
    if (button.dataset.feedbackLabelV1 === signature) return;
    button.dataset.feedbackLabelV1 = signature;
    button.innerHTML = `<span class="feedback-button-copy"><strong>${title}</strong><small>${subtitle}</small></span>`;
    button.title = `${title}｜${subtitle}`;
    button.setAttribute("aria-label", `${title}（${subtitle}）`);
  }

  function syncActionLabels() {
    document.querySelectorAll('[data-action="save-output"]').forEach((button) => {
      decorateAction(button, "收進胖譜庫", "另存新檔");
    });
    document.querySelectorAll('[data-action="save-version"]').forEach((button) => {
      decorateAction(button, "存為新版本", "更新版本");
    });
  }

  function fireInput(element, value) {
    if (!element || element.value === value) return false;
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function retryReset(token, delay = 0) {
    setTimeout(() => requestAnimationFrame(() => resetLoadedPrompt(token)), delay);
  }

  function resetLoadedPrompt(token) {
    if (token !== loadToken || !resetContext) return;
    const workspace = document.querySelector(".workspace-page");
    if (!workspace) {
      if (resetContext.attempts++ < 12) retryReset(token, 30);
      return;
    }

    // A saved prompt starts a fresh brew: keep the prompt itself, discard prior workspace choices.
    fireInput(workspace.querySelector("#additions"), "");
    fireInput(workspace.querySelector("#ratio"), "");

    const originalOrder = workspace.querySelector('[data-action="order-mode"][data-value="original"]');
    if (originalOrder && !originalOrder.classList.contains("active")) {
      originalOrder.click();
      retryReset(token);
      return;
    }

    const selectedMaterial = workspace.querySelector('[data-material-pick]:checked');
    if (selectedMaterial) {
      selectedMaterial.checked = false;
      selectedMaterial.dispatchEvent(new Event("change", { bubbles: true }));
      retryReset(token);
      return;
    }

    // Change Set v8 keeps its own local editing state. Clear character slots through its
    // public controls so the in-memory overlay and the core workspace stay in sync.
    const selectedCharacter = [...workspace.querySelectorAll("[data-v8-character-slot]")]
      .find((select) => select.value);
    if (selectedCharacter) {
      selectedCharacter.value = "";
      selectedCharacter.dispatchEvent(new Event("change", { bubbles: true }));
      retryReset(token);
      return;
    }

    const baseCharacter = [...workspace.querySelectorAll("[data-character-slot]")]
      .find((select) => select.value);
    if (baseCharacter) {
      baseCharacter.value = "";
      baseCharacter.dispatchEvent(new Event("change", { bubbles: true }));
      retryReset(token);
      return;
    }

    const extraSlot = workspace.querySelector("[data-v8-remove-slot]");
    if (extraSlot) {
      extraSlot.click();
      retryReset(token);
      return;
    }

    // Clearing through this control also drops old replacement text and status.
    const clear = workspace.querySelector("[data-v7-clear]");
    if (clear && !clear.hidden) {
      clear.click();
      resetContext.changeSetCleared = true;
      retryReset(token);
      return;
    }

    // If no operation is currently selected, there can still be stale replacement text
    // from an earlier deselected operation. Toggle one operation once, then use Clear.
    if (!resetContext.changeSetCleared && !resetContext.forcedClear) {
      const operation = workspace.querySelector(".change-set-v3-operation");
      if (operation) {
        resetContext.forcedClear = true;
        operation.click();
        retryReset(token);
        return;
      }
      if (resetContext.overlayAttempts++ < 8) {
        retryReset(token, 30);
        return;
      }
    }

    if (!resetContext.changeSetCleared && resetContext.forcedClear) {
      const forcedClear = workspace.querySelector("[data-v7-clear]");
      if (forcedClear && !forcedClear.hidden) {
        forcedClear.click();
        resetContext.changeSetCleared = true;
        retryReset(token);
        return;
      }
    }

    // Re-run the core classifier once after the old workspace state is gone. This refreshes
    // fragments/warnings from the saved prompt itself and lands the user on a clean Step 02.
    if (!resetContext.reparsed) {
      const parseButton = workspace.querySelector('[data-action="parse"]');
      if (parseButton && !parseButton.disabled) {
        resetContext.reparsed = true;
        parseButton.click();
        retryReset(token);
        return;
      }
    }

    syncActionLabels();
    resetContext = null;
    workspace.querySelector(".ingredients-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.('[data-action="open-prompt"]');
    if (!trigger) return;
    const token = ++loadToken;
    resetContext = { attempts: 0, overlayAttempts: 0, forcedClear: false, changeSetCleared: false, reparsed: false };
    // Core's bubble listener loads and re-classifies the saved prompt first.
    setTimeout(() => retryReset(token), 0);
  }, true);

  const app = document.querySelector("#app");
  if (app) new MutationObserver(scheduleSync).observe(app, { childList: true, subtree: true });
  scheduleSync();
})();
