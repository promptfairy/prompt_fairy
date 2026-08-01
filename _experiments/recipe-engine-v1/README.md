# Prompt Fairy 統一工作台 v2

這個目錄現在同時包含統一產品外殼、配方引擎、胖譜庫、人物設定庫、材料庫與本機資料管理。舊版 `app.js` 與 enhancement 檔仍保留供回溯，但入口只載入 `arcane-workbench.js` 與 `arcane-workbench.css`。

## 最容易開啟的方法

下載並解壓縮這個分支後，請直接雙擊根目錄的：

`OPEN_RECIPE_ENGINE.html`

它會自動帶到 `_experiments/recipe-engine-v1/index.html`。新版不會顯示 API key、OpenAI 或 Gemini 設定。

## 目標

- 完全本機運作，不呼叫 OpenAI 或 Gemini API。
- 將原始胖譜拆成可編輯的 `PromptFragment`。
- 看不懂的內容標記為「未分類」，原文完整保留。
- 支援鎖定、停用、改分類、改順序與手動編輯。
- 可替換人物主調、添加濾鏡與尺寸設定。
- 人物卡與配件分開保存，每次調製可自行勾選要帶入的配件。
- 胖譜庫、人物設定庫與材料庫採瀏覽優先介面，新增／編輯時才開啟表單。
- 首次載入可從同來源的配方引擎與舊正式版複製既有資料，原資料不會刪除。
- 以「保持原順序」或「標準配方順序」重新編譯。
- 顯示這次調製做了什麼，不在背後自動刪詞。
- 支援完整 JSON 備份匯出與匯入。
- 桌面與手機共用同一套路由與資料，不再跳往根目錄舊版頁面。

## 隔離

- localStorage key：`prompt-fairy-arcane-v2`
- 入口：`OPEN_RECIPE_ENGINE.html`
- 實際頁面：`_experiments/recipe-engine-v1/index.html`
- 現有穩定版與舊實驗版的 storage 不會被寫入或刪除。
- 第一次建立 v2 資料時，會讀取 `prompt-fairy-recipe-engine-v1`、`prompt-sprite-state-v2` 或 `prompt-sprite-state-v1`，將缺少的人物、材料與胖譜複製到 v2。
- 設定頁可重新掃描舊資料；同名人物、同名材料與同內容胖譜不會重複加入。

## 驗收路徑

1. 貼入完整 Prompt。
2. 點「拆成材料」。
3. 確認所有原文片段仍存在。
4. 到人物設定庫新增人物卡與固定配件。
5. 在 [AA]／[BB] 選擇人物，勾選本次需要的配件。
6. 加入濾鏡與 3:4。
7. 點「Compose Prompt｜本機調製」。
8. 確認未勾選配件沒有寫入，再將成品收進胖譜庫。
9. 重新整理頁面，確認草稿、人物、材料與胖譜仍存在。
10. 到設定頁匯出 JSON 備份。
