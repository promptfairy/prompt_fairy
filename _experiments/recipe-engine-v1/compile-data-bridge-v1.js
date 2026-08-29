(() => {
  "use strict";

  // Compatibility bridge for the Change Set v8 compile path.
  // Change Set v8 owns the final compile when a fairy change/reference/ratio is active,
  // so restore Material Library selections and temporary additions after that compile settles.

  const CORE_KEY = "prompt-fairy-arcane-v2";
  const CHANGE_SET_KEY = "prompt-fairy-change-set-v8";
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

  function missingBridgeBlocks(output, core) {
    const blocks = [];
    const materials = selectedMaterialContents(core);
    const additions = additionLines(core);

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

    const blocks = missingBridgeBlocks(textarea.value, core);
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
