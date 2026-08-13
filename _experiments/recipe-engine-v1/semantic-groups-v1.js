(() => {
  const MODULE_VERSION = "semantic-groups-v1.0.1";
  const previousRender = render;
  const previousSplitPrompt = splitPrompt;
  const expandedGroups = new Set();
  const expandedFixtureManagers = new Set();
  let semanticFilter = "all";
  let viewportRestoreToken = 0;

  const SEMANTIC_GROUPS = [
    { id: "character", zh: "人物設定", en: "CHARACTER", attribute: "高變動" },
    { id: "wardrobe", zh: "服裝配件", en: "WARDROBE", attribute: "高變動" },
    { id: "pose_action", zh: "姿勢動作", en: "POSE & ACTION", attribute: "高變動" },
    { id: "scene", zh: "場景背景", en: "SCENE", attribute: "高變動" },
    { id: "composition", zh: "構圖尺寸", en: "COMPOSITION", attribute: "可調整" },
    { id: "lighting", zh: "光線色調", en: "LIGHTING", attribute: "可調整" },
    { id: "style", zh: "風格品質", en: "STYLE", attribute: "可調整" },
    { id: "preserved", zh: "原文保留", en: "PRESERVED", attribute: "保留原文" }
  ];

  function semanticGroupId(fragment) {
    if (!fragment || fragment.confidence === "low") return "preserved";
    const category = String(fragment.category || "unclassified");
    if (["provider_instruction", "constraints", "negative", "restriction", "unclassified"].includes(category)) return "preserved";
    if (["character", "subject", "appearance"].includes(category)) return "character";
    if (category === "clothing") return "wardrobe";
    if (category === "action") return "pose_action";
    if (category === "scene") return "scene";
    if (["framing", "composition", "camera", "ratio"].includes(category)) return "composition";
    if (category === "lighting") return "lighting";
    if (["style_quality", "style", "quality"].includes(category)) return "style";
    return "preserved";
  }

  function activeControlIdentity() {
    const active = document.activeElement;
    if (!active) return null;
    const controlTypes = [
      ["fragmentText", "fragment-text"],
      ["fragmentCategory", "fragment-category"],
      ["fragmentEnabled", "fragment-enabled"],
      ["fragmentLocked", "fragment-locked"],
      ["semanticFilter", "semantic-filter"]
    ];
    const match = controlTypes.find(([property]) => active.dataset?.[property]);
    return match ? { property: match[0], attribute: match[1], value: active.dataset[match[0]] } : null;
  }

  function captureViewportState() {
    const active = document.activeElement;
    const fragmentCard = active?.closest?.("[data-fragment-card]");
    const filterBar = document.querySelector(".semantic-filter-tabs");
    let anchor = null;

    if (fragmentCard) {
      anchor = {
        kind: "fragment",
        id: fragmentCard.dataset.fragmentCard,
        top: fragmentCard.getBoundingClientRect().top
      };
    } else if (active?.closest?.("[data-semantic-filter]") && filterBar) {
      anchor = { kind: "filters", top: filterBar.getBoundingClientRect().top };
    }

    return {
      scrollX: window.scrollX || 0,
      scrollY: window.scrollY || 0,
      filterScrollLeft: filterBar?.scrollLeft || 0,
      anchor,
      activeControl: activeControlIdentity()
    };
  }

  function restoreViewportState(viewport) {
    const token = ++viewportRestoreToken;
    const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    schedule(() => {
      if (token !== viewportRestoreToken) return;
      const filterBar = document.querySelector(".semantic-filter-tabs");
      if (filterBar) filterBar.scrollLeft = viewport.filterScrollLeft;

      let anchorElement = null;
      if (viewport.anchor?.kind === "fragment") {
        anchorElement = [...document.querySelectorAll("[data-fragment-card]")]
          .find((card) => card.dataset.fragmentCard === viewport.anchor.id) || null;
      } else if (viewport.anchor?.kind === "filters") {
        anchorElement = filterBar;
      }

      const anchorIsVisible = anchorElement && anchorElement.getClientRects().length > 0;
      if (anchorIsVisible) {
        const delta = anchorElement.getBoundingClientRect().top - viewport.anchor.top;
        if (delta) window.scrollBy(0, delta);
      } else {
        window.scrollTo(viewport.scrollX, viewport.scrollY);
      }

      const control = viewport.activeControl;
      if (!control) return;
      const escaped = window.CSS?.escape ? window.CSS.escape(control.value) : control.value.replace(/["\\]/g, "\\$&");
      const replacement = document.querySelector(`[data-${control.attribute}="${escaped}"]`);
      replacement?.focus?.({ preventScroll: true });
    });
  }

  /*
   * The former style compaction can merge adjacent fragments. Feed one original
   * fragment at a time through the existing classifier chain so classification
   * improvements remain active without changing fragment boundaries or text.
   */
  splitPrompt = function losslessSemanticSplit(raw) {
    const pieces = [];
    String(raw || "").replace(/\r\n/g, "\n").split("\n").forEach((line) => {
      if (!line.trim()) return;
      const matches = line.match(/[^,;，；]+(?:[,;，；]|$)/g) || [line];
      matches.forEach((match) => {
        const text = match.trim();
        if (text) pieces.push(text);
      });
    });

    if (!pieces.length && String(raw || "").trim()) pieces.push(String(raw).trim());

    const fragments = pieces.flatMap((piece) => {
      const classified = previousSplitPrompt(piece);
      return classified.length ? classified : [];
    });

    return fragments.map((fragment, index) => ({
      ...fragment,
      originalOrder: index
    }));
  };

  function makeFilterBar(counts) {
    const bar = document.createElement("div");
    bar.className = "semantic-filter-tabs";
    bar.setAttribute("aria-label", "Semantic Groups 分類篩選");

    const options = [{ id: "all", zh: "全部", en: "ALL", count: state.fragments.length }]
      .concat(SEMANTIC_GROUPS.map((group) => ({ ...group, count: counts[group.id] || 0 })));

    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `semantic-filter${semanticFilter === option.id ? " active" : ""}`;
      button.dataset.semanticFilter = option.id;
      button.textContent = `${option.zh}｜${option.en} `;
      const count = document.createElement("span");
      count.textContent = String(option.count);
      button.appendChild(count);
      button.addEventListener("click", () => {
        semanticFilter = option.id;
        render();
      });
      bar.appendChild(button);
    });
    return bar;
  }

  function makeGroup(group, fragments, cardsById) {
    const details = document.createElement("details");
    details.className = `semantic-group semantic-group-${group.id}`;
    details.dataset.semanticGroup = group.id;
    details.open = expandedGroups.has(group.id);
    details.hidden = semanticFilter !== "all" && semanticFilter !== group.id;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <span class="semantic-group-heading"><strong></strong><small></small></span>
      <span class="semantic-group-count"></span>
      <span class="semantic-group-attribute"></span>
      <span class="semantic-group-chevron" aria-hidden="true">⌄</span>
    `;
    summary.querySelector("strong").textContent = group.zh;
    summary.querySelector("small").textContent = group.en;
    summary.querySelector(".semantic-group-count").textContent = `${fragments.length} 份材料`;
    summary.querySelector(".semantic-group-attribute").textContent = group.attribute;
    details.appendChild(summary);

    const content = document.createElement("div");
    content.className = "semantic-group-content";
    if (group.id === "preserved") {
      const note = document.createElement("p");
      note.className = "preserved-note";
      note.textContent = "未指定修改的內容完整保留；低信心、限制詞與參考指示預設不重建。";
      content.appendChild(note);
    }

    if (fragments.length) {
      fragments.forEach((fragment) => {
        const card = cardsById.get(fragment.id);
        if (!card) return;
        card.hidden = false;
        content.appendChild(card);
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "semantic-group-empty";
      empty.textContent = "目前沒有這個群組的材料。";
      content.appendChild(empty);
    }
    details.appendChild(content);
    details.addEventListener("toggle", () => {
      if (details.open) expandedGroups.add(group.id);
      else expandedGroups.delete(group.id);
    });
    return details;
  }

  function applySemanticGroups() {
    const list = document.querySelector(".recipe-list");
    if (!list || !state.fragments.length) return;

    const title = list.closest(".panel")?.querySelector(".section-title h2");
    const subtitle = list.closest(".panel")?.querySelector(".section-title .panel-subtitle");
    if (title) title.textContent = "② Semantic Groups";
    if (subtitle) subtitle.textContent = "先瀏覽 8 個語意群組；展開後仍可編輯、停用、鎖定每一份原始材料。";

    state.activeIngredientFilter = "all";
    const cardsById = new Map(
      [...list.querySelectorAll("[data-fragment-card]")].map((card) => [card.dataset.fragmentCard, card])
    );
    const grouped = Object.fromEntries(SEMANTIC_GROUPS.map((group) => [group.id, []]));
    state.fragments.forEach((fragment) => grouped[semanticGroupId(fragment)].push(fragment));
    const counts = Object.fromEntries(SEMANTIC_GROUPS.map((group) => [group.id, grouped[group.id].length]));

    const oldTabs = document.querySelector(".ingredient-tabs");
    const filterBar = makeFilterBar(counts);
    if (oldTabs) oldTabs.replaceWith(filterBar);
    else document.querySelector(".recipe-toolbar")?.insertAdjacentElement("afterend", filterBar);

    list.classList.add("semantic-groups");
    const groups = document.createDocumentFragment();
    SEMANTIC_GROUPS.forEach((group) => groups.appendChild(makeGroup(group, grouped[group.id], cardsById)));
    list.replaceChildren(groups);
  }

  function selectedCharacter(slot) {
    const assignment = state.characterAssignments?.[slot];
    return state.characters?.find((character) => character.id === assignment?.characterId) || null;
  }

  function updateFixtureSummary(manager, slot) {
    const inputs = [...manager.querySelectorAll("[data-recipe-fixture-id]")];
    const selected = inputs.filter((input) => input.checked);
    const status = manager.querySelector(".fixture-compact-status");
    if (status) status.textContent = `已選 ${selected.length} / ${inputs.length}`;

    const chips = manager.querySelector(".fixture-selected-chips");
    if (!chips) return;
    chips.replaceChildren();
    const character = selectedCharacter(slot);
    selected.slice(0, 3).forEach((input) => {
      const fixture = character?.fixtures?.find((item) => item.id === input.dataset.recipeFixtureId);
      const chip = document.createElement("span");
      chip.className = "fixture-chip";
      chip.textContent = fixture?.name || "未命名配件";
      chips.appendChild(chip);
    });
    if (selected.length > 3) {
      const more = document.createElement("span");
      more.className = "fixture-chip fixture-chip-more";
      more.textContent = `＋${selected.length - 3}`;
      chips.appendChild(more);
    }
  }

  function compactFixtureAssignment(card) {
    const characterSelect = card.querySelector("[data-recipe-character-slot]");
    const fixtureSelector = card.querySelector(".fixture-selector");
    if (!characterSelect || !fixtureSelector) return;
    const slot = characterSelect.dataset.recipeCharacterSlot;
    const character = selectedCharacter(slot);
    const oldContainer = fixtureSelector.parentElement;
    const labels = [...fixtureSelector.querySelectorAll(".fixture-choice")];

    const manager = document.createElement("div");
    manager.className = "fixture-compact-manager";
    manager.dataset.fixtureManager = slot;
    manager.innerHTML = `
      <div class="fixture-compact-head">
        <strong>固定配件</strong>
        <span class="fixture-compact-status"></span>
      </div>
      <div class="fixture-selected-chips" aria-label="目前已選配件"></div>
      <button class="fixture-manage-toggle" type="button" aria-expanded="false">管理配件<span aria-hidden="true">⌄</span></button>
      <div class="fixture-compact-list" hidden></div>
    `;

    const list = manager.querySelector(".fixture-compact-list");
    labels.forEach((label) => {
      const input = label.querySelector("[data-recipe-fixture-id]");
      const fixture = character?.fixtures?.find((item) => item.id === input?.dataset.recipeFixtureId);
      const name = label.querySelector("strong");
      let location = label.querySelector("small");
      if (!location) {
        location = document.createElement("small");
        label.querySelector("span")?.appendChild(location);
      }
      if (name) name.textContent = fixture?.name || "未命名配件";
      location.textContent = fixture?.bodySlot || "未指定位置";
      list.appendChild(label);
      input?.addEventListener("change", () => updateFixtureSummary(manager, slot));
    });

    const button = manager.querySelector(".fixture-manage-toggle");
    const setOpen = (open) => {
      list.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      manager.classList.toggle("is-open", open);
      if (open) expandedFixtureManagers.add(slot);
      else expandedFixtureManagers.delete(slot);
    };
    button.addEventListener("click", () => setOpen(list.hidden));
    setOpen(expandedFixtureManagers.has(slot));
    oldContainer.replaceWith(manager);
    updateFixtureSummary(manager, slot);
  }

  function applyFixtureManagers() {
    document.querySelectorAll(".assignment-card").forEach(compactFixtureAssignment);
  }

  render = function semanticGroupsRender() {
    const viewport = captureViewportState();
    previousRender();
    applySemanticGroups();
    applyFixtureManagers();
    restoreViewportState(viewport);
  };

  window.promptFairySemanticGroups = {
    version: MODULE_VERSION,
    groupForFragment: semanticGroupId
  };

  render();
})();
