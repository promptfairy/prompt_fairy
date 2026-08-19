(() => {
  "use strict";

  const HEADER_SELECTOR = [
    ".workspace-page .page-header",
    ".library-page .page-header",
    ".settings-page .page-header"
  ].join(",");

  function ensureSlot(header, className, label) {
    let slot = header.querySelector(`:scope > .${className}`);
    if (!slot) {
      slot = document.createElement("div");
      slot.className = className;
      slot.setAttribute("aria-label", label);
      header.append(slot);
    }
    return slot;
  }

  function relocateHeader(header) {
    const page = header.closest(".workspace-page, .library-page, .settings-page");
    if (!page) return;

    const searchSlot = ensureSlot(header, "page-header-search", "頁面搜尋");
    const tagsSlot = ensureSlot(header, "page-header-tags", "頁面篩選");

    const toolbar = page.querySelector(".library-toolbar");
    if (toolbar) {
      const searchBox = toolbar.querySelector(".search-box");
      const filterRow = toolbar.querySelector(".filter-row");

      if (searchBox && searchBox.parentElement !== searchSlot) {
        searchSlot.append(searchBox);
      }

      if (filterRow && filterRow.parentElement !== tagsSlot) {
        tagsSlot.append(filterRow);
      }

      toolbar.classList.add("header-relocated");
      toolbar.setAttribute("aria-hidden", "true");
    }

    /* Cleanup from the previous v7 experiment if a cached DOM ever survives
       a hot reload. v8 owns the two fixed slots above. */
    const legacyUtility = header.querySelector(":scope > .page-header-utility");
    if (legacyUtility) {
      const legacySearch = legacyUtility.querySelector(".search-box");
      if (legacySearch) searchSlot.append(legacySearch);
      if (!legacyUtility.children.length) legacyUtility.remove();
    }
  }

  function applyHeaderFrame() {
    document.querySelectorAll(HEADER_SELECTOR).forEach(relocateHeader);
  }

  const app = document.getElementById("app");
  if (!app) return;

  let scheduled = false;
  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyHeaderFrame();
    });
  };

  new MutationObserver(scheduleApply).observe(app, { childList: true, subtree: true });
  applyHeaderFrame();
})();
