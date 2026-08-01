const STORAGE_KEY = "prompt-fairy-recipe-engine-v1";
const ENGINE_VERSION = "recipe-engine-v1.0.0";

const CATEGORY_OPTIONS = [
  ["provider_instruction", "平台／參考圖指示"],
  ["subject", "人物身分"],
  ["appearance", "人物外觀"],
  ["clothing", "服裝與配件"],
  ["action", "動作與互動"],
  ["scene", "場景"],
  ["composition", "構圖"],
  ["camera", "鏡頭／攝影"],
  ["lighting", "光線"],
  ["style", "風格／色調"],
  ["quality", "品質／細節"],
  ["ratio", "尺寸／比例"],
  ["negative", "負面詞"],
  ["restriction", "禁止事項"],
  ["unclassified", "未分類（完整保留）"]
];

const STANDARD_ORDER = CATEGORY_OPTIONS.map(([value]) => value);

const CLASSIFIERS = [
  ["provider_instruction", [
    "face reference", "reference image", "same facial", "same person", "preserve identity",
    "參考圖", "臉部參考", "保留五官", "維持同一人", "人物身份"
  ]],
  ["ratio", [
    "aspect ratio", "--ar", "9:16", "4:5", "3:4", "1:1", "16:9", "1254x1254", "1024x1024",
    "畫幅", "比例", "直式", "橫式", "正方形", "尺寸"
  ]],
  ["negative", [
    "negative prompt", "bad hands", "extra fingers", "missing fingers", "bad anatomy", "extra limbs",
    "負面詞", "崩手", "多手指", "少手指", "肢體錯誤"
  ]],
  ["restriction", [
    "avoid:", "do not", "no watermark", "no text", "no logo", "without watermark", "禁止", "不要", "避免", "無水印"
  ]],
  ["camera", [
    "85mm", "50mm", "35mm", "lens", "f/1.", "f/2.", "depth of field", "bokeh", "dslr", "fujifilm", "kodak",
    "鏡頭", "景深", "焦段", "散景", "相機", "底片機"
  ]],
  ["lighting", [
    "lighting", "golden hour", "window light", "backlight", "rim light", "soft light", "tungsten", "daylight",
    "光線", "晨光", "夕陽", "逆光", "輪廓光", "室內燈", "自然光"
  ]],
  ["composition", [
    "close-up", "full body", "half body", "upper body", "three-quarter", "overhead", "low angle", "high angle", "looking at camera", "not looking at camera",
    "特寫", "全身", "半身", "上半身", "三分之四", "俯拍", "仰拍", "不看鏡頭", "構圖"
  ]],
  ["style", [
    "style", "cinematic", "editorial", "anime", "photorealistic", "ultra-realistic", "film look", "film grain", "monochrome", "color palette", "vogue",
    "畫風", "電影感", "雜誌", "寫實", "半寫實", "動漫", "底片", "顆粒", "黑白", "色調"
  ]],
  ["quality", [
    "masterpiece", "high detail", "8k", "4k", "high resolution", "visible pores", "detailed", "sharp focus",
    "高畫質", "高細節", "傑作", "毛孔", "清晰", "精緻"
  ]],
  ["clothing", [
    "wearing", "wears", "dressed in", "shirt", "suit", "jacket", "coat", "dress", "vest", "trousers", "skirt", "uniform", "jewelry", "earrings", "glasses",
    "穿著", "襯衫", "西裝", "外套", "長褲", "裙", "制服", "飾品", "耳環", "眼鏡", "服裝"
  ]],
  ["action", [
    "holding", "sitting", "standing", "walking", "leaning", "hugging", "kissing", "looking back", "hands", "pose", "interaction",
    "拿著", "坐在", "站在", "走路", "倚靠", "擁抱", "親吻", "回頭", "動作", "互動"
  ]],
  ["scene", [
    "background", "inside", "outdoor", "room", "kitchen", "cafe", "street", "beach", "forest", "school", "garden", "window", "bridge",
    "背景", "室內", "戶外", "房間", "廚房", "咖啡廳", "街道", "海邊", "森林", "校園", "花園", "窗邊", "橋"
  ]],
  ["appearance", [
    "hair", "eyes", "skin", "face", "facial", "lips", "nose", "body", "height", "slim", "muscular", "young adult", "adult man", "adult woman",
    "頭髮", "眼睛", "瞳", "膚色", "五官", "嘴唇", "鼻", "身形", "身高", "纖瘦", "肌肉", "成年男性", "成年女性"
  ]],
  ["subject", [
    "a man", "a woman", "a person", "young man", "young woman", "east asian man", "east asian woman", "couple", "two men", "two women",
    "一名男子", "一名女性", "一個人", "東亞男性", "東亞女性", "情侶", "兩名男性", "兩名女性", "人物"
  ]]
];

