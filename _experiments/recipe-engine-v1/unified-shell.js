(() => {
  const UNIFIED_SCHEMA = "prompt-fairy-unified-v1";
  const LEGACY_STORAGE_KEYS = ["prompt-sprite-state-v2", "prompt-sprite-state-v1"];
  const VIEW_IDS = new Set(["home", "workspace", "library", "characters", "materials", "settings"]);
  const previousRender = render;
  let libraryFilter = "all";
  let materialFilter = "all";
  let pageMessage = "";

  const DEFAULT_MATERIALS = [
    {
      id: "material_face_reference",
      name: "臉部參考保護語",
      category: "REFERENCE",
      content: "Use the attached images as a face reference. Preserve the same identity and facial structure.",
      description: "保留人物身份與五官結構。"
    },
    {
      id: "material_real_skin",
      name: "寫實人物質感",
      category: "QUALITY",
      content: "realistic skin texture with visible pores, natural facial expression, detailed eyelashes, balanced adult proportions",
      description: "加強寫實皮膚、表情與成人比例。"
    },
    {
      id: "material_hands",
      name: "手部修正",
      category: "NEGATIVE",
      content: "Avoid: extra fingers, missing fingers, fused fingers, bad hands, extra limbs, bad anatomy",
      description: "常用手部與肢體錯誤修正。"
    },
    {
      id: "material_no_logo",
      name: "不要文字水印",
      category: "RESTRICTION",
      content: "Avoid: watermark, logo, text, signature, brand label",
      description: "避免生成水印、文字或品牌標籤。"
    }
  ];

  function currentView() {
    const requested = location.hash.slice(1);
    return VIEW_IDS.has(requested) ? requested : "home";
  }

  function mergeUnique(target, source, keyFn) {
    const known = new Set(target.map(keyFn));
    source.forEach((item) => {
      const key = keyFn(item);
      if (!known.has(key)) {
        target.push(item);
        known.add(key);
      }
    });
  }

  function legacyCharacter(character) {
    const appearance = character.appearance || {};
    const basePrompt = character.basePrompt || [
      appearance.hairColor,
      appearance.hairstyle,
      appearance.eyes,
      appearance.heightBody,
      appearance.makeup,
      appearance.glassesOrDefaultWear
    ].filter(Boolean).join(", ");
    return {
      id: String(character.id || uid("character")),
      name: String(character.name || "未命名人物"),
      basePrompt: String(basePrompt || "reference image priority"),
      avatarData: String(character.avatarData || ""),
      fixtures: Array.isArray(character.fixtures)
        ? character.fixtures.filter((item) => !item.archivedAt).map((fixture) => ({
            id: String(fixture.id || uid("fixture")),
            name: String(fixture.name || "未命名配件"),
            promptText: String(fixture.promptText || fixture.name || ""),
            bodySlot: String(fixture.bodySlot || ""),
            type: String(fixture.type || "other")
          }))
        : [],
      createdAt: character.createdAt || new Date().toISOString(),
      updatedAt: character.updatedAt || new Date().toISOString()
    };
  }

  function legacyEntry(entry) {
    return {
      id: String(entry.id || uid("entry")),
      title: String(entry.title || "未命名胖譜"),
      status: ["unused", "used", "retry"].includes(entry.status) ? entry.status : "unused",
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
      sourcePrompt: String(entry.sourcePrompt || entry.promptText || ""),
      sourceUrl: String(entry.sourceUrl || ""),
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString()
    };
  }

  function legacyMaterial(phrase) {
    return {
      id: String(phrase.id || uid("material")),
      name: String(phrase.name || "未命名材料"),
      category: String(phrase.category || "OTHER").replaceAll("_", " ").toUpperCase(),
      content: String(phrase.content || ""),
      description: String(phrase.descriptionZh || phrase.description || ""),
      createdAt: phrase.createdAt || new Date().toISOString()
    };
  }

  function migrateLegacyData() {
    if (state.unifiedMigration === UNIFIED_SCHEMA) return;
    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const legacy = JSON.parse(raw);
        mergeUnique(state.characters, (legacy.characters || []).filter((item) => !item.archivedAt).map(legacyCharacter), (item) => item.name.toLowerCase());
        mergeUnique(state.promptEntries, (legacy.promptEntries || []).filter((item) => !item.archivedAt).map(legacyEntry), (item) => item.id);
        mergeUnique(state.promptVersions, (legacy.promptVersions || []).filter((item) => !item.archivedAt), (item) => item.id);
        mergeUnique(state.materials, (legacy.phrases || []).filter((item) => !item.archivedAt).map(legacyMaterial), (item) => item.name.toLowerCase());
        break;
      } catch (error) {
        console.warn("Unable to migrate legacy library data", error);
      }
    }
    state.unifiedMigration = UNIFIED_SCHEMA;
  }

  function ensureUnifiedState() {
    if (!Array.isArray(state.characters)) state.characters = [];
    if (!Array.isArray(state.promptEntries)) state.promptEntries = [];
    if (!Array.isArray(state.promptVersions)) state.promptVersions = [];
    if (!Array.isArray(state.materials)) state.materials = DEFAULT_MATERIALS.map((item) => ({ ...item }));
    if (!state.characterAssignments) {
      state.characterAssignments = {
        AA: { characterId: "", fixtureIds: [] },
        BB: { characterId: "", fixtureIds: [] }
      };
    }
    if (!state.localSettings) state.localSettings = { activePromptEntryId: "", customRulePack: null };
    migrateLegacyData();
    if (!state.materials.length) state.materials = DEFAULT_MATERIALS.map((item) => ({ ...item }));
    if (state.localSettings.customRulePack?.conflicts) rulePack = state.localSettings.customRulePack;
  }

  function navItem(id, english, chinese) {
    return `<a class="${currentView() === id ? "active" : ""}" href="#${id}"><span>${english}</span><small>${chinese}</small></a>`;
  }

  renderProductBar = function unifiedProductBar() {
    return `
      <header class="product-bar unified-product-bar">
        <a class="product-brand" href="#home" aria-label="回到 Prompt Fairy 首頁">
          ${renderBrandGlyph()}
          <span><strong>Prompt Fairy</strong><small>胖譜小精靈</small></span>
        </a>
        <nav class="product-nav" aria-label="主要導覽">
          ${navItem("workspace", "WORKSPACE", "調製台")}
          ${navItem("library", "PROMPT LIBRARY", "胖譜庫")}
          ${navItem("characters", "CHARACTER LIBRARY", "人物設定庫")}
          ${navItem("materials", "MATERIAL LIBRARY", "材料庫")}
          ${navItem("settings", "SETTINGS", "設定")}
        </nav>
        <span class="local-status"><i></i>LOCAL ONLY</span>
      </header>
    `;
  };

  function pageHeader(english, chinese, description, action = "") {
    return `
      <header class="library-header">
        <div>
          <span class="eyebrow">${english}</span>
          <h1>${chinese}</h1>
          <p>${description}</p>
        </div>
        ${action}
      </header>
    `;
  }

  function shell(content, view) {
    return `
      <div class="app-shell library-shell" data-view="${view}">
        ${renderProductBar()}
        <main class="library-main">
          ${content}
          ${pageMessage ? `<div class="page-toast" role="status">${escapeHtml(pageMessage)}</div>` : ""}
        </main>
      </div>
    `;
  }

  function statusLabel(status) {
    return { unused: "未捏", used: "已捏", retry: "想重捏" }[status] || "未捏";
  }

  function versionCount(entryId) {
    return state.promptVersions.filter((version) => version.promptEntryId === entryId && !version.archivedAt).length;
  }

  function renderPromptCard(entry) {
    const excerpt = entry.sourcePrompt.slice(0, 150);
    return `
      <article class="collection-card prompt-card">
        <div class="prompt-cover" aria-hidden="true"><span>PF</span><i></i></div>
        <div class="collection-card-body">
          <div class="card-heading">
            <div><small>${new Date(entry.updatedAt || entry.createdAt).toLocaleDateString("zh-TW")}</small><h2>${escapeHtml(entry.title)}</h2></div>
            <span class="status-chip status-${entry.status}">${statusLabel(entry.status)}</span>
          </div>
          <p>${escapeHtml(excerpt)}${entry.sourcePrompt.length > 150 ? "…" : ""}</p>
          <div class="tag-row">
            <span class="meta-chip">${versionCount(entry.id)} 個版本</span>
            ${(entry.tags || []).map((tag) => `<span class="meta-chip subtle">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="card-actions">
            <button class="btn secondary" data-use-entry="${entry.id}">送到調製台</button>
            <button class="btn ghost" data-archive-entry="${entry.id}">封存</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderPromptLibrary() {
    const entries = state.promptEntries
      .filter((entry) => !entry.archivedAt && (libraryFilter === "all" || entry.status === libraryFilter))
      .slice().reverse();
    const filters = [["all", "全部"], ["unused", "未捏"], ["used", "已捏"], ["retry", "想重捏"]];
    return shell(`
      ${pageHeader("PROMPT LIBRARY", "胖譜庫", "先瀏覽館藏，再決定要新增或拿回調製台。", `<button class="btn primary" data-open-dialog="prompt-dialog">＋ 新增胖譜</button>`)}
      <div class="library-toolbar">
        <div class="filter-pills">${filters.map(([id, label]) => `<button class="${libraryFilter === id ? "active" : ""}" data-library-filter="${id}">${label}</button>`).join("")}</div>
        <span>${entries.length} 份館藏</span>
      </div>
      <section class="collection-grid">
        ${entries.length ? entries.map(renderPromptCard).join("") : renderEmpty("胖譜庫還是空的", "先收進第一份胖譜，之後一進來就會先看到館藏。")}
      </section>
      ${renderPromptDialog()}
    `, "library");
  }

  function initials(name) {
    return String(name || "PF").trim().slice(0, 2).toUpperCase();
  }

  function assignmentLabel(characterId) {
    const slots = ["AA", "BB"].filter((slot) => state.characterAssignments?.[slot]?.characterId === characterId);
    return slots.length ? `套用中 · ${slots.join(" / ")}` : "尚未套用";
  }

  function renderCharacterCard(character) {
    const fixtures = character.fixtures || [];
    return `
      <article class="collection-card character-card">
        <div class="character-portrait">
          ${character.avatarData ? `<img src="${escapeAttr(character.avatarData)}" alt="${escapeAttr(character.name)} 肖像" />` : `<span>${escapeHtml(initials(character.name))}</span>`}
          <i class="apply-dot ${assignmentLabel(character.id).startsWith("套用中") ? "active" : ""}"></i>
        </div>
        <div class="collection-card-body">
          <div class="card-heading"><div><small>${assignmentLabel(character.id)}</small><h2>${escapeHtml(character.name)}</h2></div></div>
          <div class="character-facts">
            <span>固定外觀</span>
            <p>${escapeHtml(character.basePrompt || "尚未填寫固定外觀")}</p>
          </div>
          <div class="tag-row">
            ${fixtures.length ? fixtures.map((fixture) => `<span class="meta-chip subtle">${escapeHtml(fixture.name)}${fixture.bodySlot ? ` · ${escapeHtml(fixture.bodySlot)}` : ""}</span>`).join("") : `<span class="meta-chip subtle">尚無固定配件</span>`}
          </div>
          <div class="card-actions">
            <button class="btn secondary" data-apply-character="${character.id}" data-slot="AA">套用 AA</button>
            <button class="btn secondary" data-apply-character="${character.id}" data-slot="BB">套用 BB</button>
            <button class="btn ghost" data-remove-character="${character.id}">移除</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderCharacterLibrary() {
    return shell(`
      ${pageHeader("CHARACTER LIBRARY", "人物設定庫", "肖像、固定外觀與配件都收在這裡；套用狀態會直接顯示在卡片上。", `<button class="btn primary" data-open-dialog="character-dialog">＋ 新增人物</button>`)}
      <div class="library-toolbar"><span>目前人物設定</span><span>${state.characters.length} 張人物卡</span></div>
      <section class="collection-grid character-grid">
        ${state.characters.length ? state.characters.map(renderCharacterCard).join("") : renderEmpty("人物設定庫還是空的", "新增人物後，調製台只需要選擇要套用哪一張人物卡。")}
      </section>
      ${renderCharacterDialog()}
    `, "characters");
  }

  function materialCategories() {
    return ["all", ...new Set(state.materials.map((material) => material.category))];
  }

  function renderMaterialCard(material) {
    return `
      <article class="collection-card material-card">
        <div class="collection-card-body">
          <div class="card-heading"><div><small>${escapeHtml(material.category)}</small><h2>${escapeHtml(material.name)}</h2></div><span class="material-glyph">✦</span></div>
          <p>${escapeHtml(material.description || "可重複套用的 Prompt 材料。")}</p>
          <div class="material-content">${escapeHtml(material.content)}</div>
          <div class="card-actions">
            <button class="btn secondary" data-apply-material="${material.id}">加入調製台</button>
            <button class="btn ghost" data-remove-material="${material.id}">移除</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderMaterialLibrary() {
    const materials = state.materials.filter((material) => materialFilter === "all" || material.category === materialFilter);
    return shell(`
      ${pageHeader("MATERIAL LIBRARY", "材料庫", "原本的咒語匣已收編為可分類、可重複套用的材料館藏。", `<button class="btn primary" data-open-dialog="material-dialog">＋ 新增材料</button>`)}
      <div class="library-toolbar">
        <div class="filter-pills">${materialCategories().map((category) => `<button class="${materialFilter === category ? "active" : ""}" data-material-filter="${escapeAttr(category)}">${category === "all" ? "全部" : escapeHtml(category)}</button>`).join("")}</div>
        <span>${materials.length} 份材料</span>
      </div>
      <section class="collection-grid material-grid">
        ${materials.length ? materials.map(renderMaterialCard).join("") : renderEmpty("這個分類還沒有材料", "按右上角新增，表單只會在需要時出現。")}
      </section>
      ${renderMaterialDialog()}
    `, "materials");
  }

  function renderSettings() {
    const bytes = new Blob([JSON.stringify(state)]).size;
    const conflicts = rulePack?.conflicts?.length || 0;
    return shell(`
      ${pageHeader("SETTINGS", "設定", "只管理本機資料、匯入匯出與規則包；沒有 API、模型或遠端生成設定。")}
      <section class="settings-grid">
        <article class="settings-card">
          <span class="settings-kicker">LOCAL DATA</span>
          <h2>本機資料</h2>
          <p>所有胖譜、人物、材料與草稿都只存在這個瀏覽器來源。</p>
          <dl><div><dt>目前資料量</dt><dd>${(bytes / 1024).toFixed(1)} KB</dd></div><div><dt>館藏</dt><dd>${state.promptEntries.length} 份胖譜</dd></div><div><dt>人物</dt><dd>${state.characters.length} 張</dd></div></dl>
          <div class="card-actions"><button class="btn secondary" id="export-unified-data">匯出 JSON</button><label class="btn secondary" for="import-unified-data">匯入 JSON</label><input class="visually-hidden" id="import-unified-data" type="file" accept="application/json" /></div>
        </article>
        <article class="settings-card">
          <span class="settings-kicker">RULE PACK</span>
          <h2>規則包</h2>
          <p>確定性編譯只依本機分類與衝突規則運作，不呼叫外部模型。</p>
          <dl><div><dt>目前版本</dt><dd>${escapeHtml(rulePack?.version || "內建版")}</dd></div><div><dt>衝突規則</dt><dd>${conflicts} 條</dd></div><div><dt>來源</dt><dd>${state.localSettings.customRulePack ? "自訂匯入" : "內建規則"}</dd></div></dl>
          <div class="card-actions"><label class="btn secondary" for="import-rule-pack">匯入規則包</label><input class="visually-hidden" id="import-rule-pack" type="file" accept="application/json" /><button class="btn ghost" id="reset-rule-pack" ${state.localSettings.customRulePack ? "" : "disabled"}>恢復內建</button></div>
        </article>
        <article class="settings-card danger-zone">
          <span class="settings-kicker">RESET</span>
          <h2>清除本機資料</h2>
          <p>只會清除新版 Prompt Fairy 的本機資料。建議先匯出備份。</p>
          <button class="btn danger" id="clear-unified-data">刪除全部資料</button>
        </article>
      </section>
    `, "settings");
  }

  function renderEmpty(title, description) {
    return `<div class="library-empty"><span>${renderBrandGlyph()}</span><h2>${title}</h2><p>${description}</p></div>`;
  }

  function renderPromptDialog() {
    return `
      <dialog class="library-dialog" id="prompt-dialog">
        <form method="dialog" class="dialog-panel" id="prompt-form">
          <div class="dialog-heading"><div><small>NEW PROMPT</small><h2>新增胖譜</h2></div><button class="icon-button" value="cancel" aria-label="關閉">×</button></div>
          <div class="two-col"><div class="field"><label for="new-prompt-title">標題</label><input id="new-prompt-title" required /></div><div class="field"><label for="new-prompt-status">狀態</label><select id="new-prompt-status"><option value="unused">未捏</option><option value="used">已捏</option><option value="retry">想重捏</option></select></div></div>
          <div class="field"><label for="new-prompt-content">原始胖譜</label><textarea id="new-prompt-content" required></textarea></div>
          <div class="field"><label for="new-prompt-tags">標籤</label><input id="new-prompt-tags" placeholder="日系, 雙人, 寫實" /></div>
          <div class="dialog-actions"><button class="btn ghost" value="cancel">取消</button><button class="btn primary" type="submit" value="default">收進胖譜庫</button></div>
        </form>
      </dialog>`;
  }

  function renderCharacterDialog() {
    return `
      <dialog class="library-dialog" id="character-dialog">
        <form method="dialog" class="dialog-panel" id="character-form">
          <div class="dialog-heading"><div><small>NEW CHARACTER</small><h2>新增人物</h2></div><button class="icon-button" value="cancel" aria-label="關閉">×</button></div>
          <div class="two-col"><div class="field"><label for="new-character-name">姓名</label><input id="new-character-name" required /></div><div class="field"><label for="new-character-avatar">肖像</label><input id="new-character-avatar" type="file" accept="image/*" /></div></div>
          <div class="field"><label for="new-character-base">固定外觀</label><textarea id="new-character-base" placeholder="髮色、眼睛、身形與不可變的外觀設定" required></textarea></div>
          <div class="field"><label for="new-character-fixtures">固定配件</label><textarea id="new-character-fixtures" placeholder="金絲眼鏡｜thin gold-rimmed glasses｜face&#10;銀戒｜a silver ring｜right hand"></textarea><span class="hint">每行一個：名稱｜寫進胖譜的內容｜位置</span></div>
          <div class="dialog-actions"><button class="btn ghost" value="cancel">取消</button><button class="btn primary" type="submit" value="default">收進人物設定庫</button></div>
        </form>
      </dialog>`;
  }

  function renderMaterialDialog() {
    return `
      <dialog class="library-dialog" id="material-dialog">
        <form method="dialog" class="dialog-panel" id="material-form">
          <div class="dialog-heading"><div><small>NEW MATERIAL</small><h2>新增材料</h2></div><button class="icon-button" value="cancel" aria-label="關閉">×</button></div>
          <div class="two-col"><div class="field"><label for="new-material-name">名稱</label><input id="new-material-name" required /></div><div class="field"><label for="new-material-category">分類</label><input id="new-material-category" placeholder="LIGHTING" required /></div></div>
          <div class="field"><label for="new-material-description">中文說明</label><input id="new-material-description" /></div>
          <div class="field"><label for="new-material-content">Prompt 內容</label><textarea id="new-material-content" required></textarea></div>
          <div class="dialog-actions"><button class="btn ghost" value="cancel">取消</button><button class="btn primary" type="submit" value="default">收進材料庫</button></div>
        </form>
      </dialog>`;
  }

  function patchCoreView(view) {
    document.querySelectorAll('a[href*="../../index.html"]').forEach((link) => {
      const target = link.getAttribute("href").includes("characters") ? "characters" : "library";
      link.setAttribute("href", `#${target}`);
    });
    if (view === "home") return;
    const heroTitle = document.querySelector(".hero .brand h1");
    const heroDescription = document.querySelector(".hero .brand p");
    if (heroTitle) heroTitle.textContent = "WORKSPACE";
    if (heroDescription) heroDescription.textContent = "調製台 · 原文 → 材料 → 輸出";
    document.querySelectorAll(".local-only-banner").forEach((element) => element.remove());
    document.querySelectorAll(".notice.success").forEach((element) => {
      if (element.textContent.includes("安全邊界")) element.remove();
    });
    const clearButton = document.querySelector("#clearExperiment");
    if (clearButton) clearButton.textContent = "清空調製台";
    const cabinet = document.querySelector(".character-cabinet");
    cabinet?.querySelector(".character-create")?.remove();
    cabinet?.querySelector(".recipe-character-grid")?.remove();
    const cabinetTitle = cabinet?.querySelector("h3");
    const cabinetDescription = cabinet?.querySelector(".panel-subtitle");
    if (cabinetTitle) cabinetTitle.textContent = "套用人物設定";
    if (cabinetDescription) cabinetDescription.textContent = "從人物設定庫選擇角色；固定配件仍可在這次調製中個別勾選。";
    const importButton = cabinet?.querySelector("#importStableCharacters");
    if (importButton) importButton.outerHTML = '<a class="btn secondary compact" href="#characters">管理人物設定</a>';
    const compileButton = document.querySelector("#compilePrompt");
    if (compileButton) compileButton.textContent = "Compose Prompt｜調製新胖譜";
    const outputRow = document.querySelector("#copyOutput")?.closest(".row");
    if (outputRow && !outputRow.querySelector("#save-output-library")) {
      outputRow.insertAdjacentHTML("beforeend", `<button class="btn secondary" id="save-output-library" ${state.outputPrompt.trim() || state.sourcePrompt.trim() ? "" : "disabled"}>儲存至胖譜庫</button>`);
      outputRow.querySelector("#save-output-library")?.addEventListener("click", saveWorkspaceToLibrary);
    }
  }

  function parseFixtures(text) {
    return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[｜|]/).map((part) => part.trim());
      return { id: uid("fixture"), name: parts[0] || "未命名配件", promptText: parts[1] || parts[0] || "", bodySlot: parts[2] || "", type: "other" };
    });
  }

  function readDataUrl(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  function saveWorkspaceToLibrary() {
    const prompt = state.outputPrompt.trim() || state.sourcePrompt.trim();
    if (!prompt) return;
    const entryId = state.localSettings.activePromptEntryId;
    const entry = state.promptEntries.find((item) => item.id === entryId);
    if (entry) {
      state.promptVersions.push({ id: uid("version"), promptEntryId: entry.id, promptText: prompt, createdAt: new Date().toISOString() });
      entry.updatedAt = new Date().toISOString();
      pageMessage = `已替「${entry.title}」新增一個版本。`;
    } else {
      const newEntry = {
        id: uid("entry"), title: `未命名配方 ${new Date().toLocaleDateString("zh-TW")}`, status: "unused", tags: [],
        sourcePrompt: state.sourcePrompt.trim() || prompt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      state.promptEntries.push(newEntry);
      state.localSettings.activePromptEntryId = newEntry.id;
      state.promptVersions.push({ id: uid("version"), promptEntryId: newEntry.id, promptText: prompt, createdAt: new Date().toISOString() });
      pageMessage = "已建立新館藏並保存目前版本。";
    }
    saveState();
    render();
  }

  function openDialog(id) {
    const dialog = document.querySelector(`#${id}`);
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function bindUnifiedEvents(view) {
    document.querySelectorAll("[data-open-dialog]").forEach((button) => button.addEventListener("click", () => openDialog(button.dataset.openDialog)));
    document.querySelectorAll("[data-library-filter]").forEach((button) => button.addEventListener("click", () => { libraryFilter = button.dataset.libraryFilter; render(); }));
    document.querySelectorAll("[data-material-filter]").forEach((button) => button.addEventListener("click", () => { materialFilter = button.dataset.materialFilter; render(); }));

    document.querySelector("#prompt-form")?.addEventListener("submit", (event) => {
      if (event.submitter?.value === "cancel") return;
      event.preventDefault();
      const prompt = document.querySelector("#new-prompt-content").value.trim();
      const title = document.querySelector("#new-prompt-title").value.trim();
      if (!title || !prompt) return;
      state.promptEntries.push({ id: uid("entry"), title, status: document.querySelector("#new-prompt-status").value, tags: document.querySelector("#new-prompt-tags").value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), sourcePrompt: prompt, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      pageMessage = `已把「${title}」收進胖譜庫。`;
      saveState(); render();
    });

    document.querySelector("#character-form")?.addEventListener("submit", async (event) => {
      if (event.submitter?.value === "cancel") return;
      event.preventDefault();
      const name = document.querySelector("#new-character-name").value.trim();
      const basePrompt = document.querySelector("#new-character-base").value.trim();
      if (!name || !basePrompt) return;
      const avatarData = await readDataUrl(document.querySelector("#new-character-avatar").files[0]);
      state.characters.push({ id: uid("character"), name, basePrompt, avatarData, fixtures: parseFixtures(document.querySelector("#new-character-fixtures").value), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      pageMessage = `已把「${name}」收進人物設定庫。`;
      saveState(); render();
    });

    document.querySelector("#material-form")?.addEventListener("submit", (event) => {
      if (event.submitter?.value === "cancel") return;
      event.preventDefault();
      const name = document.querySelector("#new-material-name").value.trim();
      const content = document.querySelector("#new-material-content").value.trim();
      if (!name || !content) return;
      state.materials.push({ id: uid("material"), name, category: document.querySelector("#new-material-category").value.trim().toUpperCase(), description: document.querySelector("#new-material-description").value.trim(), content, createdAt: new Date().toISOString() });
      pageMessage = `已把「${name}」收進材料庫。`;
      saveState(); render();
    });

    document.querySelectorAll("[data-use-entry]").forEach((button) => button.addEventListener("click", () => {
      const entry = state.promptEntries.find((item) => item.id === button.dataset.useEntry);
      if (!entry) return;
      state.sourcePrompt = entry.sourcePrompt;
      state.fragments = splitPrompt(entry.sourcePrompt);
      state.outputPrompt = "";
      state.localSettings.activePromptEntryId = entry.id;
      saveState(); location.hash = "workspace";
    }));
    document.querySelectorAll("[data-archive-entry]").forEach((button) => button.addEventListener("click", () => {
      const entry = state.promptEntries.find((item) => item.id === button.dataset.archiveEntry);
      if (!entry || !confirm(`封存「${entry.title}」？`)) return;
      entry.archivedAt = new Date().toISOString(); saveState(); render();
    }));
    document.querySelectorAll("[data-apply-character]").forEach((button) => button.addEventListener("click", () => {
      const character = state.characters.find((item) => item.id === button.dataset.applyCharacter);
      const slot = button.dataset.slot;
      if (!character || !state.characterAssignments[slot]) return;
      state.characterAssignments[slot] = { characterId: character.id, fixtureIds: (character.fixtures || []).map((fixture) => fixture.id) };
      pageMessage = `已將「${character.name}」套用至 ${slot}。`;
      saveState(); render();
    }));
    document.querySelectorAll("[data-remove-character]").forEach((button) => button.addEventListener("click", () => {
      const character = state.characters.find((item) => item.id === button.dataset.removeCharacter);
      if (!character || !confirm(`移除「${character.name}」？`)) return;
      state.characters = state.characters.filter((item) => item.id !== character.id);
      ["AA", "BB"].forEach((slot) => { if (state.characterAssignments[slot].characterId === character.id) state.characterAssignments[slot] = { characterId: "", fixtureIds: [] }; });
      saveState(); render();
    }));
    document.querySelectorAll("[data-apply-material]").forEach((button) => button.addEventListener("click", () => {
      const material = state.materials.find((item) => item.id === button.dataset.applyMaterial);
      if (!material) return;
      state.mixer.additions = [state.mixer.additions.trim(), material.content].filter(Boolean).join("\n");
      pageMessage = `已將「${material.name}」加入調製台。`;
      saveState(); location.hash = "workspace";
    }));
    document.querySelectorAll("[data-remove-material]").forEach((button) => button.addEventListener("click", () => {
      const material = state.materials.find((item) => item.id === button.dataset.removeMaterial);
      if (!material || !confirm(`移除材料「${material.name}」？`)) return;
      state.materials = state.materials.filter((item) => item.id !== material.id); saveState(); render();
    }));

    if (view === "settings") bindSettingsEvents();
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function bindSettingsEvents() {
    document.querySelector("#export-unified-data")?.addEventListener("click", () => downloadJson(`prompt-fairy-backup-${new Date().toISOString().slice(0, 10)}.json`, state));
    document.querySelector("#import-unified-data")?.addEventListener("change", async (event) => {
      try {
        const parsed = JSON.parse(await event.target.files[0].text());
        const normalized = normalizeState(parsed);
        normalized.characters = Array.isArray(parsed.characters) ? parsed.characters.map(legacyCharacter) : [];
        normalized.promptEntries = Array.isArray(parsed.promptEntries) ? parsed.promptEntries.map(legacyEntry) : [];
        normalized.promptVersions = Array.isArray(parsed.promptVersions) ? parsed.promptVersions : [];
        normalized.materials = Array.isArray(parsed.materials) ? parsed.materials : DEFAULT_MATERIALS.map((item) => ({ ...item }));
        normalized.characterAssignments = parsed.characterAssignments;
        normalized.localSettings = parsed.localSettings;
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, normalized);
        ensureUnifiedState(); saveState(); pageMessage = "本機資料已匯入。"; render();
      } catch (error) { pageMessage = "匯入失敗：檔案不是有效的 Prompt Fairy 備份。"; render(); }
    });
    document.querySelector("#import-rule-pack")?.addEventListener("change", async (event) => {
      try {
        const parsed = JSON.parse(await event.target.files[0].text());
        if (!Array.isArray(parsed.conflicts)) throw new Error("invalid");
        state.localSettings.customRulePack = parsed; rulePack = parsed; updateWarnings(); saveState(); pageMessage = "規則包已匯入。"; render();
      } catch (error) { pageMessage = "規則包格式不正確，至少需要 conflicts 陣列。"; render(); }
    });
    document.querySelector("#reset-rule-pack")?.addEventListener("click", async () => {
      state.localSettings.customRulePack = null; saveState(); pageMessage = "已恢復內建規則包。"; await loadRulePack();
    });
    document.querySelector("#clear-unified-data")?.addEventListener("click", () => {
      if (!confirm("刪除新版 Prompt Fairy 的全部本機資料？此操作無法復原。")) return;
      localStorage.removeItem(STORAGE_KEY); location.reload();
    });
  }

  render = function unifiedRender() {
    ensureUnifiedState();
    const view = currentView();
    if (view === "home" || view === "workspace") {
      activeView = view;
      previousRender();
      patchCoreView(view);
      return;
    }
    const html = {
      library: renderPromptLibrary,
      characters: renderCharacterLibrary,
      materials: renderMaterialLibrary,
      settings: renderSettings
    }[view]();
    document.querySelector("#app").innerHTML = html;
    bindUnifiedEvents(view);
  };

  ensureUnifiedState();
  saveState();
  render();
})();
