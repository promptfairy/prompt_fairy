(() => {
  const MODULE_VERSION = "change-set-v1.0.0";
  const previousRender = render;

  const CHANGE_OPERATIONS = [
    {
      id: "subject_count",
      zh: "人物數量",
      en: "SUBJECT COUNT",
      hint: "單人 ↔ 雙人、增加或減少人物",
      groups: ["character", "pose_action", "composition"]
    },
    {
      id: "gender_appearance",
      zh: "性別／外觀",
      en: "APPEARANCE",
      hint: "性別、髮型、髮色、五官與身形",
      groups: ["character"]
    },
    {
      id: "wardrobe",
      zh: "服裝配件",
      en: "WARDROBE",
      hint: "衣著、飾品與固定配件",
      groups: ["wardrobe", "character"]
    },
    {
      id: "pose_action",
      zh: "姿勢／互動",
      en: "POSE & ACTION",
      hint: "姿勢、動作、角色之間的互動",
      groups: ["pose_action", "composition", "character"]
    },
    {
      id: "scene",
      zh: "場景背景",
      en: "SCENE",
      hint: "地點、環境與背景元素",
      groups: ["scene"]
    },
    {
      id: "composition",
      zh: "構圖尺寸",
      en: "COMPOSITION",
      hint: "鏡位、景別、比例與畫面安排",
      groups: ["composition"]
    }
  ];

  function ensureChangeSet() {
    if (!state.changeSet || typeof state.changeSet !== "object" || Array.isArray(state.changeSet)) {
      state.changeSet = {};
    }
    if (!Array.isArray(state.changeSet.intentIds)) state.changeSet.intentIds = [];
    if (typeof state.changeSet.request !== "string") state.changeSet.request = "";
    if (!Array.isArray(state.changeSet.targetFragmentIds)) state.changeSet.targetFragmentIds = [];
  }

  function activeOperations() {
    const selected = new Set(state.changeSet.intentIds);
    return CHANGE_OPERATIONS.filter((operation) => selected.has(operation.id));
  }

  function targetGroups() {
    const groups = new Set();
    activeOperations().forEach((operation) => operation.groups.forEach((group) => groups.add(group)));
    return groups;
  }

  function groupForFragment(fragment) {
    return window.promptFairySemanticGroups?.groupForFragment?.(fragment) || "preserved";
  }

  function targetFragments() {
    const groups = targetGroups();
    if (!groups.size) return [];
    return state.fragments.filter((fragment) => groups.has(groupForFragment(fragment)));
  }

  function syncTargetIds() {
    state.changeSet.targetFragmentIds = targetFragments().map((fragment) => fragment.id);
  }

  function makeOperationButton(operation, selected) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `change-set-operation${selected ? " is-selected" : ""}`;
    button.dataset.changeSetOperation = operation.id;
    button.setAttribute("aria-pressed", String(selected));
    button.innerHTML = `
      <span class="change-set-operation-copy">
        <strong></strong>
        <small></small>
        <em></em>
      </span>
      <span class="change-set-operation-mark" aria-hidden="true">${selected ? "✓" : "+"}</span>
    `;
    button.querySelector("strong").textContent = operation.zh;
    button.querySelector("small").textContent = operation.en;
    button.querySelector("em").textContent = operation.hint;
    button.addEventListener("click", () => {
      const ids = new Set(state.changeSet.intentIds);
      if (ids.has(operation.id)) ids.delete(operation.id);
      else ids.add(operation.id);
      state.changeSet.intentIds = CHANGE_OPERATIONS.map((item) => item.id).filter((id) => ids.has(id));
      syncTargetIds();
      saveState();
      render();
    });
    return button;
  }

  function makeScopePreview() {
    const active = activeOperations();
    const fragments = targetFragments();
    const preview = document.createElement("div");
    preview.className = "change-set-scope";

    if (!active.length) {
      preview.innerHTML = `
        <div class="change-set-empty">
          <strong>先選這次要改的東西。</strong>
          <span>完整 Prompt 仍是底稿；小精靈不需要你管理全部語意切片。</span>
        </div>
      `;
      return preview;
    }

    const header = document.createElement("div");
    header.className = "change-set-scope-head";
    header.innerHTML = `
      <div>
        <small>RELEVANT SCOPE</small>
        <strong>本次相關材料</strong>
      </div>
      <span class="change-set-count"></span>
    `;
    header.querySelector(".change-set-count").textContent = `${fragments.length} / ${state.fragments.length} 份`;
    preview.appendChild(header);

    const tags = document.createElement("div");
    tags.className = "change-set-tags";
    [...targetGroups()].forEach((groupId) => {
      const tag = document.createElement("span");
      const count = fragments.filter((fragment) => groupForFragment(fragment) === groupId).length;
      tag.textContent = `${groupId.replaceAll("_", " ")} · ${count}`;
      tags.appendChild(tag);
    });
    preview.appendChild(tags);

    const snippets = document.createElement("div");
    snippets.className = "change-set-snippets";
    fragments.slice(0, 8).forEach((fragment) => {
      const item = document.createElement("div");
      item.className = "change-set-snippet";
      const group = document.createElement("small");
      group.textContent = groupForFragment(fragment).replaceAll("_", " ");
      const text = document.createElement("span");
      text.textContent = fragment.text;
      item.append(group, text);
      snippets.appendChild(item);
    });
    if (fragments.length > 8) {
      const more = document.createElement("div");
      more.className = "change-set-more";
      more.textContent = `還有 ${fragments.length - 8} 份相關材料；需要時可在下方 Advanced Semantic Index 查看。`;
      snippets.appendChild(more);
    }
    preview.appendChild(snippets);
    return preview;
  }

  function makeChangeSetControls() {
    const wrapper = document.createElement("div");
    wrapper.className = "change-set-workspace";

    const intro = document.createElement("div");
    intro.className = "change-set-intro";
    intro.innerHTML = `
      <div>
        <small>CHANGE SET · v1</small>
        <strong>這次想改什麼？</strong>
      </div>
      <p>只選本次修改意圖。完整語意分析留在後台當索引，不再要求你逐份管理。</p>
    `;
    wrapper.appendChild(intro);

    const operations = document.createElement("div");
    operations.className = "change-set-operations";
    const selected = new Set(state.changeSet.intentIds);
    CHANGE_OPERATIONS.forEach((operation) => operations.appendChild(makeOperationButton(operation, selected.has(operation.id))));
    wrapper.appendChild(operations);

    const requestField = document.createElement("label");
    requestField.className = "change-set-request";
    requestField.innerHTML = `
      <span>修改說明 <small>CHANGE REQUEST</small></span>
      <textarea rows="3" data-change-set-request placeholder="例如：單人改成兩個成年男性，保留原本場景與光線；兩人都換成黑色西裝。"></textarea>
      <em>這一版先保存意圖與相關材料範圍；實際 semantic patch 會接在下一層，不做全 Prompt 翻譯再回填。</em>
    `;
    const textarea = requestField.querySelector("textarea");
    textarea.value = state.changeSet.request;
    textarea.addEventListener("input", () => {
      state.changeSet.request = textarea.value;
      saveState();
    });
    wrapper.appendChild(requestField);
    wrapper.appendChild(makeScopePreview());
    return wrapper;
  }

  function wrapSemanticIndex(panel) {
    const filterBar = panel.querySelector(".semantic-filter-tabs");
    const list = panel.querySelector(".recipe-list");
    if (!list || list.closest(".change-set-advanced")) return;

    const details = document.createElement("details");
    details.className = "change-set-advanced";
    details.innerHTML = `
      <summary>
        <span><strong>Advanced Semantic Index</strong><small>完整語意索引／除錯檢視</small></span>
        <span class="change-set-advanced-count"></span>
      </summary>
      <div class="change-set-advanced-body"></div>
    `;
    details.querySelector(".change-set-advanced-count").textContent = `${state.fragments.length} 份`;
    const body = details.querySelector(".change-set-advanced-body");
    if (filterBar) body.appendChild(filterBar);
    body.appendChild(list);
    panel.appendChild(details);
  }

  function applyChangeSet() {
    ensureChangeSet();
    if (activeView !== "workspace") return;
    const list = document.querySelector(".recipe-list");
    const panel = list?.closest(".panel");
    if (!panel) return;

    syncTargetIds();

    const title = panel.querySelector(".section-title h2");
    const subtitle = panel.querySelector(".section-title .panel-subtitle");
    const sourcePill = panel.querySelector(".section-title .source-pill");
    if (title) title.textContent = "② 本次修改｜Change Set";
    if (subtitle) subtitle.textContent = "完整 Prompt 當底稿；只抽出這次修改真正相關的語意範圍。";
    if (sourcePill) sourcePill.textContent = `${state.fragments.length} 份索引`;

    const toolbar = panel.querySelector(".recipe-toolbar");
    if (toolbar) toolbar.hidden = true;

    const controls = makeChangeSetControls();
    const insertionPoint = panel.querySelector(".semantic-filter-tabs") || list;
    insertionPoint?.insertAdjacentElement("beforebegin", controls);
    wrapSemanticIndex(panel);
  }

  render = function changeSetRender() {
    previousRender();
    applyChangeSet();
  };

  window.promptFairyChangeSet = {
    version: MODULE_VERSION,
    operations: CHANGE_OPERATIONS.map(({ id, zh, en, groups }) => ({ id, zh, en, groups: [...groups] }))
  };

  render();
})();
