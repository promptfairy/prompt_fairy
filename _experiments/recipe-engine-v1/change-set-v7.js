(() => {
  "use strict";

  const CORE_KEY = "prompt-fairy-arcane-v2";
  const LOCAL_KEY = "prompt-fairy-change-set-v7";
  const LEGACY_KEY = "prompt-fairy-change-set-v5";

  const OPS = [
    ["character", "人物", "CHARACTER", "人物身份、外觀與數量"],
    ["wardrobe_props", "衣著／小道具", "WARDROBE & PROPS", "服裝、飾品與手邊小物"],
    ["dynamic", "動態描述", "MOTION", "姿勢、互動、風吹雨落等動態"],
    ["background", "背景", "BACKGROUND", "地點、空間與場景本體"],
    ["camera", "鏡頭語言", "CAMERA", "景別、視角、焦段、比例與構圖"],
    ["filter", "濾鏡", "FILTER", "畫風、光線、色調、質感與品質"],
  ];
  const OP_MAP = Object.fromEntries(OPS.map((item) => [item[0], item]));

  const RULES = {
    character: [
      [/\b(?:man|woman|male|female|boy|girl|person|people|couple|adult|young adult|two men|two women|two people)\b/i, 2],
      [/\b(?:hair|hairstyle|bangs|eyes?|iris|face|facial|skin|lips?|nose|height|body|slim|muscular|petite|tall|short)\b/i, 2],
      [/(?:人物|角色|男子|男人|男性|女子|女人|女性|男生|女生|成人|兩人|两人|雙人|双人|情侶|情侣|頭髮|头发|髮型|发型|髮色|发色|眼睛|瞳|五官|臉|脸|膚色|肤色|皮膚|皮肤|嘴唇|鼻子|身高|身形|纖瘦|纤瘦|肌肉)/i, 2],
    ],
    wardrobe_props: [
      [/\b(?:wearing|wears|dressed|shirt|blouse|t-?shirt|suit|jacket|coat|dress|skirt|trousers|pants|jeans|shorts|vest|uniform|robe|kimono|cheongsam|shoes|boots|hat|cap|glasses|earrings?|rings?|necklace|bracelet|watch|bag|handbag|umbrella|cup|mug|phone|book|camera|flower|bouquet)\b/i, 2],
      [/(?:穿著|穿着|衣著|衣着|服裝|服装|襯衫|衬衫|西裝|西装|外套|洋裝|连衣裙|連身裙|裙子|長褲|长裤|短褲|短裤|背心|制服|和服|旗袍|鞋子|靴子|帽子|眼鏡|眼镜|耳環|耳环|戒指|項鍊|项链|手鍊|手链|手錶|手表|包包|手提包|雨傘|雨伞|杯子|馬克杯|马克杯|手機|手机|書本|书本|相機|相机|花束)/i, 2],
    ],
    dynamic: [
      [/\b(?:sitting|standing|walking|running|leaning|holding|hugging|kissing|touching|reaching|turning|looking|gazing|smiling|laughing|posing|pose|interaction|hand in hand|wind|breeze|rain|falling|flowing|fluttering|movement|motion)\b/i, 2],
      [/(?:坐著|坐着|站著|站着|走路|行走|奔跑|倚靠|靠著|靠着|抱住|擁抱|拥抱|親吻|亲吻|牽手|牵手|碰觸|碰触|伸手|回頭|回头|看向|凝視|凝视|微笑|大笑|姿勢|姿势|互動|互动|風吹|风吹|微風|微风|下雨|雨落|飄動|飘动|飛揚|飞扬|動態|动态)/i, 2],
    ],
    background: [
      [/\b(?:background|indoors?|outdoors?|room|bedroom|living room|kitchen|cafe|coffee shop|restaurant|street|alley|beach|ocean|sea|forest|woods|school|campus|garden|park|window|bridge|city|building|studio|rooftop|mountain|field|station|train|airport)\b/i, 2],
      [/(?:背景|室內|室内|戶外|户外|房間|房间|臥室|卧室|客廳|客厅|廚房|厨房|咖啡廳|咖啡厅|餐廳|餐厅|街道|巷弄|海邊|海边|海洋|森林|校園|校园|花園|花园|公園|公园|窗邊|窗边|橋|桥|城市|建築|建筑|攝影棚|摄影棚|屋頂|屋顶|山景|草地|車站|车站|火車|火车|機場|机场)/i, 2],
    ],
    camera: [
      [/\b(?:close-up|medium shot|wide shot|full body|half body|upper body|three-quarter|portrait|landscape|overhead|high angle|low angle|eye level|framing|composition|lens|depth of field|bokeh|focus|shot|camera|aspect ratio|vertical|horizontal)\b/i, 2],
      [/(?:\b(?:24|28|35|50|85|105|135)mm\b|\bf\/\d(?:\.\d+)?\b|\b(?:1:1|4:5|3:4|2:3|9:16|16:9)\b)/i, 3],
      [/(?:鏡頭|镜头|構圖|构图|景別|景别|特寫|特写|近景|中景|遠景|远景|全身|半身|上半身|三分之四身|俯拍|仰拍|平視|平视|視角|视角|焦段|景深|散景|對焦|对焦|畫幅|画幅|比例|直幅|橫幅|横幅|直式|橫式|横式)/i, 2],
    ],
    filter: [
      [/\b(?:style|cinematic|editorial|photorealistic|realistic|anime|manga|illustration|watercolor|gouache|oil painting|film look|film grain|analog|vintage|monochrome|black and white|color grading|palette|lighting|daylight|sunlight|golden hour|backlight|rim light|soft light|tungsten|high detail|high resolution|4k|8k|masterpiece)\b/i, 2],
      [/(?:畫風|画风|風格|风格|電影感|电影感|雜誌感|杂志感|寫實|写实|動漫|动漫|漫畫|漫画|插畫|插画|水彩|水粉|油畫|油画|底片|膠片|胶片|顆粒|颗粒|復古|复古|黑白|單色|单色|色調|色调|調色|调色|配色|光線|光线|自然光|陽光|阳光|晨光|夕陽|夕阳|逆光|輪廓光|轮廓光|柔光|鎢絲燈|钨丝灯|高細節|高细节|高畫質|高画质|傑作|杰作)/i, 2],
    ],
  };

  const empty = () => ({
    selected: [],
    replacements: {},
    refs: { AA: false, BB: false },
    anchors: {},
    status: "",
    migrated: false,
  });

  const read = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch { return {}; }
  };

  let local = { ...empty(), ...read(LOCAL_KEY) };
  local.replacements = { ...(local.replacements || {}) };
  local.refs = { AA: false, BB: false, ...(local.refs || {}) };
  local.anchors = { ...(local.anchors || {}) };

  if (!local.migrated) {
    const legacy = read(LEGACY_KEY);
    local.refs = { ...local.refs, ...(legacy.refs || {}) };
    local.anchors = { ...local.anchors, ...(legacy.anchors || {}) };
    local.migrated = true;
  }

  const save = () => {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); }
    catch {}
  };
  save();

  const core = () => read(CORE_KEY);
  const characterFor = (c, slot) => (c.characters || []).find((item) => item.id === c?.workspace?.assignments?.[slot]?.characterId) || null;
  const refOn = (c, slot) => Boolean(local.refs[slot] && characterFor(c, slot));

  function fixtures(c, slot, character) {
    const ids = new Set(c?.workspace?.assignments?.[slot]?.fixtureIds || []);
    return (character?.fixtures || [])
      .filter((item) => ids.has(item.id))
      .map((item) => String(item.promptText || item.name || "").trim())
      .filter(Boolean);
  }

  function scoreText(text, pairs) {
    return pairs.reduce((score, [pattern, weight]) => score + (pattern.test(text) ? weight : 0), 0);
  }

  function classify(text) {
    const value = String(text || "").trim();
    if (!value) return "";
    const scores = Object.entries(RULES).map(([id, rules]) => [id, scoreText(value, rules)]);
    const best = Math.max(...scores.map(([, score]) => score));
    if (!best) return "";
    return scores.find(([, score]) => score === best)?.[0] || "";
  }

  function tokenize(source) {
    const src = String(source || "");
    const separators = /[,;，；。]+|\.\s+|\n+/g;
    const units = [];
    let cursor = 0;
    let match;
    while ((match = separators.exec(src))) {
      const content = src.slice(cursor, match.index);
      units.push({ raw: content + match[0], content, category: classify(content) });
      cursor = match.index + match[0].length;
    }
    if (cursor < src.length) {
      const content = src.slice(cursor);
      units.push({ raw: content, content, category: classify(content) });
    }
    return units;
  }

  function extract(source) {
    const result = Object.fromEntries(OPS.map(([id]) => [id, []]));
    tokenize(source).forEach((unit) => {
      if (unit.category && unit.content.trim()) result[unit.category].push(unit.content.trim());
    });
    return result;
  }

  function sourceHasUnsupportedScript(source) {
    return /[\u3040-\u30ff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f]/.test(String(source || ""));
  }

  function conciseAnchor(c, slot) {
    const character = characterFor(c, slot);
    if (!character) return "";
    const own = String(local.anchors[character.id] || "").trim();
    if (own) return [own, ...fixtures(c, slot, character)].filter(Boolean).join("; ");

    const base = String(character.basePrompt || "").trim();
    const picked = extract(base).character.slice(0, 3).join(", ");
    const fallback = picked || base.replace(/\s+/g, " ").trim();
    const short = fallback.length > 180 ? `${fallback.slice(0, 177).trim()}…` : fallback;
    return [short, ...fixtures(c, slot, character)].filter(Boolean).join("; ");
  }

  function genderFromAnchor(text) {
    const value = String(text || "").toLowerCase();
    if (/\b(?:woman|female|girl)\b/.test(value) || /(?:女性|女人|女子|女生)/.test(value)) return "female";
    if (/\b(?:man|male|boy)\b/.test(value) || /(?:男性|男人|男子|男生)/.test(value)) return "male";
    return "";
  }

  function preserveCase(from, to) {
    if (from === from.toUpperCase()) return to.toUpperCase();
    if (from[0] === from[0]?.toUpperCase()) return to[0].toUpperCase() + to.slice(1);
    return to;
  }

  function replaceWord(text, pattern, replacement) {
    return text.replace(pattern, (match) => preserveCase(match, replacement));
  }

  function looksMultiSubject(text) {
    return /\b(?:two|couple|pair|both|they|them|their|men|women|people)\b/i.test(text) || /(?:兩人|两人|雙人|双人|情侶|情侣|兩位|两位|他們|他们|她們|她们)/.test(text);
  }

  function applySafePronouns(text, c, refs) {
    if (refs.length !== 1 || looksMultiSubject(text)) {
      return { text, changed: false, note: refs.length > 1 ? "雙人模式：小精靈不做全文代詞替換。" : "人物歸屬不夠明確：小精靈不亂換代詞。" };
    }
    const gender = genderFromAnchor(conciseAnchor(c, refs[0]));
    if (!gender) return { text, changed: false, note: "辨識錨點沒有明確性別資訊，小精靈不亂換代詞。" };

    let output = String(text || "");
    if (gender === "female") {
      output = replaceWord(output, /\bhimself\b/gi, "herself");
      output = replaceWord(output, /\bhis\b/gi, "her");
      output = replaceWord(output, /\bhim\b/gi, "her");
      output = replaceWord(output, /\bhe\b/gi, "she");
      output = output.replace(/(?<!其)他的/g, "她的");
      output = output.replace(/(^|[\s,，。；;：:\(\[\{])他(?=$|[\s,，。；;：:\)\]\}])/g, "$1她");
    } else {
      output = replaceWord(output, /\bherself\b/gi, "himself");
      output = replaceWord(output, /\bhers\b/gi, "his");
      output = output.replace(/\bher\s+(?=[a-z])/gi, (match) => preserveCase(match.trim(), "his") + " ");
      output = replaceWord(output, /\bher\b/gi, "him");
      output = replaceWord(output, /\bshe\b/gi, "he");
      output = output.replace(/她的/g, "他的");
      output = output.replace(/(^|[\s,，。；;：:\(\[\{])她(?=$|[\s,，。；;：:\)\]\}])/g, "$1他");
    }
    return { text: output, changed: output !== text, note: output !== text ? "單人模式：小精靈已同步代詞。" : "代詞原本就一致，小精靈沒有多動。" };
  }

  function strippedSource(source, removeIds) {
    const ids = new Set(removeIds);
    return tokenize(source).filter((unit) => !ids.has(unit.category)).map((unit) => unit.raw).join("").trim();
  }

  function active(c) {
    const hasReplacement = local.selected.some((id) => String(local.replacements[id] || "").trim());
    return Boolean(local.selected.length || hasReplacement || refOn(c, "AA") || refOn(c, "BB") || String(c?.workspace?.ratio || "").trim());
  }

  function operationButton(op) {
    const [id, zh, en, hint] = op;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "change-set-v3-operation";
    button.setAttribute("aria-pressed", String(local.selected.includes(id)));
    button.innerHTML = `<strong>${zh}</strong><small>${en}</small><em>${hint}</em>`;
    button.addEventListener("click", () => {
      const selected = new Set(local.selected);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      local.selected = OPS.map(([opId]) => opId).filter((opId) => selected.has(opId));
      local.status = "";
      save();
      rebuild();
    });
    return button;
  }

  function noticeMarkup(source) {
    const unsupported = sourceHasUnsupportedScript(source);
    return `
      <div class="fairy-notices">
        <div class="fairy-note ${unsupported ? "warning" : ""}">
          <strong>語言小提醒</strong>
          <span>${unsupported
            ? "這份胖譜裡有小精靈還在進修的語言。原文會完整保留，但分類結果只當參考；建議先翻成中文或英文再調製。"
            : "小精靈目前最熟悉中文和英文。其他語言也會乖乖保留原文，但暫時不保證能精準找到要修改的部分。"}</span>
        </div>
        <div class="fairy-note">
          <strong>跨平台小提醒</strong>
          <span>每份胖譜都有熟悉的魔法環境。GPT Image、Gemini、NIJI、PixAI 等平台理解 Prompt 的方式不同；跨平台時，畫風、構圖或人物表現可能有落差，小精靈不會偷偷把它改造成另一個平台的專用版本。</span>
        </div>
      </div>
    `;
  }

  function previewCard(id, found, refsActive) {
    const [, zh, en] = OP_MAP[id];
    const lines = found[id] || [];
    const current = String(local.replacements[id] || "");
    const refCharacter = id === "character" && refsActive;
    const foundMarkup = lines.length
      ? `<div class="fairy-extracted-list">${lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</div>`
      : `<div class="fairy-extracted-empty">這一類小精靈暫時沒找到明確片段，所以先不亂碰原文。</div>`;

    return `
      <section class="fairy-preview-card" data-v7-preview="${id}">
        <div class="fairy-preview-head">
          <div><strong>${zh}</strong><small>${en}</small></div>
          <span>${lines.length} 段</span>
        </div>
        ${foundMarkup}
        ${refCharacter ? `<p class="fairy-ref-note">有參考圖時，人物身份會改由 [AA]／[BB] ＋簡短辨識錨點接手；動作、表情、服裝、背景與鏡頭不會跟著被吃掉。</p>` : ""}
        <label class="fairy-replacement-field">
          <span>${refCharacter ? "人物補充（選填）" : "想換成什麼？"}</span>
          <textarea rows="2" data-v7-replacement="${id}" placeholder="把新的內容交給小精靈…">${escapeHtml(current)}</textarea>
        </label>
      </section>
    `;
  }

  function controls() {
    const c = core();
    const source = String(c?.workspace?.sourcePrompt || "");
    const found = extract(source);
    const refsActive = refOn(c, "AA") || refOn(c, "BB");
    if (refsActive && !local.selected.includes("character")) {
      const selected = new Set(["character", ...local.selected]);
      local.selected = OPS.map(([id]) => id).filter((id) => selected.has(id));
      save();
    }
    const box = document.createElement("section");
    box.className = "change-set-v3 change-set-v7";
    box.dataset.changeSetV7 = "true";
    box.innerHTML = `
      <div class="change-set-v3-head">
        <div class="change-set-v3-copy">
          <span class="change-set-v3-kicker">FAIRY CHANGE SET</span>
          <strong class="change-set-v3-title">這次想施哪一種小魔法？</strong>
          <p>勾選想修改的部分，小精靈只把相關內容找出來。<b>沒被選到的原文，小精靈乖乖、保持距離！</b></p>
        </div>
        <button type="button" class="change-set-v3-clear" data-v7-clear>清除選擇</button>
      </div>
      ${noticeMarkup(source)}
      <div class="change-set-v3-operations"></div>
      <div class="fairy-preview-stack" data-v7-preview-stack></div>
      <div class="change-set-v3-status" data-v7-status></div>
    `;

    const operations = box.querySelector(".change-set-v3-operations");
    OPS.forEach((op) => operations.append(operationButton(op)));

    const previewStack = box.querySelector("[data-v7-preview-stack]");
    local.selected.forEach((id) => {
      previewStack.insertAdjacentHTML("beforeend", previewCard(id, found, refsActive));
    });
    if (!local.selected.length) {
      previewStack.innerHTML = `<div class="fairy-preview-idle">先勾一格，小精靈再把那一類從原胖譜裡撈出來給你看。</div>`;
    }

    box.querySelectorAll("[data-v7-replacement]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        local.replacements[textarea.dataset.v7Replacement] = textarea.value;
        local.status = "";
        save();
        syncCompileButton();
      });
    });

    const clear = box.querySelector("[data-v7-clear]");
    clear.hidden = !local.selected.length;
    clear.addEventListener("click", () => {
      local.selected = [];
      local.replacements = {};
      local.status = "";
      save();
      rebuild();
    });

    const status = box.querySelector("[data-v7-status]");
    status.textContent = local.status || (refsActive
      ? "參考圖模式已開啟：小精靈會先把人物身份描述抽出來，再交給 [AA]／[BB] 辨識錨點接手。"
      : "原胖譜是底稿；只有你勾選、而且真的填入新內容的分類才會被替換。其餘原文保持原樣。"
    );
    return box;
  }

  function wrapAdvanced(panel) {
    if (panel.querySelector("[data-v7-advanced]")) return;
    const old = panel.querySelector("[data-v5-advanced]");
    if (old) {
      old.dataset.v7Advanced = "true";
      old.removeAttribute("data-v5-advanced");
      return;
    }
    const tabs = panel.querySelector(".ingredient-tabs");
    const summary = panel.querySelector(".ingredient-summary");
    const list = panel.querySelector(".recipe-list");
    if (!tabs || !list) return;
    const details = document.createElement("details");
    details.className = "change-set-v3-advanced";
    details.dataset.v7Advanced = "true";
    details.innerHTML = `<summary><span><strong>Advanced Semantic Index</strong><small>完整拆分／手動校正</small></span><span>需要時再展開</span></summary><div class="change-set-v3-advanced-body"></div>`;
    const body = details.querySelector(".change-set-v3-advanced-body");
    body.appendChild(tabs);
    if (summary) body.appendChild(summary);
    body.appendChild(list);
    panel.appendChild(details);
  }

  function rebuild() {
    const panel = document.querySelector(".workspace-page .ingredients-panel");
    if (!panel) return;
    panel.querySelector("[data-change-set-v7]")?.remove();
    wrapAdvanced(panel);
    const details = panel.querySelector("[data-v7-advanced]");
    const control = controls();
    details ? details.insertAdjacentElement("beforebegin", control) : panel.querySelector(".step-title")?.insertAdjacentElement("afterend", control);
    syncCompileButton();
  }

  function syncRefs() {
    const c = core();
    document.querySelectorAll(".workspace-page .assignment-card").forEach((card) => {
      const slot = card.querySelector("[data-character-slot]")?.dataset.characterSlot;
      if (!slot) return;
      const character = characterFor(c, slot);
      const existing = card.querySelector("[data-v7-ref]");
      if (existing && existing.dataset.characterId === (character?.id || "")) return;
      existing?.remove();
      card.querySelector("[data-v5-ref]")?.remove();

      const host = document.createElement("div");
      host.dataset.v7Ref = "true";
      host.dataset.characterId = character?.id || "";
      host.className = "fairy-ref-control";

      if (!character) {
        local.refs[slot] = false;
        save();
        host.innerHTML = `<small class="muted">先選好人物，小精靈才知道參考圖要叫 [${slot}] 誰。</small>`;
      } else {
        const checked = local.refs[slot] ? "checked" : "";
        const anchorText = conciseAnchor(c, slot) || character.name || slot;
        host.innerHTML = `
          <label class="check-line">
            <input type="checkbox" data-v7-ref-slot="${slot}" ${checked}>
            <span>這位角色有參考圖 <small>小精靈會改用 [${slot}] ＋簡短辨識錨點認人</small></span>
          </label>
          <p class="assignment-preview" data-v7-anchor ${checked ? "" : "hidden"}>小精靈預計使用：[${slot}] ${escapeHtml(anchorText)}</p>
          <small class="muted" data-v7-ref-hint ${checked ? "" : "hidden"}>人物身份描述會先抽出；動作、表情、服裝、背景和鏡頭保持原本的工作。</small>
        `;
        host.querySelector("[data-v7-ref-slot]").addEventListener("change", (event) => {
          local.refs[slot] = event.target.checked;
          local.status = "";
          save();
          rebuild();
          requestAnimationFrame(syncRefs);
        });
      }
      card.append(host);
    });
  }

  function enhanceCharacter() {
    const form = document.querySelector('form[data-form="character"]');
    if (!form || form.querySelector("[data-v7-anchor-field]")) return;
    form.querySelector("[data-v5-anchor-field]")?.remove();
    const id = form.dataset.id || "";
    const c = core();
    const character = (c.characters || []).find((item) => item.id === id);
    const field = document.createElement("label");
    field.className = "field";
    field.dataset.v7AnchorField = "true";
    field.innerHTML = `
      <span>辨識錨點｜Identity Anchor <em>選填・短一點更好</em></span>
      <textarea name="identityAnchor" rows="3" placeholder="black long straight hair, light amber eyes, silver ring"></textarea>
      <small>小精靈只記髮色／髮型、眼色與固定辨識特徵；動作、表情、服裝和場景不塞進來。</small>
    `;
    field.querySelector("textarea").value = character ? String(local.anchors[character.id] || "") : "";
    form.querySelector('textarea[name="basePrompt"]')?.closest(".field")?.insertAdjacentElement("afterend", field);
  }

  function build() {
    const c = core();
    const original = String(c?.workspace?.sourcePrompt || "").trim();
    if (!original) return null;

    const refs = ["AA", "BB"].filter((slot) => refOn(c, slot));
    const removeIds = local.selected.filter((id) => String(local.replacements[id] || "").trim());
    if (refs.length && !removeIds.includes("character")) removeIds.push("character");

    let cleaned = strippedSource(original, removeIds);
    const pronouns = applySafePronouns(cleaned, c, refs);
    cleaned = pronouns.text;

    const parts = [`[SOURCE PROMPT — selected excerpts removed]\n${cleaned}`];

    const replacementLines = [];
    local.selected.forEach((id) => {
      const value = String(local.replacements[id] || "").trim();
      if (!value) return;
      const label = OP_MAP[id]?.[1] || id;
      replacementLines.push(`${label}: ${value}`);
    });
    if (String(c?.workspace?.ratio || "").trim()) {
      replacementLines.push(`鏡頭語言／比例: ${String(c.workspace.ratio).trim()}`);
    }
    if (replacementLines.length) {
      parts.push(`[FAIRY REPLACEMENT]\n${replacementLines.join("\n")}\nOnly these named replacements override the removed excerpts. Everything else in the source remains authoritative.`);
    }

    if (refs.length) {
      const identity = ["[IDENTITY PATCH]", "Reference images are supplied in the image-generation tool."];
      refs.forEach((slot, index) => {
        identity.push(`[${slot}] = reference image ${index + 1}: ${conciseAnchor(c, slot) || characterFor(c, slot)?.name || slot}`);
      });
      identity.push("Use these anchors for static identity only. Keep source pose, expression, movement, wardrobe, background, camera language and filter unless that category was explicitly replaced above.");
      parts.push(identity.join("\n"));
    }

    return {
      output: parts.join("\n\n"),
      refs: refs.length,
      removed: removeIds,
      pronounNote: pronouns.note,
      pronounsChanged: pronouns.changed,
      unsupported: sourceHasUnsupportedScript(original),
    };
  }

  function compile() {
    const result = build();
    if (!result) return;
    const textarea = document.querySelector("#outputPrompt");
    if (!textarea) return;
    textarea.value = result.output;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const out = document.querySelector(".output-workspace");
    out?.classList.add("is-complete");
    out?.querySelectorAll('[data-action="copy-output"],[data-action="save-output"],[data-action="save-version"]').forEach((button) => { button.disabled = false; });
    const subtitle = out?.querySelector(".step-title p");
    if (subtitle) subtitle.textContent = "小精靈只替換你點名的部分；其他原文保持距離。";

    const aside = out?.querySelector(".output-aside");
    aside?.querySelector("[data-v7-result]")?.remove();
    if (aside) {
      const note = document.createElement("div");
      note.className = `notice ${result.unsupported ? "warning" : "success"}`;
      note.dataset.v7Result = "true";
      note.innerHTML = `<strong>${result.unsupported ? "調製完成，但有進修中語言" : "小精靈調製完成"}</strong><span></span><small></small>`;
      note.querySelector("span").textContent = result.removed.length
        ? `已替換：${result.removed.map((id) => OP_MAP[id]?.[1] || id).join("、")}；${result.refs ? `${result.refs} 位角色使用參考圖錨定。` : "未啟用參考圖。"}`
        : `${result.refs ? `${result.refs} 位角色改用參考圖錨定；` : ""}沒有填入的新分類不會被刪除。`;
      note.querySelector("small").textContent = result.pronounNote;
      aside.prepend(note);
    }

    local.status = result.unsupported
      ? "完成。其他語言片段小精靈沒有硬猜，仍保留在原文裡。"
      : "完成。沒被選到的原文，小精靈乖乖、保持距離！";
    save();
    rebuild();
    out?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncCompileButton() {
    const c = core();
    const button = document.querySelector('.workspace-page [data-action="compile"]');
    if (!button) return;
    const hasSource = Boolean(String(c?.workspace?.sourcePrompt || "").trim());
    button.disabled = !(hasSource && active(c));
    if (hasSource && active(c)) button.textContent = "Compose Prompt｜小精靈調製";
  }

  function sync() {
    const workspace = document.querySelector(".workspace-page");
    const panel = workspace?.querySelector(".ingredients-panel");
    if (!workspace || !panel) return;

    const parse = workspace.querySelector('[data-action="parse"]');
    if (parse) parse.textContent = "小精靈找找看";
    const title = panel.querySelector(".step-title h2");
    const subtitle = panel.querySelector(".step-title p");
    if (title) title.textContent = "挑出這次想改的部分";
    if (subtitle) subtitle.textContent = "原胖譜先當底稿；小精靈只撈你點名的那幾類。";

    wrapAdvanced(panel);
    if (!panel.querySelector("[data-change-set-v7]")) {
      const control = controls();
      const details = panel.querySelector("[data-v7-advanced]");
      details ? details.insertAdjacentElement("beforebegin", control) : panel.querySelector(".step-title")?.insertAdjacentElement("afterend", control);
    }
    syncRefs();
    syncCompileButton();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[char]));
  }

  const schedule = () => requestAnimationFrame(() => { enhanceCharacter(); sync(); });
  const app = document.querySelector("#app");
  if (app) new MutationObserver(schedule).observe(app, { childList: true, subtree: true });

  document.addEventListener("input", (event) => {
    if (event.target?.id === "sourcePrompt") setTimeout(rebuild, 0);
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-character-slot]")) requestAnimationFrame(() => { syncRefs(); rebuild(); });
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-form="character"]');
    if (!form) return;
    const id = form.dataset.id || "";
    const name = String(form.querySelector('[name="name"]')?.value || "").trim();
    const value = String(form.querySelector('[name="identityAnchor"]')?.value || "").trim();
    setTimeout(() => {
      const c = core();
      const character = id
        ? (c.characters || []).find((item) => item.id === id)
        : [...(c.characters || [])].reverse().find((item) => item.name === name);
      if (!character) return;
      value ? local.anchors[character.id] = value : delete local.anchors[character.id];
      save();
    }, 0);
  }, true);

  document.addEventListener("click", (event) => {
    if (!event.target.closest('[data-action="compile"]')) return;
    const c = core();
    if (!active(c)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    compile();
  }, true);

  window.addEventListener("hashchange", schedule);
  schedule();
})();