const FALLBACK_RULE_PACK = {
  id: "base-fallback-v1",
  version: "1.0.0",
  conflicts: [
    {
      id: "full-body-close-up",
      left: ["full body", "全身", "完整全身"],
      right: ["extreme close-up", "臉部特寫", "極近距離特寫"],
      message: "全身入鏡與極近距離特寫可能互相衝突。"
    },
    {
      id: "mono-vivid",
      left: ["monochrome", "black and white", "黑白", "單色"],
      right: ["vivid colors", "highly saturated", "鮮豔色彩", "高飽和"],
      message: "黑白／單色與鮮豔高飽和色彩可能互相衝突。"
    },
    {
      id: "text-no-text",
      left: ["magazine title", "typography", "封面標題", "文字排版"],
      right: ["no text", "avoid text", "不要文字", "禁止文字"],
      message: "要求文字排版，同時又禁止文字。"
    }
  ]
};

let rulePack = FALLBACK_RULE_PACK;
let message = "";

const state = loadState();
const RECIPE_VIEW_IDS = new Set(["home", "workspace"]);
let activeView = RECIPE_VIEW_IDS.has(location.hash.slice(1)) ? location.hash.slice(1) : "home";

window.addEventListener("hashchange", () => {
  activeView = RECIPE_VIEW_IDS.has(location.hash.slice(1)) ? location.hash.slice(1) : "home";
  render();
});

function createInitialState() {
  return {
    engineVersion: ENGINE_VERSION,
    sourcePrompt: "",
    fragments: [],
    mixer: {
      characterAA: "",
      characterBB: "",
      additions: "",
      ratio: "",
      orderMode: "original"
    },
    outputPrompt: "",
    outputNotes: [],
    warnings: [],
    updatedAt: new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn("Unable to load recipe state", error);
    return createInitialState();
  }
}

function normalizeState(input) {
  const base = createInitialState();
  return {
    ...base,
    ...input,
    mixer: { ...base.mixer, ...(input.mixer || {}) },
    fragments: Array.isArray(input.fragments) ? input.fragments.map(normalizeFragment) : [],
    outputNotes: Array.isArray(input.outputNotes) ? input.outputNotes : [],
    warnings: Array.isArray(input.warnings) ? input.warnings : []
  };
}

function normalizeFragment(fragment, index = 0) {
  return {
    id: fragment.id || uid("fragment"),
    text: String(fragment.text || ""),
    originalText: String(fragment.originalText ?? fragment.text ?? ""),
    category: CATEGORY_OPTIONS.some(([value]) => value === fragment.category) ? fragment.category : "unclassified",
    confidence: ["high", "medium", "low"].includes(fragment.confidence) ? fragment.confidence : "low",
    locked: Boolean(fragment.locked),
    enabled: fragment.enabled !== false,
    source: fragment.source || "original",
    originalOrder: Number.isFinite(fragment.originalOrder) ? fragment.originalOrder : index
  };
}

