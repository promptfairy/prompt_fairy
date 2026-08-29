(() => {
  "use strict";

  const STORAGE_KEY = "prompt-fairy-arcane-v2";
  const LEGACY_RECIPE_KEY = "prompt-fairy-recipe-engine-v1";
  const LEGACY_APP_KEYS = ["prompt-sprite-state-v2", "prompt-sprite-state-v1"];
  const SCHEMA_VERSION = 2;
  const MAX_FRAGMENTS = 500;

  const PAGE_IDS = new Set(["home", "workspace", "prompts", "characters", "materials", "settings"]);
  const NAV_ITEMS = [
    ["workspace", "WORKSPACE", "調製台", "✦"],
    ["prompts", "PROMPT LIBRARY", "胖譜庫", "▣"],
    ["characters", "CHARACTER LIBRARY", "人物設定庫", "◎"],
    ["materials", "MATERIAL LIBRARY", "材料庫", "◇"],
    ["settings", "SETTINGS", "設定", "⚙"]
  ];

  const CATEGORIES = [
    ["provider_instruction", "平台／參考指示"],
    ["character", "人物"],
    ["clothing", "服裝與配件"],
    ["action", "動作與互動"],
    ["scene", "場景／背景"],
    ["framing", "構圖／鏡頭"],
    ["lighting", "光線／色調"],
    ["style_quality", "風格／品質"],
    ["ratio", "尺寸／比例"],
    ["constraints", "限制／負面詞"],
    ["unclassified", "未分類（完整保留）"]
  ];
  const CATEGORY_IDS = new Set(CATEGORIES.map(([id]) => id));
  const STANDARD_ORDER = CATEGORIES.map(([id]) => id);
  const LEGACY_CATEGORY_MAP = {
    subject: "character",
    appearance: "character",
    composition: "framing",
    camera: "framing",
    style: "style_quality",
    quality: "style_quality",
    negative: "constraints",
    restriction: "constraints"
  };

  const MATERIAL_CATEGORIES = [
    ["face_reference", "臉部參考"],
    ["style_filter", "風格濾鏡"],
    ["lighting", "光線"],
    ["character_quality", "人物質感"],
    ["negative", "負面詞"],
    ["restriction", "禁止事項"],
    ["enhancement", "常用補強"],
    ["tool_specific", "工具專用"],
    ["other", "其他"]
  ];

  const CLASSIFIERS = [
    ["provider_instruction", ["face reference", "reference image", "same person", "preserve identity", "參考圖", "臉部參考", "保留五官", "維持同一人"]],
    ["ratio", ["aspect ratio", "--ar", "9:16", "4:5", "3:4", "1:1", "16:9", "1254x1254", "1024x1024", "畫幅", "比例", "直式", "橫式", "正方形", "尺寸"]],
    ["constraints", ["negative prompt", "avoid:", "do not", "no watermark", "no text", "no logo", "bad hands", "extra fingers", "missing fingers", "bad anatomy", "extra limbs", "負面詞", "禁止", "不要", "避免", "無水印", "崩手", "肢體錯誤"]],
    ["framing", ["85mm", "50mm", "35mm", "lens", "f/1.", "f/2.", "depth of field", "bokeh", "dslr", "fujifilm", "kodak", "close-up", "full body", "half body", "upper body", "three-quarter", "overhead", "low angle", "high angle", "looking at camera", "not looking at camera", "鏡頭", "景深", "焦段", "散景", "相機", "特寫", "全身", "半身", "上半身", "俯拍", "仰拍", "不看鏡頭", "構圖"]],
    ["lighting", ["lighting", "golden hour", "window light", "backlight", "rim light", "soft light", "tungsten", "daylight", "color grading", "color palette", "光線", "晨光", "夕陽", "逆光", "輪廓光", "自然光", "色調", "調色"]],
    ["style_quality", ["style", "cinematic", "editorial", "anime", "photorealistic", "ultra-realistic", "film look", "film grain", "monochrome", "vogue", "lifestyle photography", "fashion photography", "masterpiece", "high detail", "ultra detail", "8k", "4k", "high resolution", "visible pores", "detailed", "sharp focus", "畫風", "電影感", "雜誌", "寫實", "半寫實", "動漫", "底片", "顆粒", "黑白", "高畫質", "高細節", "傑作", "毛孔", "清晰", "精緻", "時尚攝影"]],
    ["clothing", ["wearing", "wears", "dressed in", "shirt", "suit", "jacket", "coat", "dress", "vest", "trousers", "skirt", "uniform", "jewelry", "earrings", "glasses", "ring", "necklace", "bracelet", "watch", "穿著", "襯衫", "西裝", "外套", "長褲", "裙", "制服", "飾品", "耳環", "眼鏡", "戒指", "項鍊", "手鍊", "手錶", "服裝"]],
    ["action", ["holding", "sitting", "standing", "walking", "leaning", "hugging", "kissing", "looking back", "hands", "pose", "interaction", "拿著", "坐在", "站在", "走路", "倚靠", "擁抱", "親吻", "回頭", "動作", "互動"]],
    ["scene", ["background", "inside", "outdoor", "room", "kitchen", "cafe", "street", "beach", "forest", "school", "garden", "window", "bridge", "sky", "背景", "室內", "戶外", "房間", "廚房", "咖啡廳", "街道", "海邊", "森林", "校園", "花園", "窗邊", "橋", "天空"]],
    ["character", ["hair", "eyes", "skin", "face", "facial", "lips", "nose", "body", "height", "slim", "muscular", "young adult", "adult man", "adult woman", "a man", "a woman", "a person", "young man", "young woman", "east asian man", "east asian woman", "couple", "two men", "two women", "頭髮", "眼睛", "瞳", "膚色", "五官", "嘴唇", "鼻", "身形", "身高", "纖瘦", "肌肉", "成年男性", "成年女性", "一名男子", "一名女性", "東亞男性", "東亞女性", "情侶", "人物"]]
  ];

  const CONFLICT_RULES = [
    { id: "full-body-close-up", left: ["full body", "full-body", "全身", "完整全身"], right: ["extreme close-up", "close-up face", "臉部特寫", "極近距離特寫"], message: "全身入鏡與極近距離特寫可能互相衝突。" },
    { id: "mono-vivid", left: ["monochrome", "black and white", "黑白", "單色"], right: ["vivid colors", "highly saturated", "鮮豔色彩", "高飽和"], message: "黑白／單色與鮮豔高飽和色彩可能互相衝突。" },
    { id: "text-no-text", left: ["magazine title", "typography", "headline text", "封面標題", "文字排版"], right: ["no text", "avoid text", "不要文字", "禁止文字"], message: "要求文字排版，同時又禁止文字。" },
    { id: "single-couple", left: ["solo portrait", "one person", "single subject", "單人", "一人"], right: ["couple", "two people", "two subjects", "雙人", "兩人"], message: "單人與雙人條件同時存在。" }
  ];

  const DEFAULT_MATERIALS = [
    {
      id: "material_face_reference",
      name: "臉部參考保護語",
      category: "face_reference",
      content: "((Use the attached images as a FACE REFERENCE. Maintain the same facial structure, eyes, nose, lips, skin tone, and overall identity from the reference image. Do not change the person's identity. Only adjust pose, expression, lighting, and styling as described below.))",
      description: "保留同一人身份，只調整姿勢、表情、光線與造型。",
      favorite: true
    },
    {
      id: "material_real_skin",
      name: "寫實人物質感",
      category: "character_quality",
      content: "realistic skin texture with visible pores, natural facial expression, detailed eyelashes, balanced adult proportions",
      description: "加強寫實皮膚、自然表情與成人比例。",
      favorite: true
    },
    {
      id: "material_hands",
      name: "手部修正",
      category: "negative",
      content: "Avoid: extra fingers, missing fingers, fused fingers, bad hands, extra limbs, bad anatomy",
      description: "常用手部與肢體錯誤修正。",
      favorite: true
    },
    {
      id: "material_couple",
      name: "自然雙人互動",
      category: "enhancement",
      content: "genuine chemistry, warm body language, authentic unposed interaction, candid realistic couple photography",
      description: "讓雙人互動更自然。",
      favorite: true
    },
    {
      id: "material_no_logo",
      name: "不要文字水印",
      category: "restriction",
      content: "Avoid: watermark, logo, text, signature, brand label",
      description: "避免生成水印、文字或品牌標籤。",
      favorite: false
    },
    {
      id: "material_film",
      name: "復古底片正向宣告",
      category: "style_filter",
      content: "retro film look with intentional analog grain and lifted blacks as a deliberate stylistic choice",
      description: "把底片顆粒改成正向風格，不被負面詞打掉。",
      favorite: true
    }
  ];

  let activePage = getPageFromHash();
  let modal = null;
  let toast = "";
  let toastTimer = null;
  let promptFilter = "all";
  let materialFilter = "all";
  let promptSearch = "";
  let characterSearch = "";
  let materialSearch = "";
  let ingredientScrollLeft = 0;
  let state = loadState();

  function now() {
    return new Date().toISOString();
  }

  function uid(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getPageFromHash() {
    const requested = location.hash.slice(1);
    return PAGE_IDS.has(requested) ? requested : "home";
  }

  function readStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return null;
    }
  }

  function createInitialState() {
    const timestamp = now();
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        createdAt: timestamp,
        updatedAt: timestamp,
        migratedFrom: []
      },
      settings: {
        outputLanguage: "keep_source",
        defaultOrder: "original",
        preserveUnknown: true
      },
      workspace: {
        sourcePrompt: "",
        sourceUrl: "",
        fragments: [],
        activeIngredientFilter: "all",
        assignments: {
          AA: { characterId: "", fixtureIds: [] },
          BB: { characterId: "", fixtureIds: [] }
        },
        selectedMaterialIds: [],
        additions: "",
        ratio: "",
        orderMode: "original",
        outputPrompt: "",
        outputNotes: [],
        warnings: [],
        currentEntryId: ""
      },
      characters: [],
      materials: DEFAULT_MATERIALS.map((item) => normalizeMaterial({ ...item, createdAt: timestamp, updatedAt: timestamp })),
      promptEntries: []
    };
  }

  function loadState() {
    const current = readStorage(STORAGE_KEY);
    if (current) return normalizeState(current);
    const fresh = createInitialState();
    applyLegacyData(fresh);
    persistState(fresh);
    return fresh;
  }

  function normalizeState(input) {
    const base = createInitialState();
    const workspace = input?.workspace || {};
    const assignments = workspace.assignments || workspace.characterAssignments || {};
    const output = {
      ...base,
      ...input,
      schemaVersion: SCHEMA_VERSION,
      meta: { ...base.meta, ...(input?.meta || {}), updatedAt: input?.meta?.updatedAt || now() },
      settings: { ...base.settings, ...(input?.settings || {}) },
      workspace: {
        ...base.workspace,
        ...workspace,
        sourcePrompt: String(workspace.sourcePrompt ?? workspace.rawPrompt ?? ""),
        fragments: Array.isArray(workspace.fragments) ? compactFragments(workspace.fragments.map(normalizeFragment)) : [],
        assignments: {
          AA: normalizeAssignment(assignments.AA),
          BB: normalizeAssignment(assignments.BB)
        },
        selectedMaterialIds: arrayOfStrings(workspace.selectedMaterialIds || workspace.selectedPhrases),
        outputNotes: Array.isArray(workspace.outputNotes) ? workspace.outputNotes.map(String) : [],
        warnings: Array.isArray(workspace.warnings) ? workspace.warnings : []
      },
      characters: Array.isArray(input?.characters) ? input.characters.filter((item) => !item.archivedAt).map(normalizeCharacter) : [],
      materials: Array.isArray(input?.materials) && input.materials.length
        ? input.materials.filter((item) => !item.archivedAt).map(normalizeMaterial)
        : base.materials,
      promptEntries: Array.isArray(input?.promptEntries) ? input.promptEntries.filter((item) => !item.archivedAt).map(normalizePromptEntry) : []
    };
    if (!CATEGORY_IDS.has(output.workspace.activeIngredientFilter) && output.workspace.activeIngredientFilter !== "all") {
      output.workspace.activeIngredientFilter = "all";
    }
    return output;
  }

  function normalizeAssignment(input = {}) {
    return {
      characterId: String(input?.characterId || ""),
      fixtureIds: arrayOfStrings(input?.fixtureIds)
    };
  }

  function normalizeFragment(fragment = {}, index = 0) {
    const category = LEGACY_CATEGORY_MAP[fragment.category] || fragment.category;
    return {
      id: String(fragment.id || uid("fragment")),
      text: String(fragment.text || ""),
      originalText: String(fragment.originalText ?? fragment.text ?? ""),
      category: CATEGORY_IDS.has(category) ? category : "unclassified",
      confidence: ["high", "medium", "low"].includes(fragment.confidence) ? fragment.confidence : "low",
      locked: Boolean(fragment.locked),
      enabled: fragment.enabled !== false,
      source: String(fragment.source || "original"),
      originalOrder: Number.isFinite(fragment.originalOrder) ? fragment.originalOrder : index
    };
  }

  function normalizeCharacter(character = {}) {
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
      basePrompt: String(basePrompt || ""),
      notes: String(character.notes || character.impression || ""),
      fixtures: Array.isArray(character.fixtures) ? character.fixtures.filter((item) => !item.archivedAt).map(normalizeFixture) : [],
      starred: Boolean(character.starred),
      createdAt: character.createdAt || now(),
      updatedAt: character.updatedAt || now()
    };
  }

  function normalizeFixture(fixture = {}) {
    return {
      id: String(fixture.id || uid("fixture")),
      name: String(fixture.name || fixture.promptText || "未命名配件"),
      promptText: String(fixture.promptText || fixture.name || ""),
      bodySlot: String(fixture.bodySlot || ""),
      type: String(fixture.type || "other")
    };
  }

  function normalizeMaterial(material = {}) {
    return {
      id: String(material.id || uid("material")),
      name: String(material.name || "未命名材料"),
      category: MATERIAL_CATEGORIES.some(([id]) => id === material.category) ? material.category : "other",
      content: String(material.content || ""),
      description: String(material.description ?? material.descriptionZh ?? ""),
      favorite: Boolean(material.favorite ?? material.isFavorite),
      createdAt: material.createdAt || now(),
      updatedAt: material.updatedAt || now()
    };
  }

  function normalizePromptEntry(entry = {}) {
    const content = entry.content ?? entry.outputPrompt ?? entry.sourcePrompt ?? entry.prompt ?? "";
    return {
      id: String(entry.id || uid("prompt")),
      title: String(entry.title || "未命名胖譜"),
      content: String(content),
      sourcePrompt: String(entry.sourcePrompt || ""),
      sourceUrl: String(entry.sourceUrl || ""),
      status: ["unused", "used", "retry"].includes(entry.status) ? entry.status : "unused",
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : Array.isArray(entry.tagIds) ? entry.tagIds.map(String) : [],
      notes: String(entry.notes || ""),
      starred: Boolean(entry.starred),
      versions: Array.isArray(entry.versions) ? entry.versions.map((version) => ({
        id: String(version.id || uid("version")),
        content: String(version.content || version.promptText || ""),
        createdAt: version.createdAt || now()
      })) : [],
      createdAt: entry.createdAt || now(),
      updatedAt: entry.updatedAt || now(),
      lastUsedAt: entry.lastUsedAt || ""
    };
  }

  function arrayOfStrings(input) {
    return Array.isArray(input) ? input.map(String) : [];
  }

  function applyLegacyData(target) {
    const migratedFrom = new Set(target.meta.migratedFrom || []);
    const recipe = readStorage(LEGACY_RECIPE_KEY);
    const stable = LEGACY_APP_KEYS.map(readStorage).find(Boolean);

    if (recipe) {
      const recipeState = recipe || {};
      target.workspace.sourcePrompt ||= String(recipeState.sourcePrompt || "");
      target.workspace.fragments = target.workspace.fragments.length
        ? target.workspace.fragments
        : compactFragments((recipeState.fragments || []).map(normalizeFragment));
      target.workspace.additions ||= String(recipeState.mixer?.additions || "");
      target.workspace.ratio ||= String(recipeState.mixer?.ratio || "");
      target.workspace.orderMode = recipeState.mixer?.orderMode || target.workspace.orderMode;
      target.workspace.outputPrompt ||= String(recipeState.outputPrompt || "");
      target.workspace.outputNotes = target.workspace.outputNotes.length ? target.workspace.outputNotes : (recipeState.outputNotes || []).map(String);
      const recipeAssignments = recipeState.characterAssignments || {};
      target.workspace.assignments.AA = normalizeAssignment(recipeAssignments.AA || target.workspace.assignments.AA);
      target.workspace.assignments.BB = normalizeAssignment(recipeAssignments.BB || target.workspace.assignments.BB);
      mergeCharacters(target.characters, recipeState.characters || []);
      migratedFrom.add(LEGACY_RECIPE_KEY);
    }

    if (stable) {
      mergeCharacters(target.characters, stable.characters || []);
      mergeMaterials(target.materials, stable.phrases || []);
      mergePromptEntries(target.promptEntries, stable.promptEntries || []);
      migratedFrom.add(LEGACY_APP_KEYS.find((key) => readStorage(key)) || LEGACY_APP_KEYS[0]);
    }

    target.meta.migratedFrom = [...migratedFrom];
    target.meta.updatedAt = now();
  }

  function mergeCharacters(target, incoming) {
    const keys = new Set(target.map((item) => item.name.trim().toLocaleLowerCase()));
    (Array.isArray(incoming) ? incoming : []).filter((item) => !item.archivedAt).forEach((item) => {
      const normalized = normalizeCharacter(item);
      const key = normalized.name.trim().toLocaleLowerCase();
      if (keys.has(key)) return;
      target.push(normalized);
      keys.add(key);
    });
  }

  function mergeMaterials(target, incoming) {
    const keys = new Set(target.map((item) => item.name.trim().toLocaleLowerCase()));
    (Array.isArray(incoming) ? incoming : []).filter((item) => !item.archivedAt).forEach((item) => {
      const normalized = normalizeMaterial(item);
      const key = normalized.name.trim().toLocaleLowerCase();
      if (keys.has(key)) return;
      target.push(normalized);
      keys.add(key);
    });
  }

  function mergePromptEntries(target, incoming) {
    const keys = new Set(target.map((item) => `${item.title}\n${item.content}`));
    (Array.isArray(incoming) ? incoming : []).filter((item) => !item.archivedAt).forEach((item) => {
      const normalized = normalizePromptEntry(item);
      const key = `${normalized.title}\n${normalized.content}`;
      if (keys.has(key)) return;
      target.push(normalized);
      keys.add(key);
    });
  }

  function persistState(target = state) {
    target.meta.updatedAt = now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
      return true;
    } catch (error) {
      console.error("Unable to save local state", error);
      showToast("本機儲存空間不足，這次變更還沒存下來。", true);
      return false;
    }
  }

  function navigate(page) {
    if (!PAGE_IDS.has(page)) return;
    if (location.hash !== `#${page}`) location.hash = page;
    else {
      activePage = page;
      render();
    }
  }

  function render() {
    ingredientScrollLeft = document.querySelector(".ingredient-tabs")?.scrollLeft || ingredientScrollLeft;
    document.querySelector("#app").innerHTML = `
      <div class="app-shell">
        ${renderProductBar()}
        <main class="app-main">${renderPage()}</main>
        ${renderMobileNav()}
        ${modal ? renderModal() : ""}
        ${toast ? `<div class="toast ${toast.startsWith("!") ? "risk" : ""}" role="status">${escapeHtml(toast.replace(/^!/, ""))}</div>` : ""}
      </div>
    `;
    requestAnimationFrame(() => {
      const tabs = document.querySelector(".ingredient-tabs");
      if (tabs) tabs.scrollLeft = ingredientScrollLeft;
      applySearchFilters();
      if (modal) document.querySelector(".modal-card input:not([type='checkbox']), .modal-card textarea")?.focus();
    });
  }

  function renderProductBar() {
    return `
      <header class="product-bar">
        <a class="product-brand" href="#home" aria-label="回到 Prompt Fairy 首頁">
          ${brandGlyph()}
          <span><strong>Prompt Fairy</strong><small>胖譜小精靈</small></span>
        </a>
        <nav class="product-nav" aria-label="主要導覽">
          ${NAV_ITEMS.map(([id, englishLabel, localLabel]) => `
            <a class="${activePage === id ? "active" : ""}" href="#${id}">
              <span>${englishLabel}</span><small>${localLabel}</small>
            </a>
          `).join("")}
        </nav>
        <a class="local-status" href="#settings" aria-label="開啟資料設定"><i></i><span>完全本機</span></a>
      </header>
    `;
  }

  function renderMobileNav() {
    return `
      <nav class="mobile-nav" aria-label="手機導覽">
        ${NAV_ITEMS.map(([id, , localLabel, icon]) => `
          <a class="${activePage === id ? "active" : ""}" href="#${id}">
            <span>${icon}</span><small>${localLabel.replace("設定庫", "").replace("庫", "")}</small>
          </a>
        `).join("")}
      </nav>
    `;
  }

  function renderPage() {
    if (activePage === "workspace") return renderWorkspace();
    if (activePage === "prompts") return renderPromptLibrary();
    if (activePage === "characters") return renderCharacterLibrary();
    if (activePage === "materials") return renderMaterialLibrary();
    if (activePage === "settings") return renderSettings();
    return renderHome();
  }

  function renderHome() {
    const workspace = state.workspace;
    const hasDraft = Boolean(workspace.sourcePrompt.trim() || workspace.fragments.length || workspace.outputPrompt.trim());
    const recentPrompts = [...state.promptEntries].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0, 3);
    return `
      <div class="home-page page-width">
        <section class="home-hero">
          <div class="hero-copy">
            <span class="eyebrow">ARCANE PROMPT WORKBENCH</span>
            <h1>把一整段胖譜，<span>調成真正能控制的配方。</span></h1>
            <p>拆解、置換、重組與保存常用設定。所有內容都留在這台裝置，小精靈只替妳整理，不把原文送去任何地方。</p>
            <div class="hero-meta"><span><i></i> Local-first</span><span>11 類材料</span><span>不自動刪除原文</span></div>
          </div>
          <a class="beam-card" href="#workspace">
            <span class="beam-card-inner">
              <small>${hasDraft ? "CONTINUE DRAFT" : "RECOMMENDED"}</small>
              <strong>${hasDraft ? "Continue Brewing" : "Open Workspace"}</strong>
              <span>${hasDraft ? "繼續上次調製" : "開啟調製台"}</span>
              <p>${hasDraft ? `已保留 ${workspace.fragments.length} 份材料與目前輸出。` : "從貼入 Prompt 開始建立第一份可編輯配方。"}</p>
              <b aria-hidden="true">↗</b>
            </span>
          </a>
        </section>

        <section class="home-entry-grid" aria-label="主要功能">
          ${homeEntry("▣", "PROMPT LIBRARY", "胖譜庫", `${state.promptEntries.length} 份收藏與歷史版本`, "prompts")}
          ${homeEntry("◎", "CHARACTER LIBRARY", "人物設定庫", `${state.characters.length} 位人物與固定配件`, "characters")}
          ${homeEntry("◇", "MATERIAL LIBRARY", "材料庫", `${state.materials.length} 份可重用片段與詞條`, "materials")}
        </section>

        <section class="home-lower-grid">
          <article class="surface-card privacy-card">
            <span class="card-kicker">LOCAL BY DESIGN</span>
            <h2>妳的資料，不離開瀏覽器。</h2>
            <p>沒有 API key、沒有遠端生成、沒有背景同步。匯出檔由妳自己保管；舊版資料也只在妳按下遷移時複製。</p>
            <a class="text-link" href="#settings">管理本機資料 →</a>
          </article>
          <article class="surface-card recent-card">
            <div class="section-title"><div><span class="card-kicker">RECENT RECIPES</span><h2>最近胖譜</h2></div><a class="text-link" href="#prompts">查看全部</a></div>
            ${recentPrompts.length ? recentPrompts.map((entry) => `
              <button class="recent-row" data-action="open-prompt" data-id="${escapeAttr(entry.id)}">
                <span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.tags.slice(0, 3).join(" · ") || statusLabel(entry.status))}</small></span>
                <time>${formatDate(entry.updatedAt)}</time>
              </button>
            `).join("") : `<div class="compact-empty">胖譜庫還是空的。第一份成品完成後，就把它收進來。</div>`}
          </article>
        </section>
      </div>
    `;
  }

  function homeEntry(icon, kicker, title, description, route) {
    return `
      <a class="entry-card" href="#${route}">
        <span class="entry-icon">${icon}</span>
        <span><small>${kicker}</small><strong>${title}</strong><p>${description}</p></span>
        <b aria-hidden="true">→</b>
      </a>
    `;
  }

  function renderWorkspace() {
    const workspace = state.workspace;
    const filteredFragments = workspace.fragments.filter((fragment) => workspace.activeIngredientFilter === "all" || fragment.category === workspace.activeIngredientFilter);
    return `
      <div class="workspace-page wide-page">
        ${pageHeader("Workspace", "調製台", "原文 → 材料 → 輸出；每一筆變動都看得見。", `RECIPE ENGINE · v2`)}
        <div class="workspace-grid">
          <section class="panel source-panel stack">
            <div class="step-title"><span>01</span><div><h2>倒入原始胖譜</h2><p>原文永遠保留；拆解只建立可操作副本。</p></div></div>
            <label class="field"><span>原始胖譜</span><textarea id="sourcePrompt" class="prompt-input" placeholder="貼上完整 Prompt…">${escapeHtml(workspace.sourcePrompt)}</textarea><small>${workspace.sourcePrompt.length.toLocaleString()} 字 · 自動存於本瀏覽器</small></label>
            <label class="field"><span>來源連結 <em>選填</em></span><input id="sourceUrl" value="${escapeAttr(workspace.sourceUrl)}" placeholder="Threads、Instagram 或其他來源" /></label>
            <div class="button-row">
              <button class="btn primary" data-action="parse" ${!workspace.sourcePrompt.trim() ? "disabled" : ""}>拆成材料</button>
              <button class="btn secondary" data-action="reset-fragments" ${!workspace.fragments.length ? "disabled" : ""}>重新拆解</button>
              <button class="btn ghost danger-text" data-action="clear-workspace" ${!hasWorkspaceContent() ? "disabled" : ""}>清空</button>
            </div>
            <div class="local-note"><i></i><span><strong>完全本機</strong>　內容不會送往 OpenAI、Gemini 或其他服務。</span></div>
          </section>

          <section class="panel ingredients-panel stack">
            <div class="step-title"><span>02</span><div><h2>檢查材料</h2><p>分類錯了可以改；不確定的內容完整保留。</p></div><b>${workspace.fragments.length} 份</b></div>
            ${renderIngredientTabs()}
            <div class="ingredient-summary">
              <span>目前顯示 ${filteredFragments.length}</span>
              <span>鎖定 ${workspace.fragments.filter((item) => item.locked).length}</span>
              <span>停用 ${workspace.fragments.filter((item) => !item.enabled).length}</span>
            </div>
            <div class="recipe-list">
              ${filteredFragments.length ? filteredFragments.map((fragment) => renderFragment(fragment, workspace.fragments.indexOf(fragment))).join("") : `<div class="empty-state"><span>◇</span><strong>${workspace.fragments.length ? "這個分類沒有材料" : "還沒有可編輯材料"}</strong><p>${workspace.fragments.length ? "切換上方分類看看其他材料。" : "先在左側貼上胖譜，再按「拆成材料」。"}</p></div>`}
            </div>
          </section>

          <section class="panel compose-panel stack">
            <div class="step-title"><span>03</span><div><h2>選擇調製方式</h2><p>人物、材料與比例只在妳指定時加入。</p></div></div>
            <div class="assignment-grid">
              ${renderAssignment("AA", "第一主調 [AA]")}
              ${renderAssignment("BB", "第二主調 [BB]")}
            </div>
            <details class="compose-details" open>
              <summary><span>材料庫</span><small>${workspace.selectedMaterialIds.length} 份已選</small></summary>
              <div class="material-picker">
                ${state.materials.length ? [...state.materials].sort((a, b) => Number(b.favorite) - Number(a.favorite)).map((material) => `
                  <label class="pick-card">
                    <input type="checkbox" data-material-pick="${escapeAttr(material.id)}" ${workspace.selectedMaterialIds.includes(material.id) ? "checked" : ""} />
                    <span><strong>${escapeHtml(material.name)}</strong><small>${escapeHtml(materialCategoryLabel(material.category))}</small></span>
                  </label>
                `).join("") : `<span class="muted">材料庫還是空的。</span>`}
              </div>
              <a class="inline-link" href="#materials">管理材料庫 →</a>
            </details>
            <label class="field"><span>臨時點綴 <em>每行一份</em></span><textarea id="additions" placeholder="retro film look&#10;soft golden-hour lighting">${escapeHtml(workspace.additions)}</textarea></label>
            <div class="two-col">
              <label class="field"><span>尺寸／比例</span><input id="ratio" value="${escapeAttr(workspace.ratio)}" placeholder="3:4 或 1254×1254" /></label>
              <div class="field"><span>出杯順序</span><div class="segment"><button class="${workspace.orderMode === "original" ? "active" : ""}" data-action="order-mode" data-value="original">原順序</button><button class="${workspace.orderMode === "standard" ? "active" : ""}" data-action="order-mode" data-value="standard">標準順序</button></div></div>
            </div>
            <button class="btn primary beam-action" data-action="compile" ${!workspace.fragments.length ? "disabled" : ""}>Compose Prompt｜本機調製</button>
          </section>
        </div>

        <section class="output-workspace panel ${workspace.outputPrompt.trim() ? "is-complete" : ""}">
          <div class="output-heading">
            <div class="step-title"><span>04</span><div><h2>新胖譜</h2><p>${workspace.outputPrompt.trim() ? "調製完成；仍可直接手動修字。" : "完成調製後，成品與變更紀錄會出現在這裡。"}</p></div></div>
            <div class="button-row">
              <button class="btn secondary" data-action="copy-output" ${!workspace.outputPrompt.trim() ? "disabled" : ""}>複製</button>
              <button class="btn primary" data-action="save-output" ${!workspace.outputPrompt.trim() ? "disabled" : ""}>收進胖譜庫</button>
              ${workspace.currentEntryId ? `<button class="btn ghost" data-action="save-version" ${!workspace.outputPrompt.trim() ? "disabled" : ""}>存為新版本</button>` : ""}
            </div>
          </div>
          <div class="output-grid">
            <label class="field"><span>輸出內容</span><textarea id="outputPrompt" class="output-box" placeholder="調製完成後會出現在這裡。">${escapeHtml(workspace.outputPrompt)}</textarea></label>
            <div class="output-aside stack">
              ${workspace.warnings.length ? `<div class="notice warning"><strong>配方可能打架</strong>${workspace.warnings.map((warning) => `<span>• ${escapeHtml(warning.message)}</span>`).join("")}<small>只提醒，不會自動刪除材料。</small></div>` : `<div class="notice success"><strong>${workspace.outputPrompt ? "沒有偵測到明顯衝突" : "等待調製"}</strong><span>${workspace.outputPrompt ? "仍建議生成前快速讀過一次。" : "小精靈會在這裡列出衝突提醒與處理紀錄。"}</span></div>`}
              ${workspace.outputNotes.length ? `<div class="change-log"><strong>本次調製紀錄</strong>${workspace.outputNotes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div>` : ""}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderIngredientTabs() {
    const counts = state.workspace.fragments.reduce((result, fragment) => {
      result[fragment.category] = (result[fragment.category] || 0) + 1;
      return result;
    }, {});
    const filters = [["all", "全部"], ...CATEGORIES];
    return `<div class="ingredient-tabs" aria-label="材料分類">${filters.map(([id, label]) => `<button class="ingredient-tab ${state.workspace.activeIngredientFilter === id ? "active" : ""}" data-action="ingredient-filter" data-value="${id}">${escapeHtml(label.replace("（完整保留）", ""))}<span>${id === "all" ? state.workspace.fragments.length : (counts[id] || 0)}</span></button>`).join("")}</div>`;
  }

  function renderFragment(fragment, index) {
    return `
      <article class="fragment ${fragment.enabled ? "" : "off"} ${fragment.locked ? "locked" : ""}">
        <div class="fragment-head">
          <span class="fragment-index">${index + 1}</span>
          <div><strong>${escapeHtml(categoryLabel(fragment.category))}</strong><small>信心 ${confidenceLabel(fragment.confidence)} · ${fragment.source === "original" ? "原文" : "新增"}</small></div>
          <span class="source-pill">${fragment.locked ? "已鎖" : fragment.category === "unclassified" ? "待確認" : "材料"}</span>
        </div>
        <textarea data-fragment-text="${escapeAttr(fragment.id)}">${escapeHtml(fragment.text)}</textarea>
        <div class="fragment-controls">
          <select data-fragment-category="${escapeAttr(fragment.id)}">${CATEGORIES.map(([id, label]) => `<option value="${id}" ${fragment.category === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>
          <label class="toggle"><input type="checkbox" data-fragment-enabled="${escapeAttr(fragment.id)}" ${fragment.enabled ? "checked" : ""}/><span>使用</span></label>
          <label class="toggle"><input type="checkbox" data-fragment-locked="${escapeAttr(fragment.id)}" ${fragment.locked ? "checked" : ""}/><span>鎖定</span></label>
        </div>
        <div class="mini-actions">
          <button data-action="fragment-up" data-id="${escapeAttr(fragment.id)}" ${index === 0 ? "disabled" : ""}>↑ 上移</button>
          <button data-action="fragment-down" data-id="${escapeAttr(fragment.id)}" ${index === state.workspace.fragments.length - 1 ? "disabled" : ""}>↓ 下移</button>
          <button data-action="fragment-restore" data-id="${escapeAttr(fragment.id)}">↺ 原文</button>
        </div>
      </article>
    `;
  }

  function renderAssignment(slot, label) {
    const assignment = state.workspace.assignments[slot];
    const character = state.characters.find((item) => item.id === assignment.characterId);
    return `
      <div class="assignment-card">
        <label class="field"><span>${label}</span><select data-character-slot="${slot}"><option value="">不替換人物</option>${state.characters.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === assignment.characterId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
        ${character ? `
          <p class="assignment-preview">${escapeHtml(shorten(character.basePrompt, 150))}</p>
          ${character.fixtures.length ? `<div class="fixture-picker">${character.fixtures.map((fixture) => `<label><input type="checkbox" data-fixture-pick="${escapeAttr(fixture.id)}" data-slot="${slot}" ${assignment.fixtureIds.includes(fixture.id) ? "checked" : ""}/><span>${escapeHtml(fixture.name)}</span></label>`).join("")}</div>` : `<small class="muted">這張人物卡沒有固定配件。</small>`}
        ` : `<small class="muted">從人物設定庫選擇；也可以保留原人物。</small>`}
      </div>
    `;
  }

  function renderPromptLibrary() {
    const entries = [...state.promptEntries].sort((a, b) => Number(b.starred) - Number(a.starred) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return `
      <div class="library-page page-width">
        ${pageHeader("Prompt Library", "胖譜庫", "先看收藏，再決定要編輯、套用或建立新版本。", `${entries.length} RECIPES`, `<button class="btn primary" data-action="new-prompt">＋ 新增胖譜</button>`)}
        <div class="library-toolbar">
          <label class="search-box"><span>⌕</span><input data-search="prompts" value="${escapeAttr(promptSearch)}" placeholder="搜尋標題、內容或標籤" /></label>
          <div class="filter-row">${[["all", "全部"], ["starred", "收藏"], ["unused", "未使用"], ["used", "已使用"], ["retry", "待重試"]].map(([id, label]) => `<button class="filter-chip ${promptFilter === id ? "active" : ""}" data-action="prompt-filter" data-value="${id}">${label}</button>`).join("")}</div>
        </div>
        <div class="collection-grid" data-collection="prompts">
          ${entries.length ? entries.map(renderPromptCard).join("") : renderCollectionEmpty("▣", "胖譜庫還是空的", "從調製台保存第一份成品，或直接新增既有 Prompt。", "new-prompt", "新增胖譜")}
        </div>
      </div>
    `;
  }

  function renderPromptCard(entry) {
    const index = `${entry.title} ${entry.content} ${entry.tags.join(" ")} ${entry.notes}`.toLocaleLowerCase();
    const filterValue = entry.starred ? `starred ${entry.status}` : entry.status;
    return `
      <article class="library-card prompt-card" data-search-card="prompts" data-search-index="${escapeAttr(index)}" data-filter-value="${escapeAttr(filterValue)}">
        <div class="card-topline"><span class="status ${statusClass(entry.status)}">${statusLabel(entry.status)}</span><button class="star-button ${entry.starred ? "active" : ""}" data-action="toggle-prompt-star" data-id="${escapeAttr(entry.id)}" aria-label="${entry.starred ? "取消收藏" : "加入收藏"}">★</button></div>
        <div><h2>${escapeHtml(entry.title)}</h2><p class="card-excerpt">${escapeHtml(shorten(entry.content, 260))}</p></div>
        <div class="tag-row">${entry.tags.length ? entry.tags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : `<span class="quiet-tag">尚未加標籤</span>`}</div>
        <div class="card-meta"><span>${entry.versions.length} 個版本</span><time>${formatDate(entry.updatedAt)}</time></div>
        <div class="card-actions"><button class="btn primary compact" data-action="open-prompt" data-id="${escapeAttr(entry.id)}">拿去調製</button><button class="btn secondary compact" data-action="copy-prompt" data-id="${escapeAttr(entry.id)}">複製</button><button class="btn ghost compact" data-action="edit-prompt" data-id="${escapeAttr(entry.id)}">編輯</button><button class="icon-danger" data-action="delete-prompt" data-id="${escapeAttr(entry.id)}" aria-label="刪除">×</button></div>
      </article>
    `;
  }

  function renderCharacterLibrary() {
    const characters = [...state.characters].sort((a, b) => Number(b.starred) - Number(a.starred) || a.name.localeCompare(b.name, "zh-Hant"));
    return `
      <div class="library-page page-width">
        ${pageHeader("Character Library", "人物設定庫", "人物主調與固定配件分開保存；每次調製再決定帶哪些。", `${characters.length} CHARACTERS`, `<button class="btn primary" data-action="new-character">＋ 新增人物</button>`)}
        <div class="library-toolbar single"><label class="search-box"><span>⌕</span><input data-search="characters" value="${escapeAttr(characterSearch)}" placeholder="搜尋姓名、人物主調或備註" /></label></div>
        <div class="collection-grid character-grid" data-collection="characters">
          ${characters.length ? characters.map(renderCharacterCard).join("") : renderCollectionEmpty("◎", "還沒有人物設定", "先建立人物主調與固定配件，調製時就不用反覆貼同一段。", "new-character", "新增人物")}
        </div>
      </div>
    `;
  }

  function renderCharacterCard(character) {
    const index = `${character.name} ${character.basePrompt} ${character.notes} ${character.fixtures.map((item) => item.name).join(" ")}`.toLocaleLowerCase();
    return `
      <article class="library-card character-card" data-search-card="characters" data-search-index="${escapeAttr(index)}">
        <div class="character-heading"><div class="monogram">${escapeHtml(character.name.trim().slice(0, 1).toUpperCase() || "✦")}</div><div><span class="card-kicker">CHARACTER PROFILE</span><h2>${escapeHtml(character.name)}</h2></div><button class="star-button ${character.starred ? "active" : ""}" data-action="toggle-character-star" data-id="${escapeAttr(character.id)}">★</button></div>
        <p class="card-excerpt character-prompt">${escapeHtml(shorten(character.basePrompt, 230) || "尚未填入人物主調。")}</p>
        <div class="fixture-list">${character.fixtures.length ? character.fixtures.slice(0, 6).map((fixture) => `<span>${escapeHtml(fixture.name)}</span>`).join("") : `<span class="quiet-tag">沒有固定配件</span>`}</div>
        ${character.notes ? `<p class="card-note">${escapeHtml(shorten(character.notes, 110))}</p>` : ""}
        <div class="card-meta"><span>${character.fixtures.length} 個配件</span><time>${formatDate(character.updatedAt)}</time></div>
        <div class="card-actions"><button class="btn primary compact" data-action="use-character" data-id="${escapeAttr(character.id)}">帶去調製</button><button class="btn secondary compact" data-action="edit-character" data-id="${escapeAttr(character.id)}">編輯</button><button class="icon-danger" data-action="delete-character" data-id="${escapeAttr(character.id)}" aria-label="刪除">×</button></div>
      </article>
    `;
  }

  function renderMaterialLibrary() {
    const materials = [...state.materials].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "zh-Hant"));
    return `
      <div class="library-page page-width">
        ${pageHeader("Material Library", "材料庫", "保存可重用的風格、限制、參考指示與 Prompt 片段。", `${materials.length} MATERIALS`, `<button class="btn primary" data-action="new-material">＋ 新增材料</button>`)}
        <div class="library-toolbar">
          <label class="search-box"><span>⌕</span><input data-search="materials" value="${escapeAttr(materialSearch)}" placeholder="搜尋材料名稱或內容" /></label>
          <div class="filter-row"><button class="filter-chip ${materialFilter === "all" ? "active" : ""}" data-action="material-filter" data-value="all">全部</button><button class="filter-chip ${materialFilter === "favorite" ? "active" : ""}" data-action="material-filter" data-value="favorite">常用</button>${MATERIAL_CATEGORIES.map(([id, label]) => `<button class="filter-chip ${materialFilter === id ? "active" : ""}" data-action="material-filter" data-value="${id}">${label}</button>`).join("")}</div>
        </div>
        <div class="collection-grid material-grid" data-collection="materials">
          ${materials.length ? materials.map(renderMaterialCard).join("") : renderCollectionEmpty("◇", "材料庫還是空的", "把常用風格、限制詞或補強片段保存起來，調製時勾選套用。", "new-material", "新增材料")}
        </div>
      </div>
    `;
  }

  function renderMaterialCard(material) {
    const index = `${material.name} ${material.content} ${material.description}`.toLocaleLowerCase();
    const filterValue = `${material.category}${material.favorite ? " favorite" : ""}`;
    const selected = state.workspace.selectedMaterialIds.includes(material.id);
    return `
      <article class="library-card material-card" data-search-card="materials" data-search-index="${escapeAttr(index)}" data-filter-value="${escapeAttr(filterValue)}">
        <div class="card-topline"><span class="category-pill">${escapeHtml(materialCategoryLabel(material.category))}</span><button class="star-button ${material.favorite ? "active" : ""}" data-action="toggle-material-star" data-id="${escapeAttr(material.id)}">★</button></div>
        <div><h2>${escapeHtml(material.name)}</h2><p class="material-content">${escapeHtml(shorten(material.content, 300))}</p></div>
        ${material.description ? `<p class="card-note">${escapeHtml(material.description)}</p>` : ""}
        <div class="card-actions"><button class="btn ${selected ? "secondary selected" : "primary"} compact" data-action="toggle-material-workspace" data-id="${escapeAttr(material.id)}">${selected ? "✓ 已放入調製台" : "加入調製台"}</button><button class="btn ghost compact" data-action="edit-material" data-id="${escapeAttr(material.id)}">編輯</button><button class="icon-danger" data-action="delete-material" data-id="${escapeAttr(material.id)}" aria-label="刪除">×</button></div>
      </article>
    `;
  }

  function renderSettings() {
    const bytes = new Blob([JSON.stringify(state)]).size;
    return `
      <div class="settings-page page-width narrow-page">
        ${pageHeader("Settings", "設定", "本機資料、備份與遷移；內容只留在這台裝置。", `SCHEMA v${SCHEMA_VERSION}`)}
        <section class="settings-grid">
          <article class="panel settings-card">
            <span class="card-kicker">STORAGE</span><h2>目前館藏</h2>
            <div class="stats-grid"><div><strong>${state.promptEntries.length}</strong><span>胖譜</span></div><div><strong>${state.characters.length}</strong><span>人物</span></div><div><strong>${state.materials.length}</strong><span>材料</span></div><div><strong>${formatBytes(bytes)}</strong><span>資料大小</span></div></div>
            <p class="muted">最後儲存：${formatDateTime(state.meta.updatedAt)}</p>
          </article>
          <article class="panel settings-card">
            <span class="card-kicker">BACKUP</span><h2>匯出與匯入</h2><p>匯出會把工作草稿、人物、材料與胖譜打包成一份 JSON。匯入前會先確認，不會把檔案送到網路。</p>
            <div class="button-row"><button class="btn primary" data-action="export-data">匯出全部資料</button><button class="btn secondary" data-action="choose-import">匯入備份</button><input id="importFile" type="file" accept="application/json,.json" hidden /></div>
          </article>
          <article class="panel settings-card">
            <span class="card-kicker">MIGRATION</span><h2>舊版資料遷移</h2><p>已辨識來源：${state.meta.migratedFrom.length ? state.meta.migratedFrom.map(escapeHtml).join("、") : "尚未找到舊版資料"}。再次掃描只會加入缺少的項目，不會刪除新版內容。</p>
            <button class="btn secondary" data-action="migrate-legacy">重新掃描舊版資料</button>
          </article>
          <article class="panel settings-card danger-zone">
            <span class="card-kicker">RESET</span><h2>清除新版資料</h2><p>只清除這套統一工作台的資料；舊版 storage 不受影響。若可能還會需要，請先匯出備份。</p>
            <button class="btn danger" data-action="reset-all">清除全部新版資料</button>
          </article>
        </section>
      </div>
    `;
  }

  function pageHeader(englishTitle, title, subtitle, badge = "", action = "") {
    return `
      <header class="page-header">
        <div class="page-heading-copy">
          <h1>${escapeHtml(englishTitle.toUpperCase())}</h1>
          <p class="page-local-title"><strong>${escapeHtml(title)}</strong><span aria-hidden="true">·</span><span>${escapeHtml(subtitle)}</span></p>
        </div>
        <div class="page-header-actions">${badge ? `<span class="header-badge">${escapeHtml(badge)}</span>` : ""}${action}</div>
      </header>
    `;
  }

  function renderCollectionEmpty(icon, title, text, action, buttonLabel) {
    return `<div class="collection-empty"><span>${icon}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><button class="btn primary" data-action="${action}">${escapeHtml(buttonLabel)}</button></div>`;
  }

  function renderModal() {
    let body = "";
    if (modal.kind === "prompt") body = renderPromptForm();
    if (modal.kind === "character") body = renderCharacterForm();
    if (modal.kind === "material") body = renderMaterialForm();
    return `
      <div class="modal-backdrop" data-action="close-modal">
        <section class="modal-card" role="dialog" aria-modal="true" aria-label="編輯視窗" data-modal-card>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="關閉">×</button>
          ${body}
        </section>
      </div>
    `;
  }

  function renderPromptForm() {
    const entry = modal.id ? state.promptEntries.find((item) => item.id === modal.id) : null;
    const draft = modal.draft || {};
    const value = entry || {
      title: draft.title || suggestPromptTitle(draft.content || ""),
      content: draft.content || "",
      sourcePrompt: draft.sourcePrompt || "",
      sourceUrl: draft.sourceUrl || "",
      status: "unused",
      tags: suggestTags(draft.content || ""),
      notes: "",
      starred: false
    };
    return `
      <form data-form="prompt" data-id="${escapeAttr(entry?.id || "")}" class="modal-form">
        <div class="modal-heading"><span class="card-kicker">PROMPT LIBRARY</span><h2>${entry ? "編輯胖譜" : "新增胖譜"}</h2><p>保存完整成品、來源與使用狀態。</p></div>
        <label class="field"><span>標題</span><input name="title" required value="${escapeAttr(value.title)}" placeholder="例如：香港茶樓午後" /></label>
        <label class="field"><span>Prompt 內容</span><textarea name="content" class="modal-large" required>${escapeHtml(value.content)}</textarea></label>
        <div class="two-col"><label class="field"><span>來源連結</span><input name="sourceUrl" value="${escapeAttr(value.sourceUrl)}" placeholder="可留空" /></label><label class="field"><span>狀態</span><select name="status"><option value="unused" ${value.status === "unused" ? "selected" : ""}>未使用</option><option value="used" ${value.status === "used" ? "selected" : ""}>已使用</option><option value="retry" ${value.status === "retry" ? "selected" : ""}>待重試</option></select></label></div>
        <label class="field"><span>標籤 <em>以逗號分隔</em></span><input name="tags" value="${escapeAttr((value.tags || []).join(", "))}" placeholder="雙人, 電影感, 室內" /></label>
        <label class="field"><span>備註</span><textarea name="notes">${escapeHtml(value.notes)}</textarea></label>
        <label class="check-line"><input type="checkbox" name="starred" ${value.starred ? "checked" : ""}/><span>加入收藏</span></label>
        <div class="modal-actions"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${entry ? "儲存變更" : "收進胖譜庫"}</button></div>
      </form>
    `;
  }

  function renderCharacterForm() {
    const character = modal.id ? state.characters.find((item) => item.id === modal.id) : null;
    const value = character || { name: "", basePrompt: "", notes: "", fixtures: [], starred: false };
    return `
      <form data-form="character" data-id="${escapeAttr(character?.id || "")}" class="modal-form">
        <div class="modal-heading"><span class="card-kicker">CHARACTER LIBRARY</span><h2>${character ? "編輯人物" : "新增人物"}</h2><p>人物主調與固定配件會分開保存。</p></div>
        <label class="field"><span>人物名稱</span><input name="name" required value="${escapeAttr(value.name)}" placeholder="例如：Sill" /></label>
        <label class="field"><span>人物主調</span><textarea name="basePrompt" class="modal-large" required placeholder="adult East Asian man, platinum-blonde hair…">${escapeHtml(value.basePrompt)}</textarea></label>
        <label class="field"><span>固定配件 <em>每行一個</em></span><textarea name="fixtures" placeholder="金絲眼鏡｜thin gold-rimmed glasses｜face&#10;銀戒｜silver ring｜left ring finger">${escapeHtml(fixturesToText(value.fixtures))}</textarea><small>格式：顯示名稱｜寫進 Prompt 的文字｜位置。後兩欄可省略。</small></label>
        <label class="field"><span>備註</span><textarea name="notes" placeholder="只在資料庫顯示，不寫入 Prompt。">${escapeHtml(value.notes)}</textarea></label>
        <label class="check-line"><input type="checkbox" name="starred" ${value.starred ? "checked" : ""}/><span>固定在人物庫前方</span></label>
        <div class="modal-actions"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${character ? "儲存變更" : "建立人物"}</button></div>
      </form>
    `;
  }

  function renderMaterialForm() {
    const material = modal.id ? state.materials.find((item) => item.id === modal.id) : null;
    const value = material || { name: "", category: "enhancement", content: "", description: "", favorite: false };
    return `
      <form data-form="material" data-id="${escapeAttr(material?.id || "")}" class="modal-form">
        <div class="modal-heading"><span class="card-kicker">MATERIAL LIBRARY</span><h2>${material ? "編輯材料" : "新增材料"}</h2><p>保存一段可以反覆套用的詞條、補強或限制。</p></div>
        <div class="two-col"><label class="field"><span>材料名稱</span><input name="name" required value="${escapeAttr(value.name)}" placeholder="例如：復古底片" /></label><label class="field"><span>分類</span><select name="category">${MATERIAL_CATEGORIES.map(([id, label]) => `<option value="${id}" ${value.category === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label></div>
        <label class="field"><span>寫進 Prompt 的內容</span><textarea name="content" class="modal-large" required>${escapeHtml(value.content)}</textarea></label>
        <label class="field"><span>中文說明</span><textarea name="description" placeholder="這份材料適合什麼情境？">${escapeHtml(value.description)}</textarea></label>
        <label class="check-line"><input type="checkbox" name="favorite" ${value.favorite ? "checked" : ""}/><span>標記為常用材料</span></label>
        <div class="modal-actions"><button class="btn ghost" type="button" data-action="close-modal">取消</button><button class="btn primary" type="submit">${material ? "儲存變更" : "建立材料"}</button></div>
      </form>
    `;
  }

  function splitPrompt(raw) {
    const normalized = String(raw || "").replace(/\r\n/g, "\n");
    const fragments = [];
    const pushText = (text) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      const classification = classifyFragment(cleaned);
      fragments.push(normalizeFragment({
        id: uid("fragment"),
        text: cleaned,
        originalText: cleaned,
        category: classification.category,
        confidence: classification.confidence,
        source: "original",
        originalOrder: fragments.length
      }, fragments.length));
    };

    normalized.split("\n").forEach((line) => {
      if (!line.trim() || fragments.length >= MAX_FRAGMENTS) return;
      if (/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)、]\s)/.test(line) || line.length > 700) {
        pushText(line);
        return;
      }
      const matches = line.match(/[^,;，；]+(?:[,;，；]|$)/g) || [line];
      matches.forEach((part) => {
        if (fragments.length < MAX_FRAGMENTS) pushText(part);
      });
    });

    if (!fragments.length && normalized.trim()) pushText(normalized.trim());
    if (fragments.length >= MAX_FRAGMENTS) {
      const represented = fragments.map((item) => item.originalText).join(" ");
      const remaining = normalized.slice(Math.min(represented.length, normalized.length)).trim();
      if (remaining) {
        fragments[fragments.length - 1].text += `\n${remaining}`;
        fragments[fragments.length - 1].originalText += `\n${remaining}`;
        fragments[fragments.length - 1].category = "unclassified";
        fragments[fragments.length - 1].confidence = "low";
      }
    }
    return compactFragments(fragments);
  }

  function classifyFragment(text) {
    const lower = String(text).toLocaleLowerCase();
    const scores = CLASSIFIERS.map(([category, keywords]) => ({
      category,
      hits: keywords.reduce((count, keyword) => count + (lower.includes(keyword.toLocaleLowerCase()) ? 1 : 0), 0)
    })).filter((item) => item.hits).sort((a, b) => b.hits - a.hits);
    if (!scores.length) return { category: "unclassified", confidence: "low" };

    const patternOverrides = [
      ["framing", /\b(?:dramatic\s+)?low[-\s]?angle\b|\bwide[-\s]?angle\b|\b(?:camera\s+)?perspective\b|\b(?:captured|shot|photographed)\s+from\b|構圖|鏡頭|視角|仰拍|俯拍|廣角/i],
      ["action", /\b(?:holds?|holding|carries|carrying|grips?|touches?|touching|sits?|sitting|stands?|standing|walks?|walking|leans?|leaning)\b|拿著|手持|端著|握著|抱著|坐著|站著|走著|倚靠|互動|動作/i],
      ["scene", /\b(?:background|sky|clouds?|inside|outdoors?|street|room|kitchen|cafe|school|garden|beach|forest|bridge|window)\b|背景|天空|室內|戶外|街道|房間|廚房|咖啡廳|校園|花園|海邊|森林|橋|窗邊/i],
      ["clothing", /\b(?:earbuds?|earphones?|headphones?|wristwatch|rings?|bracelet|necklace|earrings|glasses|tattoo|jewelry|shirt|suit|jacket|coat|dress|vest|trousers|skirt|uniform)\b|耳機|手錶|戒指|手鍊|項鍊|耳環|眼鏡|刺青|飾品|服裝|襯衫|西裝|外套|制服/i]
    ];
    const current = scores[0];
    if (!["provider_instruction", "ratio", "constraints", "style_quality", "lighting"].includes(current.category)) {
      const override = patternOverrides.find(([, pattern]) => pattern.test(text));
      if (override) return { category: override[0], confidence: current.hits >= 2 ? "high" : "medium" };
    }
    return { category: current.category, confidence: current.hits >= 2 ? "high" : "medium" };
  }

  function compactFragments(fragments) {
    const output = [];
    fragments.forEach((fragment, index) => {
      const current = normalizeFragment(fragment, index);
      const previous = output[output.length - 1];
      if (previous && previous.category === "style_quality" && current.category === "style_quality" && previous.source === "original" && current.source === "original" && !previous.locked && !current.locked) {
        previous.text = [stripSeparator(previous.text), stripSeparator(current.text)].filter(Boolean).join(", ");
        previous.originalText = [stripSeparator(previous.originalText), stripSeparator(current.originalText)].filter(Boolean).join(", ");
        previous.confidence = previous.confidence === "high" && current.confidence === "high" ? "high" : "medium";
      } else {
        output.push(current);
      }
    });
    output.forEach((item, index) => { item.originalOrder = index; });
    return output;
  }

  function stripSeparator(text) {
    return String(text || "").trim().replace(/[,;，；]+$/g, "").trim();
  }

  function parseWorkspace() {
    if (!state.workspace.sourcePrompt.trim()) return;
    state.workspace.fragments = splitPrompt(state.workspace.sourcePrompt);
    state.workspace.outputPrompt = "";
    state.workspace.outputNotes = [];
    state.workspace.warnings = detectConflicts(state.workspace.fragments.map((item) => item.text).join(" "));
    state.workspace.activeIngredientFilter = "all";
    persistState();
    showToast(`已拆成 ${state.workspace.fragments.length} 份材料；未分類內容仍完整保留。`);
    render();
  }

  function compileWorkspace() {
    const workspace = state.workspace;
    if (!workspace.fragments.length) return;
    const selectedCharacters = ["AA", "BB"].map((slot) => ({ slot, text: buildCharacterText(slot) })).filter((item) => item.text);
    const removedCharacters = [];
    const removedRatios = [];
    let ingredients = workspace.fragments.filter((fragment) => {
      if (!fragment.enabled) return false;
      if (selectedCharacters.length && fragment.category === "character" && !fragment.locked) {
        removedCharacters.push(fragment);
        return false;
      }
      if (workspace.ratio.trim() && fragment.category === "ratio" && !fragment.locked) {
        removedRatios.push(fragment);
        return false;
      }
      return true;
    }).map((fragment) => ({ ...fragment }));

    selectedCharacters.forEach(({ slot, text }, index) => ingredients.push(normalizeFragment({
      id: `runtime_character_${slot}`,
      text: `[${slot}]: ${text}`,
      originalText: text,
      category: "character",
      confidence: "high",
      locked: true,
      enabled: true,
      source: "character",
      originalOrder: -100 + index
    })));

    const selectedMaterials = workspace.selectedMaterialIds.map((id) => state.materials.find((item) => item.id === id)).filter(Boolean);
    selectedMaterials.forEach((material, index) => ingredients.push(normalizeFragment({
      id: `runtime_material_${material.id}`,
      text: material.content,
      originalText: material.content,
      category: materialToFragmentCategory(material.category),
      confidence: "high",
      enabled: true,
      source: "material",
      originalOrder: 9000 + index
    })));

    splitAdditions(workspace.additions).forEach((text, index) => {
      const classification = classifyFragment(text);
      ingredients.push(normalizeFragment({
        id: `runtime_addition_${index}`,
        text,
        originalText: text,
        category: classification.category,
        confidence: classification.confidence,
        enabled: true,
        source: "manual",
        originalOrder: 10000 + index
      }));
    });

    if (workspace.ratio.trim()) ingredients.push(normalizeFragment({
      id: "runtime_ratio",
      text: `Aspect ratio: ${workspace.ratio.trim()}`,
      originalText: workspace.ratio.trim(),
      category: "ratio",
      confidence: "high",
      enabled: true,
      source: "manual",
      originalOrder: 11000
    }));

    if (workspace.orderMode === "standard") {
      ingredients.sort((a, b) => STANDARD_ORDER.indexOf(a.category) - STANDARD_ORDER.indexOf(b.category) || a.originalOrder - b.originalOrder);
    } else {
      ingredients.sort((a, b) => a.originalOrder - b.originalOrder);
    }

    workspace.outputPrompt = ingredients.map((item) => item.text.trim()).filter(Boolean).join("\n\n");
    workspace.outputNotes = [
      selectedCharacters.length ? `套用 ${selectedCharacters.length} 位人物，替換 ${removedCharacters.length} 份未鎖定原人物材料。` : "未替換人物，保留原人物材料。",
      selectedMaterials.length ? `加入材料庫：${selectedMaterials.map((item) => item.name).join("、")}。` : "未套用材料庫內容。",
      splitAdditions(workspace.additions).length ? `加入 ${splitAdditions(workspace.additions).length} 份臨時點綴。` : "未加入臨時點綴。",
      workspace.ratio.trim() ? `尺寸改為 ${workspace.ratio.trim()}，替換 ${removedRatios.length} 份未鎖定舊比例。` : "沿用原胖譜比例。",
      `輸出順序：${workspace.orderMode === "standard" ? "標準配方順序" : "保持原始順序"}；保留 ${ingredients.filter((item) => item.source === "original").length} 份原始材料。`
    ];
    workspace.warnings = detectConflicts(workspace.outputPrompt);
    persistState();
    showToast("新胖譜調製完成。");
    render();
    requestAnimationFrame(() => document.querySelector(".output-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function buildCharacterText(slot) {
    const assignment = state.workspace.assignments[slot];
    const character = state.characters.find((item) => item.id === assignment.characterId);
    if (!character) return "";
    const selected = new Set(assignment.fixtureIds);
    const fixtures = character.fixtures.filter((item) => selected.has(item.id)).map(fixturePrompt).filter(Boolean);
    return [character.basePrompt, ...fixtures].filter(Boolean).join("; ");
  }

  function fixturePrompt(fixture) {
    const explicit = String(fixture.promptText || "").trim();
    if (explicit && explicit !== fixture.name) return explicit;
    if (!fixture.bodySlot) return explicit || fixture.name;
    return `${explicit || fixture.name} on ${fixture.bodySlot}`;
  }

  function materialToFragmentCategory(category) {
    if (["negative", "restriction"].includes(category)) return "constraints";
    if (category === "lighting") return "lighting";
    if (category === "face_reference" || category === "tool_specific") return "provider_instruction";
    if (category === "character_quality") return "character";
    return "style_quality";
  }

  function detectConflicts(input) {
    const text = String(input || "").toLocaleLowerCase();
    return CONFLICT_RULES.filter((rule) => rule.left.some((term) => text.includes(term.toLocaleLowerCase())) && rule.right.some((term) => text.includes(term.toLocaleLowerCase()))).map((rule) => ({ id: rule.id, message: rule.message }));
  }

  function splitAdditions(text) {
    return String(text || "").split(/\n+/).map((item) => item.trim()).filter(Boolean);
  }

  function moveFragment(id, direction) {
    const list = state.workspace.fragments;
    const index = list.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    list.forEach((item, position) => { item.originalOrder = position; });
    persistState();
    render();
  }

  function restoreFragment(id) {
    const fragment = state.workspace.fragments.find((item) => item.id === id);
    if (!fragment) return;
    fragment.text = fragment.originalText;
    fragment.enabled = true;
    persistState();
    render();
  }

  function setCharacter(slot, characterId) {
    const character = state.characters.find((item) => item.id === characterId);
    state.workspace.assignments[slot] = {
      characterId: character?.id || "",
      fixtureIds: character ? character.fixtures.map((item) => item.id) : []
    };
    persistState();
    render();
  }

  function openPromptInWorkspace(id) {
    const entry = state.promptEntries.find((item) => item.id === id);
    if (!entry) return;
    entry.lastUsedAt = now();
    entry.updatedAt = now();
    state.workspace.sourcePrompt = entry.content;
    state.workspace.sourceUrl = entry.sourceUrl;
    state.workspace.fragments = splitPrompt(entry.content);
    state.workspace.outputPrompt = "";
    state.workspace.outputNotes = [];
    state.workspace.currentEntryId = entry.id;
    state.workspace.activeIngredientFilter = "all";
    persistState();
    navigate("workspace");
    showToast(`已把「${entry.title}」放上調製台。`);
  }

  function useCharacterInWorkspace(id) {
    const character = state.characters.find((item) => item.id === id);
    if (!character) return;
    const slot = state.workspace.assignments.AA.characterId ? "BB" : "AA";
    state.workspace.assignments[slot] = { characterId: id, fixtureIds: character.fixtures.map((item) => item.id) };
    persistState();
    navigate("workspace");
    showToast(`已把 ${character.name} 放進 [${slot}]。`);
  }

  function savePromptForm(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = state.promptEntries.find((item) => item.id === id);
    const content = String(data.get("content") || "").trim();
    const timestamp = now();
    const entry = normalizePromptEntry({
      ...(existing || {}),
      id: existing?.id || uid("prompt"),
      title: String(data.get("title") || "").trim(),
      content,
      sourcePrompt: existing?.sourcePrompt || modal?.draft?.sourcePrompt || "",
      sourceUrl: String(data.get("sourceUrl") || "").trim(),
      status: String(data.get("status") || "unused"),
      tags: String(data.get("tags") || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean),
      notes: String(data.get("notes") || "").trim(),
      starred: data.get("starred") === "on",
      versions: existing?.versions || [],
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    });
    if (existing) Object.assign(existing, entry);
    else state.promptEntries.push(entry);
    if (modal?.draft?.fromWorkspace) state.workspace.currentEntryId = entry.id;
    modal = null;
    persistState();
    showToast(existing ? "胖譜已更新。" : "已收進胖譜庫。")
    render();
  }

  function saveCharacterForm(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = state.characters.find((item) => item.id === id);
    const timestamp = now();
    const fixtures = parseFixtureLines(String(data.get("fixtures") || ""), existing?.fixtures || []);
    const character = normalizeCharacter({
      ...(existing || {}),
      id: existing?.id || uid("character"),
      name: String(data.get("name") || "").trim(),
      basePrompt: String(data.get("basePrompt") || "").trim(),
      notes: String(data.get("notes") || "").trim(),
      fixtures,
      starred: data.get("starred") === "on",
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    });
    if (existing) Object.assign(existing, character);
    else state.characters.push(character);
    ["AA", "BB"].forEach((slot) => {
      const assignment = state.workspace.assignments[slot];
      if (assignment.characterId !== character.id) return;
      const validIds = new Set(character.fixtures.map((item) => item.id));
      assignment.fixtureIds = assignment.fixtureIds.filter((fixtureId) => validIds.has(fixtureId));
    });
    modal = null;
    persistState();
    showToast(existing ? `${character.name} 已更新。` : `${character.name} 已收進人物設定庫。`);
    render();
  }

  function saveMaterialForm(form) {
    const data = new FormData(form);
    const id = form.dataset.id;
    const existing = state.materials.find((item) => item.id === id);
    const timestamp = now();
    const material = normalizeMaterial({
      ...(existing || {}),
      id: existing?.id || uid("material"),
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "other"),
      content: String(data.get("content") || "").trim(),
      description: String(data.get("description") || "").trim(),
      favorite: data.get("favorite") === "on",
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp
    });
    if (existing) Object.assign(existing, material);
    else state.materials.push(material);
    modal = null;
    persistState();
    showToast(existing ? "材料已更新。" : "材料已建立。")
    render();
  }

  function parseFixtureLines(text, existing = []) {
    const oldBySignature = new Map(existing.map((item) => [`${item.name}|${item.promptText}|${item.bodySlot}`, item.id]));
    return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[|｜]/).map((part) => part.trim());
      const name = parts[0] || "未命名配件";
      const promptText = parts[1] || name;
      const bodySlot = parts[2] || "";
      return normalizeFixture({ id: oldBySignature.get(`${name}|${promptText}|${bodySlot}`) || uid("fixture"), name, promptText, bodySlot });
    });
  }

  function fixturesToText(fixtures) {
    return (fixtures || []).map((item) => [item.name, item.promptText !== item.name ? item.promptText : "", item.bodySlot].join("｜").replace(/｜+$/g, "")).join("\n");
  }

  async function copyText(text, successMessage) {
    if (!String(text || "").trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage || "已複製。")
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast(successMessage || "已複製。")
    }
  }

  function saveCurrentVersion() {
    const entry = state.promptEntries.find((item) => item.id === state.workspace.currentEntryId);
    if (!entry || !state.workspace.outputPrompt.trim()) return;
    entry.versions.push({ id: uid("version"), content: state.workspace.outputPrompt, createdAt: now() });
    entry.content = state.workspace.outputPrompt;
    entry.updatedAt = now();
    persistState();
    showToast(`已替「${entry.title}」保存新版本。`);
    render();
  }

  function exportData() {
    const payload = { type: "prompt-fairy-backup", exportedAt: now(), ...state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `prompt-fairy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast("備份檔已匯出。")
  }

  async function importData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!confirm("匯入會用備份內容取代目前的統一工作台資料。確定繼續？")) return;
      state = normalizeState(parsed);
      persistState();
      showToast("備份已匯入。")
      render();
    } catch (error) {
      console.error(error);
      showToast("!這份檔案不是可讀取的 Prompt Fairy 備份。", true);
      render();
    }
  }

  function applySearchFilters() {
    document.querySelectorAll("[data-search-card]").forEach((card) => {
      const collection = card.dataset.searchCard;
      const query = { prompts: promptSearch, characters: characterSearch, materials: materialSearch }[collection].trim().toLocaleLowerCase();
      const matchesSearch = !query || card.dataset.searchIndex.includes(query);
      let matchesFilter = true;
      if (collection === "prompts" && promptFilter !== "all") matchesFilter = card.dataset.filterValue.split(" ").includes(promptFilter);
      if (collection === "materials" && materialFilter !== "all") matchesFilter = card.dataset.filterValue.split(" ").includes(materialFilter);
      card.hidden = !(matchesSearch && matchesFilter);
    });
  }

  function showToast(message, risk = false) {
    toast = `${risk ? "!" : ""}${message}`;
    document.querySelector(".toast")?.remove();
    const shell = document.querySelector(".app-shell");
    if (shell) {
      const element = document.createElement("div");
      element.className = `toast ${risk ? "risk" : ""}`;
      element.setAttribute("role", "status");
      element.textContent = message;
      shell.append(element);
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast = "";
      document.querySelector(".toast")?.remove();
    }, 3200);
  }

  function hasWorkspaceContent() {
    const workspace = state.workspace;
    return Boolean(workspace.sourcePrompt || workspace.fragments.length || workspace.outputPrompt || workspace.additions || workspace.ratio);
  }

  function clearWorkspace() {
    if (!confirm("清空目前調製台？人物、材料與胖譜庫都不受影響。")) return;
    state.workspace = createInitialState().workspace;
    persistState();
    showToast("調製台已清空。")
    render();
  }

  function deletePrompt(id) {
    const entry = state.promptEntries.find((item) => item.id === id);
    if (!entry || !confirm(`刪除胖譜「${entry.title}」？`)) return;
    state.promptEntries = state.promptEntries.filter((item) => item.id !== id);
    if (state.workspace.currentEntryId === id) state.workspace.currentEntryId = "";
    persistState();
    showToast("胖譜已刪除。")
    render();
  }

  function deleteCharacter(id) {
    const character = state.characters.find((item) => item.id === id);
    if (!character || !confirm(`刪除人物「${character.name}」？`)) return;
    state.characters = state.characters.filter((item) => item.id !== id);
    ["AA", "BB"].forEach((slot) => {
      if (state.workspace.assignments[slot].characterId === id) state.workspace.assignments[slot] = { characterId: "", fixtureIds: [] };
    });
    persistState();
    showToast(`${character.name} 已刪除。`);
    render();
  }

  function deleteMaterial(id) {
    const material = state.materials.find((item) => item.id === id);
    if (!material || !confirm(`刪除材料「${material.name}」？`)) return;
    state.materials = state.materials.filter((item) => item.id !== id);
    state.workspace.selectedMaterialIds = state.workspace.selectedMaterialIds.filter((item) => item !== id);
    persistState();
    showToast("材料已刪除。")
    render();
  }

  function suggestTags(text) {
    const source = String(text || "").toLocaleLowerCase();
    const candidates = [
      ["雙人", ["couple", "two men", "two women", "兩人", "雙人"]],
      ["單人", ["solo", "one person", "單人"]],
      ["電影感", ["cinematic", "電影感"]],
      ["寫實", ["photorealistic", "ultra-realistic", "寫實"]],
      ["底片", ["film grain", "film look", "底片"]],
      ["室內", ["interior", "inside", "室內"]],
      ["戶外", ["outdoor", "outside", "戶外"]]
    ];
    return candidates.filter(([, words]) => words.some((word) => source.includes(word))).map(([label]) => label).slice(0, 5);
  }

  function suggestPromptTitle(text) {
    const first = String(text || "").split(/[\n,，]/).map((item) => item.trim()).find(Boolean) || "未命名胖譜";
    return shorten(first.replace(/^\(+|\)+$/g, ""), 34);
  }

  function categoryLabel(id) {
    return CATEGORIES.find(([value]) => value === id)?.[1] || "未分類";
  }

  function materialCategoryLabel(id) {
    return MATERIAL_CATEGORIES.find(([value]) => value === id)?.[1] || "其他";
  }

  function confidenceLabel(value) {
    return { high: "高", medium: "中", low: "低" }[value] || "低";
  }

  function statusLabel(value) {
    return { unused: "未使用", used: "已使用", retry: "待重試" }[value] || "未使用";
  }

  function statusClass(value) {
    return { unused: "neutral", used: "success", retry: "warning" }[value] || "neutral";
  }

  function formatDate(input) {
    if (!input) return "—";
    try { return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit" }).format(new Date(input)); }
    catch { return "—"; }
  }

  function formatDateTime(input) {
    if (!input) return "—";
    try { return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(input)); }
    catch { return "—"; }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function shorten(value, length) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > length ? `${text.slice(0, length).trim()}…` : text;
  }

  function brandGlyph() {
    return `<span class="brand-glyph" aria-hidden="true"><img class="brand-logo brand-logo-dark" src="./assets/prompt-fairy-logo-arcane.png?v=release-1" alt="" /><img class="brand-logo brand-logo-light" src="./assets/prompt-fairy-logo-mojito.png?v=release-1" alt="" /></span>`;
  }

  function escapeHtml(value = "") {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttr(value = "") {
    return escapeHtml(value);
  }

  window.addEventListener("hashchange", () => {
    activePage = getPageFromHash();
    modal = null;
    window.scrollTo({ top: 0, behavior: "instant" });
    render();
  });

  document.addEventListener("click", (event) => {
    const modalCard = event.target.closest("[data-modal-card]");
    if (modalCard) event.stopPropagation();
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    const action = trigger.dataset.action;
    const id = trigger.dataset.id;
    if (trigger.tagName === "BUTTON") event.preventDefault();

    if (action === "close-modal") {
      if (event.target.closest("[data-modal-card]") && !event.target.closest(".modal-close, [data-action='close-modal'].btn")) return;
      modal = null;
      render();
    } else if (action === "parse") parseWorkspace();
    else if (action === "reset-fragments") {
      if (confirm("重新拆解會重設手動分類與材料編輯。確定繼續？")) parseWorkspace();
    } else if (action === "clear-workspace") clearWorkspace();
    else if (action === "ingredient-filter") {
      ingredientScrollLeft = document.querySelector(".ingredient-tabs")?.scrollLeft || 0;
      state.workspace.activeIngredientFilter = trigger.dataset.value;
      persistState();
      render();
    } else if (action === "order-mode") {
      state.workspace.orderMode = trigger.dataset.value;
      persistState();
      render();
    } else if (action === "fragment-up") moveFragment(id, -1);
    else if (action === "fragment-down") moveFragment(id, 1);
    else if (action === "fragment-restore") restoreFragment(id);
    else if (action === "compile") compileWorkspace();
    else if (action === "copy-output") copyText(state.workspace.outputPrompt, "新胖譜已複製。")
    else if (action === "save-output") {
      modal = { kind: "prompt", draft: { content: state.workspace.outputPrompt, sourcePrompt: state.workspace.sourcePrompt, sourceUrl: state.workspace.sourceUrl, fromWorkspace: true } };
      render();
    } else if (action === "save-version") saveCurrentVersion();
    else if (action === "new-prompt") { modal = { kind: "prompt", draft: {} }; render(); }
    else if (action === "edit-prompt") { modal = { kind: "prompt", id }; render(); }
    else if (action === "delete-prompt") deletePrompt(id);
    else if (action === "open-prompt") openPromptInWorkspace(id);
    else if (action === "copy-prompt") {
      const entry = state.promptEntries.find((item) => item.id === id);
      if (entry) copyText(entry.content, `「${entry.title}」已複製。`);
    } else if (action === "toggle-prompt-star") {
      const item = state.promptEntries.find((entry) => entry.id === id); if (item) { item.starred = !item.starred; item.updatedAt = now(); persistState(); render(); }
    } else if (action === "prompt-filter") { promptFilter = trigger.dataset.value; render(); }
    else if (action === "new-character") { modal = { kind: "character" }; render(); }
    else if (action === "edit-character") { modal = { kind: "character", id }; render(); }
    else if (action === "delete-character") deleteCharacter(id);
    else if (action === "use-character") useCharacterInWorkspace(id);
    else if (action === "toggle-character-star") {
      const item = state.characters.find((entry) => entry.id === id); if (item) { item.starred = !item.starred; item.updatedAt = now(); persistState(); render(); }
    } else if (action === "new-material") { modal = { kind: "material" }; render(); }
    else if (action === "edit-material") { modal = { kind: "material", id }; render(); }
    else if (action === "delete-material") deleteMaterial(id);
    else if (action === "toggle-material-star") {
      const item = state.materials.find((entry) => entry.id === id); if (item) { item.favorite = !item.favorite; item.updatedAt = now(); persistState(); render(); }
    } else if (action === "toggle-material-workspace") {
      const selected = new Set(state.workspace.selectedMaterialIds);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      state.workspace.selectedMaterialIds = [...selected];
      persistState();
      render();
    } else if (action === "material-filter") { materialFilter = trigger.dataset.value; render(); }
    else if (action === "export-data") exportData();
    else if (action === "choose-import") document.querySelector("#importFile")?.click();
    else if (action === "migrate-legacy") {
      const before = JSON.stringify({ characters: state.characters, materials: state.materials, prompts: state.promptEntries });
      applyLegacyData(state);
      persistState();
      const changed = before !== JSON.stringify({ characters: state.characters, materials: state.materials, prompts: state.promptEntries });
      showToast(changed ? "已補入找到的舊版資料。" : "沒有缺少的舊版資料需要補入。")
      render();
    } else if (action === "reset-all") {
      if (confirm("清除統一工作台的全部資料？這個動作無法復原。")) {
        state = createInitialState();
        persistState();
        showToast("新版資料已清除。")
        navigate("home");
        render();
      }
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.id === "sourcePrompt") {
      state.workspace.sourcePrompt = target.value;
      const parseButton = document.querySelector('[data-action="parse"]');
      if (parseButton) parseButton.disabled = !target.value.trim();
      const counter = target.closest(".field")?.querySelector("small");
      if (counter) counter.textContent = `${target.value.length.toLocaleString()} 字 · 自動存於本瀏覽器`;
    }
    else if (target.id === "sourceUrl") state.workspace.sourceUrl = target.value;
    else if (target.id === "additions") state.workspace.additions = target.value;
    else if (target.id === "ratio") state.workspace.ratio = target.value;
    else if (target.id === "outputPrompt") {
      state.workspace.outputPrompt = target.value;
      document.querySelectorAll('[data-action="copy-output"], [data-action="save-output"], [data-action="save-version"]').forEach((button) => {
        button.disabled = !target.value.trim();
      });
    }
    else if (target.dataset.fragmentText) {
      const fragment = state.workspace.fragments.find((item) => item.id === target.dataset.fragmentText);
      if (fragment) fragment.text = target.value;
    } else if (target.dataset.search) {
      if (target.dataset.search === "prompts") promptSearch = target.value;
      if (target.dataset.search === "characters") characterSearch = target.value;
      if (target.dataset.search === "materials") materialSearch = target.value;
      applySearchFilters();
      return;
    } else return;
    persistState();
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.fragmentCategory) {
      const fragment = state.workspace.fragments.find((item) => item.id === target.dataset.fragmentCategory);
      if (fragment) { fragment.category = target.value; fragment.confidence = "high"; persistState(); render(); }
    } else if (target.dataset.fragmentEnabled) {
      const fragment = state.workspace.fragments.find((item) => item.id === target.dataset.fragmentEnabled);
      if (fragment) { fragment.enabled = target.checked; persistState(); render(); }
    } else if (target.dataset.fragmentLocked) {
      const fragment = state.workspace.fragments.find((item) => item.id === target.dataset.fragmentLocked);
      if (fragment) { fragment.locked = target.checked; persistState(); render(); }
    } else if (target.dataset.characterSlot) setCharacter(target.dataset.characterSlot, target.value);
    else if (target.dataset.fixturePick) {
      const assignment = state.workspace.assignments[target.dataset.slot];
      const selected = new Set(assignment.fixtureIds);
      target.checked ? selected.add(target.dataset.fixturePick) : selected.delete(target.dataset.fixturePick);
      assignment.fixtureIds = [...selected];
      persistState();
    } else if (target.dataset.materialPick) {
      const selected = new Set(state.workspace.selectedMaterialIds);
      target.checked ? selected.add(target.dataset.materialPick) : selected.delete(target.dataset.materialPick);
      state.workspace.selectedMaterialIds = [...selected];
      persistState();
      render();
    } else if (target.id === "importFile") importData(target.files?.[0]);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === "prompt") savePromptForm(form);
    if (form.dataset.form === "character") saveCharacterForm(form);
    if (form.dataset.form === "material") saveMaterialForm(form);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal) {
      modal = null;
      render();
    }
  });

  render();
})();
