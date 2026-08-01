(() => {
  const CATEGORY_LABELS = {
    REFERENCE: "參考保護｜REFERENCE",
    QUALITY: "品質細節｜QUALITY",
    NEGATIVE: "負面修正｜NEGATIVE",
    RESTRICTION: "限制事項｜RESTRICTION",
    SUBJECT: "人物主體｜SUBJECT",
    APPEARANCE: "人物外觀｜APPEARANCE",
    CLOTHING: "服裝配件｜CLOTHING",
    ACTION: "動作互動｜ACTION",
    SCENE: "場景背景｜SCENE",
    COMPOSITION: "構圖視角｜COMPOSITION",
    CAMERA: "鏡頭攝影｜CAMERA",
    LIGHTING: "光線照明｜LIGHTING",
    STYLE: "風格色調｜STYLE",
    RATIO: "尺寸比例｜RATIO",
    OTHER: "其他｜OTHER"
  };

  const baseRender = render;
  let editing = null;

  function categoryLabel(category) {
    const key = String(category || "OTHER").toUpperCase();
    return CATEGORY_LABELS[key] || `其他｜${key}`;
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function bindExplicitDialogClose() {
    document.querySelectorAll("dialog .icon-button, dialog button[value='cancel']").forEach((button) => {
      if (button.dataset.closeBound) return;
      button.dataset.closeBound = "true";
      button.type = "button";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeDialog(button.closest("dialog"));
      });
    });
  }

  function ensureEditDialog() {
    if (document.querySelector("#edit-library-dialog")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <dialog class="library-dialog" id="edit-library-dialog">
        <form class="dialog-panel" id="edit-library-form">
          <div class="dialog-heading">
            <div><small>EDIT ITEM</small><h2 id="edit-library-title">編輯資料</h2></div>
            <button class="icon-button" type="button" data-edit-close aria-label="關閉">×</button>
          </div>
          <div id="edit-library-fields"></div>
          <p class="edit-dialog-note">修改後會立即儲存在目前瀏覽器的本機資料。</p>
          <div class="dialog-actions">
            <button class="btn ghost" type="button" data-edit-close>取消</button>
            <button class="btn primary" type="submit">儲存修改</button>
          </div>
        </form>
      </dialog>
    `);

    const dialog = document.querySelector("#edit-library-dialog");
    dialog.querySelectorAll("[data-edit-close]").forEach((button) => button.addEventListener("click", () => closeDialog(dialog)));
    dialog.querySelector("#edit-library-form").addEventListener("submit", saveEdit);
  }

  function field(label, control) {
    return `<div class="field"><label>${label}</label>${control}</div>`;
  }

  function openEdit(type, id) {
    ensureEditDialog();
    editing = { type, id };
    const dialog = document.querySelector("#edit-library-dialog");
    const title = dialog.querySelector("#edit-library-title");
    const fields = dialog.querySelector("#edit-library-fields");

    if (type === "prompt") {
      const item = state.promptEntries.find((entry) => entry.id === id);
      if (!item) return;
      title.textContent = "編輯胖譜";
      fields.innerHTML = `
        ${field("標題", `<input id="edit-title" value="${escapeAttr(item.title)}" required />`)}
        ${field("狀態", `<select id="edit-status"><option value="unused" ${item.status === "unused" ? "selected" : ""}>未捏</option><option value="used" ${item.status === "used" ? "selected" : ""}>已捏</option><option value="retry" ${item.status === "retry" ? "selected" : ""}>想重捏</option></select>`)}
        ${field("標籤", `<input id="edit-tags" value="${escapeAttr((item.tags || []).join(", "))}" />`)}
        ${field("原始胖譜", `<textarea id="edit-content" required>${escapeHtml(item.sourcePrompt)}</textarea>`)}
      `;
    } else if (type === "character") {
      const item = state.characters.find((character) => character.id === id);
      if (!item) return;
      title.textContent = "編輯人物設定";
      const fixtures = (item.fixtures || []).map((fixture) => `${fixture.name}｜${fixture.promptText}｜${fixture.bodySlot || ""}`).join("\n");
      fields.innerHTML = `
        ${field("姓名", `<input id="edit-name" value="${escapeAttr(item.name)}" required />`)}
        ${field("固定外觀", `<textarea id="edit-base" required>${escapeHtml(item.basePrompt || "")}</textarea>`)}
        ${field("固定配件", `<textarea id="edit-fixtures" placeholder="名稱｜Prompt 內容｜位置">${escapeHtml(fixtures)}</textarea>`)}
      `;
    } else if (type === "material") {
      const item = state.materials.find((material) => material.id === id);
      if (!item) return;
      title.textContent = "編輯材料";
      const keys = [...new Set([...Object.keys(CATEGORY_LABELS), ...state.materials.map((material) => String(material.category || "OTHER").toUpperCase())])];
      fields.innerHTML = `
        ${field("名稱", `<input id="edit-name" value="${escapeAttr(item.name)}" required />`)}
        ${field("分類", `<select id="edit-category">${keys.map((key) => `<option value="${escapeAttr(key)}" ${String(item.category).toUpperCase() === key ? "selected" : ""}>${escapeHtml(categoryLabel(key))}</option>`).join("")}</select>`)}
        ${field("中文說明", `<input id="edit-description" value="${escapeAttr(item.description || "")}" />`)}
        ${field("Prompt 內容", `<textarea id="edit-content" required>${escapeHtml(item.content || "")}</textarea>`)}
      `;
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function parseFixtureLines(text) {
    return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const [name, promptText, bodySlot] = line.split(/[｜|]/).map((part) => part.trim());
      return { id: uid("fixture"), name: name || "未命名配件", promptText: promptText || name || "", bodySlot: bodySlot || "", type: "other" };
    });
  }

  function saveEdit(event) {
    event.preventDefault();
    if (!editing) return;

    if (editing.type === "prompt") {
      const item = state.promptEntries.find((entry) => entry.id === editing.id);
      if (!item) return;
      item.title = document.querySelector("#edit-title").value.trim();
      item.status = document.querySelector("#edit-status").value;
      item.tags = document.querySelector("#edit-tags").value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
      item.sourcePrompt = document.querySelector("#edit-content").value.trim();
      item.updatedAt = new Date().toISOString();
    } else if (editing.type === "character") {
      const item = state.characters.find((character) => character.id === editing.id);
      if (!item) return;
      item.name = document.querySelector("#edit-name").value.trim();
      item.basePrompt = document.querySelector("#edit-base").value.trim();
      item.fixtures = parseFixtureLines(document.querySelector("#edit-fixtures").value);
      item.updatedAt = new Date().toISOString();
    } else if (editing.type === "material") {
      const item = state.materials.find((material) => material.id === editing.id);
      if (!item) return;
      item.name = document.querySelector("#edit-name").value.trim();
      item.category = document.querySelector("#edit-category").value;
      item.description = document.querySelector("#edit-description").value.trim();
      item.content = document.querySelector("#edit-content").value.trim();
    }

    saveState();
    closeDialog(document.querySelector("#edit-library-dialog"));
    editing = null;
    render();
  }

  function addEditButtons() {
    document.querySelectorAll("[data-use-entry]").forEach((button) => {
      const row = button.closest(".card-actions");
      if (!row || row.querySelector("[data-edit-prompt]")) return;
      button.insertAdjacentHTML("afterend", `<button class="btn ghost" data-edit-prompt="${button.dataset.useEntry}">編輯</button>`);
    });

    document.querySelectorAll("[data-apply-character]").forEach((button) => {
      const row = button.closest(".card-actions");
      if (!row || row.querySelector("[data-edit-character]")) return;
      row.insertAdjacentHTML("afterbegin", `<button class="btn ghost" data-edit-character="${button.dataset.applyCharacter}">編輯</button>`);
    });

    document.querySelectorAll("[data-apply-material]").forEach((button) => {
      const row = button.closest(".card-actions");
      if (!row || row.querySelector("[data-edit-material]")) return;
      button.insertAdjacentHTML("afterend", `<button class="btn ghost" data-edit-material="${button.dataset.applyMaterial}">編輯</button>`);
    });

    document.querySelectorAll("[data-edit-prompt]").forEach((button) => button.addEventListener("click", () => openEdit("prompt", button.dataset.editPrompt)));
    document.querySelectorAll("[data-edit-character]").forEach((button) => button.addEventListener("click", () => openEdit("character", button.dataset.editCharacter)));
    document.querySelectorAll("[data-edit-material]").forEach((button) => button.addEventListener("click", () => openEdit("material", button.dataset.editMaterial)));
  }

  function localizeMaterialCategories() {
    document.querySelectorAll("[data-material-filter]").forEach((button) => {
      const category = button.dataset.materialFilter;
      button.textContent = category === "all" ? "全部｜ALL" : categoryLabel(category);
    });

    document.querySelectorAll(".material-card .card-heading small").forEach((label) => {
      label.textContent = categoryLabel(label.textContent.trim());
    });

    const input = document.querySelector("#new-material-category");
    if (input && input.tagName === "INPUT") {
      const select = document.createElement("select");
      select.id = input.id;
      select.required = true;
      select.innerHTML = Object.keys(CATEGORY_LABELS).map((key) => `<option value="${key}">${categoryLabel(key)}</option>`).join("");
      input.replaceWith(select);
    }
  }

  function applyFixes() {
    bindExplicitDialogClose();
    addEditButtons();
    localizeMaterialCategories();
  }

  render = function fixedRender() {
    baseRender();
    applyFixes();
  };

  applyFixes();
})();
