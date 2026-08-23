(() => {
  "use strict";

  const CORE_KEY = "prompt-fairy-arcane-v2";
  const DB_NAME = "prompt-fairy-local-images-v1";
  const STORE_NAME = "images";
  const DB_VERSION = 1;
  const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

  let dbPromise = null;
  let scheduled = false;

  function readCore() {
    try { return JSON.parse(localStorage.getItem(CORE_KEY) || "{}") || {}; }
    catch { return {}; }
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error("這個瀏覽器不支援本機圖片資料庫。"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("kind", "kind", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("無法開啟本機圖片資料庫。"));
    });
    return dbPromise;
  }

  async function requestStore(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      let request;
      try { request = action(store); }
      catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || request?.error || new Error("本機圖片資料庫操作失敗。"));
      tx.onabort = () => reject(tx.error || new Error("本機圖片資料庫操作被中止。"));
    });
  }

  const imageKey = (kind, id) => `${kind}:${id}`;
  const getImage = (kind, id) => requestStore("readonly", (store) => store.get(imageKey(kind, id)));
  const getAllImages = () => requestStore("readonly", (store) => store.getAll());
  const deleteImage = (kind, id) => requestStore("readwrite", (store) => store.delete(imageKey(kind, id)));

  function putImage(kind, id, file) {
    const record = {
      key: imageKey(kind, id),
      kind,
      entityId: id,
      blob: file,
      name: String(file.name || "image"),
      type: String(file.type || "application/octet-stream"),
      size: Number(file.size || 0),
      updatedAt: new Date().toISOString(),
    };
    return requestStore("readwrite", (store) => store.put(record));
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
    return `${(value / 1024 ** 3).toFixed(2)} GB`;
  }

  function entityFromCard(card) {
    if (card.matches(".prompt-card")) {
      const id = card.querySelector('[data-action="edit-prompt"][data-id]')?.dataset.id;
      return id ? { kind: "prompt", id } : null;
    }
    if (card.matches(".character-card")) {
      const id = card.querySelector('[data-action="edit-character"][data-id]')?.dataset.id;
      return id ? { kind: "character", id } : null;
    }
    return null;
  }

  function mediaLabel(kind) {
    return kind === "character" ? "人物預覽" : "成品預覽";
  }

  function entityTitle(kind, id) {
    const core = readCore();
    if (kind === "character") return (core.characters || []).find((item) => item.id === id)?.name || "人物預覽";
    return (core.promptEntries || []).find((item) => item.id === id)?.title || "成品預覽";
  }

  function ensureImageInput(card, entity) {
    let input = card.querySelector(`:scope > input[data-local-image-input="${imageKey(entity.kind, entity.id)}"]`);
    if (input) return input;
    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    input.dataset.localImageInput = imageKey(entity.kind, entity.id);
    card.append(input);
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!String(file.type || "").startsWith("image/")) {
        alert("請選擇圖片檔。");
        event.target.value = "";
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        alert(`這張圖片是 ${formatBytes(file.size)}。為避免本機容量被單張圖片吃掉太多，目前單張上限為 ${formatBytes(MAX_IMAGE_BYTES)}。`);
        event.target.value = "";
        return;
      }
      try {
        await putImage(entity.kind, entity.id, file);
        event.target.value = "";
        closeLightbox();
        card.dataset.localImageReady = "";
        await decorateCard(card, true);
        await refreshStorageUi();
      } catch (error) {
        console.error(error);
        alert("圖片沒有存成功；可能是瀏覽器的本機儲存空間不足。");
      }
    });
    return input;
  }

  function closeLightbox() {
    const lightbox = document.querySelector("[data-local-image-lightbox]");
    if (!lightbox) return;
    const url = lightbox.dataset.objectUrl;
    if (url) URL.revokeObjectURL(url);
    lightbox.remove();
    document.documentElement.classList.remove("local-image-lightbox-open");
  }

  function openLightbox(card, entity, record) {
    closeLightbox();
    const url = URL.createObjectURL(record.blob);
    const lightbox = document.createElement("div");
    lightbox.className = "local-image-lightbox";
    lightbox.dataset.localImageLightbox = "true";
    lightbox.dataset.objectUrl = url;
    lightbox.innerHTML = `
      <div class="local-image-lightbox-card" role="dialog" aria-modal="true" aria-label="${mediaLabel(entity.kind)}完整圖片">
        <div class="local-image-lightbox-head">
          <div><small>${mediaLabel(entity.kind)}</small><strong></strong></div>
          <button type="button" class="local-image-lightbox-close" aria-label="關閉">×</button>
        </div>
        <div class="local-image-lightbox-stage"><img alt="${mediaLabel(entity.kind)}完整圖片" /></div>
        <div class="local-image-lightbox-foot">
          <span>${formatBytes(record.size)}</span>
          <div>
            <button type="button" class="btn ghost compact" data-local-image-replace>更換圖片</button>
            <button type="button" class="btn ghost compact danger-text" data-local-image-delete>移除圖片</button>
          </div>
        </div>
      </div>
    `;
    lightbox.querySelector(".local-image-lightbox-head strong").textContent = entityTitle(entity.kind, entity.id);
    lightbox.querySelector("img").src = url;
    lightbox.querySelector(".local-image-lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.querySelector("[data-local-image-replace]").addEventListener("click", () => {
      const input = ensureImageInput(card, entity);
      closeLightbox();
      input.click();
    });
    lightbox.querySelector("[data-local-image-delete]").addEventListener("click", async () => {
      if (!confirm("移除這張本機圖片？胖譜／人設本身不會被刪除。")) return;
      await deleteImage(entity.kind, entity.id);
      closeLightbox();
      card.dataset.localImageReady = "";
      await decorateCard(card, true);
      await refreshStorageUi();
    });
    document.body.append(lightbox);
    document.documentElement.classList.add("local-image-lightbox-open");
  }

  function buildPromptEmpty(entity, input) {
    const shell = document.createElement("div");
    shell.className = "local-image-media local-image-media-prompt is-empty";
    shell.dataset.localImageMedia = imageKey(entity.kind, entity.id);
    shell.innerHTML = `
      <div class="local-image-empty-copy">
        <span aria-hidden="true">▧</span>
        <strong>成品預覽</strong>
        <small>放一張生成結果，之後一眼就知道這份胖譜長什麼樣。</small>
      </div>
      <button type="button" class="btn ghost compact local-image-pick">＋ 加入圖片</button>
    `;
    shell.querySelector(".local-image-pick").addEventListener("click", () => input.click());
    return shell;
  }

  function buildPromptFilled(card, entity, record, input) {
    const shell = document.createElement("div");
    shell.className = "local-image-media local-image-media-prompt has-image";
    shell.dataset.localImageMedia = imageKey(entity.kind, entity.id);
    const url = URL.createObjectURL(record.blob);
    shell.innerHTML = `
      <button type="button" class="local-image-preview-button" aria-label="開啟完整成品圖"><img alt="成品預覽" /></button>
      <div class="local-image-overlay">
        <span>${formatBytes(record.size)}</span>
        <div>
          <button type="button" class="local-image-text-button local-image-pick">更換</button>
          <button type="button" class="local-image-text-button danger local-image-remove">移除</button>
        </div>
      </div>
    `;
    const img = shell.querySelector("img");
    img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    img.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
    img.src = url;
    shell.querySelector(".local-image-preview-button").addEventListener("click", () => openLightbox(card, entity, record));
    shell.querySelector(".local-image-pick").addEventListener("click", () => input.click());
    shell.querySelector(".local-image-remove").addEventListener("click", async () => {
      if (!confirm("移除這張本機圖片？胖譜本身不會被刪除。")) return;
      await deleteImage(entity.kind, entity.id);
      card.dataset.localImageReady = "";
      await decorateCard(card, true);
      await refreshStorageUi();
    });
    return shell;
  }

  function decorateCharacterAvatar(card, entity, record, input) {
    card.querySelector(":scope > [data-local-image-media]")?.remove();
    const monogram = card.querySelector(":scope > .character-heading .monogram");
    if (!monogram) return;
    const name = entityTitle("character", entity.id);
    const fallback = name.trim().slice(0, 1).toUpperCase() || "✦";
    monogram.classList.add("local-character-avatar");
    monogram.dataset.localCharacterAvatar = imageKey(entity.kind, entity.id);
    monogram.replaceChildren();

    if (!record) {
      monogram.classList.add("is-empty");
      const letter = document.createElement("span");
      letter.className = "local-character-avatar-letter";
      letter.textContent = fallback;
      const plus = document.createElement("span");
      plus.className = "local-character-avatar-plus";
      plus.textContent = "+";
      monogram.append(letter, plus);
      monogram.setAttribute("role", "button");
      monogram.setAttribute("tabindex", "0");
      monogram.setAttribute("aria-label", `替 ${name} 加入人物預覽圖`);
      const pick = () => input.click();
      monogram.addEventListener("click", pick);
      monogram.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(); }
      });
      return;
    }

    monogram.classList.remove("is-empty");
    monogram.setAttribute("role", "button");
    monogram.setAttribute("tabindex", "0");
    monogram.setAttribute("aria-label", `開啟 ${name} 的完整人物圖`);
    const url = URL.createObjectURL(record.blob);
    const img = document.createElement("img");
    img.alt = `${name} 人物預覽`;
    img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    img.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
    img.src = url;
    monogram.append(img);
    const open = () => openLightbox(card, entity, record);
    monogram.addEventListener("click", open);
    monogram.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
    });
  }

  async function decorateCard(card, force = false) {
    const entity = entityFromCard(card);
    if (!entity) return;
    const key = imageKey(entity.kind, entity.id);
    if (!force && card.dataset.localImageReady === key) return;
    card.dataset.localImageReady = key;

    try {
      const record = await getImage(entity.kind, entity.id);
      if (!card.isConnected || entityFromCard(card)?.id !== entity.id) return;
      const input = ensureImageInput(card, entity);

      if (entity.kind === "character") {
        decorateCharacterAvatar(card, entity, record, input);
        return;
      }

      card.querySelector(":scope > [data-local-image-media]")?.remove();
      const media = record
        ? buildPromptFilled(card, entity, record, input)
        : buildPromptEmpty(entity, input);
      const anchor = card.querySelector(":scope > .card-topline");
      anchor?.insertAdjacentElement("afterend", media);
    } catch (error) {
      console.error("Prompt Fairy local image decoration failed", error);
    }
  }

  function ensureLibraryNotice() {
    document.querySelectorAll('.library-page [data-collection="prompts"], .library-page [data-collection="characters"]').forEach((collection) => {
      const page = collection.closest(".library-page");
      if (!page || page.querySelector("[data-local-image-note]")) return;
      const note = document.createElement("div");
      note.className = "local-image-storage-note";
      note.dataset.localImageNote = "true";
      note.innerHTML = `
        <strong>圖片只存在這台裝置</strong>
        <span>預覽圖會佔用瀏覽器的本機儲存空間；清除這個網站的資料時，圖片也會一起消失。目前 JSON 備份不包含圖片。</span>
      `;
      collection.insertAdjacentElement("beforebegin", note);
    });
  }

  async function refreshStorageUi() {
    let records = [];
    try { records = await getAllImages(); }
    catch { return; }
    const totalBytes = records.reduce((sum, record) => sum + Number(record.size || record.blob?.size || 0), 0);
    const summary = `本機圖片：${records.length} 張 · ${formatBytes(totalBytes)}`;

    document.querySelectorAll("[data-local-image-usage]").forEach((node) => { node.textContent = summary; });

    const settings = document.querySelector(".settings-page");
    if (!settings) return;
    const cards = [...settings.querySelectorAll(".settings-card")];
    const storageCard = cards.find((card) => card.querySelector("h2")?.textContent?.trim() === "目前館藏");
    if (storageCard && !storageCard.querySelector("[data-local-image-usage]")) {
      const p = document.createElement("p");
      p.className = "muted local-image-settings-usage";
      p.dataset.localImageUsage = "true";
      p.textContent = summary;
      storageCard.append(p);
    }
    const backupCard = cards.find((card) => card.querySelector("h2")?.textContent?.trim() === "匯出與匯入");
    if (backupCard && !backupCard.querySelector("[data-local-image-backup-note]")) {
      const p = document.createElement("p");
      p.className = "local-image-backup-note";
      p.dataset.localImageBackupNote = "true";
      p.textContent = "本機預覽圖目前獨立存放在瀏覽器圖片資料庫，不會塞進 JSON 備份。";
      backupCard.append(p);
    }
  }

  async function pruneOrphans() {
    const core = readCore();
    const valid = new Set([
      ...(core.promptEntries || []).map((item) => imageKey("prompt", item.id)),
      ...(core.characters || []).map((item) => imageKey("character", item.id)),
    ]);
    let records = [];
    try { records = await getAllImages(); }
    catch { return; }
    const orphaned = records.filter((record) => !valid.has(record.key));
    if (!orphaned.length) return;
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      orphaned.forEach((record) => store.delete(record.key));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function apply() {
    ensureLibraryNotice();
    const cards = document.querySelectorAll(".library-page .prompt-card, .library-page .character-card");
    await Promise.all([...cards].map((card) => decorateCard(card)));
    await refreshStorageUi();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(async () => {
      scheduled = false;
      await apply();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.querySelector("[data-local-image-lightbox]")) closeLightbox();
  });

  const app = document.getElementById("app");
  if (!app) return;
  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("pagehide", () => { closeLightbox(); dbPromise = null; });
  setTimeout(() => pruneOrphans().then(schedule).catch(() => {}), 250);
  schedule();
})();
