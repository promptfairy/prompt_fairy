# 配方引擎實驗版 v1

這個目錄是 `feature/recipe-engine-v1` 分支上的獨立實驗版，不會覆蓋根目錄穩定版，也不會修改 `_experiments/local-rule-engine/`。

## 最容易開啟的方法

下載並解壓縮這個分支後，請直接雙擊根目錄的：

`OPEN_RECIPE_ENGINE.html`

它會自動帶到 `_experiments/recipe-engine-v1/index.html`。若看到 API key、OpenAI 或 Gemini 設定，代表開到根目錄穩定版，不是配方引擎。

## 目標

- 完全本機運作，不呼叫 OpenAI 或 Gemini API。
- 將原始胖譜拆成可編輯的 `PromptFragment`。
- 看不懂的內容標記為「未分類」，原文完整保留。
- 支援鎖定、停用、改分類、改順序與手動編輯。
- 可替換人物主調、添加濾鏡與尺寸設定。
- 人物卡與配件分開保存，每次調製可自行勾選要帶入的配件。
- 可嘗試從同一瀏覽器來源的正式版匯入人物卡與配件。
- 以「保持原順序」或「標準配方順序」重新編譯。
- 顯示這次調製做了什麼，不在背後自動刪詞。

## 隔離

- localStorage key：`prompt-fairy-recipe-engine-v1`
- 入口：`OPEN_RECIPE_ENGINE.html`
- 實際頁面：`_experiments/recipe-engine-v1/index.html`
- 現有穩定版與舊實驗版的資料不會被寫入。
- 只有使用者主動按「從正式版人物卡匯入」時，才會讀取正式版人物卡並複製到實驗資料區。

## 驗收路徑

1. 貼入完整 Prompt。
2. 點「拆成材料」。
3. 確認所有原文片段仍存在。
4. 新增或匯入人物卡。
5. 在 [AA]／[BB] 選擇人物，勾選本次需要的配件。
6. 加入濾鏡與 3:4。
7. 點「本機調製新胖譜（不需 API）」。
8. 複製輸出，並確認未勾選配件沒有被寫入。
