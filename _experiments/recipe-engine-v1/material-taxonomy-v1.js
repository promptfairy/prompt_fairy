(() => {
  "use strict";

  const STATE_KEY = "prompt-fairy-arcane-v2";
  const LABEL_KEY = "prompt-fairy-material-labels-v1";
  const BASE_LABELS = ["臉部鎖定", "負面詞", "濾鏡"];
  const pendingForms = new WeakMap();
  let activeMaterialFilter = "all";
  let syncing = false;

  const DEFAULT_DISPLAY = {
    face_reference: "臉部鎖定",
    negative: "負面詞",
    restriction: "負面詞",
    style_filter: "濾鏡",
    lighting: "濾鏡",
    character_quality: "濾鏡",
    enhancement: "",
    tool_specific: "",
    other: ""
  };

  const INTERNAL_BY_LABEL = new Map([
    ["臉部鎖定", "face_reference"],
    ["臉部參考", "face_reference"],
    ["負面詞", "negative"],
    ["禁止事項", "negative"],
    ["濾鏡", "style_filter"],
    ["風格濾鏡", "style_filter"],
    ["光線", "lighting"],
    ["人物質感", "character_quality"],
    ["常用補強", "enhancement"],
    ["工具專用", "tool_specific"]
  ]);

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "null") || {};
    } catch {
      return {};
    }
  }

  function readLabels() {
    let sidecar = {};
    try {
      sidecar = JSON.parse(localStorage.getItem(LABEL_KEY) || "{}") || {};
    } catch {
      sidecar = {};
    }
    const embedded = readState().materialLabels;
    return { ...(embedded && typeof embedded === "object" ? embedded : {}), ...sidecar };
  }

  function writeLabels(labels) {
    const clean = Object.fromEntries(Object.entries(labels || {}).filter(([id, label]) => id && String(label || "").trim()).map(([id, label]) => [id, String(label).trim()]));
    localStorage.setItem(LABEL_KEY, JSON.stringify(clean));

    /* Keep a copy inside the stored state so exported / imported backups can carry the labels. */
    try {
      const state = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (state && typeof state === "object") {
        state.materialLabels = clean;
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      }
    } catch {
      /* The sidecar remains the source of truth if the main state cannot be patched. */
    }
  }

  function materialMap() {
    return new Map((readState().materials || []).map((material) => [String(material.id), material]));
  }

  function displayLabel(id, category) {
    const custom = String(readLabels()[id] || "").trim();
    if (custom) return custom;
    return DEFAULT_DISPLAY[category] ?? "";
  }

  function internalCategory(label) {
    return INTERNAL_BY_LABEL.get(String(label || "").trim()) || "other";
  }

  function pruneLabels() {
    const state = readState();
    const ids = new Set((state.materials || []).map((material) => String(material.id)));
    const labels = readLabels();
    const clean = Object.fromEntries(Object.entries(labels).filter(([id]) => ids.has(id)));
    if (JSON.stringify(clean) !== JSON.stringify(labels)) writeLabels(clean);
  }

  function enhanceMaterialForm() {
    const form = document.querySelector('form[data-form="material"]');
    const select = form?.querySelector('select[name="category"]');
    if (!form || !select || select.dataset.taxonomyEnhanced === "true") return;

    select.dataset.taxonomyEnhanced = "true";
    select.hidden = true;
    select.tabIndex = -1;

    const field = select.closest(".field");
    if (!field) return;
    field.classList.add("material-label-field");

    const heading = field.querySelector(":scope > span");
    if (heading) {
      heading.textContent = "標籤 ";
      const em = document.createElement("em");
      em.textContent = "可自訂";
      heading.append(em);
    }

    const materialId = form.dataset.id || "";
    const label = materialId ? displayLabel(materialId, select.value) : "";
    const listId = `material-label-presets-${Math.random().toString(36).slice(2, 8)}`;
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.materialLabelInput = "true";
    input.setAttribute("list", listId);
    input.value = label;
    input.placeholder = "臉部鎖定、負面詞、濾鏡，或輸入自己的標籤";

    const datalist = document.createElement("datalist");
    datalist.id = listId;
    BASE_LABELS.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      datalist.append(option);
    });

    const note = document.createElement("small");
    note.textContent = "內建只提供三個起手式；也可以直接建立自己的材料標籤。";

    field.insertBefore(input, select);
    field.insertBefore(datalist, select);
    field.append(note);

    const syncHiddenCategory = () => {
      select.value = internalCategory(input.value);
    };
    input.addEventListener("input", syncHiddenCategory);
    input.addEventListener("change", syncHiddenCategory);
    syncHiddenCategory();
  }

  function decorateMaterialCards() {
    const materials = materialMap();
    document.querySelectorAll('.material-grid [data-search-card="materials"]').forEach((card) => {
      const id = card.querySelector("[data-id]")?.dataset.id;
      const material = materials.get(String(id || ""));
      if (!id || !material) return;

      const label = displayLabel(id, material.category);
      card.dataset.materialLabel = label;
      card.dataset.materialFavorite = card.querySelector(".star-button.active") ? "true" : "false";

      if (!card.dataset.taxonomyBaseSearch) card.dataset.taxonomyBaseSearch = card.dataset.searchIndex || "";
      card.dataset.searchIndex = `${card.dataset.taxonomyBaseSearch} ${label}`.trim().toLocaleLowerCase();

      const pill = card.querySelector(".category-pill");
      if (pill) {
        if (label) {
          if (pill.textContent !== label) pill.textContent = label;
          pill.dataset.emptyLabel = "false";
          pill.hidden = false;
        } else {
          pill.textContent = "";
          pill.dataset.emptyLabel = "true";
          pill.hidden = true;
        }
      }
    });
  }

  function decorateWorkspacePicker() {
    const materials = materialMap();
    document.querySelectorAll("[data-material-pick]").forEach((input) => {
      const id = input.dataset.materialPick;
      const material = materials.get(String(id || ""));
      const small = input.closest(".pick-card")?.querySelector("small");
      if (!material || !small) return;
      const label = displayLabel(id, material.category);
      small.textContent = label;
      small.hidden = !label;
    });
  }

  function customLabelsInUse() {
    const materials = materialMap();
    const labels = readLabels();
    const custom = new Set();
    materials.forEach((material, id) => {
      const label = String(labels[id] || "").trim();
      if (label && !BASE_LABELS.includes(label)) custom.add(label);
    });
    return [...custom].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }

  function buildMaterialFilters() {
    const grid = document.querySelector(".material-grid");
    const row = grid?.closest(".library-page")?.querySelector(".library-toolbar .filter-row");
    if (!grid || !row) return;

    const filters = [
      ["all", "全部"],
      ["favorite", "常用"],
      ...BASE_LABELS.map((label) => [`label:${label}`, label]),
      ...customLabelsInUse().map((label) => [`label:${label}`, label])
    ];
    const valid = new Set(filters.map(([value]) => value));
    if (!valid.has(activeMaterialFilter)) activeMaterialFilter = "all";

    const signature = filters.map(([value, label]) => `${value}:${label}`).join("|");
    if (row.dataset.taxonomySignature !== signature) {
      row.dataset.taxonomySignature = signature;
      row.innerHTML = filters.map(([value, label]) => `<button class="filter-chip ${activeMaterialFilter === value ? "active" : ""}" type="button" data-material-label-filter="${escapeAttr(value)}">${escapeHtml(label)}</button>`).join("");
    } else {
      row.querySelectorAll("[data-material-label-filter]").forEach((button) => button.classList.toggle("active", button.dataset.materialLabelFilter === activeMaterialFilter));
    }
  }

  function applyMaterialFilter() {
    const query = String(document.querySelector('[data-search="materials"]')?.value || "").trim().toLocaleLowerCase();
    document.querySelectorAll('.material-grid [data-search-card="materials"]').forEach((card) => {
      const matchesSearch = !query || String(card.dataset.searchIndex || "").includes(query);
      let matchesFilter = true;
      if (activeMaterialFilter === "favorite") matchesFilter = card.dataset.materialFavorite === "true";
      else if (activeMaterialFilter.startsWith("label:")) matchesFilter = card.dataset.materialLabel === activeMaterialFilter.slice(6);
      card.hidden = !(matchesSearch && matchesFilter);
    });
  }

  function resolveSavedMaterialId(data) {
    if (data.existingId) return data.existingId;
    const materials = readState().materials || [];
    return [...materials]
      .filter((item) => String(item.name || "").trim() === data.name && String(item.content || "").trim() === data.content)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0]?.id || "";
  }

  function sync() {
    if (syncing) return;
    syncing = true;
    try {
      pruneLabels();
      enhanceMaterialForm();
      decorateMaterialCards();
      decorateWorkspacePicker();
      buildMaterialFilters();
      applyMaterialFilter();
    } finally {
      syncing = false;
    }
  }

  function escapeHtml(value = "") {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttr(value = "") {
    return escapeHtml(value);
  }

  /* Capture runs before the original form handler so the hidden internal category is ready for FormData. */
  document.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-form="material"]');
    if (!form) return;
    enhanceMaterialForm();
    const input = form.querySelector("[data-material-label-input]");
    const select = form.querySelector('select[name="category"]');
    if (!input || !select) return;

    const label = String(input.value || "").trim();
    select.value = internalCategory(label);
    pendingForms.set(form, {
      label,
      existingId: form.dataset.id || "",
      name: String(form.querySelector('[name="name"]')?.value || "").trim(),
      content: String(form.querySelector('[name="content"]')?.value || "").trim()
    });
  }, true);

  /* The original handler saves synchronously; this listener then attaches the flexible display label. */
  document.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-form="material"]');
    const data = form ? pendingForms.get(form) : null;
    if (!form || !data) return;

    const id = resolveSavedMaterialId(data);
    if (id) {
      const labels = readLabels();
      if (data.label) labels[id] = data.label;
      else delete labels[id];
      writeLabels(labels);
    }
    pendingForms.delete(form);
    queueMicrotask(sync);
  });

  document.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-material-label-filter]");
    if (filter) {
      activeMaterialFilter = filter.dataset.materialLabelFilter || "all";
      buildMaterialFilters();
      applyMaterialFilter();
      return;
    }

    /* Export the flexible labels with the normal backup without touching the main app schema. */
    const exportButton = event.target.closest('[data-action="export-data"]');
    if (exportButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const state = readState();
      const payload = { type: "prompt-fairy-backup", exportedAt: new Date().toISOString(), ...state, materialLabels: readLabels() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `prompt-fairy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
  }, true);

  document.addEventListener("input", (event) => {
    if (event.target.matches('[data-search="materials"]')) queueMicrotask(applyMaterialFilter);
  });

  document.addEventListener("change", async (event) => {
    if (event.target.id !== "importFile" || !event.target.files?.[0]) return;
    const before = localStorage.getItem(STATE_KEY);
    try {
      const parsed = JSON.parse(await event.target.files[0].text());
      setTimeout(() => {
        const after = localStorage.getItem(STATE_KEY);
        if (after !== before && parsed?.materialLabels && typeof parsed.materialLabels === "object") {
          writeLabels(parsed.materialLabels);
          sync();
        }
      }, 80);
    } catch {
      /* The original import flow owns invalid-file feedback. */
    }
  });

  const observer = new MutationObserver(() => queueMicrotask(sync));
  const app = document.querySelector("#app");
  if (app) observer.observe(app, { childList: true, subtree: true });

  sync();
})();
