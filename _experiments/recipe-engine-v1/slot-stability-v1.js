(() => {
  "use strict";

  function slotCards() {
    return [...document.querySelectorAll(".workspace-page .v8-slot-card")];
  }

  function slotToken(card) {
    return card?.querySelector(".v8-slot-token")?.textContent?.trim() || "這個人物槽";
  }

  function refreshRemoveHints() {
    const cards = slotCards();
    cards.forEach((card, index) => {
      const button = card.querySelector("[data-v8-remove-slot]");
      if (!button) return;
      const token = slotToken(card);
      const hasLaterSlots = index < cards.length - 1;
      const label = hasLaterSlots
        ? `清空 ${token}（保留位置）`
        : `移除 ${token}`;
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }

  // Slot labels such as [AA]/[BB]/[CC] are part of the prompt contract.
  // Removing a middle slot must therefore clear its assignment instead of
  // compacting later slots forward. Only the trailing slot may disappear.
  window.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-v8-remove-slot]");
    if (!button) return;

    const cards = slotCards();
    const card = button.closest(".v8-slot-card");
    const index = cards.indexOf(card);
    if (index <= 0 || index === cards.length - 1) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const select = card.querySelector("[data-v8-character-slot]");
    if (!select) return;
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, true);

  const app = document.getElementById("app");
  if (!app) return;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshRemoveHints();
    });
  };

  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  schedule();
})();
