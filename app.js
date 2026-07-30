const STORAGE_KEY = "prompt-sprite-state-v2";
const OLD_STORAGE_KEY = "prompt-sprite-state-v1";

const navItems = [
  ["workbench", "工作台", "✦"],
  ["characters", "角色卡", "◎"],
  ["phrases", "咒語匣", "◇"],
  ["library", "胖譜庫", "▣"],
  ["settings", "設定", "⚙"]
];

const phraseCategories = {
  face_reference: "臉部參考",
  style_filter: "風格濾鏡",
  lighting: "光線",
  character_quality: "人物質感",
  negative: "負面詞",
  restriction: "禁止事項",
  enhancement: "常用補強"
};

const fixtureTypes = {
  tattoo: "刺青",
  mole: "痣",
  tear_mole: "淚痣",
  scar: "疤",
  earring: "耳環",
  glasses: "眼鏡",
  ring: "戒指",
  watch: "手錶",
  bracelet: "手鍊",
  necklace: "項鍊",
  other: "其他"
};

const fieldLabels = {
  subject: "人物",
  outfit: "服裝",
  scene: "場景",
  pose: "動作",
  style: "風格",
  ratio: "比例",
  negative: "負面詞"
};

const modeOptions = [
  ["keep", "原樣保留"],
  ["character", "套用角色卡"],
  ["sprite", "小精靈救救我"],
  ["manual", "我自己來"]
];

const defaultPhrases = [
  {
    id: "phrase_face_ref",
    name: "臉部參考保護語",
    category: "face_reference",
    content:
      "((Use the attached images as a FACE REFERENCE. Maintain the same facial structure, eyes, nose, lips, skin tone, and overall identity from the reference image. Do not change the person's identity. Only adjust pose, expression, lighting, and styling as described below.))",
    descriptionZh: "保留同一人身份，只調整姿勢、表情、光線與造型。",
    isFavorite: true,
    defaultEnabled: true
  },
  {
    id: "phrase_real_skin",
    name: "寫實人物質感",
    category: "character_quality",
    content:
      "realistic skin texture with visible pores, natural facial expression, detailed eyelashes, balanced adult proportions",
    descriptionZh: "加強寫實皮膚、自然表情與成人比例。",
    isFavorite: true,
    defaultEnabled: false
  },
  {
    id: "phrase_hands",
    name: "手部修正",
    category: "negative",
    content:
      "Avoid: extra fingers, missing fingers, fused fingers, bad hands, extra limbs, bad anatomy",
    descriptionZh: "常用手部與肢體錯誤修正。",
    isFavorite: true,
    defaultEnabled: false
  },
  {
    id: "phrase_couple",
    name: "自然雙人互動",
    category: "enhancement",
    content:
      "genuine chemistry, warm body language, authentic unposed interaction, candid realistic couple photography",
    descriptionZh: "讓雙人互動更自然。",
    isFavorite: true,
    defaultEnabled: false
  },
  {
    id: "phrase_no_logo",
    name: "不要文字水印",
    category: "restriction",
    content: "Avoid: watermark, logo, text, signature, brand label",
    descriptionZh: "避免生成水印、文字或品牌標籤。",
    isFavorite: false,
    defaultEnabled: false
  },
  {
    id: "phrase_film",
    name: "復古底片正向宣告",
    category: "style_filter",
    content:
      "retro film look with intentional analog grain and lifted blacks as a deliberate stylistic choice",
    descriptionZh: "把底片顆粒改成正向風格，不被負面詞打掉。",
    isFavorite: true,
    defaultEnabled: false
  },
  {
    id: "phrase_bw",
    name: "黑白電影感",
    category: "style_filter",
    content:
      "intentional deep blacks and glowing highlights as a deliberate stylistic choice, monochrome cinematic grade",
    descriptionZh: "黑白電影感與高對比光影。",
    isFavorite: false,
    defaultEnabled: false
  }
];

let activePage = "workbench";
let activeResultTab = "tips";
let activePhraseCategory = "all";
let editingPhraseId = "";
let libraryFilter = "all";
let guideOpen = false;
let busyMessage = "";
let apiMessage = "";

const state = loadState();

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
  if (raw) {
    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return normalizeState({});
}

