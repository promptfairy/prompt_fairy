(() => {
  const PATCH_VERSION = "recipe-ui-v1.2";
  const previousSplitPrompt = splitPrompt;
  const previousRender = render;
  let ingredientTabsScrollLeft = 0;

  const CATEGORY_PRIORITY = ["framing", "action", "scene", "clothing"];
  const CATEGORY_PATTERNS = {
    framing: [
      /\b(?:dramatic\s+)?low[-\s]?angle\b/i,
      /\bwide[-\s]?angle\b/i,
      /\b(?:camera\s+)?perspective\b/i,
      /\b(?:captured|shot|photographed)\s+from\b/i,
      /\bpoint\s+of\s+view\b/i,
      /\bcomposition\b/i,
      /構圖|鏡頭|視角|仰拍|俯拍|廣角/
    ],
    action: [
      /\bholds?\b/i,
      /\bholding\b/i,
      /\bcarries\b/i,
      /\bcarrying\b/i,
      /\bgrips?\b/i,
      /\btouch(?:es|ing)?\b/i,
      /\b(?:sits?|sitting|stands?|standing|walks?|walking|leans?|leaning)\b/i,
      /\b(?:cup|glass|straw|juice|drink|umbrella|book|phone|bag)\b/i,
      /拿著|手持|端著|握著|抱著|坐著|站著|走著|倚靠|互動|動作/
    ],
    scene: [
      /\bbackground\b/i,
      /\bclear\s+blue\s+sky\b/i,
      /\bsky\b/i,
      /\bclouds?\b/i,
      /\bagainst\s+(?:a\s+)?(?:clear\s+blue\s+)?sky\b/i,
      /\binside\b/i,
      /\boutdoors?\b/i,
      /\b(?:street|room|kitchen|cafe|school|garden|beach|forest|bridge|window)\b/i,
      /背景|天空|藍天|室內|戶外|街道|房間|廚房|咖啡廳|校園|花園|海邊|森林|橋|窗邊/
    ],
    clothing: [
      /\b(?:earbud|earbuds|earphone|earphones|headphone|headphones)\b/i,
      /\b(?:watch|wristwatch|ring|rings|bracelet|necklace|earrings|glasses|tattoo|jewelry)\b/i,
      /\b(?:shirt|suit|jacket|coat|dress|vest|trousers|skirt|uniform)\b/i,
      /耳機|耳塞|手錶|戒指|手鍊|項鍊|耳環|眼鏡|刺青|飾品|服裝|襯衫|西裝|外套|制服/
    ]
  };

  function scoreText(text, category) {
    return (CATEGORY_PATTERNS[category] || []).reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
  }

  function detectBetterCategory(fragment) {
    const text = String(fragment?.text || "").trim();
    if (!text) return fragment.category;
    if (["provider_instruction", "ratio", "constraints", "style_quality", "lighting"].includes(fragment.category)) {
      return fragment.category;
    }

    const scores = Object.fromEntries(CATEGORY_PRIORITY.map((category) => [category, scoreText(text, category)]));
    if (/\b(?:captured|shot|photographed)\s+from\b/i.test(text) || /\b(?:dramatic\s+)?low[-\s]?angle\b/i.test(text) || /\bwide[-\s]?angle\b/i.test(text) || /\bperspective\b/i.test(text)) {
      return "framing";
    }
    if (scores.action >= 1 && (scores.scene >= 1 || scores.framing >= 1 || fragment.category === "character")) {
      return "action";
    }
    if (scores.scene >= 1 && (fragment.category === "character" || fragment.category === "unclassified")) {
      return "scene";
    }
    if (scores.clothing >= 1 && (fragment.category === "character" || fragment.category === "unclassified")) {
      return "clothing";
    }
    return fragment.category;
  }

  splitPrompt = function splitPromptV4(text) {
    const fragments = previousSplitPrompt(text);
    return fragments.map((fragment) => ({
      ...fragment,
      category: detectBetterCategory(fragment)
    }));
  };

  function captureIngredientTabsScroll() {
    const tabs = document.querySelector(".ingredient-tabs");
    if (tabs) ingredientTabsScrollLeft = tabs.scrollLeft;
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".ingredient-tab")) captureIngredientTabsScroll();
  }, true);

  render = function renderV4() {
    captureIngredientTabsScroll();
    previousRender();
    requestAnimationFrame(() => {
      const tabs = document.querySelector(".ingredient-tabs");
      if (tabs) tabs.scrollLeft = ingredientTabsScrollLeft;
    });
  };

  window.recipeEngineV4 = { version: PATCH_VERSION };
})();
