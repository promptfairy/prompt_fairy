(() => {
  "use strict";

  const CORE_KEY = "prompt-fairy-arcane-v2";
  const LOCAL_KEY = "prompt-fairy-change-set-v5";
  const OPS = [
    ["subject_count", "人物數量", "SUBJECT COUNT", "單人 ↔ 雙人、增加或減少人物"],
    ["gender_appearance", "性別／外觀", "APPEARANCE", "性別、髮型、髮色、五官與身形"],
    ["wardrobe", "服裝配件", "WARDROBE", "衣著、飾品與固定配件"],
    ["pose_action", "姿勢／互動", "POSE & ACTION", "姿勢、動作、角色之間的互動"],
    ["scene", "場景背景", "SCENE", "地點、環境與背景元素"],
    ["composition", "構圖尺寸", "COMPOSITION", "鏡位、景別、比例與畫面安排"]
  ];

  const STYLE_LOCK = /(?:화풍\s*잠금|비사진적|일러스트|畫風|画风|style\s*lock|illustration|gouache|watercolou?r)/i;
  const STYLE_DIRTY = /(?:photorealistic|ultra[- ]?realistic|realistic\s+(?:skin|photo)|visible\s+pores|photography|anime|manga|film\s+look|film\s+grain|vogue|寫實|写实|攝影|摄影|動漫|动漫|動畫|动画|실사|사진|애니|만화)/i;

  const empty = () => ({ selected: [], request: "", refs: { AA: false, BB: false }, anchors: {}, status: "" });
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; } };
  let local = { ...empty(), ...read(LOCAL_KEY) };
  local.refs = { AA: false, BB: false, ...(local.refs || {}) };
  local.anchors = local.anchors || {};
  const save = () => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch {} };
  const core = () => read(CORE_KEY);
  const char = (c, slot) => (c.characters || []).find((x) => x.id === c?.workspace?.assignments?.[slot]?.characterId) || null;
  const refOn = (c, slot) => Boolean(local.refs[slot] && char(c, slot));
  const active = (c) => Boolean(local.selected.length || refOn(c, "AA") || refOn(c, "BB") || String(c?.workspace?.ratio || "").trim());

  function fixtures(c, slot, character) {
    const ids = new Set(c?.workspace?.assignments?.[slot]?.fixtureIds || []);
    return (character?.fixtures || []).filter((x) => ids.has(x.id)).map((x) => String(x.promptText || x.name || "").trim()).filter(Boolean);
  }

  function anchor(c, slot) {
    const character = char(c, slot);
    if (!character) return "";
    const own = String(local.anchors[character.id] || "").trim();
    const base = String(character.basePrompt || "").replace(/\s+/g, " ").trim();
    return [own || (base.length > 220 ? `${base.slice(0, 217).trim()}…` : base), ...fixtures(c, slot, character)].filter(Boolean).join("; ");
  }

  function genderFromAnchor(text) {
    const value = String(text || "").toLowerCase();
    if (/\b(?:woman|female|girl)\b/.test(value)) return "female";
    if (/\b(?:man|male|boy)\b/.test(value)) return "male";
    return "";
  }

  function opButton(op) {
    const [id, zh, en, hint] = op;
    const button = document.createElement("button");
    const on = local.selected.includes(id);
    button.type = "button";
    button.className = "change-set-v3-operation";
    button.setAttribute("aria-pressed", String(on));
    button.innerHTML = `<strong>${zh}</strong><small>${en}</small><em>${hint}</em>`;
    button.addEventListener("click", () => {
      const selected = new Set(local.selected);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      local.selected = OPS.map((x) => x[0]).filter((x) => selected.has(x));
      local.status = "";
      save();
      rebuild();
    });
    return button;
  }

  function controls() {
    const c = core();
    const box = document.createElement("section");
    box.className = "change-set-v3";
    box.dataset.changeSetV5 = "true";
    box.innerHTML = `
      <div class="change-set-v3-head">
        <div class="change-set-v3-copy">
          <span class="change-set-v3-kicker">CHANGE SET</span>
          <strong class="change-set-v3-title">這次想改什麼？</strong>
          <p>只說要變成什麼；原文是哪種語言都不用自己重寫。</p>
        </div>
        <button type="button" class="change-set-v3-clear" data-v5-clear>清除選擇</button>
      </div>
      <div class="change-set-v3-operations"></div>
      <label class="change-set-v3-request">
        <span>修改說明 <small>CHANGE REQUEST</small></span>
        <textarea rows="3" data-v5-request placeholder="例如：兩位角色都換成 oversized 白襯衫；其他內容保持原樣。"></textarea>
      </label>
      <div class="change-set-v3-status" data-v5-status></div>
    `;
    const ops = box.querySelector(".change-set-v3-operations");
    OPS.forEach((x) => ops.appendChild(opButton(x)));
    const textarea = box.querySelector("[data-v5-request]");
    textarea.value = local.request || "";
    textarea.disabled = !local.selected.length;
    textarea.addEventListener("input", () => { local.request = textarea.value; local.status = ""; save(); });
    const clear = box.querySelector("[data-v5-clear]");
    clear.hidden = !local.selected.length;
    clear.addEventListener("click", () => { local.selected = []; local.request = ""; local.status = ""; save(); rebuild(); });
    box.querySelector("[data-v5-status]").textContent = local.status || (refOn(c, "AA") || refOn(c, "BB")
      ? "生成端參考圖模式已啟用：小精靈只輸出 [AA]/[BB] 辨識錨點，不處理圖片。"
      : "完整拆分留在 Advanced Semantic Index，需要時才展開。");
    return box;
  }

  function wrap(panel) {
    if (panel.querySelector("[data-v5-advanced]")) return;
    const tabs = panel.querySelector(".ingredient-tabs");
    const summary = panel.querySelector(".ingredient-summary");
    const list = panel.querySelector(".recipe-list");
    if (!tabs || !list) return;
    const details = document.createElement("details");
    details.className = "change-set-v3-advanced";
    details.dataset.v5Advanced = "true";
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
    panel.querySelector("[data-change-set-v5]")?.remove();
    const details = panel.querySelector("[data-v5-advanced]");
    const control = controls();
    details ? details.insertAdjacentElement("beforebegin", control) : panel.querySelector(".step-title")?.insertAdjacentElement("afterend", control);
  }

  function syncRefs() {
    const c = core();
    document.querySelectorAll(".workspace-page .assignment-card").forEach((card) => {
      const slot = card.querySelector("[data-character-slot]")?.dataset.characterSlot;
      if (!slot) return;
      const character = char(c, slot);
      const existing = card.querySelector("[data-v5-ref]");
      if (existing && existing.dataset.characterId === (character?.id || "")) return;
      existing?.remove();
      const host = document.createElement("div");
      host.dataset.v5Ref = "true";
      host.dataset.characterId = character?.id || "";
      host.style.marginTop = "10px";
      if (!character) {
        local.refs[slot] = false;
        save();
        host.innerHTML = `<small class="muted">選好人物後，可標記「生成端有參考圖」。</small>`;
      } else {
        host.innerHTML = `<label class="check-line"><input type="checkbox" data-v5-ref-slot="${slot}" ${local.refs[slot] ? "checked" : ""}><span>生成端有參考圖 <small>圖片在 image2 / banana2 等生成端提供</small></span></label><p class="assignment-preview" data-v5-anchor ${local.refs[slot] ? "" : "hidden"}></p>`;
        host.querySelector("[data-v5-anchor]").textContent = `Identity Anchor｜${anchor(c, slot) || "尚未設定，暫用人物主調短版"}`;
        host.querySelector("[data-v5-ref-slot]").addEventListener("change", (event) => {
          local.refs[slot] = event.target.checked;
          local.status = "";
          save();
          const preview = host.querySelector("[data-v5-anchor]");
          if (preview) preview.hidden = !event.target.checked;
          rebuild();
        });
      }
      card.appendChild(host);
    });
  }

  function enhanceCharacter() {
    const form = document.querySelector('form[data-form="character"]');
    if (!form || form.querySelector("[data-v5-anchor-field]")) return;
    const id = form.dataset.id || "";
    const c = core();
    const character = (c.characters || []).find((x) => x.id === id);
    const field = document.createElement("label");
    field.className = "field";
    field.dataset.v5AnchorField = "true";
    field.innerHTML = `<span>Identity Anchor｜辨識錨點 <em>選填・建議短版</em></span><textarea name="identityAnchor" rows="3" placeholder="black long straight hair man with center-part bangs, light amber eyes"></textarea><small>只留髮型／髮色、眼色與 1–2 個固定辨識特徵；給生成端分辨 [AA] / [BB]，不取代完整人物主調。</small>`;
    field.querySelector("textarea").value = character ? String(local.anchors[character.id] || "") : "";
    form.querySelector('textarea[name="basePrompt"]')?.closest(".field")?.insertAdjacentElement("afterend", field);
  }

  function sanitize(text, lock) {
    const src = String(text || "").trim();
    if (!src || !lock) return { keep: src, drop: [] };
    const keep = [], drop = [];
    src.split(/[,;，；]/).map((x) => x.trim()).filter(Boolean).forEach((x) => STYLE_DIRTY.test(x) ? drop.push(x) : keep.push(x));
    return { keep: keep.join(", "), drop };
  }

  function source(c) {
    let text = String(c?.workspace?.sourcePrompt || "").trim();
    if (refOn(c, "AA") && refOn(c, "BB")) {
      text = text.replace(/^.*(?:익명의\s*성인동반자|반대되는\s*이성으로\s*생성).*$/gmi, "");
      text = text.replace(/^.*(?:if\s+only\s+one\s+target|anonymous\s+adult\s+companion).*(?:opposite[- ]?sex|opposite\s+gender).*$/gmi, "");
    }
    return text.replace(/\n{3,}/g, "\n\n").trim();
  }

  function extractStyleSection(src) {
    const patterns = [
      /(\[2\.\s*화풍\s*잠금\][\s\S]*?)(?=\n\s*\[3\.|$)/i,
      /(\[(?:STYLE|STYLE LOCK)[^\]]*\][\s\S]*?)(?=\n\s*\[[^\]]+\]|$)/i
    ];
    for (const pattern of patterns) {
      const match = String(src || "").match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return "";
  }

  function extras(c, lock) {
    const keep = [], drop = [];
    const ids = c?.workspace?.selectedMaterialIds || [];
    (c.materials || []).forEach((material) => {
      if (!ids.includes(material.id)) return;
      if ((refOn(c, "AA") || refOn(c, "BB")) && material.category === "face_reference") {
        drop.push(`${material.name}（Reference-first 已接管）`);
        return;
      }
      const result = sanitize(material.content, lock);
      if (result.keep) keep.push(result.keep);
      if (result.drop.length) drop.push(`${material.name}: ${result.drop.join(" / ")}`);
    });
    String(c?.workspace?.additions || "").split(/\n+/).filter(Boolean).forEach((line) => {
      const result = sanitize(line, lock);
      if (result.keep) keep.push(result.keep);
      if (result.drop.length) drop.push(`臨時點綴: ${result.drop.join(" / ")}`);
    });
    return { keep, drop };
  }

  function buildPatch(c, refs) {
    const blocks = [];
    if (refs.length) {
      const map = ["[IDENTITY PATCH]", "Reference images are supplied in the image-generation tool."];
      refs.forEach((slot, index) => {
        const a = anchor(c, slot) || char(c, slot)?.name || slot;
        map.push(`[${slot}] = reference image ${index + 1}: ${a}`);
        const gender = genderFromAnchor(a);
        if (gender) map.push(`[${slot}] gender branch: ${gender}`);
      });
      map.push("These identity anchors override source-character static identity traits only; source pose, expression, hair movement, scene action and composition remain active.");
      blocks.push(map.join("\n"));
    }

    if (local.selected.length || local.request.trim() || String(c?.workspace?.ratio || "").trim()) {
      const lines = ["[CHANGE PATCH]"];
      if (local.selected.includes("gender_appearance")) lines.push("Identity / appearance override: use the assigned Identity Anchors for static subject identity traits.");
      if (local.selected.includes("wardrobe") && local.request.trim()) lines.push(`Wardrobe override: ${local.request.trim()}`);
      if (local.selected.includes("subject_count") && local.request.trim()) lines.push(`Subject-count override: ${local.request.trim()}`);
      if (local.selected.includes("pose_action") && local.request.trim()) lines.push(`Pose / interaction override: ${local.request.trim()}`);
      if (local.selected.includes("scene") && local.request.trim()) lines.push(`Scene override: ${local.request.trim()}`);
      if (local.selected.includes("composition") && local.request.trim()) lines.push(`Composition override: ${local.request.trim()}`);
      if (!local.selected.includes("wardrobe") && !local.selected.includes("subject_count") && !local.selected.includes("pose_action") && !local.selected.includes("scene") && !local.selected.includes("composition") && local.request.trim()) lines.push(`Requested change: ${local.request.trim()}`);
      if (String(c?.workspace?.ratio || "").trim()) lines.push(`Aspect-ratio override: ${String(c.workspace.ratio).trim()}`);
      lines.push("Only the fields named in this patch override the source. Every other source instruction remains authoritative.");
      blocks.push(lines.join("\n"));
    }
    return blocks;
  }

  function build() {
    const c = core();
    const src = source(c);
    if (!src) return null;
    const lock = STYLE_LOCK.test(src);
    const styleSection = lock ? extractStyleSection(src) : "";
    const add = extras(c, lock);
    const refs = ["AA", "BB"].filter((slot) => refOn(c, slot));
    const parts = [`[SOURCE PROMPT]\n${src}`];

    if (add.keep.length) parts.push(`[ADDITIONAL SAFE MATERIAL]\n${add.keep.join("\n")}`);
    parts.push(...buildPatch(c, refs));

    if (styleSection) {
      parts.push(`[STYLE AUTHORITY — VERBATIM FROM SOURCE]\n${styleSection}\n\nThis source style section has final authority over rendering medium, line quality, shading, palette, brush texture, material treatment and finish.`);
    } else if (lock) {
      parts.push("[STYLE AUTHORITY]\nThe source prompt's existing style instructions have final authority over rendering medium, line quality, shading, palette, brush texture, material treatment and finish.");
    }

    return { output: parts.join("\n\n"), drop: add.drop, refs: refs.length, lock, repeatedStyle: Boolean(styleSection) };
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
    out?.querySelectorAll('[data-action="copy-output"],[data-action="save-output"],[data-action="save-version"]').forEach((button) => button.disabled = false);
    const p = out?.querySelector(".step-title p");
    if (p) p.textContent = "Change Set v5 已完成：原文先行、局部 patch 後置，來源畫風鎖在結尾再次加權。";
    const aside = out?.querySelector(".output-aside");
    aside?.querySelector("[data-v5-result]")?.remove();
    if (aside) {
      const note = document.createElement("div");
      note.className = `notice ${result.drop.length ? "warning" : "success"}`;
      note.dataset.v5Result = "true";
      note.innerHTML = `<strong>${result.drop.length ? "已攔截可能改畫風的附加詞" : "局部替換完成"}</strong><span></span>${result.drop.length ? "<small></small>" : ""}`;
      note.querySelector("span").textContent = `${result.refs} 位角色使用 Identity Anchor${result.repeatedStyle ? " · 已重申來源畫風鎖" : result.lock ? " · 偵測到來源畫風鎖" : ""}`;
      if (result.drop.length) note.querySelector("small").textContent = `未寫入：${result.drop.join("；")}`;
      aside.prepend(note);
    }
    local.status = result.drop.length ? `已完成；攔截 ${result.drop.length} 組可能污染畫風的附加詞。` : "已完成；只追加局部 patch，來源 Prompt 本文未重排。";
    save();
    out?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function sync() {
    const workspace = document.querySelector(".workspace-page");
    const panel = workspace?.querySelector(".ingredients-panel");
    if (!workspace || !panel) return;
    const parse = workspace.querySelector('[data-action="parse"]');
    if (parse) parse.textContent = "分析可替換區域";
    const h = panel.querySelector(".step-title h2");
    const sub = panel.querySelector(".step-title p");
    if (h) h.textContent = "選擇這次要改的部分";
    if (sub) sub.textContent = "完整 Prompt 當底稿；只描述這次要變動的結果。";
    wrap(panel);
    if (!panel.querySelector("[data-change-set-v5]")) {
      const control = controls();
      const details = panel.querySelector("[data-v5-advanced]");
      details ? details.insertAdjacentElement("beforebegin", control) : panel.querySelector(".step-title")?.insertAdjacentElement("afterend", control);
    }
    syncRefs();
    const c = core();
    const button = workspace.querySelector('[data-action="compile"]');
    if (button && String(c?.workspace?.sourcePrompt || "").trim() && active(c)) {
      button.disabled = false;
      button.textContent = "Compose Prompt｜局部替換";
    }
  }

  const schedule = () => requestAnimationFrame(() => { enhanceCharacter(); sync(); });
  const app = document.querySelector("#app");
  if (app) new MutationObserver(schedule).observe(app, { childList: true, subtree: true });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-character-slot]")) requestAnimationFrame(sync);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest('form[data-form="character"]');
    if (!form) return;
    const id = form.dataset.id || "";
    const name = String(form.querySelector('[name="name"]')?.value || "").trim();
    const value = String(form.querySelector('[name="identityAnchor"]')?.value || "").trim();
    setTimeout(() => {
      const c = core();
      const character = id ? (c.characters || []).find((x) => x.id === id) : [...(c.characters || [])].reverse().find((x) => x.name === name);
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
