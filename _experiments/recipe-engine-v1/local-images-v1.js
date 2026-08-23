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

  function buildEmptyMedia(kind, id) {
    const shell = document.createElement("div");
    shell.className = `local-image-media local-image-media-${kind} is-empty`;
    shell.dataset.localImageMedia = imageKey(kind, id);
    shell.innerHTML = `
      <div class="local-image-empty-copy">
        <span aria-hidden="true">▧</span>
        <strong>${mediaLabel(kind)}</strong>
        <small>${kind === "character" ? "放一張角色圖，整理時更快認人。" : "放一張生成結果，之後一眼就知道這份胖譜長什麼樣。"}</small>
      </div>
      <button type="button" class="btn ghost compact local-image-pick">＋ 加入圖片</button>
      <input class="local-image-input" type="file" accept="image/*" hidden />
    `;
    return shell;
  }

  function buildFilledMedia(kind, id, record) {
    const shell = document.createElement("div");
    shell.className = `local-image-media local-image-media-${kind} has-image`;
    shell.dataset.localImageMedia = imageKey(kind, id);
    const url = URL.createObjectURL(record.blob);
    shell.innerHTML = `
      <img alt="${mediaLabel(kind)}" />
      <div class="local-image-overlay">
        <span>${formatBytes(record.size)}</span>
        <div>
          <button type="button" class="local-image-text-button local-image-pick">更換</button>
          <button type="button" class="local-image-text-button danger local-image-remove">移除</button>
        </div>
      </div>
      <input class="local-image-input" type="file" accept="image/*" hidden />
    `;
    const img = shell.querySelector("img");
    img.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
    img.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
    img.src = url;
    return shell;
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
      card.querySelector(":scope > [data-local-image-media]")?.remove();
      const media = record ? buildFilledMedia(entity.kind, entity.id, record) : buildEmptyMedia(entity.kind, entity.id);
      const anchor = entity.kind === "character"
        ? card.querySelector(":scope > .character-heading")
        : card.querySelector(":scope > .card-topline");
      anchor?.insertAdjacentElement("afterend", media);

      media.querySelector(".local-image-pick")?.addEventListener("click", () => {
        media.querySelector(".local-image-input")?.click();
      });
      media.querySelector(".local-image-input")?.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!String(file.type || "").startsWith("image/")) {
          alert("請選擇圖片檔。 ");
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
          await decorateCard(card, true);
          await refreshStorageUi();
        } catch (error) {
          console.error(error);
          alert("圖片沒有存成功；可能是瀏覽器的本機儲存空間不足。 ");
        }
      });
      media.querySelector(".local-image-remove")?.addEventListener("click", async () => {
        if (!confirm("移除這張本機圖片？胖譜／人設本身不會被刪除。")) return;
        await deleteImage(entity.kind, entity.id);
        await decorateCard(card, true);
        await refreshStorageUi();
      });
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
      const toolbar = page.querySelector(".library-toolbar");
      toolbar?.insertAdjacentElement("afterend", note);
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

  const app = document.getElementById("app");
  if (!app) return;
  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  window.addEventListener("hashchange", schedule);
  window.addEventListener("pagehide", () => { dbPromise = null; });
  setTimeout(() => pruneOrphans().then(schedule).catch(() => {}), 250);
  schedule();
})();
