(() => {
  const v2Render = render;
  const v2CompilePrompt = compilePrompt;
  const TYPE_PROMPTS = {
    ring: "ring",
    glasses: "glasses",
    earring: "earrings",
    necklace: "necklace",
    bracelet: "bracelet",
    watch: "wristwatch",
    tattoo: "tattoo",
    mole: "mole",
    tear_mole: "tear mole",
    scar: "scar"
  };

  function joinEnglish(items) {
    if (items.length < 2) return items[0] || "";
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function typedFixturePrompt(fixture) {
    const accessory = TYPE_PROMPTS[fixture.type];
    if (!accessory) return "";
    const location = `${fixture.name || ""} ${fixture.bodySlot || ""}`;
    const side = location.includes("左") ? "left" : location.includes("右") ? "right" : "";
    const fingers = [["拇指", "thumb"], ["食指", "index"], ["中指", "middle"], ["無名指", "ring"], ["小指", "little"]]
      .map(([zh, en]) => ({ en, index: location.indexOf(zh) }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.en);
    if (fingers.length) {
      const noun = accessory === "ring" && fingers.length > 1 ? "rings" : accessory;
      return `${noun} on the ${side ? `${side} ` : ""}${joinEnglish(fingers)} ${fingers.length > 1 ? "fingers" : "finger"}`;
    }
    const locations = [["左手腕", "left wrist"], ["右手腕", "right wrist"], ["左手", "left hand"], ["右手", "right hand"], ["左耳", "left ear"], ["右耳", "right ear"], ["耳垂", "earlobe"], ["左鎖骨", "left collarbone"], ["右鎖骨", "right collarbone"], ["鎖骨", "collarbone"], ["頸部", "neck"], ["脖子", "neck"], ["臉", "face"]];
    const found = locations.find(([zh]) => location.includes(zh));
    return found ? `${accessory} on the ${found[1]}` : "";
  }

  function updateTypedFixturePreviews() {
    document.querySelectorAll("[data-recipe-fixture-id]").forEach((input) => {
      const slot = input.dataset.recipeFixtureSlot;
      const characterId = state.characterAssignments?.[slot]?.characterId;
      const character = state.characters?.find((item) => item.id === characterId);
      const fixture = character?.fixtures?.find((item) => item.id === input.dataset.recipeFixtureId);
      const output = fixture ? typedFixturePrompt(fixture) : "";
      if (!output) return;
      const smalls = input.closest("label")?.querySelectorAll("small");
      const target = smalls?.[smalls.length - 1];
      if (target) target.textContent = `${fixture.bodySlot || fixture.name || "未指定位置"} → ${output}`;
    });
  }

  render = function v3Render() {
    v2Render();
    updateTypedFixturePreviews();
  };

  compilePrompt = function v3CompilePrompt() {
    const restorations = [];
    (state.characters || []).forEach((character) => {
      (character.fixtures || []).forEach((fixture) => {
        const output = typedFixturePrompt(fixture);
        if (!output) return;
        restorations.push([fixture, fixture.promptText]);
        fixture.promptText = output;
      });
    });
    try {
      v2CompilePrompt();
    } finally {
      restorations.forEach(([fixture, promptText]) => { fixture.promptText = promptText; });
    }
    saveState();
    render();
  };

  render();
})();