function normalizeState(input) {
  const selectedPhrases =
    input.workbench?.selectedPhrases || defaultPhrases.filter((p) => p.defaultEnabled).map((p) => p.id);
  return {
    settings: {
      privacyMode: "ask_each_time",
      defaultProvider: "gemini",
      openaiModel: "gpt-4.1-mini",
      geminiModel: "gemini-3.6-flash",
      apiKeys: { openai: "", gemini: "" },
      sendConfirmation: true,
      neverSendImages: true,
      includeFaceReference: true,
      apiStatus: {
        openai: { ok: null, message: "尚未測試", checkedAt: "" },
        gemini: { ok: null, message: "尚未測試", checkedAt: "" }
      },
      ...input.settings,
      apiKeys: { openai: "", gemini: "", ...(input.settings?.apiKeys || {}) },
      apiStatus: {
        openai: { ok: null, message: "尚未測試", checkedAt: "", ...(input.settings?.apiStatus?.openai || {}) },
        gemini: { ok: null, message: "尚未測試", checkedAt: "", ...(input.settings?.apiStatus?.gemini || {}) }
      }
    },
    characters: input.characters || [],
    phrases: input.phrases?.length ? input.phrases : defaultPhrases.map((p) => ({ ...p, createdAt: now(), updatedAt: now() })),
    promptEntries: input.promptEntries || [],
    promptVersions: input.promptVersions || [],
    workbench: {
      rawPrompt: "",
      sourceUrl: "",
      provider: "gemini",
      parsed: null,
      fieldModes: {
        subject: "character",
        outfit: "keep",
        scene: "keep",
        pose: "keep",
        style: "sprite",
        ratio: "keep",
        negative: "sprite"
      },
      selectedCharacters: ["", ""],
      selectedPhrases,
      outputPrompt: "",
      outputNotes: [],
      repairImage: "",
      repairProblem: "",
      repairDesired: "",
      currentEntryId: "",
      ...input.workbench
    }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="sprite-mark-frame">
            <img class="sprite-mark" src="assets/sprite-icon.png" alt="胖譜小精靈" />
          </span>
          <div>
            <h1>胖譜小精靈</h1>
            <p>整理、置換、重新施法</p>
          </div>
        </div>
        <nav class="nav" aria-label="主要導覽">
          ${navItems.map(([id, label, icon]) => `
            <button class="${activePage === id ? "active" : ""}" data-nav="${id}">
              <span class="nav-icon">${icon}</span>${label}
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <div><span class="status-dot ${hasApiKey() ? "green" : ""}"></span>${modeLabel()}</div>
          <div class="hint">${hasApiKey() ? "API key 已填寫" : "可先用本機模式"}</div>
        </div>
      </aside>
      <main class="main">${renderPage()}</main>
      <nav class="mobile-tab" aria-label="手機導覽">
        ${navItems.map(([id, label]) => `
          <button class="${activePage === id ? "active" : ""}" data-nav="${id}">${label.replace("卡", "").replace("匣", "")}</button>
        `).join("")}
      </nav>
      ${guideOpen ? renderGuideModal() : ""}
    </div>
  `;
  bindEvents();
}

function renderPage() {
  if (activePage === "characters") return renderCharacters();
  if (activePage === "phrases") return renderPhrases();
  if (activePage === "library") return renderLibrary();
  if (activePage === "settings") return renderSettings();
  return renderWorkbench();
}

function pageHeader(title, subtitle) {
  return `
    <div class="page-header">
      <div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="mode-pill"><span class="status-dot ${hasApiKey() ? "green" : ""}"></span>${modeLabel()}</div>
    </div>
  `;
}

function renderWorkbench() {
  const wb = state.workbench;
  return `
    ${pageHeader("工作台", "餵我胖譜，交給小精靈。")}
    <div class="workbench-grid">
      <section class="panel stack">
        <h3>餵胖譜</h3>
        ${!wb.rawPrompt ? renderGuideCard() : ""}
        <div class="field">
          <label for="rawPrompt">原始胖譜</label>
          <textarea id="rawPrompt" class="prompt-input" placeholder="餵我胖譜，交給小精靈。">${escapeHtml(wb.rawPrompt)}</textarea>
          <div class="hint">${wb.rawPrompt.length} 字。API 可用時會真的改寫；失敗時用本機整理版。</div>
        </div>
        <div class="two-col">
          <div class="field">
            <label for="sourceUrl">原文連結</label>
            <input id="sourceUrl" value="${escapeAttr(wb.sourceUrl)}" placeholder="Threads 或其他來源，可跳過" />
          </div>
          <div class="field">
            <label for="provider">生成工具</label>
            <select id="provider">
              <option value="gemini" ${wb.provider === "gemini" ? "selected" : ""}>Gemini</option>
              <option value="openai" ${wb.provider === "openai" ? "selected" : ""}>OpenAI</option>
            </select>
          </div>
        </div>
        <div class="row">
          <button class="btn primary" id="parsePrompt" ${!wb.rawPrompt.trim() ? "disabled" : ""}>拆解胖譜</button>
          <button class="btn secondary" id="saveRawPrompt" ${!wb.rawPrompt.trim() ? "disabled" : ""}>收進胖譜庫</button>
        </div>
      </section>

      <section class="panel stack">
        <h3>怎麼改</h3>
        ${busyMessage ? `<div class="notice"><strong>${escapeHtml(busyMessage)}</strong><span>小精靈處理中，請稍等。</span></div>` : ""}
        <div class="field">
          <label>選角色</label>
          <div class="two-col">
            ${renderCharacterSelect(0, "第一位 [AA]")}
            ${renderCharacterSelect(1, "第二位 [BB]")}
          </div>
        </div>
        <div class="stack">
          ${Object.entries(fieldLabels).map(([key, label]) => renderModeRow(key, label)).join("")}
        </div>
        <div class="field">
          <label>套用咒語</label>
          <div class="chips">
            ${state.phrases.filter((p) => p.isFavorite && !p.archivedAt).slice(0, 8).map((phrase) => `
              <button class="chip ${wb.selectedPhrases.includes(phrase.id) ? "active" : ""}" data-toggle-phrase="${phrase.id}">
                ${escapeHtml(phrase.name)}
              </button>
            `).join("") || `<span class="hint">咒語匣還沒有常用咒語。</span>`}
          </div>
        </div>
        ${renderGenerationCapabilityNotice()}
        <button class="btn primary" id="generatePrompt" ${!wb.parsed ? "disabled" : ""}>${generationButtonLabel()}</button>
      </section>

      <section class="panel stack">
        <div class="tabs">
          ${[
            ["tips", "小提醒"],
            ["output", "新胖譜"],
            ["repair", "修修胖譜"],
            ["versions", "版本"]
          ].map(([id, label]) => `<button class="${activeResultTab === id ? "active" : ""}" data-result-tab="${id}">${label}</button>`).join("")}
        </div>
        ${renderResultTab()}
      </section>
    </div>
  `;
}

function renderGuideCard() {
  return `
    <div class="guide-card">
      <strong>第一次來？</strong>
      <ol>
        <li>貼上胖譜。</li>
        <li>選角色或先建立角色卡。</li>
        <li>生成新胖譜。</li>
      </ol>
      <div class="row">
        <button class="btn secondary" data-nav="characters">建立角色卡</button>
        <button class="btn secondary" id="showGuide">看 1 分鐘教學</button>
      </div>
    </div>
  `;
}

function renderGuideModal() {
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guideTitle">
      <div class="modal">
        <h3 id="guideTitle">1 分鐘認識小精靈</h3>
        <p class="hint">先知道這四件事就可以開始，不需要一次填完所有資料。</p>
        <div class="modal-list">
          <div><strong>工作台</strong><br /><span class="hint">貼胖譜、選角色、生成新胖譜。</span></div>
          <div><strong>角色卡</strong><br /><span class="hint">存人物資料，不固定綁 [AA] 或 [BB]。</span></div>
          <div><strong>咒語匣</strong><br /><span class="hint">存常用片段，例如臉部參考、濾鏡、負面詞。</span></div>
          <div><strong>胖譜庫</strong><br /><span class="hint">存完整胖譜、版本和結果圖。</span></div>
        </div>
        <button class="btn primary" id="closeGuide">知道了</button>
      </div>
    </div>
  `;
}

function renderCharacterSelect(index, label) {
  const value = state.workbench.selectedCharacters[index] || "";
  return `
    <div class="field">
      <label>${label}</label>
      <select data-character-slot="${index}">
        <option value="">不指定</option>
        ${state.characters.filter((c) => !c.archivedAt).map((c) => `
          <option value="${c.id}" ${value === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>
        `).join("")}
      </select>
    </div>
  `;
}

function apiStatusFor(provider) {
  return state.settings.apiStatus?.[provider] || { ok: null, message: "尚未測試", checkedAt: "" };
}

function updateApiStatus(provider, ok, message) {
  state.settings.apiStatus = state.settings.apiStatus || {};
  state.settings.apiStatus[provider] = {
    ok,
    message,
    checkedAt: now()
  };
}

function shouldAttemptRemoteGeneration() {
  const provider = state.workbench.provider;
  return state.settings.privacyMode !== "local" && hasUsableApiKey(provider) && apiStatusFor(provider).ok !== false;
}

function canUseRemoteGeneration() {
  const provider = state.workbench.provider;
  return state.settings.privacyMode !== "local" && hasUsableApiKey(provider) && apiStatusFor(provider).ok === true;
}

function generationButtonLabel() {
  if (canUseRemoteGeneration()) return "生成新胖譜";
  if (shouldAttemptRemoteGeneration()) return "嘗試生成新胖譜";
  return "產出本機草稿";
}

function renderGenerationCapabilityNotice() {
  const provider = state.workbench.provider;
  const status = apiStatusFor(provider);
  if (canUseRemoteGeneration()) {
    return `
      <div class="notice success">
        <strong>這次會請 ${providerLabel(provider)} 改寫</strong>
        <span>會把原胖譜整理成英文自然語句，再套用你選的角色與咒語。</span>
      </div>
    `;
  }

  if (state.settings.privacyMode === "local") {
    return `
      <div class="notice warning">
        <strong>本機模式不會真的 AI 改寫</strong>
        <span>只會套咒語、做簡單整理和英文草稿。要完整翻譯或重寫，請到設定改成小精靈模式並連接 API。</span>
      </div>
    `;
  }

  if (hasUsableApiKey(provider) && status.ok === false) {
    return `
      <div class="notice risk">
        <strong>${providerLabel(provider)} 上次生成失敗</strong>
        <span>${escapeHtml(status.message)}。請到設定重新測試、確認額度/付款狀態，或改用另一個生成工具。</span>
      </div>
    `;
  }

  if (hasUsableApiKey(provider)) {
    return `
      <div class="notice warning">
        <strong>${providerLabel(provider)} 尚未確認可以生成</strong>
        <span>按下後會先嘗試連線改寫；如果 API 失敗，才會改成本機草稿。</span>
      </div>
    `;
  }

  return `
    <div class="notice warning">
      <strong>還沒有可用的 ${providerLabel(provider)} API key</strong>
      <span>按下後會改產出本機草稿，不會完整理解、翻譯或重寫原胖譜。</span>
    </div>
  `;
}

function renderApiStatusSummary() {
  return `
    <div class="two-col">
      ${["openai", "gemini"].map((provider) => {
        const status = apiStatusFor(provider);
        const className = status.ok === true ? "success" : status.ok === false ? "risk" : "warning";
        const title = status.ok === true
          ? `${providerLabel(provider)} 可生成`
          : status.ok === false
            ? `${providerLabel(provider)} 目前不可用`
            : `${providerLabel(provider)} 尚未測試`;
        return `
          <div class="notice ${className}">
            <strong>${title}</strong>
            <span>${escapeHtml(status.message || "尚未測試")}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderModeRow(key, label) {
  const current = state.workbench.fieldModes[key] || "keep";
  return `
    <div class="setting-row">
      <span>${label}</span>
      <div class="segment">
        ${modeOptions.map(([value, text]) => `
          <button class="${current === value ? "active" : ""}" data-field-mode="${key}" data-mode-value="${value}">
            ${text}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderResultTab() {
  if (activeResultTab === "output") return renderOutputTab();
  if (activeResultTab === "repair") return renderRepairTab();
  if (activeResultTab === "versions") return renderVersionsTab();
  return renderTipsTab();
}

function renderTipsTab() {
  const tips = buildTips();
  return `
    <div class="stack">
      ${state.workbench.parsed ? `
        <div class="notice">
          <strong>拆解結果</strong>
          <span>${escapeHtml(state.workbench.parsed.summary)}</span>
        </div>
      ` : `<div class="empty">貼上胖譜後按「拆解胖譜」，小提醒會出現在這裡。</div>`}
      ${tips.map((tip) => `
        <div class="notice ${tip.severity}">
          <strong>${escapeHtml(tip.title)}</strong>
          <span>${escapeHtml(tip.body)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderOutputTab() {
  const out = state.workbench.outputPrompt;
  return `
    <div class="stack">
      <div class="field">
        <label>新胖譜</label>
        <textarea class="output-box" id="outputPrompt" placeholder="生成後會出現在這裡。">${escapeHtml(out)}</textarea>
      </div>
      ${state.workbench.outputNotes.length ? `
        <div class="notice">
          <strong>小精靈做了什麼</strong>
          <span>${state.workbench.outputNotes.map(escapeHtml).join(" · ")}</span>
        </div>
      ` : ""}
      <div class="row">
        <button class="btn primary" id="copyPrompt" ${!out ? "disabled" : ""}>複製胖譜</button>
        <button class="btn secondary" id="saveVersion" ${!out ? "disabled" : ""}>收進胖譜庫</button>
      </div>
    </div>
  `;
}

function renderRepairTab() {
  return `
    <div class="stack">
      <div class="notice">
        <strong>這張哪裡不對？告訴小精靈。</strong>
        <span>第一版圖片只存在本機作紀錄，不會自動送 AI。</span>
      </div>
      ${state.workbench.repairImage ? `<img class="file-preview" src="${state.workbench.repairImage}" alt="修修胖譜結果圖預覽" />` : ""}
      <div class="field">
        <label for="repairImage">選擇檔案</label>
        <input id="repairImage" type="file" accept="image/*" />
      </div>
      <div class="field">
        <label>直接貼上圖片</label>
        <div class="paste-zone" id="repairPasteZone" tabindex="0">點一下這裡後按 Ctrl+V / Cmd+V 貼上壞掉的結果圖</div>
      </div>
      <div class="field">
        <label for="repairProblem">哪裡不對</label>
        <textarea id="repairProblem" placeholder="例如：刺青不見了、臉不像、太卡通、背景太暗">${escapeHtml(state.workbench.repairProblem)}</textarea>
      </div>
      <div class="field">
        <label for="repairDesired">想怎麼改</label>
        <textarea id="repairDesired" placeholder="例如：保留左鎖骨刺青，整體更寫實">${escapeHtml(state.workbench.repairDesired)}</textarea>
      </div>
      <button class="btn primary" id="repairPrompt" ${!state.workbench.outputPrompt ? "disabled" : ""}>生成下一版</button>
    </div>
  `;
}

function renderVersionsTab() {
  const versions = state.promptVersions.filter((v) => !v.archivedAt).slice().reverse();
  return `
    <div class="stack">
      ${versions.length ? versions.slice(0, 8).map((v) => `
        <div class="card">
          <div class="row">
            <span class="chip active">${escapeHtml(v.versionLabel)}</span>
            <span class="chip gray">${providerLabel(v.provider)}</span>
            <span class="hint">${formatDate(v.createdAt)}</span>
          </div>
          <p>${escapeHtml((v.promptText || "").slice(0, 180))}${v.promptText.length > 180 ? "..." : ""}</p>
          <button class="btn secondary" data-load-version="${v.id}">拿去工作台</button>
        </div>
      `).join("") : `<div class="empty">還沒有版本紀錄。</div>`}
    </div>
  `;
}

function renderCharacters() {
  return `
    ${pageHeader("角色卡", "角色卡存人，當次生成再分配 [AA]、[BB]。")}
    <div class="form-box">
      <h3>新增角色</h3>
      <div class="two-col">
        <div class="field"><label for="charName">角色名稱</label><input id="charName" placeholder="例如：慕澄希" /></div>
        <div class="field">
          <label for="charHabit">寫進胖譜習慣</label>
          <select id="charHabit">
            <option value="minimal">少寫一點：交給參考圖</option>
            <option value="write_filled">照我填的寫</option>
            <option value="ask_each_time">這次再問我</option>
          </select>
        </div>
      </div>
      <div class="three-col">
        <div class="field"><label for="charHair">髮色/髮型</label><input id="charHair" placeholder="可跳過" /></div>
        <div class="field"><label for="charEyes">眼睛特徵</label><input id="charEyes" placeholder="可跳過" /></div>
        <div class="field"><label for="charBody">身高/體型</label><input id="charBody" placeholder="可跳過" /></div>
      </div>
      <div class="field">
        <label for="charImportPrompt">丟舊胖譜給小精靈</label>
        <textarea id="charImportPrompt" placeholder="貼一段過去用過的人物 prompt，小精靈會抓出可能適合保存的外觀重點。"></textarea>
      </div>
      <div class="row form-actions">
        <button class="btn primary" id="addCharacter">建立角色</button>
        <button class="btn secondary" id="importCharacter">從舊胖譜抓重點</button>
      </div>
      <div id="importPreview"></div>
    </div>
    <div class="cards-grid">
      ${state.characters.filter((c) => !c.archivedAt).map(renderCharacterCard).join("") || `<div class="empty">還沒有角色卡。先建一張，30 秒就能開始套用。</div>`}
    </div>
  `;
}

function avatarCrop(c) {
  return {
    x: Number(c.avatarCrop?.x ?? 50),
    y: Number(c.avatarCrop?.y ?? 50),
    scale: Number(c.avatarCrop?.scale ?? 1)
  };
}

function avatarStyle(c) {
  const crop = avatarCrop(c);
  return `object-position: ${crop.x}% ${crop.y}%; transform: scale(${crop.scale});`;
}

function renderCharacterCard(c) {
  const fixtureCount = (c.fixtures || []).filter((f) => !f.archivedAt).length;
  return `
    <article class="card">
      <div class="card-header">
        <div class="avatar-frame">
          ${c.avatarData ? `<img class="avatar-img" src="${c.avatarData}" alt="${escapeAttr(c.name)} 大頭貼" style="${avatarStyle(c)}" data-avatar-card="${c.id}" />` : `<div class="avatar-placeholder" aria-hidden="true"></div>`}
        </div>
        <div>
          <h3>${escapeHtml(c.name)}</h3>
          <p>${habitLabel(c.writingHabit)}</p>
        </div>
      </div>
      <p>${escapeHtml(characterSummary(c) || "參考圖優先，外觀重點可慢慢補。")}</p>
      <div class="chips">
        <span class="chip">${fixtureCount} 個標記/配件</span>
        ${c.faceReference?.enabled ? `<span class="chip active">臉部參考</span>` : ""}
      </div>
      <div class="field">
        <label>角色大頭貼</label>
        <input type="file" accept="image/*" data-avatar-character="${c.id}" />
        <span class="hint">只存在本機，作為 app 內辨識用。</span>
      </div>
      ${c.avatarData ? `
        <div class="avatar-editor">
          <label>縮放 <input type="range" min="1" max="2" step="0.05" value="${avatarCrop(c).scale}" data-avatar-crop="${c.id}" data-crop-field="scale" /></label>
          <label>左右 <input type="range" min="0" max="100" step="1" value="${avatarCrop(c).x}" data-avatar-crop="${c.id}" data-crop-field="x" /></label>
          <label>上下 <input type="range" min="0" max="100" step="1" value="${avatarCrop(c).y}" data-avatar-crop="${c.id}" data-crop-field="y" /></label>
        </div>
      ` : ""}
      <div class="field">
        <label>新增固定標記與配件</label>
        <div class="three-col">
          <select data-fixture-type="${c.id}">
            ${Object.entries(fixtureTypes).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
          <input data-fixture-name="${c.id}" placeholder="名稱" />
          <input data-fixture-slot="${c.id}" placeholder="位置" />
        </div>
        <button class="btn secondary" data-add-fixture="${c.id}">加入</button>
      </div>
      ${(c.fixtures || []).filter((f) => !f.archivedAt).map((f) => `
        <div class="notice">
          <strong>${escapeHtml(f.name)}</strong>
          <span>${fixtureTypes[f.type] || "其他"} · ${escapeHtml(f.bodySlot || "位置未填")} · ${importanceLabel(f.importance)}</span>
        </div>
      `).join("")}
      <div class="row">
        <button class="btn secondary" data-use-character="${c.id}">拿去工作台</button>
        <button class="btn danger" data-archive-character="${c.id}">封存</button>
      </div>
    </article>
  `;
}

function renderPhrases() {
  const phrases = state.phrases.filter((p) => !p.archivedAt && (activePhraseCategory === "all" || p.category === activePhraseCategory));
  return `
    ${pageHeader("咒語匣", "收好常用語句、濾鏡、負面詞，生成時一鍵套用。")}
    <div class="form-box">
      <h3>新增咒語卡</h3>
      <div class="three-col">
        <div class="field"><label for="phraseName">名稱</label><input id="phraseName" placeholder="例如：清透海邊感" /></div>
        <div class="field">
          <label for="phraseCategory">分類</label>
          <select id="phraseCategory">${Object.entries(phraseCategories).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="phraseFavorite">常用</label><select id="phraseFavorite"><option value="true">是</option><option value="false">否</option></select></div>
      </div>
      <div class="field"><label for="phraseContent">語句內容</label><textarea id="phraseContent" placeholder="貼上常用 prompt 片段"></textarea></div>
      <div class="form-actions">
        <button class="btn primary" id="addPhrase">新增咒語卡</button>
      </div>
    </div>
    <div class="chips" style="margin-bottom: 14px">
      <button class="chip ${activePhraseCategory === "all" ? "active" : ""}" data-phrase-category="all">全部</button>
      ${Object.entries(phraseCategories).map(([k, v]) => `<button class="chip ${activePhraseCategory === k ? "active" : ""}" data-phrase-category="${k}">${v}</button>`).join("")}
    </div>
    <div class="cards-grid">
      ${phrases.map(renderPhraseCard).join("") || `<div class="empty">這個分類還沒有咒語卡。</div>`}
    </div>
  `;
}

function renderPhraseCard(p) {
  const isEditing = editingPhraseId === p.id;
  return `
    <article class="card">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${phraseCategories[p.category] || "其他"} · ${p.isFavorite ? "常用" : "一般"}</p>
      </div>
      <p>${escapeHtml(p.descriptionZh || p.content.slice(0, 120))}</p>
      <div class="notice"><span>${escapeHtml(p.content)}</span></div>
      ${isEditing ? `
        <div class="field">
          <label>編輯語句</label>
          <textarea data-phrase-content="${p.id}">${escapeHtml(p.content)}</textarea>
        </div>
      ` : ""}
      <div class="row">
        <button class="btn secondary" data-apply-phrase="${p.id}">套用</button>
        ${isEditing
          ? `<button class="btn secondary" data-save-phrase="${p.id}">儲存修改</button><button class="btn secondary" data-cancel-phrase-edit="${p.id}">取消</button>`
          : `<button class="btn secondary" data-edit-phrase="${p.id}">修改</button>`}
        <button class="btn danger" data-archive-phrase="${p.id}">封存</button>
      </div>
    </article>
  `;
}

function renderLibrary() {
  const entries = state.promptEntries
    .filter((e) => !e.archivedAt)
    .filter((e) => libraryFilter === "all" || e.status === libraryFilter)
    .slice()
    .reverse();
  return `
    ${pageHeader("胖譜庫", "完整胖譜收藏、封面、標籤與版本紀錄。")}
    <div class="form-box">
      <h3>新增胖譜</h3>
      <div class="two-col">
        <div class="field"><label for="entryTitle">標題</label><input id="entryTitle" placeholder="例如：海邊情侶照" /></div>
        <div class="field"><label for="entryStatus">狀態</label><select id="entryStatus"><option value="unused">未捏</option><option value="used">已捏</option><option value="retry">想重捏</option></select></div>
      </div>
      <div class="field"><label for="entryPrompt">原始胖譜</label><textarea id="entryPrompt"></textarea></div>
      <div class="two-col">
        <div class="field"><label for="entryUrl">原文連結</label><input id="entryUrl" /></div>
        <div class="field"><label for="entryTags">標籤</label><input id="entryTags" placeholder="用逗號分隔，例如：日系, 雙人" /></div>
      </div>
      <div class="form-actions">
        <button class="btn primary" id="addEntry">收進胖譜庫</button>
      </div>
    </div>
    <div class="chips" style="margin-bottom: 14px">
      ${[["all", "全部"], ["unused", "未捏"], ["used", "已捏"], ["retry", "想重捏"]]
        .map(([id, label]) => `<button class="chip ${libraryFilter === id ? "active" : ""}" data-library-filter="${id}">${label}</button>`).join("")}
    </div>
    <div class="cards-grid">
      ${entries.map(renderEntryCard).join("") || `<div class="empty">胖譜庫還是空的。可以從工作台收進來，也可以手動新增。</div>`}
    </div>
  `;
}

function renderEntryCard(e) {
  const versions = state.promptVersions.filter((v) => v.promptEntryId === e.id && !v.archivedAt).length;
  return `
    <article class="card">
      <div class="cover" aria-hidden="true"></div>
      <div><h3>${escapeHtml(e.title)}</h3><p>${providerLabel(e.provider)} · ${formatDate(e.createdAt)}</p></div>
      <div class="chips">
        <span class="chip ${statusClass(e.status)}">${statusLabel(e.status)}</span>
        <span class="chip">${versions} 版</span>
        ${(e.tags || []).map((t) => `<span class="chip gray">${escapeHtml(t)}</span>`).join("")}
      </div>
      <p>${escapeHtml(e.sourcePrompt.slice(0, 160))}${e.sourcePrompt.length > 160 ? "..." : ""}</p>
      <div class="row">
        <button class="btn secondary" data-entry-workbench="${e.id}">拿去工作台</button>
        <button class="btn danger" data-archive-entry="${e.id}">封存</button>
      </div>
    </article>
  `;
}

function renderSettings() {
  return `
    ${pageHeader("設定", "清楚、安心，不讓資料自己亂跑。")}
    <div class="form-box stack">
      <h3>小精靈怎麼幫你？</h3>
      ${[
        ["local", "本機模式", "不連 AI。可以整理胖譜、建立角色卡、套固定咒語。"],
        ["sprite", "小精靈模式", "會把這次選中的文字送去 AI，幫你拆解和改寫。"],
        ["ask_each_time", "每次都問我", "生成前先讓你確認要送出的內容。"]
      ].map(([value, title, desc]) => `
        <label class="notice">
          <span><input type="radio" name="privacyMode" value="${value}" ${state.settings.privacyMode === value ? "checked" : ""} /> <strong>${title}</strong></span>
          <span>${desc}</span>
        </label>
      `).join("")}
    </div>
    <div class="form-box stack">
      <h3>AI 連線</h3>
      <div class="notice">
        <strong>API key 只存在你的裝置。</strong>
        <span>使用量與費用會計入該帳號。不要把自己的 key 分享給別人。</span>
      </div>
      <div class="two-col">
        <div class="field"><label for="openaiKey">OpenAI API key</label><input id="openaiKey" type="password" value="${escapeAttr(state.settings.apiKeys.openai || "")}" placeholder="sk-..." /></div>
        <div class="field"><label for="geminiKey">Gemini API key</label><input id="geminiKey" type="password" value="${escapeAttr(state.settings.apiKeys.gemini || "")}" placeholder="AIza..." /></div>
      </div>
      <div class="two-col">
        <div class="field"><label for="openaiModel">OpenAI 模型</label><input id="openaiModel" value="${escapeAttr(state.settings.openaiModel || "gpt-4.1-mini")}" /></div>
        <div class="field"><label for="geminiModel">Gemini 模型</label><input id="geminiModel" value="${escapeAttr(state.settings.geminiModel || "gemini-3.6-flash")}" /></div>
      </div>
      <div class="row">
        <button class="btn primary" id="saveKeys">儲存 key</button>
        <button class="btn secondary" id="testOpenAi" ${!state.settings.apiKeys.openai ? "disabled" : ""}>測試 OpenAI</button>
        <button class="btn secondary" id="testGemini" ${!state.settings.apiKeys.gemini ? "disabled" : ""}>測試 Gemini</button>
        <button class="btn secondary" id="showApiGuide">帶我取得 API key</button>
      </div>
      ${apiMessage ? `<div class="notice"><strong>連線狀態</strong><span>${escapeHtml(apiMessage)}</span></div>` : ""}
      ${renderApiStatusSummary()}
      <div class="notice" id="apiGuide" hidden>
        <strong>取得 API key 簡短流程</strong>
        <span>1. 前往官方 API key 頁面。2. 建立一組新的 key。3. 回來貼到這裡。4. 儲存後開始使用。</span>
        <span><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI API keys</a> · <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Gemini AI Studio API keys</a></span>
      </div>
    </div>
    <div class="form-box stack">
      <h3>送出前確認</h3>
      <label class="chip"><input type="checkbox" id="sendConfirmation" ${state.settings.sendConfirmation ? "checked" : ""} /> 每次送出前確認</label>
      <label class="chip"><input type="checkbox" id="neverSendImages" ${state.settings.neverSendImages ? "checked" : ""} /> 圖片不自動送 AI</label>
      <div class="notice">
        <strong>這次會送出</strong>
        <span>原始胖譜、選中的角色摘要、套用的咒語。</span>
        <strong>這次不會送出</strong>
        <span>角色大頭貼、胖譜庫歷史紀錄、其他未選資料。</span>
      </div>
    </div>
    <div class="form-box stack">
      <h3>本機資料</h3>
      <div class="row">
        <button class="btn secondary" id="exportData">匯出 JSON</button>
        <label class="btn secondary" for="importData">匯入 JSON</label>
        <input class="sr-only" id="importData" type="file" accept="application/json" />
        <button class="btn danger" id="clearData">刪除全部資料</button>
      </div>
      <p class="hint">第一版匯出不含圖片打包與加密備份。API key 不建議匯出。</p>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      activePage = button.dataset.nav;
      render();
    });
  });
  document.querySelector("#closeGuide")?.addEventListener("click", () => {
    guideOpen = false;
    render();
  });
  if (activePage === "workbench") bindWorkbenchEvents();
  if (activePage === "characters") bindCharacterEvents();
  if (activePage === "phrases") bindPhraseEvents();
  if (activePage === "library") bindLibraryEvents();
  if (activePage === "settings") bindSettingsEvents();
}

function bindWorkbenchEvents() {
  bindInput("#rawPrompt", (value) => (state.workbench.rawPrompt = value));
  bindInput("#sourceUrl", (value) => (state.workbench.sourceUrl = value));
  document.querySelector("#provider")?.addEventListener("change", (event) => {
    state.workbench.provider = event.target.value;
    saveState();
    render();
  });
  document.querySelector("#parsePrompt")?.addEventListener("click", () => {
    state.workbench.parsed = parsePrompt(state.workbench.rawPrompt);
    activeResultTab = "tips";
    saveState();
    render();
  });
  document.querySelector("#saveRawPrompt")?.addEventListener("click", () => saveEntryFromWorkbench(false));
  document.querySelectorAll("[data-character-slot]").forEach((select) => {
    select.addEventListener("change", () => {
      state.workbench.selectedCharacters[Number(select.dataset.characterSlot)] = select.value;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-field-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.workbench.fieldModes[button.dataset.fieldMode] = button.dataset.modeValue;
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-toggle-phrase]").forEach((button) => {
    button.addEventListener("click", () => togglePhrase(button.dataset.togglePhrase));
  });
  document.querySelector("#generatePrompt")?.addEventListener("click", generatePromptAction);
  bindInput("#outputPrompt", (value) => (state.workbench.outputPrompt = value));
  document.querySelector("#copyPrompt")?.addEventListener("click", copyOutput);
  document.querySelector("#saveVersion")?.addEventListener("click", () => saveEntryFromWorkbench(true));
  bindInput("#repairProblem", (value) => (state.workbench.repairProblem = value));
  bindInput("#repairDesired", (value) => (state.workbench.repairDesired = value));
  document.querySelector("#repairImage")?.addEventListener("change", handleRepairImage);
  document.querySelector("#repairPasteZone")?.addEventListener("paste", handleRepairPaste);
  document.querySelector("#repairPrompt")?.addEventListener("click", repairPrompt);
  document.querySelectorAll("[data-result-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeResultTab = button.dataset.resultTab;
      render();
    });
  });
  document.querySelectorAll("[data-load-version]").forEach((button) => {
    button.addEventListener("click", () => {
      const version = state.promptVersions.find((v) => v.id === button.dataset.loadVersion);
      if (!version) return;
      state.workbench.rawPrompt = version.promptText;
      state.workbench.outputPrompt = version.promptText;
      activeResultTab = "output";
      saveState();
      render();
    });
  });
  document.querySelector("#showGuide")?.addEventListener("click", () => {
    guideOpen = true;
    render();
  });
}

function bindCharacterEvents() {
  document.querySelector("#addCharacter")?.addEventListener("click", addCharacter);
  document.querySelector("#importCharacter")?.addEventListener("click", previewCharacterImport);
  document.querySelectorAll("[data-use-character]").forEach((button) => {
    button.addEventListener("click", () => {
      state.workbench.selectedCharacters[0] = button.dataset.useCharacter;
      activePage = "workbench";
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-archive-character]").forEach((button) => {
    button.addEventListener("click", () => {
      const c = state.characters.find((item) => item.id === button.dataset.archiveCharacter);
      if (c && confirm(`封存 ${c.name}？`)) {
        c.archivedAt = now();
        saveState();
        render();
      }
    });
  });
  document.querySelectorAll("[data-add-fixture]").forEach((button) => {
    button.addEventListener("click", () => addFixture(button.dataset.addFixture));
  });
  document.querySelectorAll("[data-avatar-character]").forEach((input) => {
    input.addEventListener("change", () => handleCharacterAvatar(input.dataset.avatarCharacter, input.files?.[0]));
  });
  document.querySelectorAll("[data-avatar-crop]").forEach((input) => {
    input.addEventListener("input", () => updateCharacterAvatarCrop(input.dataset.avatarCrop, input.dataset.cropField, input.value));
  });
}

function bindPhraseEvents() {
  document.querySelector("#addPhrase")?.addEventListener("click", addPhrase);
  document.querySelectorAll("[data-phrase-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activePhraseCategory = button.dataset.phraseCategory;
      render();
    });
  });
  document.querySelectorAll("[data-apply-phrase]").forEach((button) => {
    button.addEventListener("click", () => {
      togglePhrase(button.dataset.applyPhrase, true);
      activePage = "workbench";
      render();
    });
  });
  document.querySelectorAll("[data-archive-phrase]").forEach((button) => {
    button.addEventListener("click", () => archiveById(state.phrases, button.dataset.archivePhrase));
  });
  document.querySelectorAll("[data-edit-phrase]").forEach((button) => {
    button.addEventListener("click", () => {
      editingPhraseId = button.dataset.editPhrase;
      render();
    });
  });
  document.querySelectorAll("[data-cancel-phrase-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      if (editingPhraseId === button.dataset.cancelPhraseEdit) editingPhraseId = "";
      render();
    });
  });
  document.querySelectorAll("[data-save-phrase]").forEach((button) => {
    button.addEventListener("click", () => savePhraseEdit(button.dataset.savePhrase));
  });
}

function bindLibraryEvents() {
  document.querySelector("#addEntry")?.addEventListener("click", addEntry);
  document.querySelectorAll("[data-library-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      libraryFilter = button.dataset.libraryFilter;
      render();
    });
  });
  document.querySelectorAll("[data-entry-workbench]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.promptEntries.find((e) => e.id === button.dataset.entryWorkbench);
      if (!entry) return;
      state.workbench.rawPrompt = entry.sourcePrompt;
      state.workbench.sourceUrl = entry.sourceUrl || "";
      state.workbench.provider = entry.provider || "gemini";
      state.workbench.currentEntryId = entry.id;
      activePage = "workbench";
      saveState();
      render();
    });
  });
  document.querySelectorAll("[data-archive-entry]").forEach((button) => {
    button.addEventListener("click", () => archiveById(state.promptEntries, button.dataset.archiveEntry));
  });
}

