(() => {
  "use strict";

  // Compatibility bridge for the Change Set v8 compile path.
  // Change Set v8 owns the final compile when a fairy change/reference/ratio is active,
  // so restore selected Character Library cards, Material Library selections and temporary additions
  // after that compile settles.

  const CORE_KEY = "prompt-fairy-arcane-v2";
  const CHANGE_SET_KEY = "prompt-fairy-change-set-v8";
  const CHARACTER_MARKER = "[FAIRY CHARACTER CARDS — explicitly selected]";
  const MATERIAL_MARKER = "[FAIRY MATERIALS — explicitly selected]";
  const ADDITIONS_MARKER = "[EXTRA TOUCHES — explicitly added]";
  const IDENTITY_MARKER = "[IDENTITY PATCH]";

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch { return {}; }
  }

  function hasActiveReference(core, local) {
    const characterIds = new Set((core?.characters || []).map((item) => String(item.id || "")));
    return (Array.isArray(local?.slots) ? local.slots : []).some((slot) => slot?.ref && characterIds.has(String(slot.characterId || "")));
  }

  function changeSetOwnsCompile(core, local) {
    const selected = Array.isArray(local?.selected) ? local.selected : [];
    const replacements = local?.replacements || {};
    const hasReplacement = selected.some((id) => String(replacements[id] || "").trim());
    const ratio = String(core?.workspace?.ratio || "").trim();
    return Boolean(selected.length || hasReplacement || hasActiveReference(core, local) || ratio);
  }

  function slotToken(index) {
    const code = 65 + Math.max(0, Math.min(25, index));
    const letter = String.fromCharCode(code);
    return `${letter}${letter}`;
  }

  function fixturePrompt(fixture) {
    const explicit = String(fixture?.promptText || "").trim();
    if (explicit && explicit !== fixture?.name) return explicit;
    if (!fixture?.bodySlot) return explicit || String(fixture?.name || "").trim();
    return `${explicit || fixture?.name || ""} on ${fixture.bodySlot}`.trim();
  }

  function selectedCharacterLines(core, local) {
    const byId = new Map((core?.characters || []).map((character) => [String(character.id || ""), character]));
    const localSlots = Array.isArray(local?.slots) ? local.slots : [];
    const coreAssignments = core?.workspace?.assignments || {};
    const slots = localSlots.length
      ? localSlots
      : Object.keys(coreAssignments).sort().map((token) => ({ ...coreAssignments[token], token }));

    return slots.map((slot, index) => {
      const character = byId.get(String(slot?.characterId || ""));
      if (!character) return "";
      const selectedFixtures = new Set(Array.isArray(slot?.fixtureIds) ? slot.fixtureIds.map(String) : []);
      const fixtures = (Array.isArray(character.fixtures) ? character.fixtures : [])
        .filter((fixture) => selectedFixtures.has(String(fixture.id || "")))
        .map(fixturePrompt)
        .filter(Boolean);
      const payload = [String(character.basePrompt || "").trim(), ...fixtures].filter(Boolean).join("; ");
      if (!payload) return "";
      const token = String(slot?.token || slotToken(index));
      const name = String(character.name || "").trim();
      return `[${token}]${name ? ` ${name}:` : ""} ${payload}`.trim();
    }).filter(Boolean);
  }

  function selectedMaterialContents(core) {
    const ids = Array.isArray(core?.workspace?.selectedMaterialIds) ? core.workspace.selectedMaterialIds : [];
    const byId = new Map((core?.materials || []).map((material) => [String(material.id || ""), material]));
    return ids
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((material) => String(material.content || "").trim())
      .filter(Boolean);
  }

  function additionLines(core) {
    return String(core?.workspace?.additions || "")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function missingBridgeBlocks(output, core, local) {
    const blocks = [];
    const characters = selectedCharacterLines(core, local);
    const materials = selectedMaterialContents(core);
    const additions = additionLines(core);

    if (characters.length && !output.includes(CHARACTER_MARKER)) {
      blocks.push(`${CHARACTER_MARKER}\nSelected character cards override conflicting source character identity and appearance. Keep source pose, expression, movement, wardrobe, background, camera language and filter unless those categories were explicitly replaced elsewhere.\n${characters.join("\n")}`);
    }
    if (materials.length && !output.includes(MATERIAL_MARKER)) {
      blocks.push(`${MATERIAL_MARKER}\n${materials.join("\n")}`);
    }
    if (additions.length && !output.includes(ADDITIONS_MARKER)) {
      blocks.push(`${ADDITIONS_MARKER}\n${additions.join("\n")}`);
    }
    return blocks.join("\n\n");
  }

  function insertBeforeIdentity(output, blocks) {
    if (!blocks) return output;
    const marker = `\n\n${IDENTITY_MARKER}`;
    const index = output.indexOf(marker);
    if (index < 0) return `${output.trim()}\n\n${blocks}`;
    return `${output.slice(0, index).trim()}\n\n${blocks}${output.slice(index)}`;
  }

  function reconcileCompileOutput() {
    const core = read(CORE_KEY);
    const local = read(CHANGE_SET_KEY);
    if (!changeSetOwnsCompile(core, local)) return;

    const textarea = document.querySelector("#outputPrompt");
    if (!textarea?.value?.trim()) return;

    const blocks = missingBridgeBlocks(textarea.value, core, local);
    if (!blocks) return;

    const next = insertBeforeIdentity(textarea.value, blocks);
    if (next === textarea.value) return;
    textarea.value = next;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  document.addEventListener("click", (event) => {
    const compileButton = event.target.closest?.('[data-action="compile"]');
    if (!compileButton) return;

    // Change Set v8 compiles synchronously and may immediately rebuild parts of the workspace.
    // Re-read persisted state on the next task so the bridge uses the final UI state/output,
    // rather than a click-time snapshot that can become stale during the compile event.
    setTimeout(reconcileCompileOutput, 0);
  }, true);
})();
