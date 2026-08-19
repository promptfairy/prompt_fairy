(() => {
  "use strict";

  const HEADER_SELECTOR = [
    ".workspace-page .page-header",
    ".library-page .page-header",
    ".settings-page .page-header"
  ].join(",");

  function ensureUtility(header) {
    let utility = header.querySelector(":scope > .page-header-utility");
    if (!utility) {
      utility = document.createElement("div");
      utility.className = "page-header-utility";
      utility.setAttribute("aria-label", "頁面工具");
      header.append(utility);
    }
    return utility;
  }

  function relocateHeader(header) {
    const copy = header.querySelector(":scope > .page-heading-copy") || header.querySelector(".page-heading-copy");
    const actions = header.querySelector(":scope > .page-header-actions") || header.querySelector(".page-header-actions");

    if (copy && actions && actions.parentElement !== copy) {
      copy.append(actions);
    }

    const utility = ensureUtility(header);
    const page = header.closest(".library-page");

    if (page) {
      const promptOrCharacterSearch = page.querySelector('[data-search="prompts"], [data-search="characters"]');
      if (promptOrCharacterSearch) {
        const toolbar = promptOrCharacterSearch.closest(".library-toolbar");
        const searchBox = promptOrCharacterSearch.closest(".search-box");

        if (searchBox && searchBox.parentElement !== utility) {
          utility.append(searchBox);
        }

        if (toolbar) {
          toolbar.classList.add("search-relocated");
          toolbar.classList.toggle("is-empty", !toolbar.querySelector(".filter-row, .search-box"));
        }
      }
    }

    utility.hidden = !utility.children.length;
  }

  function applyHeaderContract() {
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
      applyHeaderContract();
    });
  };

  const observer = new MutationObserver(scheduleApply);
  observer.observe(app, { childList: true, subtree: true });

  applyHeaderContract();
})();