function bindSettingsEvents() {
  document.querySelectorAll("input[name='privacyMode']").forEach((input) => {
    input.addEventListener("change", () => {
      state.settings.privacyMode = input.value;
      saveState();
      render();
    });
  });
  document.querySelector("#saveKeys")?.addEventListener("click", () => {
    const oldOpenAiKey = state.settings.apiKeys.openai;
    const oldGeminiKey = state.settings.apiKeys.gemini;
    const oldOpenAiModel = state.settings.openaiModel;
    const oldGeminiModel = state.settings.geminiModel;
    state.settings.apiKeys.openai = document.querySelector("#openaiKey").value.trim();
    state.settings.apiKeys.gemini = document.querySelector("#geminiKey").value.trim();
    state.settings.openaiModel = document.querySelector("#openaiModel").value.trim() || "gpt-4.1-mini";
    state.settings.geminiModel = document.querySelector("#geminiModel").value.trim() || "gemini-3.6-flash";
    if (oldOpenAiKey !== state.settings.apiKeys.openai || oldOpenAiModel !== state.settings.openaiModel) {
      updateApiStatus("openai", null, "尚未測試");
    }
    if (oldGeminiKey !== state.settings.apiKeys.gemini || oldGeminiModel !== state.settings.geminiModel) {
      updateApiStatus("gemini", null, "尚未測試");
    }
    saveState();
    apiMessage = "已儲存 key。可以按測試確認是否能連線。";
    render();
  });
  document.querySelector("#testOpenAi")?.addEventListener("click", () => testApiConnection("openai"));
  document.querySelector("#testGemini")?.addEventListener("click", () => testApiConnection("gemini"));
  document.querySelector("#showApiGuide")?.addEventListener("click", () => {
    const guide = document.querySelector("#apiGuide");
    guide.hidden = !guide.hidden;
  });
  document.querySelector("#sendConfirmation")?.addEventListener("change", (event) => {
    state.settings.sendConfirmation = event.target.checked;
    saveState();
  });
  document.querySelector("#neverSendImages")?.addEventListener("change", (event) => {
    state.settings.neverSendImages = event.target.checked;
    saveState();
  });
  document.querySelector("#exportData")?.addEventListener("click", exportData);
  document.querySelector("#importData")?.addEventListener("change", importData);
  document.querySelector("#clearData")?.addEventListener("click", () => {
    if (confirm("確定刪除全部本機資料？這個動作無法復原。")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OLD_STORAGE_KEY);
      location.reload();
    }
  });
}

