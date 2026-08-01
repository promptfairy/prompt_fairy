(() => {
  const baseRender = render;

  function unifyWorkspaceShell() {
    const shell = document.querySelector(".workspace-shell");
    if (!shell) return;

    shell.dataset.view = "workspace";

    const hero = shell.querySelector(":scope > .hero");
    if (!hero || hero.dataset.unifiedHeader === "true") return;

    hero.dataset.unifiedHeader = "true";
    hero.className = "hero library-header workspace-page-header";
    hero.innerHTML = `
      <div>
        <span class="eyebrow">WORKSPACE</span>
        <h1>調製台</h1>
        <p>將原始胖譜拆成材料，再調整、置換與輸出。</p>
      </div>
      <div class="badge">RECIPE ENGINE · v1.3</div>
    `;
  }

  render = function unifiedWorkspaceRender() {
    baseRender();
    unifyWorkspaceShell();
  };

  unifyWorkspaceShell();
})();
