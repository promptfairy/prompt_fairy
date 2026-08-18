(() => {
  "use strict";

  const STORAGE_KEY = "prompt-fairy-change-set-v2";

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

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        selected: Array.isArray(parsed.selected) ? parsed.selected.filter((id) => OPERATIONS.some((item) => item.id === id)) : [],
        request: typeof parsed.request === "string" ? parsed.request : ""
      };
    } catch {
      return { selected: [], request: "" };
    }
  }

  let localState = readState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
    } catch {
      // This enhancement must never block the main workspace.
    }
  }

  function selectedCategories() {
    const set = new Set();
    OPERATIONS.forEach((operation) => {
      if (localState.selected.includes(operation.id)) {
        operation.categories.forEach((category) => set.add(category));
      }
    });
    return set;
  }

  function ensureAllIngredientFilter() {
    const all = document.querySelector('.ingredient-tab[data-value="all"]');
    if (all && !all.classList.contains("active")) all.click();
  }

  function fragmentCategory(fragment) {
    return fragment.querySelector("[data-fragment-category]")?.value || "";
  }

  function applyScopeFilter() {
    const fragments = [...document.querySelectorAll(".workspace-page .fragment")];
    if (!fragments.length) return;

    const categories = selectedCategories();
    let shown = 0;

    fragments.forEach((fragment) => {
      const visible = categories.size === 0 || categories.has(fragmentCategory(fragment));
      fragment.dataset.changeSetHidden = visible ? "false" : "true";
      if (visible) shown += 1;
    });

    const status = document.querySelector("[data-change-set-v2-status]");
    if (status) {
      const label = status.querySelector("strong");
      const detail = status.querySelector("span");
      if (categories.size === 0) {
        if (label) label.textContent = "尚未篩選";
        if (detail) detail.textContent = `目前顯示全部 ${fragments.length} 份材料`;
      } else {
        if (label) label.textContent = `${shown} / ${fragments.length} 份相關材料`;
        if (detail) detail.textContent = "只收斂畫面，不刪除或改寫原 Prompt";
      }
    }
  }

  function toggleOperation(id) {
    const selected = new Set(localState.selected);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    localState.selected = OPERATIONS.map((item) => item.id).filter((item) => selected.has(item));
    saveState();
    ensureAllIngredientFilter();
    requestAnimationFrame(syncWorkspace);
  }

  function clearOperations() {
    localState.selected = [];
    saveState();
    requestAnimationFrame(syncWorkspace);
  }

  function makeControls() {
    const wrapper = document.createElement("section");
    wrapper.className = "change-set-v2";
    wrapper.dataset.changeSetV2 = "true";

    wrapper.innerHTML = `
      <div class="change-set-v2-head">
        <div class="change-set-v2-copy">
          <span class="change-set-v2-kicker">CHANGE SET</span>
          <strong class="change-set-v2-title">這次想改什麼？</strong>
          <p class="change-set-v2-help">保留完整 Prompt 當底稿，只勾這次要改動的部分；下方材料會收斂成相關範圍。</p>
        </div>
        <button type="button" class="change-set-v2-clear" data-change-set-v2-clear>清除</button>
      </div>
      <div class="change-set-v2-operations" data-change-set-v2-operations></div>
      <label class="change-set-v2-request">
        <span>修改說明 <small>CHANGE REQUEST</small></span>
        <textarea rows="3" data-change-set-v2-request placeholder="例如：單人改成兩個成年男性，保留原本場景與光線；兩人都換成黑色西裝。"></textarea>
      </label>
      <div class="change-set-v2-status" data-change-set-v2-status>
        <strong>尚未篩選</strong>
        <span></span>
      </div>
    `;

    const operations = wrapper.querySelector("[data-change-set-v2-operations]");
    OPERATIONS.forEach((operation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "change-set-v2-operation";
      button.dataset.changeSetV2Operation = operation.id;
      button.setAttribute("aria-pressed", String(localState.selected.includes(operation.id)));
      button.innerHTML = `<strong></strong><small></small><em></em>`;
      button.querySelector("strong").textContent = operation.zh;
      button.querySelector("small").textContent = operation.en;
      button.querySelector("em").textContent = operation.hint;
      button.addEventListener("click", () => toggleOperation(operation.id));
      operations.appendChild(button);
    });

    const clear = wrapper.querySelector("[data-change-set-v2-clear]");
    clear.addEventListener("click", clearOperations);

    const textarea = wrapper.querySelector("[data-change-set-v2-request]");
    textarea.value = localState.request;
    textarea.addEventListener("input", () => {
      localState.request = textarea.value;
      saveState();
    });

    return wrapper;
  }

  function refreshControls() {
    document.querySelectorAll("[data-change-set-v2-operation]").forEach((button) => {
      button.setAttribute("aria-pressed", String(localState.selected.includes(button.dataset.changeSetV2Operation)));
    });
    const clear = document.querySelector("[data-change-set-v2-clear]");
    if (clear) clear.hidden = localState.selected.length === 0;
    const textarea = document.querySelector("[data-change-set-v2-request]");
    if (textarea && document.activeElement !== textarea && textarea.value !== localState.request) textarea.value = localState.request;
  }

  function syncWorkspace() {
    const workspace = document.querySelector(".workspace-page");
    if (!workspace) return;

    const tabs = workspace.querySelector(".ingredient-tabs");
    if (!tabs) return;

    let controls = workspace.querySelector("[data-change-set-v2]");
    if (!controls) {
      controls = makeControls();
      tabs.insertAdjacentElement("beforebegin", controls);
    }

    refreshControls();
    applyScopeFilter();
  }

  function scheduleSync() {
    requestAnimationFrame(syncWorkspace);
  }

  const app = document.querySelector("#app");
  if (app) {
    const observer = new MutationObserver(scheduleSync);
    observer.observe(app, { childList: true, subtree: true });
    app.addEventListener("change", (event) => {
      if (event.target.matches("[data-fragment-category]")) scheduleSync();
    });
  }

  window.addEventListener("hashchange", scheduleSync);
  scheduleSync();
})();