function bindInput(selector, handler) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener("input", () => {
    handler(el.value);
    saveState();
  });
  el.addEventListener("change", () => {
    handler(el.value);
    saveState();
  });
}

function parsePrompt(text) {
  const lower = text.toLowerCase();
  const peopleCount = /couple|two people|two subjects|雙人|情侶|兩人/.test(lower)
    ? "雙人"
    : /group|多人|three|三人/.test(lower)
      ? "多人"
      : "單人";
  const ratioMatch = text.match(/(?:vertical\s*)?(?:9:16|4:5|3:4|1:1|16:9)/i);
  const hasNegative = /avoid|negative prompt|不要|避免|bad hands|extra fingers/i.test(text);
  return {
    peopleCount,
    ratio: ratioMatch?.[0] || "沿用原文",
    hasNegative,
    summary: `${peopleCount} · 比例 ${ratioMatch?.[0] || "未指定"} · ${hasNegative ? "含負面詞" : "未偵測到明確負面詞"}`
  };
}

function buildTips() {
  const tips = [];
  const prompt = state.workbench.rawPrompt.toLowerCase();
  const fixtures = selectedCharacters().flatMap((c) => (c.fixtures || []).map((f) => ({ ...f, characterName: c.name })));
  if (!state.workbench.parsed) return tips;
  fixtures.forEach((fixture) => {
    const fixtureText = `${fixture.name} ${fixture.bodySlot}`.toLowerCase();
    if (/turtleneck|high collar|高領|圍巾|scarf/.test(prompt) && /collarbone|neck|鎖骨|頸/.test(fixtureText)) {
      tips.push({ severity: "warning", title: `${fixture.name} 可能被遮住`, body: "可改低領，或保留遮住狀態。" });
    }
    if (/long sleeve|長袖|coat|外套|針織/.test(prompt) && /arm|wrist|手腕|上臂/.test(fixtureText)) {
      tips.push({ severity: "warning", title: `${fixture.name} 可能被袖子遮住`, body: "可改捲袖、短袖，或讓它自然 hidden。" });
    }
  });
  if (/soft focus|film grain|haze|底片|霧感/.test(prompt) && /low resolution|blurry|模糊/.test(prompt)) {
    tips.push({ severity: "warning", title: "濾鏡和負面詞可能打架", body: "底片、柔焦、霧感可以改成正向風格宣告。" });
  }
  if (!tips.length) {
    tips.push({ severity: "", title: "目前沒有明顯衝突", body: "可以先生成一版看看，再用修修胖譜微調。" });
  }
  return tips;
}

