(() => {
  const STABLE_STORAGE_KEYS = ["prompt-sprite-state-v2", "prompt-sprite-state-v1"];
  const baseRender = render;
  const baseCompilePrompt = compilePrompt;

  function ensureEnhancedState() {
    if (!Array.isArray(state.characters)) state.characters = [];
    if (!state.characterAssignments) {
      state.characterAssignments = {
        AA: { characterId: "", fixtureIds: [] },
        BB: { characterId: "", fixtureIds: [] }
      };
    }
    ["AA", "BB"].forEach((slot) => {
      const current = state.characterAssignments[slot] || {};
      state.characterAssignments[slot] = {
        characterId: String(current.characterId || ""),
        fixtureIds: Array.isArray(current.fixtureIds) ? current.fixtureIds.map(String) : []
      };
    });
  }

  function normalizeCharacter(character) {
    return {
      id: String(character.id || uid("character")),
      name: String(character.name || "未命名人物"),
      basePrompt: String(character.basePrompt || ""),
      fixtures: Array.isArray(character.fixtures)
        ? character.fixtures.map((fixture) => ({
            id: String(fixture.id || uid("fixture")),
            name: String(fixture.name || fixture.promptText || "未命名配件"),
            promptText: String(fixture.promptText || fixture.name || ""),
            bodySlot: String(fixture.bodySlot || ""),
            type: String(fixture.type || "other")
          }))
        : [],
      createdAt: character.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function parseFixtureLines(text) {
    return String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
        const name = parts[0] || line;
        const promptText = parts[1] || parts[0] || line;
        const bodySlot = parts[2] || "";
        return {
          id: uid("fixture"),
          name,
          promptText,
          bodySlot,
          type: "other"
        };
      });
  }

  function addCharacterFromForm() {
    const name = document.querySelector("#recipeCharacterName")?.value.trim() || "";
    const basePrompt = document.querySelector("#recipeCharacterBase")?.value.trim() || "";
    const fixtureText = document.querySelector("#recipeCharacterFixtures")?.value || "";
    if (!name || !basePrompt) {
      message = "人物名稱與人物主調都要填。";
      render();
      return;
    }
    state.characters.push(normalizeCharacter({
      id: uid("character"),
      name,
      basePrompt,
      fixtures: parseFixtureLines(fixtureText)
    }));
    message = `已把 ${name} 收進人物酒櫃。`;
    saveState();
    render();
  }

  function removeCharacter(id) {
    const character = state.characters.find((item) => item.id === id);
    if (!character || !confirm(`移除人物卡「${character.name}」？只影響配方引擎實驗版。`)) return;
    state.characters = state.characters.filter((item) => item.id !== id);
    ["AA", "BB"].forEach((slot) => {
      if (state.characterAssignments[slot].characterId === id) {
        state.characterAssignments[slot] = { characterId: "", fixtureIds: [] };
      }
    });
    message = `已移除 ${character.name}。`;
    saveState();
    render();
  }

  function stableCharacterToRecipe(character) {
    const appearance = character.appearance || {};
    const basePrompt = [
      appearance.hairstyle || appearance.hairColor,
      appearance.eyes,
      appearance.heightBody,
      appearance.makeup,
      appearance.glassesOrDefaultWear
    ].filter(Boolean).join(", ") || character.name || "reference image priority";

    const fixtures = (character.fixtures || [])
      .filter((fixture) => !fixture.archivedAt)
      .map((fixture) => ({
        id: uid("fixture"),
        name: fixture.name || "未命名配件",
        promptText: `${fixture.name || "accessory"}${fixture.bodySlot ? ` on ${fixture.bodySlot}` : ""}`,
        bodySlot: fixture.bodySlot || "",
        type: fixture.type || "other"
      }));

    return normalizeCharacter({
      id: `imported_${character.id || uid("character")}`,
      name: character.name || "匯入人物",
      basePrompt,
      fixtures,
      createdAt: character.createdAt
    });
  }

  function importStableCharacters() {
    let parsed = null;
    for (const key of STABLE_STORAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          parsed = JSON.parse(raw);
          break;
        }
      } catch (error) {
        console.warn("Unable to read stable character data", error);
      }
    }

    const sourceCharacters = Array.isArray(parsed?.characters)
      ? parsed.characters.filter((character) => !character.archivedAt)
      : [];

    if (!sourceCharacters.length) {
      message = "這個瀏覽器來源找不到正式版人物卡。可以在下方新增，或用同一個本機網址開啟兩個版本後再匯入。";
      render();
      return;
    }

    const existingNames = new Set(state.characters.map((character) => character.name));
    const imported = sourceCharacters
      .filter((character) => !existingNames.has(character.name))
      .map(stableCharacterToRecipe);
    state.characters.push(...imported);
    message = imported.length
      ? `已從正式版匯入 ${imported.length} 張人物卡，配件也一起帶入。`
      : "正式版人物卡都已經在人物酒櫃裡。";
    saveState();
    render();
  }

  function selectedCharacter(slot) {
    const assignment = state.characterAssignments[slot];
    return state.characters.find((character) => character.id === assignment.characterId) || null;
  }

  function setCharacter(slot, characterId) {
    const character = state.characters.find((item) => item.id === characterId);
    state.characterAssignments[slot] = {
      characterId: character?.id || "",
      fixtureIds: character ? character.fixtures.map((fixture) => fixture.id) : []
    };
    saveState();
    render();
  }

  function toggleFixture(slot, fixtureId, checked) {
    const assignment = state.characterAssignments[slot];
    const selected = new Set(assignment.fixtureIds);
    if (checked) selected.add(fixtureId);
    else selected.delete(fixtureId);
    assignment.fixtureIds = [...selected];
    saveState();
  }

  function buildCharacterText(slot, manualSupplement) {
    const assignment = state.characterAssignments[slot];
    const character = selectedCharacter(slot);
    if (!character) return String(manualSupplement || "").trim();
    const selectedFixtureIds = new Set(assignment.fixtureIds);
    const fixturePrompts = character.fixtures
      .filter((fixture) => selectedFixtureIds.has(fixture.id))
      .map((fixture) => fixture.promptText)
      .filter(Boolean);
    return [
      character.name,
      character.basePrompt,
      fixturePrompts.length ? `selected accessories: ${fixturePrompts.join(", ")}` : "",
      String(manualSupplement || "").trim()
    ].filter(Boolean).join("; ");
  }

  function renderCharacterCard(character) {
    return `
      <article class="recipe-character-card">
        <div>
          <strong>${escapeHtml(character.name)}</strong>
          <p>${escapeHtml(character.basePrompt)}</p>
        </div>
        <div class="chips">
          <span class="source-pill">${character.fixtures.length} 個配件</span>
        </div>
        ${character.fixtures.length ? `
          <div class="fixture-preview">
            ${character.fixtures.map((fixture) => `<span>${escapeHtml(fixture.name)}</span>`).join("")}
          </div>
        ` : `<span class="hint">沒有配件；人物仍可正常使用。</span>`}
        <button class="btn danger compact" data-remove-recipe-character="${character.id}">移除</button>
      </article>
    `;
  }

  function renderAssignment(slot, label) {
    const assignment = state.characterAssignments[slot];
    const character = selectedCharacter(slot);
    return `
      <div class="assignment-card stack">
        <div class="field">
          <label>${label}</label>
          <select data-recipe-character-slot="${slot}">
            <option value="">不使用人物卡（手動填）</option>
            ${state.characters.map((item) => `<option value="${item.id}" ${item.id === assignment.characterId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
        </div>
        ${character ? `
          <div>
            <strong>這杯要帶哪些配件？</strong>
            <div class="fixture-selector">
              ${character.fixtures.length ? character.fixtures.map((fixture) => `
                <label class="toggle fixture-choice">
                  <input type="checkbox" data-recipe-fixture-slot="${slot}" data-recipe-fixture-id="${fixture.id}" ${assignment.fixtureIds.includes(fixture.id) ? "checked" : ""} />
                  <span><strong>${escapeHtml(fixture.name)}</strong>${fixture.bodySlot ? `<small>${escapeHtml(fixture.bodySlot)}</small>` : ""}</span>
                </label>
              `).join("") : `<span class="hint">這張人物卡沒有配件。</span>`}
            </div>
          </div>
        ` : `<span class="hint">選人物卡後，這裡會出現可勾選的配件。</span>`}
      </div>
    `;
  }

  function renderCharacterCabinet() {
    return `
      <section class="character-cabinet stack">
        <div class="section-title">
          <div>
            <h3>人物酒櫃</h3>
            <p class="panel-subtitle">人物主調與配件分開保存；每次出杯再決定要帶哪些配件。</p>
          </div>
          <button class="btn secondary compact" id="importStableCharacters">從正式版人物卡匯入</button>
        </div>
        <details class="character-create">
          <summary>＋ 新增人物卡</summary>
          <div class="stack details-body">
            <div class="two-col">
              <div class="field"><label for="recipeCharacterName">人物名稱</label><input id="recipeCharacterName" placeholder="例如：執" /></div>
              <div class="field"><label for="recipeCharacterBase">人物主調</label><input id="recipeCharacterBase" placeholder="例如：adult East Asian man, tousled black hair, indigo eyes" /></div>
            </div>
            <div class="field">
              <label for="recipeCharacterFixtures">配件清單（每行一個）</label>
              <textarea id="recipeCharacterFixtures" placeholder="金絲眼鏡 | thin gold-rimmed glasses | face&#10;銀戒 | a silver ring | right hand"></textarea>
              <span class="hint">格式：顯示名稱｜寫進胖譜的文字｜位置。後兩欄可省略。</span>
            </div>
            <button class="btn primary" id="addRecipeCharacter">收進人物酒櫃</button>
          </div>
        </details>
        <div class="recipe-character-grid">
          ${state.characters.length ? state.characters.map(renderCharacterCard).join("") : `<div class="empty">還沒有實驗版人物卡。可以新增，或從正式版匯入。</div>`}
        </div>
        <div class="two-col assignment-grid">
          ${renderAssignment("AA", "第一主調 [AA]")}
          ${renderAssignment("BB", "第二主調 [BB]")}
        </div>
      </section>
    `;
  }

  function enhanceRenderedPage() {
    const mixer = document.querySelector(".mixer-card");
    if (!mixer || document.querySelector(".character-cabinet")) return;
    mixer.insertAdjacentHTML("afterbegin", renderCharacterCabinet());

    const aaLabel = document.querySelector('label[for="characterAA"]');
    const bbLabel = document.querySelector('label[for="characterBB"]');
    if (aaLabel) aaLabel.textContent = "[AA] 額外補充（可留空）";
    if (bbLabel) bbLabel.textContent = "[BB] 額外補充（可留空）";
    const aaInput = document.querySelector("#characterAA");
    const bbInput = document.querySelector("#characterBB");
    if (aaInput) aaInput.placeholder = "只有人物卡之外還要補充的內容才填在這裡。";
    if (bbInput) bbInput.placeholder = "只有第二位人物卡之外還要補充的內容才填在這裡。";

    const compileButton = document.querySelector("#compilePrompt");
    if (compileButton) compileButton.textContent = "本機調製新胖譜（不需 API）";

    bindEnhancementEvents();
  }

  function bindEnhancementEvents() {
    document.querySelector("#addRecipeCharacter")?.addEventListener("click", addCharacterFromForm);
    document.querySelector("#importStableCharacters")?.addEventListener("click", importStableCharacters);
    document.querySelectorAll("[data-remove-recipe-character]").forEach((button) => {
      button.addEventListener("click", () => removeCharacter(button.dataset.removeRecipeCharacter));
    });
    document.querySelectorAll("[data-recipe-character-slot]").forEach((select) => {
      select.addEventListener("change", () => setCharacter(select.dataset.recipeCharacterSlot, select.value));
    });
    document.querySelectorAll("[data-recipe-fixture-id]").forEach((input) => {
      input.addEventListener("change", () => toggleFixture(
        input.dataset.recipeFixtureSlot,
        input.dataset.recipeFixtureId,
        input.checked
      ));
    });
  }

  render = function enhancedRender() {
    ensureEnhancedState();
    baseRender();
    enhanceRenderedPage();
  };

  compilePrompt = function enhancedCompilePrompt() {
    ensureEnhancedState();
    const manualAA = state.mixer.characterAA;
    const manualBB = state.mixer.characterBB;
    const builtAA = buildCharacterText("AA", manualAA);
    const builtBB = buildCharacterText("BB", manualBB);
    state.mixer.characterAA = builtAA;
    state.mixer.characterBB = builtBB;
    baseCompilePrompt();
    state.mixer.characterAA = manualAA;
    state.mixer.characterBB = manualBB;
    if (builtAA || builtBB) {
      state.outputNotes.unshift("人物卡配件依本次勾選結果加入，未勾選的配件不會寫入胖譜。");
    }
    saveState();
    render();
  };

  ensureEnhancedState();
  saveState();
  render();
})();
