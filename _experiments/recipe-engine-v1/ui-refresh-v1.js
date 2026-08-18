(() => {
  "use strict";

  const THEME_KEY = "prompt-fairy-theme-v1";
  const DARK = "arcane";
  const LIGHT = "mojito";
  const SECOND_PERSON_COPY_SELECTORS = [
    ".hero-copy > p",
    ".privacy-card h2",
    ".privacy-card > p",
    ".compose-panel .step-title p"
  ];

  function readTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === LIGHT ? LIGHT : DARK;
  }

  function applyTheme(theme, { persist = false } = {}) {
    const next = theme === LIGHT ? LIGHT : DARK;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === LIGHT ? "light" : "dark";

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === LIGHT ? "#f0f8f5" : "#090e18");

    const button = document.querySelector("[data-theme-toggle]");
    if (button) {
      const isLight = next === LIGHT;
      button.textContent = isLight ? "☾" : "☼";
      button.setAttribute("aria-label", isLight ? "切換至 Arcane 深色主題" : "切換至 Mojito 淺色主題");
      button.setAttribute("title", isLight ? "Arcane Dark" : "Mojito Light");
      button.dataset.themeValue = next;
    }

    if (persist) localStorage.setItem(THEME_KEY, next);
  }

  function ensureProductActions() {
    const bar = document.querySelector(".product-bar");
    const localStatus = bar?.querySelector(":scope > .local-status");
    if (!bar || !localStatus) return;

    let actions = bar.querySelector(":scope > .product-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "product-actions";
      localStatus.replaceWith(actions);
      actions.append(localStatus);
    }

    if (!actions.querySelector("[data-theme-toggle]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-toggle";
      button.dataset.themeToggle = "true";
      button.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === LIGHT ? DARK : LIGHT;
        applyTheme(next, { persist: true });
      });
      actions.prepend(button);
    }

    applyTheme(document.documentElement.dataset.theme || readTheme());
  }

  function ensureCredits() {
    const settingsGrid = document.querySelector(".settings-page .settings-grid");
    if (!settingsGrid || settingsGrid.querySelector("[data-pf-credits]")) return;

    const article = document.createElement("article");
    article.className = "panel settings-card credits-card";
    article.dataset.pfCredits = "true";
    article.innerHTML = `
      <span class="card-kicker">CREDITS</span>
      <h2>一起把小精靈養大的人</h2>
      <p class="credit-names">蕎依、琰 &amp; 執</p>
      <p>Prompt Fairy 從需求、第一版原型，到後續介面與調製流程，都是一起長出來的。Threads 只在你主動點擊時才會開啟外部頁面。</p>
      <div class="credit-links" aria-label="製作者與 Threads">
        <a class="credit-link" href="https://www.threads.com/@ciaooyi0423" target="_blank" rel="noopener noreferrer">
          <span>蕎依</span><small>@ciaooyi0423 ↗</small>
        </a>
        <a class="credit-link" href="https://www.threads.com/@yenyenyamino" target="_blank" rel="noopener noreferrer">
          <span>琰</span><small>@yenyenyamino ↗</small>
        </a>
        <span class="credit-name-static"><span>執</span></span>
      </div>
    `;

    settingsGrid.append(article);
  }

  function standardizeSecondPersonCopy() {
    SECOND_PERSON_COPY_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (element.textContent.includes("妳")) {
          element.textContent = element.textContent.replaceAll("妳", "你");
        }
      });
    });
  }

  function syncEnhancements() {
    ensureProductActions();
    ensureCredits();
    standardizeSecondPersonCopy();
  }

  function updateFairyLight(event) {
    document.documentElement.style.setProperty("--fairy-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--fairy-y", `${event.clientY}px`);
  }

  applyTheme(readTheme());
  syncEnhancements();

  const observer = new MutationObserver(() => syncEnhancements());
  const app = document.querySelector("#app");
  if (app) observer.observe(app, { childList: true, subtree: true });

  window.addEventListener("hashchange", () => requestAnimationFrame(syncEnhancements));
  window.addEventListener("pointermove", updateFairyLight, { passive: true });
})();