async function generatePromptAction() {
  busyMessage = shouldAttemptRemoteGeneration()
    ? "小精靈正在連線重新施法..."
    : "小精靈正在本機整理胖譜...";
  render();
  try {
    const result = await generatePrompt();
    state.workbench.outputPrompt = result.prompt;
    state.workbench.outputNotes = result.notes;
    activeResultTab = "output";
  } catch (error) {
    const message = humanApiError(error);
    updateApiStatus(state.workbench.provider, false, message);
    const local = buildLocalFinalPrompt();
    state.workbench.outputPrompt = local.prompt;
    state.workbench.outputNotes = [`API 連線失敗，已改用本機整理版：${message}`];
    activeResultTab = "output";
  } finally {
    busyMessage = "";
    saveState();
    render();
  }
}

async function generatePrompt() {
  if (shouldAttemptRemoteGeneration()) {
    const requestText = buildRewriteRequest();
    const text = state.workbench.provider === "openai"
      ? await callOpenAi(requestText)
      : await callGemini(requestText);
    updateApiStatus(state.workbench.provider, true, "生成測試通過");
    return {
      prompt: cleanModelOutput(text),
      notes: [`已使用 ${providerLabel(state.workbench.provider)} API 生成`, "未送出圖片或胖譜庫歷史紀錄"]
    };
  }
  return buildLocalFinalPrompt();
}