function saveState() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadRulePack() {
  try {
    const response = await fetch("./rule-packs/base.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await response.json();
    if (!Array.isArray(parsed.conflicts)) throw new Error("Invalid rule pack");
    rulePack = parsed;
  } catch (error) {
    console.warn("Using fallback rule pack", error);
    rulePack = FALLBACK_RULE_PACK;
  }
  updateWarnings();
  render();
}

function splitPrompt(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const fragments = [];

  normalized.split("\n").forEach((line) => {
    if (!line.trim()) return;
    const matches = line.match(/[^,;，；]+(?:[,;，；]|$)/g) || [line];
    matches.forEach((match) => {
      const text = match.trim();
      if (!text) return;
      const classification = classifyFragment(text);
      fragments.push(normalizeFragment({
        id: uid("fragment"),
        text,
        originalText: text,
        category: classification.category,
        confidence: classification.confidence,
        locked: false,
        enabled: true,
        source: "original",
        originalOrder: fragments.length
      }, fragments.length));
    });
  });

  if (!fragments.length && raw.trim()) {
    const classification = classifyFragment(raw.trim());
    fragments.push(normalizeFragment({
      id: uid("fragment"),
      text: raw.trim(),
      originalText: raw.trim(),
      category: classification.category,
      confidence: classification.confidence,
      source: "original",
      originalOrder: 0
    }));
  }

  return fragments;
}

function classifyFragment(text) {
  const lower = text.toLowerCase();
  const scores = CLASSIFIERS.map(([category, keywords]) => {
    const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
    return { category, hits };
  }).filter((item) => item.hits > 0).sort((a, b) => b.hits - a.hits);

  if (!scores.length) return { category: "unclassified", confidence: "low" };
  const best = scores[0];
  return {
    category: best.category,
    confidence: best.hits >= 2 ? "high" : "medium"
  };
}

function parseRecipe() {
  if (!state.sourcePrompt.trim()) return;
  state.fragments = splitPrompt(state.sourcePrompt);
  state.outputPrompt = "";
  state.outputNotes = [];
  message = `已拆成 ${state.fragments.length} 份材料；未分類內容仍完整保留。`;
  updateWarnings();
  saveState();
  render();
}

function resetRecipe() {
  if (!confirm("要把材料恢復成目前原始胖譜的重新拆解結果嗎？手動分類與編輯會被重設。")) return;
  state.fragments = splitPrompt(state.sourcePrompt);
  state.outputPrompt = "";
  state.outputNotes = [];
  message = "已從原始胖譜重新拆解。";
  updateWarnings();
  saveState();
  render();
}

function compilePrompt() {
  if (!state.fragments.length) return;

  const replacementTexts = [state.mixer.characterAA.trim(), state.mixer.characterBB.trim()].filter(Boolean);
  const excludedSubjectFragments = [];

  let ingredients = state.fragments.filter((fragment) => {
    if (!fragment.enabled) return false;
    const isSubjectMaterial = fragment.category === "subject" || fragment.category === "appearance";
    if (replacementTexts.length && isSubjectMaterial && !fragment.locked) {
      excludedSubjectFragments.push(fragment);
      return false;
    }
    return true;
  }).map((fragment) => ({ ...fragment }));

  replacementTexts.forEach((text, index) => {
    ingredients.push(normalizeFragment({
      id: `runtime_character_${index}`,
      text: `[${index === 0 ? "AA" : "BB"}] ${text}`,
      originalText: text,
      category: "subject",
      confidence: "high",
      locked: true,
      enabled: true,
      source: "character",
      originalOrder: -100 + index
    }));
  });

  splitAdditions(state.mixer.additions).forEach((text, index) => {
    const classification = classifyFragment(text);
    ingredients.push(normalizeFragment({
      id: `runtime_addition_${index}`,
      text,
      originalText: text,
      category: classification.category === "unclassified" ? "style" : classification.category,
      confidence: classification.confidence,
      locked: false,
      enabled: true,
      source: "manual",
      originalOrder: 10000 + index
    }));
  });

  if (state.mixer.ratio.trim()) {
    ingredients.push(normalizeFragment({
      id: "runtime_ratio",
      text: `Aspect ratio: ${state.mixer.ratio.trim()}`,
      originalText: state.mixer.ratio.trim(),
      category: "ratio",
      confidence: "high",
      enabled: true,
      source: "manual",
      originalOrder: 11000
    }));
  }

  if (state.mixer.orderMode === "standard") {
    ingredients.sort((a, b) => {
      const categoryDiff = STANDARD_ORDER.indexOf(a.category) - STANDARD_ORDER.indexOf(b.category);
      return categoryDiff || a.originalOrder - b.originalOrder;
    });
  } else {
    ingredients.sort((a, b) => a.originalOrder - b.originalOrder);
  }

  state.outputPrompt = ingredients.map((fragment) => cleanJoinText(fragment.text)).filter(Boolean).join("\n\n");
  state.outputNotes = [
    replacementTexts.length
      ? `已加入 ${replacementTexts.length} 組人物主調，並暫時排除 ${excludedSubjectFragments.length} 份未鎖定的原人物材料。`
      : "未替換人物主調，保留原人物材料。",
    state.mixer.additions.trim() ? `已加入 ${splitAdditions(state.mixer.additions).length} 份點綴材料。` : "未加入額外點綴。",
    state.mixer.ratio.trim() ? `已設定尺寸／比例：${state.mixer.ratio.trim()}。` : "沿用原胖譜尺寸設定。",
    `輸出順序：${state.mixer.orderMode === "standard" ? "標準配方順序" : "保持原始順序"}。`,
    `保留 ${ingredients.filter((item) => item.source === "original").length} 份原始材料，其中 ${ingredients.filter((item) => item.category === "unclassified").length} 份未分類材料未被刪除。`
  ];

  message = "新胖譜調製完成。";
  updateWarnings(state.outputPrompt);
  saveState();
  render();
}

function splitAdditions(text) {
  return text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function cleanJoinText(text) {
  return String(text || "").trim();
}

function updateWarnings(overrideText = "") {
  const text = (overrideText || state.fragments.filter((f) => f.enabled).map((f) => f.text).join(" ")).toLowerCase();
  state.warnings = (rulePack.conflicts || []).filter((rule) => {
    const hasLeft = rule.left.some((word) => text.includes(word.toLowerCase()));
    const hasRight = rule.right.some((word) => text.includes(word.toLowerCase()));
    return hasLeft && hasRight;
  }).map((rule) => ({ id: rule.id, message: rule.message }));
}

function moveFragment(id, direction) {
  const index = state.fragments.findIndex((fragment) => fragment.id === id);
  if (index < 0) return;
  const target = index + direction;
  if (target < 0 || target >= state.fragments.length) return;
  [state.fragments[index], state.fragments[target]] = [state.fragments[target], state.fragments[index]];
  state.fragments.forEach((fragment, position) => {
    fragment.originalOrder = position;
  });
  saveState();
  render();
}

function restoreFragment(id) {
  const fragment = state.fragments.find((item) => item.id === id);
  if (!fragment) return;
  fragment.text = fragment.originalText;
  fragment.enabled = true;
  updateWarnings();
  saveState();
  render();
}

async function copyOutput() {
  if (!state.outputPrompt.trim()) return;
  try {
    await navigator.clipboard.writeText(state.outputPrompt);
    message = "已複製新胖譜。";
  } catch {
    message = "瀏覽器拒絕自動複製，請手動選取輸出內容。";
  }
  render();
}

function clearExperiment() {
  if (!confirm("要清除配方引擎實驗版的本機資料嗎？穩定版與舊實驗版資料不受影響。")) return;
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, createInitialState());
  message = "已清除這個實驗版的資料。";
  render();
}

function renderBrandGlyph() {
  return `
    <span class="brand-glyph" aria-hidden="true">
      <span class="brand-glyph-orbit"></span>
      <span class="brand-glyph-star">✦</span>
    </span>
  `;
}

function renderProductBar(currentView = "home") {
  return `
    <header class="product-bar">
      <a class="product-brand" href="#home" aria-label="回到 Prompt Fairy 首頁">
        ${renderBrandGlyph()}
        <span>
          <strong>Prompt Fairy</strong>
          <small>胖譜小精靈</small>
        </span>
      </a>
      <nav class="product-nav" aria-label="主要導覽">
        <a class="${currentView === "home" ? "active" : ""}" href="#home">首頁</a>
        <a class="${currentView === "workspace" ? "active" : ""}" href="#workspace">調製台</a>
        <a href="../../index.html#library">Prompt 庫</a>
        <a href="../../index.html#characters">人物設定庫</a>
      </nav>
      <span class="local-status"><i></i>完全本機</span>
    </header>
  `;
}

function renderHome() {
  const hasDraft = Boolean(state.sourcePrompt.trim() || state.fragments.length || state.outputPrompt.trim());
  return `
    <div class="app-shell home-shell">
      ${renderProductBar("home")}
      <main class="home-main">
        <section class="home-hero">
          <div class="hero-copy">
            <span class="eyebrow">ARCANE PROMPT WORKBENCH</span>
            <h1>把一整段胖譜，<br /><span>調成真正能控制的配方。</span></h1>
            <p>拆解、置換、重組與保存常用設定。所有內容留在妳的瀏覽器裡，小精靈只在需要時留下安靜的魔法訊號。</p>
            <div class="hero-meta">
              <span><i></i> Local-first</span>
              <span>15 類材料解析</span>
              <span>不自動刪除原文</span>
            </div>
          </div>

          <a class="beam-card primary-entry" href="#workspace">
            <span class="beam-card-inner">
              <span class="entry-kicker">RECOMMENDED</span>
              <strong>Open Workspace</strong>
              <span>開啟調製台</span>
              <small>${hasDraft ? `已保留 ${state.fragments.length} 份材料，可以繼續調製` : "從貼入 Prompt 開始建立第一份配方"}</small>
              <span class="entry-arrow" aria-hidden="true">↗</span>
            </span>
          </a>
        </section>

        <section class="home-entries" aria-label="其他功能入口">
          <a class="entry-card" href="../../index.html#library">
            <span class="entry-icon">▣</span>
            <span>
              <small>BROWSE RECIPES</small>
              <strong>瀏覽 Prompt 庫</strong>
              <p>查看收藏、標籤與歷史版本。</p>
            </span>
            <span class="entry-arrow" aria-hidden="true">→</span>
          </a>
          <a class="entry-card" href="../../index.html#characters">
            <span class="entry-icon">◎</span>
            <span>
              <small>CHARACTER LIBRARY</small>
              <strong>人物設定庫</strong>
              <p>管理人物卡、外觀與固定配件。</p>
            </span>
            <span class="entry-arrow" aria-hidden="true">→</span>
          </a>
          <a class="entry-card ${hasDraft ? "has-draft" : ""}" href="#workspace">
            <span class="entry-icon">◇</span>
            <span>
              <small>CONTINUE DRAFT</small>
              <strong>繼續上次調製</strong>
              <p>${hasDraft ? "上次內容仍在這台裝置上。" : "目前沒有草稿，會開啟空白工作檯。"}</p>
            </span>
            <span class="entry-arrow" aria-hidden="true">→</span>
          </a>
        </section>

        <footer class="home-footer">
          <span>${renderBrandGlyph()} A focused magical signal, not a universal decoration.</span>
          <span>Recipe Engine · v1.3</span>
        </footer>
      </main>
    </div>
  `;
}

function render() {
  if (activeView !== "workspace") {
    document.querySelector("#app").innerHTML = renderHome();
    bindEvents();
    return;
  }

  document.querySelector("#app").innerHTML = `
    <div class="app-shell workspace-shell">
      ${renderProductBar("workspace")}
      <header class="hero">
        <div class="brand">
          ${renderBrandGlyph()}
          <div>
            <h1>Prompt Workspace</h1>
            <p>調製台 · 拆解、調整與重組胖譜</p>
          </div>
        </div>
        <div class="badge">RECIPE ENGINE · v1.3</div>
      </header>

      <main class="layout">
        <section class="panel stack">
          <div>
            <h2>① 倒入原始胖譜</h2>
            <p class="panel-subtitle">完整 Prompt 是原始酒譜。拆解只建立可操作副本，不改寫這份原文。</p>
          </div>
          <div class="field">
            <label for="sourcePrompt">原始胖譜</label>
            <textarea id="sourcePrompt" class="prompt-input" placeholder="貼上完整 Prompt…">${escapeHtml(state.sourcePrompt)}</textarea>
            <span class="hint">${state.sourcePrompt.length} 字 · 儲存在本瀏覽器的獨立實驗資料區</span>
          </div>
          <div class="row">
            <button class="btn primary" id="parseRecipe" ${!state.sourcePrompt.trim() ? "disabled" : ""}>拆成材料</button>
            <button class="btn secondary" id="resetRecipe" ${!state.fragments.length ? "disabled" : ""}>重新拆解</button>
            <button class="btn danger" id="clearExperiment">清除實驗資料</button>
          </div>
          <div class="notice success">
            <strong>安全邊界</strong>
            <span>這個版本使用 <code>${STORAGE_KEY}</code>，不會讀寫正式版或舊規則實驗版。</span>
          </div>
        </section>

        <section class="panel stack">
          <div class="section-title">
            <div>
              <h2>② 檢查材料</h2>
              <p class="panel-subtitle">分類錯了可以改；重要內容可以鎖；暫時不用可以關閉。</p>
            </div>
            <span class="source-pill">${state.fragments.length} 份</span>
          </div>
          ${renderRecipeToolbar()}
          <div class="recipe-list">
            ${state.fragments.length ? state.fragments.map(renderFragment).join("") : `<div class="empty">先貼上胖譜，再按「拆成材料」。</div>`}
          </div>
        </section>

        <section class="panel stack output-panel ${state.outputPrompt.trim() ? "is-complete" : ""}">
          <div>
            <h2>③ 調製與輸出</h2>
            <p class="panel-subtitle">替換主調、加點綴與冰塊；小精靈只執行你選定的操作。</p>
          </div>
          <div class="mixer-card stack">
            <div class="field">
              <label for="characterAA">主調人物 [AA]</label>
              <textarea id="characterAA" placeholder="例如：adult East Asian man, tousled black hair, indigo eyes…">${escapeHtml(state.mixer.characterAA)}</textarea>
            </div>
            <div class="field">
              <label for="characterBB">第二主調 [BB]（可留空）</label>
              <textarea id="characterBB" placeholder="雙人胖譜需要時再填。">${escapeHtml(state.mixer.characterBB)}</textarea>
            </div>
            <div class="field">
              <label for="additions">檸檬片／點綴材料</label>
              <textarea id="additions" placeholder="每行一份，例如：retro film look&#10;soft golden-hour lighting">${escapeHtml(state.mixer.additions)}</textarea>
            </div>
            <div class="two-col">
              <div class="field">
                <label for="ratio">冰塊／尺寸設定</label>
                <input id="ratio" value="${escapeAttr(state.mixer.ratio)}" placeholder="例如 3:4 或 1254×1254" />
              </div>
              <div class="field">
                <label>出杯順序</label>
                <div class="segment">
                  <button data-order-mode="original" class="${state.mixer.orderMode === "original" ? "active" : ""}">原順序</button>
                  <button data-order-mode="standard" class="${state.mixer.orderMode === "standard" ? "active" : ""}">標準順序</button>
                </div>
              </div>
            </div>
            <button class="btn primary beam-action" id="compilePrompt" ${!state.fragments.length ? "disabled" : ""}>Compose Prompt｜調製新胖譜</button>
          </div>

          ${state.warnings.length ? `
            <div class="notice warning">
              <strong>配方可能打架</strong>
              ${state.warnings.map((warning) => `<span>• ${escapeHtml(warning.message)}</span>`).join("")}
              <span class="hint">只提醒，不會自動刪除任何材料。</span>
            </div>
          ` : ""}

          <div class="field">
            <label for="outputPrompt">新胖譜</label>
            <textarea id="outputPrompt" class="output-box" placeholder="調製完成後會出現在這裡。">${escapeHtml(state.outputPrompt)}</textarea>
          </div>
          <div class="row">
            <button class="btn primary" id="copyOutput" ${!state.outputPrompt.trim() ? "disabled" : ""}>一鍵複製</button>
          </div>
          ${state.outputNotes.length ? `
            <div class="stack">
              <h3>小精靈做了什麼</h3>
              <div class="diff-list">${state.outputNotes.map((note) => `<div class="diff-item">${escapeHtml(note)}</div>`).join("")}</div>
            </div>
          ` : ""}
          ${message ? `<div class="notice"><strong>狀態</strong><span>${escapeHtml(message)}</span></div>` : ""}
        </section>
      </main>
    </div>
  `;
  bindEvents();
}

function renderRecipeToolbar() {
  if (!state.fragments.length) return "";
  const unclassified = state.fragments.filter((fragment) => fragment.category === "unclassified").length;
  const locked = state.fragments.filter((fragment) => fragment.locked).length;
  return `
    <div class="recipe-toolbar">
      <span class="hint">未分類 ${unclassified} · 已鎖定 ${locked} · 停用 ${state.fragments.filter((f) => !f.enabled).length}</span>
      <span class="hint">看不懂 ≠ 刪掉</span>
    </div>
  `;
}

function renderFragment(fragment, index) {
  return `
    <article class="fragment ${fragment.enabled ? "" : "off"} ${fragment.locked ? "locked" : ""}" data-fragment-card="${fragment.id}">
      <div class="fragment-head">
        <span class="fragment-index">${index + 1}</span>
        <div>
          <strong>${escapeHtml(categoryLabel(fragment.category))}</strong>
          <div class="hint">信心：${confidenceLabel(fragment.confidence)} · 來源：${sourceLabel(fragment.source)}</div>
        </div>
        <span class="source-pill">${fragment.locked ? "已鎖" : fragment.source === "original" ? "原文" : "新增"}</span>
      </div>
      <textarea data-fragment-text="${fragment.id}">${escapeHtml(fragment.text)}</textarea>
      <div class="fragment-meta">
        <select data-fragment-category="${fragment.id}">
          ${CATEGORY_OPTIONS.map(([value, label]) => `<option value="${value}" ${fragment.category === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
        <div class="row">
          <label class="toggle"><input type="checkbox" data-fragment-enabled="${fragment.id}" ${fragment.enabled ? "checked" : ""} />使用</label>
          <label class="toggle"><input type="checkbox" data-fragment-locked="${fragment.id}" ${fragment.locked ? "checked" : ""} />鎖定</label>
        </div>
      </div>
      <div class="row">
        <button class="btn ghost" data-move-up="${fragment.id}" ${index === 0 ? "disabled" : ""}>上移</button>
        <button class="btn ghost" data-move-down="${fragment.id}" ${index === state.fragments.length - 1 ? "disabled" : ""}>下移</button>
        <button class="btn secondary" data-restore-fragment="${fragment.id}">恢復原文</button>
      </div>
    </article>
  `;
}

function categoryLabel(value) {
  return CATEGORY_OPTIONS.find(([category]) => category === value)?.[1] || "未分類";
}

function confidenceLabel(value) {
  return { high: "高", medium: "中", low: "低" }[value] || "低";
}

function sourceLabel(value) {
  return { original: "原始胖譜", character: "人物主調", manual: "手動添加", phrase: "咒語卡" }[value] || value;
}

function bindEvents() {
  bindInput("#sourcePrompt", (value) => { state.sourcePrompt = value; });
  bindInput("#characterAA", (value) => { state.mixer.characterAA = value; });
  bindInput("#characterBB", (value) => { state.mixer.characterBB = value; });
  bindInput("#additions", (value) => { state.mixer.additions = value; });
  bindInput("#ratio", (value) => { state.mixer.ratio = value; });
  bindInput("#outputPrompt", (value) => { state.outputPrompt = value; });

  document.querySelector("#parseRecipe")?.addEventListener("click", parseRecipe);
  document.querySelector("#resetRecipe")?.addEventListener("click", resetRecipe);
  document.querySelector("#compilePrompt")?.addEventListener("click", compilePrompt);
  document.querySelector("#copyOutput")?.addEventListener("click", copyOutput);
  document.querySelector("#clearExperiment")?.addEventListener("click", clearExperiment);

  document.querySelectorAll("[data-order-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mixer.orderMode = button.dataset.orderMode;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-fragment-text]").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      const fragment = state.fragments.find((item) => item.id === textarea.dataset.fragmentText);
      if (!fragment) return;
      fragment.text = textarea.value;
      updateWarnings();
      saveState();
    });
  });

  document.querySelectorAll("[data-fragment-category]").forEach((select) => {
    select.addEventListener("change", () => {
      const fragment = state.fragments.find((item) => item.id === select.dataset.fragmentCategory);
      if (!fragment) return;
      fragment.category = select.value;
      fragment.confidence = "high";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-fragment-enabled]").forEach((input) => {
    input.addEventListener("change", () => {
      const fragment = state.fragments.find((item) => item.id === input.dataset.fragmentEnabled);
      if (!fragment) return;
      fragment.enabled = input.checked;
      updateWarnings();
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-fragment-locked]").forEach((input) => {
    input.addEventListener("change", () => {
      const fragment = state.fragments.find((item) => item.id === input.dataset.fragmentLocked);
      if (!fragment) return;
      fragment.locked = input.checked;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-move-up]").forEach((button) => {
    button.addEventListener("click", () => moveFragment(button.dataset.moveUp, -1));
  });
  document.querySelectorAll("[data-move-down]").forEach((button) => {
    button.addEventListener("click", () => moveFragment(button.dataset.moveDown, 1));
  });
  document.querySelectorAll("[data-restore-fragment]").forEach((button) => {
    button.addEventListener("click", () => restoreFragment(button.dataset.restoreFragment));
  });
}

function bindInput(selector, handler) {
  const element = document.querySelector(selector);
  if (!element) return;
  element.addEventListener("input", () => {
    handler(element.value);
    saveState();
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

render();
loadRulePack();
