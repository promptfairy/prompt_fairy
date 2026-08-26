(() => {
  "use strict";

  // Temporary compatibility bridge for the Change Set v8 compile path.
  // The core workspace already persists selected materials and additions;
  // v8 intercepts Compose when a fairy change set / reference / ratio is active.
  // This bridge restores those existing data inputs without touching layout or CSS.

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

  function buildBridgeBlocks(core) {
    const blocks = [];
    const materials = selectedMaterialContents(core);
    const additions = additionLines(core);

    if (materials.length) blocks.push(`${MATERIAL_MARKER}\n${materials.join("\n")}`);
    if (additions.length) blocks.push(`${ADDITIONS_MARKER}\n${additions.join("\n")}`);
    return blocks.join("\n\n");
  }

  function insertBeforeIdentity(output, blocks) {
    if (!blocks) return output;
    if (output.includes(MATERIAL_MARKER) || output.includes(ADDITIONS_MARKER)) return output;

    const marker = `\n\n${IDENTITY_MARKER}`;
    const index = output.indexOf(marker);
    if (index < 0) return `${output.trim()}\n\n${blocks}`;
    return `${output.slice(0, index).trim()}\n\n${blocks}${output.slice(index)}`;
  }

  document.addEventListener("click", (event) => {
    const compileButton = event.target.closest?.('[data-action="compile"]');
    if (!compileButton) return;

    const core = read(CORE_KEY);
    const local = read(CHANGE_SET_KEY);
    if (!changeSetOwnsCompile(core, local)) return;

    const blocks = buildBridgeBlocks(core);
    if (!blocks) return;

    // Registered before change-set-v8.js. v8 completes its synchronous compile first;
    // then this microtask restores selected library materials / additions to the output.
    queueMicrotask(() => {
      const textarea = document.querySelector("#outputPrompt");
      if (!textarea?.value?.trim()) return;
      const next = insertBeforeIdentity(textarea.value, blocks);
      if (next === textarea.value) return;
      textarea.value = next;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }, true);
})();