function buildLocalFinalPrompt() {
  const parsed = state.workbench.parsed || parsePrompt(state.workbench.rawPrompt);
  const chars = selectedCharacters();
  const phrases = selectedPhrases().filter((p) => p.category !== "face_reference");
  const charLines = chars.map((char, index) => `[${index === 0 ? "AA" : "BB"}] ${characterPromptLine(char)}`);
  const preserved = extractPreservedVisualPrompt(state.workbench.rawPrompt, Boolean(charLines.length));
  const warnings = buildTips()
    .filter((tip) => tip.severity === "warning" || tip.severity === "risk")
    .map((tip) => `${tip.title}: ${tip.body}`)
    .join(" ");
  const prompt = [
    state.settings.includeFaceReference ? ensureFaceReferenceWrapper(defaultPhrases[0].content) : "",
    charLines.join("\n"),
    preserved,
    phrases.map((p) => p.content).join("\n"),
    warnings ? `Consistency notes: ${warnings}` : "",
    parsed.ratio && parsed.ratio !== "沿用原文" ? `Aspect ratio: ${parsed.ratio}.` : "",
    "Avoid duplicate identities, copied names, watermark, logo, text, distorted face, bad hands, extra fingers, missing fingers."
  ].filter(Boolean).join("\n\n");
  return {
    prompt,
    notes: [
      charLines.length ? "已套用角色卡" : "未指定角色卡",
      phrases.length ? `已套用 ${phrases.length} 張咒語卡` : "未套用額外咒語",
      containsChinese(state.workbench.rawPrompt)
        ? "API 失敗後已改成本機英文草稿"
        : "這是本機整理版，不包含原始胖譜全文"
    ]
  };
}

function buildRewriteRequest() {
  const chars = selectedCharacters();
  const phrases = selectedPhrases();
  return [
    "You are Prompt Sprite, a prompt rewriting assistant for image generation.",
    "Return ONLY the final polished English image prompt.",
    "Do not include headings, explanations, labels like 'Original prompt', or rewrite instructions.",
    "Do not paste the original prompt verbatim.",
    "If a character card is selected, replace the original subject identity with the selected character and remove conflicting hair, face, eye, skin, age, and makeup descriptions from the original prompt.",
    "Preserve non-conflicting outfit, props, scene, camera, lighting, mood, and style details.",
    "Use natural language suitable for OpenAI or Gemini image generation.",
    "",
    "Selected characters:",
    chars.length ? chars.map((c, i) => `[${i === 0 ? "AA" : "BB"}] ${characterPromptLine(c)}`).join("\n") : "None",
    "",
    "Selected field modes:",
    Object.entries(state.workbench.fieldModes).map(([key, value]) => `${fieldLabels[key]}: ${modeOptions.find((item) => item[0] === value)?.[1] || value}`).join("\n"),
    "",
    "Applied phrase cards:",
    phrases.map((p) => p.content).join("\n") || "None",
    "",
    "Original prompt to transform:",
    state.workbench.rawPrompt
  ].join("\n");
}

function extractPreservedVisualPrompt(rawPrompt, hasCharacter) {
  let text = rawPrompt.replace(/\s+/g, " ").trim();
  text = text.replace(/\b(masterpiece|8K|HDR|DSLR quality)\b,?\s*/gi, "");
  if (!hasCharacter) return text;
  const wearsIndex = text.search(/\b(she|he|they)\s+wears\b/i);
  if (wearsIndex >= 0) {
    return text
      .slice(wearsIndex)
      .replace(/^She wears/i, "Wardrobe and styling:")
      .replace(/^He wears/i, "Wardrobe and styling:")
      .replace(/^They wear/i, "Wardrobe and styling:");
  }
  const capturedIndex = text.search(/\b(Captured|Shot|Photographed|Set)\b/i);
  if (capturedIndex >= 0) return text.slice(capturedIndex);
  const trimmed = text.replace(/Ultra-realistic[^.]*?(woman|man|person|girl|boy)[^.]*\./i, "").trim();
  return containsChinese(trimmed) ? localChineseToEnglishPrompt(trimmed) : trimmed;
}

function containsChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function ensureFaceReferenceWrapper(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("((") && trimmed.endsWith("))")) return trimmed;
  return `((${trimmed}))`;
}

