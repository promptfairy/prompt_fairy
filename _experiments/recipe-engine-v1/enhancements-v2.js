(() => {
  const UI_SCHEMA_VERSION = "recipe-ui-v1.1";
  const v1Render = render;
  const v1CompilePrompt = compilePrompt;
  const baseSplitPrompt = splitPrompt;

  const CATEGORY_DEFINITIONS = [
    ["provider_instruction", "平台／參考圖指示"],
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

  const CLASSIFIER_DEFINITIONS = [
    ["provider_instruction", ["face reference", "reference image", "same person", "preserve identity", "參考圖", "臉部參考", "保留五官", "維持同一人"]],
    ["ratio", ["aspect ratio", "--ar", "9:16", "4:5", "3:4", "1:1", "16:9", "1254x1254", "1024x1024", "畫幅", "比例", "直式", "橫式", "正方形", "尺寸"]],
    ["constraints", ["negative prompt", "avoid:", "do not", "no watermark", "no text", "no logo", "bad hands", "extra fingers", "missing fingers", "bad anatomy", "extra limbs", "負面詞", "禁止", "不要", "避免", "無水印", "崩手", "肢體錯誤"]],
    ["framing", ["85mm", "50mm", "35mm", "lens", "f/1.", "f/2.", "depth of field", "bokeh", "dslr", "fujifilm", "kodak", "close-up", "full body", "half body", "upper body", "three-quarter", "overhead", "low angle", "high angle", "looking at camera", "not looking at camera", "鏡頭", "景深", "焦段", "散景", "相機", "特寫", "全身", "半身", "上半身", "俯拍", "仰拍", "不看鏡頭", "構圖"]],
    ["lighting", ["lighting", "golden hour", "window light", "backlight", "rim light", "soft light", "tungsten", "daylight", "color grading", "color palette", "光線", "晨光", "夕陽", "逆光", "輪廓光", "自然光", "色調", "調色"]],
    ["style_quality", ["style", "cinematic", "editorial", "anime", "photorealistic", "ultra-realistic", "film look", "film grain", "monochrome", "vogue", "premium lifestyle photography", "lifestyle photography", "fashion photography", "masterpiece", "high detail", "ultra detail", "ultra-detailed", "8k", "4k", "high resolution", "visible pores", "detailed", "sharp focus", "畫風", "電影感", "雜誌", "寫實", "半寫實", "動漫", "底片", "顆粒", "黑白", "高畫質", "高細節", "傑作", "毛孔", "清晰", "精緻", "生活風攝影", "時尚攝影"]],
    ["clothing", ["wearing", "wears", "dressed in", "shirt", "suit", "jacket", "coat", "dress", "vest", "trousers", "skirt", "uniform", "jewelry", "earrings", "glasses", "ring", "necklace", "bracelet", "watch", "穿著", "襯衫", "西裝", "外套", "長褲", "裙", "制服", "飾品", "耳環", "眼鏡", "戒指", "項鍊", "手鍊", "手錶", "服裝"]],
    ["action", ["holding", "sitting", "standing", "walking", "leaning", "hugging", "kissing", "looking back", "hands", "pose", "interaction", "拿著", "坐在", "站在", "走路", "倚靠", "擁抱", "親吻", "回頭", "動作", "互動"]],
    ["scene", ["background", "inside", "outdoor", "room", "kitchen", "cafe", "street", "beach", "forest", "school", "garden", "window", "bridge", "背景", "室內", "戶外", "房間", "廚房", "咖啡廳", "街道", "海邊", "森林", "校園", "花園", "窗邊", "橋"]],
    ["character", ["hair", "eyes", "skin", "face", "facial", "lips", "nose", "body", "height", "slim", "muscular", "young adult", "adult man", "adult woman", "a man", "a woman", "a person", "young man", "young woman", "east asian man", "east asian woman", "couple", "two men", "two women", "頭髮", "眼睛", "瞳", "膚色", "五官", "嘴唇", "鼻", "身形", "身高", "纖瘦", "肌肉", "成年男性", "成年女性", "一名男子", "一名女性", "東亞男性", "東亞女性", "情侶", "人物"]]
  ];

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

  const FILTERS = [
    ["all", "全部"], ["unclassified", "未分類"], ["character", "人物"],
    ["clothing", "服裝配件"], ["action", "動作"], ["scene", "場景"],
    ["framing", "構圖鏡頭"], ["lighting", "光線色調"], ["style_quality", "風格品質"],
    ["ratio", "尺寸"], ["constraints", "限制"], ["provider_instruction", "參考指示"]
  ];

  function configureCategories() {
    CATEGORY_OPTIONS.splice(0, CATEGORY_OPTIONS.length, ...CATEGORY_DEFINITIONS.map((item) => [...item]));
    STANDARD_ORDER.splice(0, STANDARD_ORDER.length, ...CATEGORY_DEFINITIONS.map(([value]) => value));
    CLASSIFIERS.splice(0, CLASSIFIERS.length, ...CLASSIFIER_DEFINITIONS.map(([category, words]) => [category, [...words]]));
  }

  function migrateCategory(category) {
    if (CATEGORY_DEFINITIONS.some(([value]) => value === category)) return category;
    return LEGACY_CATEGORY_MAP[category] || "unclassified";
  }

  function stripSeparator(text) {
    return String(text || "").trim().replace(/[,;，；]+$/g, "").trim();
  }

  function compactStyleQuality(fragments) {
    const compacted = [];
    fragments.forEach((fragment) => {
      const current = { ...fragment, category: migrateCategory(fragment.category) };
      const previous = compacted[compacted.length - 1];
      if (previous && previous.category === "style_quality" && current.category === "style_quality" && previous.source === "original" && current.source === "original" && !previous.locked && !current.locked) {
        previous.text = [stripSeparator(previous.text), stripSeparator(current.text)].filter(Boolean).join(", ");
        previous.originalText = [stripSeparator(previous.originalText), stripSeparator(current.originalText)].filter(Boolean).join(", ");
        previous.confidence = previous.confidence === "high" && current.confidence === "high" ? "high" : "medium";
      } else {
        compacted.push(current);
      }
    });
    compacted.forEach((fragment, index) => { fragment.originalOrder = index; });
    return compacted;
  }

  function ensureV2State() {
    if (!FILTERS.some(([value]) => value === state.activeIngredientFilter)) state.activeIngredientFilter = "all";
    if (state.uiSchemaVersion !== UI_SCHEMA_VERSION) {
      state.fragments = compactStyleQuality(Array.isArray(state.fragments) ? state.fragments : []);
      state.uiSchemaVersion = UI_SCHEMA_VERSION;
    }
  }

  function containsChinese(text) {
    return /[\u3400-\u9fff]/.test(String(text || ""));
  }

  function joinEnglish(items) {
    if (items.length < 2) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function translateAccessoryName(name) {
    const map = {
      "戒指": "ring", "銀戒": "silver ring", "銀戒指": "silver ring", "金戒": "gold ring", "金戒指": "gold ring",
      "眼鏡": "glasses", "金絲眼鏡": "thin gold-rimmed glasses", "耳環": "earrings", "耳釘": "stud earrings",
      "項鍊": "necklace", "手鍊": "bracelet", "手錶": "wristwatch", "刺青": "tattoo", "紋身": "tattoo",
      "痣": "mole", "淚痣": "tear mole"
    };
    const text = String(name || "").trim();
    return map[text] || (containsChinese(text) ? "" : text);
  }

  function translateBodySlot(slot) {
    const text = String(slot || "").trim();
    if (!text) return { text: "", fingerCount: 0 };
    if (!containsChinese(text)) return { text, fingerCount: 0 };
    const side = text.includes("左") ? "left" : text.includes("右") ? "right" : "";
    const fingers = [["拇指", "thumb"], ["食指", "index"], ["中指", "middle"], ["無名指", "ring"], ["小指", "little"]]
      .map(([zh, en]) => ({ en, index: text.indexOf(zh) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.en);
    if (fingers.length) {
      return { text: `${side ? `${side} ` : ""}${joinEnglish(fingers)} ${fingers.length > 1 ? "fingers" : "finger"}`, fingerCount: fingers.length };
    }
    const locations = [["左手腕", "left wrist"], ["右手腕", "right wrist"], ["左手", "left hand"], ["右手", "right hand"], ["左耳", "left ear"], ["右耳", "right ear"], ["耳垂", "earlobe"], ["左鎖骨", "left collarbone"], ["右鎖骨", "right collarbone"], ["鎖骨", "collarbone"], ["頸部", "neck"], ["脖子", "neck"], ["臉", "face"], ["鼻樑", "bridge of the nose"]];
    const found = locations.find(([zh]) => text.includes(zh));
    return { text: found?.[1] || "", fingerCount: 0 };
  }

  function naturalFixturePrompt(fixture) {
    const name = String(fixture.name || "").trim();
    const slot = String(fixture.bodySlot || "").trim();
    const explicit = String(fixture.promptText || "").trim();
    const legacyMixed = containsChinese(explicit) && /\bon\b/i.test(explicit);
    if (explicit && explicit !== name && !legacyMixed) return explicit;
    if (!slot) return explicit || name;
    const englishName = translateAccessoryName(name);
    const englishSlot = translateBodySlot(slot);
    if (englishName && englishSlot.text) {
      const outputName = englishSlot.fingerCount > 1 && /\bring$/i.test(englishName)
        ? englishName.replace(/\bring$/i, "rings")
        : englishName;
      return `${outputName} on the ${englishSlot.text}`;
    }
    if (!containsChinese(name) && !containsChinese(slot)) return `${name} on ${slot}`;
    return `${name}：${slot}`;
  }

  function parseFixtureLines(text) {
    return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(/[|｜]/).map((part) => part.trim());
      if (parts.length > 1) {
        return { id: uid("fixture"), name: parts[0] || "未命名配件", promptText: parts[1] || "", bodySlot: parts[2] || "", type: "other" };
      }
      const match = line.match(/^(.+?)(?:佩戴於|戴在|位於|在)(.+)$/) || line.match(/^(.+?)[：:](.+)$/);
      return { id: uid("fixture"), name: match?.[1]?.trim() || line, promptText: "", bodySlot: match?.[2]?.trim() || "", type: "other" };
    });
  }

  function addCharacterFromChineseForm(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = document.querySelector("#recipeCharacterName")?.value.trim() || "";
    const basePrompt = document.querySelector("#recipeCharacterBase")?.value.trim() || "";
    const fixtureText = document.querySelector("#recipeCharacterFixtures")?.value || "";
    if (!name || !basePrompt) {
      message = "人物名稱與人物主調都要填。";
      render();
      return;
    }
    state.characters ||= [];
    state.characters.push({ id: uid("character"), name, basePrompt, fixtures: parseFixtureLines(fixtureText), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    message = `已把 ${name} 收進人物酒櫃。`;
    saveState();
    render();
  }

  function renderTabs() {
    const counts = state.fragments.reduce((result, fragment) => {
      result[fragment.category] = (result[fragment.category] || 0) + 1;
      return result;
    }, {});
    return `<div class="ingredient-tabs" aria-label="材料分類篩選">${FILTERS.map(([value, label]) => {
      const count = value === "all" ? state.fragments.length : (counts[value] || 0);
      return `<button class="ingredient-tab ${state.activeIngredientFilter === value ? "active" : ""}" data-ingredient-filter="${value}">${label}<span>${count}</span></button>`;
    }).join("")}</div>`;
  }

  function applyFilter() {
    document.querySelectorAll("[data-fragment-card]").forEach((card) => {
      const category = card.querySelector("[data-fragment-category]")?.value || "unclassified";
      card.hidden = state.activeIngredientFilter !== "all" && category !== state.activeIngredientFilter;
    });
  }

  function afterRender() {
    const toolbar = document.querySelector(".recipe-toolbar");
    if (toolbar && !document.querySelector(".ingredient-tabs")) toolbar.insertAdjacentHTML("afterend", renderTabs());
    applyFilter();

    const fixtureInput = document.querySelector("#recipeCharacterFixtures");
    if (fixtureInput) {
      fixtureInput.placeholder = "戒指在左手中指、食指\n金絲眼鏡 | thin gold-rimmed glasses | face";
      const hint = fixtureInput.parentElement?.querySelector(".hint");
      if (hint) hint.textContent = "可直接用中文寫「戒指在左手中指、食指」；也可用：顯示名稱｜寫進胖譜的文字｜位置。";
    }

    document.querySelector("#addRecipeCharacter")?.addEventListener("click", addCharacterFromChineseForm, { capture: true });
    document.querySelectorAll("[data-ingredient-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeIngredientFilter = button.dataset.ingredientFilter;
        saveState();
        render();
      });
    });

    document.querySelectorAll("[data-recipe-fixture-id]").forEach((input) => {
      const fixtureId = input.dataset.recipeFixtureId;
      const slot = input.dataset.recipeFixtureSlot;
      const characterId = state.characterAssignments?.[slot]?.characterId;
      const character = state.characters?.find((item) => item.id === characterId);
      const fixture = character?.fixtures?.find((item) => item.id === fixtureId);
      const smalls = input.closest("label")?.querySelectorAll("small");
      const target = smalls?.[smalls.length - 1];
      if (fixture && target) target.textContent = `${fixture.bodySlot || "未指定位置"} → ${naturalFixturePrompt(fixture)}`;
    });
  }

  configureCategories();
  ensureV2State();

  splitPrompt = function v2SplitPrompt(raw) {
    return compactStyleQuality(baseSplitPrompt(raw));
  };

  render = function v2Render() {
    ensureV2State();
    v1Render();
    afterRender();
  };

  compilePrompt = function v2CompilePrompt() {
    const restorations = [];
    (state.characters || []).forEach((character) => {
      (character.fixtures || []).forEach((fixture) => {
        restorations.push([fixture, fixture.promptText]);
        fixture.promptText = naturalFixturePrompt(fixture);
      });
    });
    try {
      v1CompilePrompt();
    } finally {
      restorations.forEach(([fixture, promptText]) => { fixture.promptText = promptText; });
    }
    state.outputPrompt = String(state.outputPrompt || "").replace(/selected accessories:\s*/gi, "");
    state.outputNotes = (state.outputNotes || []).map((note) => String(note).replace(/selected accessories/gi, "配件"));
    saveState();
    render();
  };

  saveState();
  render();
})();
