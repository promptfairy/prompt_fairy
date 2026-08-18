(() => {
  "use strict";

  const STORAGE_KEY = "prompt-fairy-change-set-v3";

  const OPERATIONS = [
    {
      id: "subject_count",
      zh: "人物數量",
      en: "SUBJECT COUNT",
      hint: "單人 ↔ 雙人、增加或減少人物",
      categories: ["character", "action", "framing"]
    },
    {
      id: "gender_appearance",
      zh: "性別／外觀",
      en: "APPEARANCE",
      hint: "性別、髮型、髮色、五官與身形",
      categories: ["character"]
    },
    {
      id: "wardrobe",
      zh: "服裝配件",
      en: "WARDROBE",
      hint: "衣著、飾品與固定配件",
      categories: ["clothing"]
    },
    {
      id: "pose_action",
      zh: "姿勢／互動",
      en: "POSE & ACTION",
      hint: "姿勢、動作、角色之間的互動",
      categories: ["action", "framing"]
    },
    {
      id: "scene",
      zh: "場景背景",
      en: "SCENE",
      hint: "地點、環境與背景元素",
      categories: ["scene"]
    },
    {
      id: "composition",
      zh: "構圖尺寸",
      en: "COMPOSITION",
      hint: "鏡位、景別、比例與畫面安排",
      categories: ["framing", "ratio"]
    }
  ];

  function emptyState() {
    return {
      selected: [],
      draft: "",
      scopeKey: "",
      appliedBlock: "",
      disabledIds: [],
      status: ""
    };
  }

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const base = emptyState();
      return {
        ...base,
        ...raw,
        selected: Array.isArray(raw.selected)
          ? raw.selected.filter((id) => OPERATIONS.some((item) => item.id === id))
          : [],
        draft: typeof raw.draft === "string" ? raw.draft : "",
        scopeKey: typeof raw.scopeKey === "string" ? raw.scopeKey : "",
        appliedBlock: typeof raw.appliedBlock === "string" ? raw.appliedBlock : "",
        disabledIds: Array.isArray(raw.disabledIds) ? raw.disabledIds.map(String) : [],
        status: typeof raw.status === "string" ? raw.status : ""
      };
    } catch {
      return emptyState();
    }
  }

  let localState = readState();
  let busy = false;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
    } catch {
      // Change Set is an enhancement. It must never block the core workspace.
    }
  }

  function selectedCategories() {
    const categories = new Set();
    OPERATIONS.forEach((operation) => {
      if (localState.selected.includes(operation.id)) {
        operation.categories.forEach((category) => categories.add(category));
      }
    });
    return categories;
  }

  function selectionKey() {
    return OPERATIONS.map((item) => item.id)
      .filter((id) => localState.selected.includes(id))
      .join("|");
  }

  function fragmentRecords() {
    return [...document.querySelectorAll(".workspace-page .fragment")].map((element) => {
      const textField = element.querySelector("[data-fragment-text]");
      const categoryField = element.querySelector("[data-fragment-category]");
      const enabledField = element.querySelector("[data-fragment-enabled]");
      return {
        element,
        id: textField?.dataset.fragmentText || "",
        text: textField?.value || "",
        category: categoryField?.value || "",
        enabled: Boolean(enabledField?.checked),
        locked: element.classList.contains("locked")
      };
    }).filter((item) => item.id);
  }

  function scopeRecords() {
    const categories = selectedCategories();
    const previouslyApplied = new Set(localState.disabledIds);
    if (!categories.size) return [];
    return fragmentRecords().filter((item) =>
      categories.has(item.category) &&
      !item.locked &&
      (item.enabled || previouslyApplied.has(item.id))
    );
  }

  function lockedScopeCount() {
    const categories = selectedCategories();
    if (!categories.size) return 0;
    return fragmentRecords().filter((item) => categories.has(item.category) && item.locked).length;
  }

  function extractScopeText() {
    return scopeRecords().map((item) => item.text.trim()).filter(Boolean).join("\n\n");
  }

  function syncDraftToSelection({ force = false } = {}) {
    const key = selectionKey();
    if (!key) {
      localState.scopeKey = "";
      if (force) localState.draft = "";
      saveState();
      return;
    }
    if (force || localState.scopeKey !== key) {
      localState.scopeKey = key;
      localState.draft = extractScopeText();
      localState.status = "";
      saveState();
    }
  }

  function nextFrame(count = 1) {
    return new Promise((resolve) => {
      const step = () => {
        if (count <= 1) return requestAnimationFrame(resolve);
        count -= 1;
        requestAnimationFrame(step);
      };
      step();
    });
  }

  async function ensureAllIngredientFilter() {
    const all = document.querySelector('.ingredient-tab[data-value="all"]');
    if (all && !all.classList.contains("active")) {
      all.click();
      await nextFrame(2);
    }
  }

  function findEnabledCheckbox(id) {
    return [...document.querySelectorAll("[data-fragment-enabled]")]
      .find((input) => input.dataset.fragmentEnabled === id) || null;
  }

  async function setFragmentEnabled(id, enabled) {
    const checkbox = findEnabledCheckbox(id);
    if (!checkbox || checkbox.checked === enabled) return;
    checkbox.checked = enabled;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    await nextFrame(2);
  }

  function removeAppliedBlock(text, block) {
    const source = String(text || "").trim();
    const target = String(block || "").trim();
    if (!source || !target) return source;
    if (source === target) return "";

    const variants = [
      `\n${target}\n`,
      `${target}\n`,
      `\n${target}`
    ];
    let next = source;
    for (const variant of variants) {
      if (next.includes(variant)) {
        next = next.replace(variant, "\n");
        return next.replace(/\n{3,}/g, "\n\n").trim();
      }
    }
    return next;
  }

  function writeAdditions(value) {
    const textarea = document.querySelector("#additions");
    if (!textarea) return false;
    textarea.value = value;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  async function undoApplied({ recompose = false } = {}) {
    if (busy) return;
    busy = true;
    try {
      await ensureAllIngredientFilter();
      const ids = [...localState.disabledIds];
      for (const id of ids) await setFragmentEnabled(id, true);

      const additions = document.querySelector("#additions");
      if (additions && localState.appliedBlock) {
        writeAdditions(removeAppliedBlock(additions.value, localState.appliedBlock));
        await nextFrame();
      }

      localState.disabledIds = [];
      localState.appliedBlock = "";
      localState.status = "已復原上一筆 Change Set 替換。";
      saveState();
      if (recompose) document.querySelector('[data-action="compile"]')?.click();
    } finally {
      busy = false;
      scheduleSync();
    }
  }

  async function applyReplacement() {
    if (busy || !localState.selected.length || !localState.draft.trim()) return;
    busy = true;
    try {
      await ensureAllIngredientFilter();

      // Re-applying a Change Set first removes only the changes made by the previous Change Set.
      const priorIds = [...localState.disabledIds];
      for (const id of priorIds) await setFragmentEnabled(id, true);
      const additionsBefore = document.querySelector("#additions");
      if (additionsBefore && localState.appliedBlock) {
        writeAdditions(removeAppliedBlock(additionsBefore.value, localState.appliedBlock));
        await nextFrame();
      }
      localState.disabledIds = [];
      localState.appliedBlock = "";

      const targets = scopeRecords().filter((item) => item.enabled);
      if (!targets.length) {
        localState.status = lockedScopeCount()
          ? "這次命中的材料都已鎖定；沒有改寫任何內容。"
          : "目前沒有可替換的相關材料。";
        saveState();
        return;
      }

      const targetIds = [...new Set(targets.map((item) => item.id))];
      for (const id of targetIds) await setFragmentEnabled(id, false);

      const additions = document.querySelector("#additions");
      if (!additions) {
        // If the composition panel is temporarily unavailable, restore the originals.
        for (const id of targetIds) await setFragmentEnabled(id, true);
        localState.status = "找不到調製區，這次沒有套用替換。";
        saveState();
        return;
      }

      const replacement = localState.draft.trim();
      const preservedAdditions = additions.value.trim();
      const nextAdditions = [preservedAdditions, replacement].filter(Boolean).join("\n");
      writeAdditions(nextAdditions);
      await nextFrame();

      localState.disabledIds = targetIds;
      localState.appliedBlock = replacement;
      localState.status = `已替換 ${targetIds.length} 份舊材料；未勾選內容保持原樣。`;
      saveState();

      document.querySelector('[data-action="compile"]')?.click();
    } finally {
      busy = false;
      scheduleSync();
    }
  }

  function toggleOperation(id) {
    const selected = new Set(localState.selected);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    localState.selected = OPERATIONS.map((item) => item.id).filter((item) => selected.has(item));
    localState.scopeKey = "";
    saveState();
    ensureAllIngredientFilter().then(() => {
      syncDraftToSelection({ force: true });
      rebuildControls();
    });
  }

  function clearSelection() {
    localState.selected = [];
    localState.scopeKey = "";
    localState.draft = "";
    localState.status = "";
    saveState();
    rebuildControls();
  }

  function scopeInfo() {
    const scope = scopeRecords();
    const categories = selectedCategories();
    return {
      count: scope.length,
      locked: lockedScopeCount(),
      categories: [...categories]
    };
  }

  function operationButton(operation) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "change-set-v3-operation";
    button.dataset.changeSetV3Operation = operation.id;
    button.setAttribute("aria-pressed", String(localState.selected.includes(operation.id)));
    button.innerHTML = `<strong></strong><small></small><em></em>`;
    button.querySelector("strong").textContent = operation.zh;
    button.querySelector("small").textContent = operation.en;
    button.querySelector("em").textContent = operation.hint;
    button.addEventListener("click", () => toggleOperation(operation.id));
    return button;
  }

  function makeControls() {
    syncDraftToSelection();
    const info = scopeInfo();
    const wrapper = document.createElement("section");
    wrapper.className = "change-set-v3";
    wrapper.dataset.changeSetV3 = "true";

    wrapper.innerHTML = `
      <div class="change-set-v3-head">
        <div class="change-set-v3-copy">
          <span class="change-set-v3-kicker">CHANGE SET</span>
          <strong class="change-set-v3-title">這次想改什麼？</strong>
          <p>勾選修改範圍，小精靈只抽出那些內容；其他 Prompt 保持原樣。</p>
        </div>
        <button type="button" class="change-set-v3-clear" data-change-set-v3-clear>清除選擇</button>
      </div>
      <div class="change-set-v3-operations" data-change-set-v3-operations></div>
      <div class="change-set-v3-editor" data-change-set-v3-editor></div>
    `;

    const operations = wrapper.querySelector("[data-change-set-v3-operations]");
    OPERATIONS.forEach((operation) => operations.appendChild(operationButton(operation)));

    wrapper.querySelector("[data-change-set-v3-clear]").addEventListener("click", clearSelection);

    const editor = wrapper.querySelector("[data-change-set-v3-editor]");
    if (!localState.selected.length) {
      editor.innerHTML = `
        <div class="change-set-v3-empty">
          <strong>先勾選這次要改的部分。</strong>
          <span>完整拆分會留在下方 Advanced Semantic Index，不需要逐份管理。</span>
        </div>
      `;
      return wrapper;
    }

    const categoryLabel = info.categories.length ? info.categories.join(" · ") : "—";
    editor.innerHTML = `
      <div class="change-set-v3-scope-head">
        <div>
          <small>REPLACEMENT SCOPE</small>
          <strong>本次替換內容</strong>
        </div>
        <span>${info.count} 份可替換${info.locked ? ` · ${info.locked} 份鎖定保留` : ""}</span>
      </div>
      <p class="change-set-v3-scope-note">已從 <b>${categoryLabel}</b> 抽出相關內容。直接把下面這格改成你要的新版本，不需要回頭逐份改材料。</p>
      <textarea rows="8" data-change-set-v3-draft placeholder="這裡會出現本次篩出的原內容；直接改成新的版本。"></textarea>
      <div class="change-set-v3-actions">
        <button type="button" class="change-set-v3-secondary" data-change-set-v3-reextract>重新抓取原內容</button>
        ${localState.appliedBlock ? `<button type="button" class="change-set-v3-secondary" data-change-set-v3-undo>復原上一筆替換</button>` : ""}
        <button type="button" class="btn primary change-set-v3-apply" data-change-set-v3-apply>套用替換並調製</button>
      </div>
      <div class="change-set-v3-status" data-change-set-v3-status>${localState.status || "未勾選的內容不會被停用或重寫。"}</div>
    `;

    const draft = editor.querySelector("[data-change-set-v3-draft]");
    draft.value = localState.draft;
    draft.addEventListener("input", () => {
      localState.draft = draft.value;
      localState.status = "";
      saveState();
    });

    editor.querySelector("[data-change-set-v3-reextract]").addEventListener("click", () => {
      localState.draft = extractScopeText();
      localState.status = "已重新抓取目前相關材料。";
      saveState();
      rebuildControls();
    });

    editor.querySelector("[data-change-set-v3-undo]")?.addEventListener("click", () => undoApplied({ recompose: true }));
    const apply = editor.querySelector("[data-change-set-v3-apply]");
    apply.disabled = !localState.draft.trim() || info.count === 0;
    apply.addEventListener("click", applyReplacement);

    return wrapper;
  }

  function wrapAdvanced(panel) {
    if (panel.querySelector("[data-change-set-v3-advanced]")) return;

    const tabs = panel.querySelector(".ingredient-tabs");
    const summary = panel.querySelector(".ingredient-summary");
    const list = panel.querySelector(".recipe-list");
    if (!tabs || !list) return;

    const details = document.createElement("details");
    details.className = "change-set-v3-advanced";
    details.dataset.changeSetV3Advanced = "true";
    details.innerHTML = `
      <summary>
        <span><strong>Advanced Semantic Index</strong><small>完整拆分／手動校正</small></span>
        <span>需要時再展開</span>
      </summary>
      <div class="change-set-v3-advanced-body"></div>
    `;

    const body = details.querySelector(".change-set-v3-advanced-body");
    body.appendChild(tabs);
    if (summary) body.appendChild(summary);
    body.appendChild(list);
    panel.appendChild(details);
  }

  function tuneCoreCopy(workspace, panel) {
    const parseButton = workspace.querySelector('[data-action="parse"]');
    if (parseButton) parseButton.textContent = "分析可替換區域";

    const title = panel.querySelector(".step-title h2");
    const subtitle = panel.querySelector(".step-title p");
    if (title) title.textContent = "選擇這次要改的部分";
    if (subtitle) subtitle.textContent = "完整 Prompt 當底稿；只抽出這次真正要替換的範圍。";
  }

  function rebuildControls() {
    const panel = document.querySelector(".workspace-page .ingredients-panel");
    if (!panel) return;
    panel.querySelector("[data-change-set-v3]")?.remove();
    const details = panel.querySelector("[data-change-set-v3-advanced]");
    const controls = makeControls();
    if (details) details.insertAdjacentElement("beforebegin", controls);
    else panel.querySelector(".step-title")?.insertAdjacentElement("afterend", controls);
  }

  function syncWorkspace() {
    if (busy) return;
    const workspace = document.querySelector(".workspace-page");
    const panel = workspace?.querySelector(".ingredients-panel");
    if (!workspace || !panel) return;

    tuneCoreCopy(workspace, panel);
    wrapAdvanced(panel);
    if (!panel.querySelector("[data-change-set-v3]")) {
      const details = panel.querySelector("[data-change-set-v3-advanced]");
      const controls = makeControls();
      if (details) details.insertAdjacentElement("beforebegin", controls);
      else panel.querySelector(".step-title")?.insertAdjacentElement("afterend", controls);
    }
  }

  function scheduleSync() {
    requestAnimationFrame(syncWorkspace);
  }

  const app = document.querySelector("#app");
  if (app) {
    const observer = new MutationObserver(scheduleSync);
    observer.observe(app, { childList: true, subtree: true });
    app.addEventListener("change", (event) => {
      if (event.target.matches("[data-fragment-category], [data-fragment-enabled], [data-fragment-locked]")) {
        scheduleSync();
      }
    });
  }

  window.addEventListener("hashchange", scheduleSync);
  scheduleSync();
})();