function localChineseToEnglishPrompt(text) {
  const replacements = [
    [/保留上傳照片人物五官特徵與神韻/g, "use the uploaded image as the identity reference and preserve the person's facial features and overall presence"],
    [/傑作級作品|最佳畫質|毫無AI痕跡/g, ""],
    [/超寫實唯美人像攝影/g, "ultra-realistic beautiful portrait photography"],
    [/一位年輕東亞女性/g, "a young East Asian woman"],
    [/精緻柔美五官/g, "delicate soft facial features"],
    [/白皙透亮肌膚/g, "fair luminous skin"],
    [/清透自然裸妝/g, "fresh natural no-makeup makeup"],
    [/水潤粉嫩雙唇/g, "dewy rosy lips"],
    [/深棕色及腰柔順長髮/g, "waist-length smooth dark brown hair"],
    [/髮絲被風吹起/g, "hair gently lifted by the wind"],
    [/自然凌亂飄逸/g, "naturally tousled and airy"],
    [/溫柔清澈眼神直視鏡頭/g, "gentle clear eyes looking at the camera"],
    [/身穿/g, "wearing "],
    [/寬鬆柔軟的天空藍針織毛衣/g, "a loose soft sky-blue knit sweater"],
    [/內搭白色吊帶連身裙/g, "layered over a white camisole dress"],
    [/微露單側肩膀/g, "one shoulder subtly exposed"],
    [/身體微微前傾/g, "body leaning slightly forward"],
    [/對著鏡頭比yeah/g, "making a peace sign toward the camera"],
    [/低角度仰拍/g, "low-angle upward shot"],
    [/上半身構圖/g, "upper-body composition"],
    [/背景為純淨蔚藍天空與巨大潔白雲朵/g, "set against a pure blue sky with huge white clouds"],
    [/明亮自然陽光/g, "bright natural sunlight"],
    [/清新治癒/g, "fresh and soothing"],
    [/天空系/g, "sky-inspired"],
    [/氧氣感/g, "airy oxygen-like atmosphere"],
    [/日系寫真氛圍/g, "Japanese portrait photography mood"],
    [/柔和高調光影/g, "soft high-key lighting"],
    [/淺景深/g, "shallow depth of field"],
    [/真實皮膚紋理/g, "realistic skin texture"],
    [/專業攝影/g, "professional photography"],
    [/電影級色彩分級/g, "cinematic color grading"],
    [/，|、/g, ", "],
    [/。/g, ". "],
    [/、/g, ", "],
    [/8K Ultra HD|HDR|DSLR/g, ""]
  ];
  let output = text;
  replacements.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, replacement);
  });
  output = output.replace(/\s+/g, " ").replace(/, ,/g, ",").trim();
  return output || "A polished ultra-realistic portrait preserving the uploaded reference identity, with natural lighting, coherent styling, realistic skin texture, and a clean photographic composition.";
}

async function callOpenAi(input) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.settings.apiKeys.openai}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: state.settings.openaiModel || "gpt-4.1-mini", input })
  });
  if (!response.ok) throw await createApiError(response, "OpenAI");
  const data = await response.json();
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((c) => c.text || "").join("\n") || "";
}

async function callGemini(input) {
  const model = state.settings.geminiModel || "gemini-3.6-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": state.settings.apiKeys.gemini,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] })
  });
  if (!response.ok) throw await createApiError(response, "Gemini");
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
}

async function testApiConnection(provider) {
  apiMessage = `正在測試 ${providerLabel(provider)}...`;
  render();
  try {
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.settings.apiKeys.openai}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: state.settings.openaiModel || "gpt-4.1-mini",
          input: "Reply with exactly: OK"
        })
      });
      if (!response.ok) throw await createApiError(response, "OpenAI");
    } else {
      const model = state.settings.geminiModel || "gemini-3.6-flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": state.settings.apiKeys.gemini,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with exactly: OK" }] }] })
      });
      if (!response.ok) throw await createApiError(response, "Gemini");
    }
    updateApiStatus(provider, true, "生成測試通過");
    apiMessage = `${providerLabel(provider)} 連線成功。`;
  } catch (error) {
    const message = humanApiError(error);
    const detail = error.rawDetail ? `診斷：${error.rawDetail}` : "";
    updateApiStatus(provider, false, [message, detail].filter(Boolean).join(" "));
    apiMessage = `${providerLabel(provider)} 連線失敗：${message}${detail ? ` ${detail}` : ""}`;
  }
  saveState();
  render();
}

function cleanModelOutput(text) {
  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^final prompt:\s*/i, "")
    .trim();
}

async function createApiError(response, provider) {
  const raw = await response.text();
  let detail = raw.trim();
  try {
    const data = JSON.parse(raw);
    const error = data.error || data;
    detail = [
      `HTTP ${response.status}`,
      error.code ? `code=${error.code}` : "",
      error.type ? `type=${error.type}` : "",
      error.message || data.message || ""
    ].filter(Boolean).join(" · ");
  } catch {
    detail = [`HTTP ${response.status}`, response.statusText, detail].filter(Boolean).join(" · ");
  }
  const safeDetail = detail.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 500);
  const error = new Error(`${provider}: ${safeDetail}`);
  error.provider = provider;
  error.status = response.status;
  error.rawDetail = safeDetail;
  return error;
}

function humanApiError(error) {
  const text = String(error?.message || error);
  if (/401|invalid_api_key|Incorrect API key|API key not valid/i.test(text)) return "API key 好像不能用，請確認沒有貼錯或貼到 ChatGPT 帳號密碼。";
  if (/insufficient_quota|exceeded your current quota|quota|billing|payment|credit/i.test(text)) return "API 帳號額度、付款或預付金狀態不足。ChatGPT 訂閱不等於 API 額度。";
  if (/model_not_found|model.*not found|does not exist|not have access|unsupported model/i.test(text)) return "目前填的模型名稱不可用，請換成帳號可用的模型。";
  if (/rate_limit|too many requests|HTTP 429/i.test(text)) return "請求太頻繁或達到速率限制，晚點再試。";
  if (/Failed to fetch|NetworkError|CORS/i.test(text)) return "瀏覽器連線被擋或網路失敗。";
  return text.slice(0, 260);
}

function repairPrompt() {
  const repaired = [
    state.workbench.outputPrompt,
    "",
    "Revision request:",
    state.workbench.repairProblem ? `Problem observed: ${state.workbench.repairProblem}` : "",
    state.workbench.repairDesired ? `Desired change: ${state.workbench.repairDesired}` : "",
    "Revise the prompt above while preserving the successful parts. Make the requested correction explicit and natural."
  ].filter(Boolean).join("\n");
  state.workbench.outputPrompt = repaired;
  state.promptVersions.push(createVersion(repaired, "repair"));
  activeResultTab = "output";
  saveState();
  render();
}

function addCharacter() {
  const name = valueOf("#charName");
  if (!name) return alert("先填角色名稱。");
  const hair = valueOf("#charHair");
  const eyes = valueOf("#charEyes");
  const body = valueOf("#charBody");
  const character = {
    id: uid("char"),
    name,
    writingHabit: valueOf("#charHabit") || "minimal",
    faceReference: { enabled: true, outputPosition: "prefix" },
    appearance: { hairColor: hair, hairstyle: hair, eyes, heightBody: body },
    fixtures: [],
    createdAt: now(),
    updatedAt: now()
  };
  const oldPrompt = valueOf("#charImportPrompt");
  if (oldPrompt) applyImportToCharacter(character, oldPrompt);
  state.characters.push(character);
  saveState();
  render();
}

function previewCharacterImport() {
  const text = valueOf("#charImportPrompt");
  if (!text) return alert("先貼一段舊胖譜。");
  const extracted = extractCharacterFields(text);
  document.querySelector("#importPreview").innerHTML = `
    <div class="notice" style="margin-top: 12px">
      <strong>小精靈抓到這些可能可保存的重點</strong>
      <span>${extracted.length ? extracted.map(escapeHtml).join(" · ") : "沒有抓到明確外觀重點，可以直接手動填。"}</span>
    </div>
  `;
}

function applyImportToCharacter(character, text) {
  const found = extractCharacterFields(text).join(", ");
  if (!character.appearance.hairstyle && /hair|髮/.test(found)) character.appearance.hairstyle = found;
  if (!character.appearance.eyes && /eyes|眼/.test(found)) character.appearance.eyes = found;
}

function extractCharacterFields(text) {
  const candidates = ["black hair", "brown hair", "blue hair", "short hair", "long hair", "wavy hair", "glasses", "earrings", "tattoo", "mole", "黑髮", "棕髮", "短髮", "長髮", "捲髮", "眼鏡", "耳環", "刺青", "淚痣"];
  return candidates.filter((item) => text.toLowerCase().includes(item.toLowerCase()));
}

function addFixture(characterId) {
  const char = state.characters.find((c) => c.id === characterId);
  if (!char) return;
  const type = document.querySelector(`[data-fixture-type="${characterId}"]`).value;
  const name = document.querySelector(`[data-fixture-name="${characterId}"]`).value.trim();
  const slot = document.querySelector(`[data-fixture-slot="${characterId}"]`).value.trim();
  if (!name) return alert("先填標記或配件名稱。");
  char.fixtures ||= [];
  char.fixtures.push({
    id: uid("fixture"),
    type,
    name,
    bodySlot: slot,
    side: slot.includes("左") || slot.toLowerCase().includes("left") ? "left" : slot.includes("右") || slot.toLowerCase().includes("right") ? "right" : "unknown",
    importance: "standard",
    defaultVisibilityIntent: "contextual",
    createdAt: now(),
    updatedAt: now()
  });
  char.updatedAt = now();
  saveState();
  render();
}

function handleCharacterAvatar(characterId, file) {
  const char = state.characters.find((c) => c.id === characterId);
  if (!char || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    char.avatarData = reader.result;
    char.avatarCrop = char.avatarCrop || { x: 50, y: 50, scale: 1 };
    char.updatedAt = now();
    saveState();
    render();
  };
  reader.readAsDataURL(file);
}

function updateCharacterAvatarCrop(characterId, field, value) {
  const char = state.characters.find((c) => c.id === characterId);
  if (!char || !["x", "y", "scale"].includes(field)) return;
  char.avatarCrop = { ...avatarCrop(char), [field]: Number(value) };
  char.updatedAt = now();
  saveState();
  const img = document.querySelector(`[data-avatar-card="${characterId}"]`);
  if (img) img.setAttribute("style", avatarStyle(char));
}

function addPhrase() {
  const name = valueOf("#phraseName");
  const content = valueOf("#phraseContent");
  if (!name || !content) return alert("名稱和語句內容都要填。");
  state.phrases.push({
    id: uid("phrase"),
    name,
    category: valueOf("#phraseCategory") || "enhancement",
    content,
    isFavorite: valueOf("#phraseFavorite") === "true",
    defaultEnabled: false,
    createdAt: now(),
    updatedAt: now()
  });
  saveState();
  render();
}

function savePhraseEdit(phraseId) {
  const phrase = state.phrases.find((p) => p.id === phraseId);
  const textarea = document.querySelector(`[data-phrase-content="${phraseId}"]`);
  if (!phrase || !textarea) return;
  phrase.content = textarea.value.trim();
  phrase.updatedAt = now();
  editingPhraseId = "";
  saveState();
  render();
}

function addEntry() {
  const title = valueOf("#entryTitle");
  const prompt = valueOf("#entryPrompt");
  if (!title || !prompt) return alert("標題和胖譜都要填。");
  state.promptEntries.push({
    id: uid("entry"),
    title,
    sourcePrompt: prompt,
    sourceUrl: valueOf("#entryUrl"),
    provider: state.workbench.provider || state.settings.defaultProvider,
    status: valueOf("#entryStatus") || "unused",
    tags: valueOf("#entryTags").split(",").map((t) => t.trim()).filter(Boolean),
    demoAssetIds: [],
    starred: false,
    createdAt: now(),
    updatedAt: now()
  });
  saveState();
  render();
}

function saveEntryFromWorkbench(includeVersion) {
  const entry = {
    id: uid("entry"),
    title: state.workbench.parsed?.summary || "未命名胖譜",
    sourcePrompt: state.workbench.rawPrompt,
    sourceUrl: state.workbench.sourceUrl,
    provider: state.workbench.provider,
    status: includeVersion ? "used" : "unused",
    tags: suggestTags(state.workbench.rawPrompt),
    demoAssetIds: [],
    starred: false,
    createdAt: now(),
    updatedAt: now()
  };
  state.promptEntries.push(entry);
  state.workbench.currentEntryId = entry.id;
  if (includeVersion && state.workbench.outputPrompt) {
    state.promptVersions.push(createVersion(state.workbench.outputPrompt, "recast", entry.id));
  }
  saveState();
  activePage = "library";
  render();
}

function createVersion(promptText, mode = "recast", entryId = state.workbench.currentEntryId || undefined) {
  const count = state.promptVersions.filter((v) => !entryId || v.promptEntryId === entryId).length + 1;
  return {
    id: uid("version"),
    promptEntryId: entryId,
    versionLabel: `V${count}`,
    promptText,
    provider: state.workbench.provider,
    generationMode: mode,
    characterAssignments: selectedCharacters().map((c, index) => ({ characterId: c.id, alias: index === 0 ? "AA" : "BB", roleIndex: index })),
    appliedPhraseCardIds: [...state.workbench.selectedPhrases],
    resultAssetIds: [],
    userFeedback: state.workbench.repairProblem || state.workbench.repairDesired ? {
      problemText: state.workbench.repairProblem,
      desiredChange: state.workbench.repairDesired
    } : undefined,
    createdAt: now(),
    updatedAt: now()
  };
}

function suggestTags(text) {
  const tags = [];
  const lower = text.toLowerCase();
  if (/couple|雙人|情侶|兩人/.test(lower)) tags.push("雙人");
  if (/beach|海邊/.test(lower)) tags.push("海邊");
  if (/japan|日系/.test(lower)) tags.push("日系");
  if (/realistic|寫實/.test(lower)) tags.push("寫實");
  return tags;
}

function handleRepairImage(event) {
  const file = event.target.files?.[0];
  if (file) readImageFile(file);
}

function handleRepairPaste(event) {
  const item = [...event.clipboardData.items].find((entry) => entry.type.startsWith("image/"));
  if (!item) return;
  event.preventDefault();
  readImageFile(item.getAsFile());
}

function readImageFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    state.workbench.repairImage = reader.result;
    saveState();
    render();
  };
  reader.readAsDataURL(file);
}

function copyOutput() {
  navigator.clipboard?.writeText(state.workbench.outputPrompt).then(
    () => alert("已複製胖譜。"),
    () => alert("複製失敗，可以手動選取。")
  );
}

function exportData() {
  const exportState = structuredClone(state);
  exportState.settings.apiKeys = { openai: "", gemini: "" };
  const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prompt-sprite-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      Object.assign(state, normalizeState(JSON.parse(reader.result)));
      saveState();
      render();
    } catch {
      alert("匯入失敗，檔案格式可能不對。");
    }
  };
  reader.readAsText(file);
}

function togglePhrase(id, forceOn = false) {
  const selected = state.workbench.selectedPhrases;
  if (selected.includes(id) && !forceOn) {
    state.workbench.selectedPhrases = selected.filter((item) => item !== id);
  } else if (!selected.includes(id)) {
    selected.push(id);
  }
  saveState();
  render();
}

function selectedPhrases() {
  return state.workbench.selectedPhrases.map((id) => state.phrases.find((p) => p.id === id && !p.archivedAt)).filter(Boolean);
}

function selectedCharacters() {
  return state.workbench.selectedCharacters.map((id) => state.characters.find((c) => c.id === id && !c.archivedAt)).filter(Boolean);
}

function characterPromptLine(c) {
  const parts = [];
  if (c.faceReference?.enabled) parts.push("the same person as the reference image, keep exact identity");
  if (c.writingHabit !== "minimal") {
    if (c.appearance?.hairstyle) parts.push(c.appearance.hairstyle);
    if (c.appearance?.eyes) parts.push(c.appearance.eyes);
    if (c.appearance?.heightBody) parts.push(c.appearance.heightBody);
  }
  const fixtures = (c.fixtures || []).filter((f) => !f.archivedAt && f.importance !== "optional").map((f) => `${f.name}${f.bodySlot ? ` on ${f.bodySlot}` : ""}`);
  if (fixtures.length) parts.push(`signature details: ${fixtures.join(", ")}`);
  return `${c.name}; ${parts.join("; ") || "reference image priority"}`;
}

function characterSummary(c) {
  const a = c.appearance || {};
  return [a.hairstyle || a.hairColor, a.eyes, a.heightBody, a.makeup, a.glassesOrDefaultWear].filter(Boolean).join("、");
}

function hasApiKey() {
  return Boolean(state.settings.apiKeys.openai || state.settings.apiKeys.gemini);
}

function hasUsableApiKey(provider) {
  return Boolean(state.settings.apiKeys[provider]);
}

function modeLabel() {
  return state.settings.privacyMode === "local"
    ? "本機模式"
    : state.settings.privacyMode === "sprite"
      ? "小精靈模式"
      : "每次都問我";
}

function providerLabel(provider) {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  return "未指定";
}

function habitLabel(value) {
  return { minimal: "少寫一點", write_filled: "照我填的寫", ask_each_time: "這次再問我" }[value] || "少寫一點";
}

function importanceLabel(value) {
  return { signature: "招牌", standard: "常規", optional: "可省略" }[value] || "常規";
}

function statusLabel(value) {
  return { unused: "未捏", used: "已捏", retry: "想重捏" }[value] || "未捏";
}

function statusClass(value) {
  return value === "used" ? "green" : value === "retry" ? "amber" : "gray";
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

function archiveById(list, id) {
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  item.archivedAt = now();
  saveState();
  render();
}

function valueOf(selector) {
  return document.querySelector(selector)?.value.trim() || "";
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

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

render();
