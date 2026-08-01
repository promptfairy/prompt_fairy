# Prompt Fairy 統一版

這個目錄是 Prompt Fairy 的唯一應用程式。根目錄 `index.html` 只負責把舊網址轉進這裡，不再維護舊工作台或舊側欄。

## 最容易開啟的方法

下載並解壓縮這個分支後，請直接雙擊根目錄的：

`OPEN_RECIPE_ENGINE.html`

它會自動帶到 `_experiments/recipe-engine-v1/index.html#workspace`。

## 目標

- 完全本機運作，不呼叫 OpenAI 或 Gemini API。
- 將原始胖譜拆成可編輯的 `PromptFragment`。
- 看不懂的內容標記為「未分類」，原文完整保留。
- 支援鎖定、停用、改分類、改順序與手動編輯。
- 可替換人物主調、添加濾鏡與尺寸設定。
- 人物設定與配件分開保存，每次調製可自行勾選要帶入的配件。
- Prompt、人物與材料 Library 採瀏覽優先，新建表單只在按下 `＋新增` 後出現。
- 以「保持原順序」或「標準配方順序」重新編譯。
- 顯示這次調製做了什麼，不在背後自動刪詞。

## 路由

- localStorage key：`prompt-fairy-recipe-engine-v1`
- `#home`：首頁
- `#workspace`：WORKSPACE／調製台
- `#library`：PROMPT LIBRARY／胖譜庫
- `#characters`：CHARACTER LIBRARY／人物設定庫
- `#materials`：MATERIAL LIBRARY／材料庫
- `#settings`：SETTINGS／設定

首次載入會相容匯入同一瀏覽器來源的舊人物、胖譜與咒語資料；之後只寫入新版 storage key。

## 驗收路徑

1. 貼入完整 Prompt。
2. 點「拆成材料」。
3. 確認所有原文片段仍存在。
4. 從人物設定庫新增或選擇人物。
5. 在 [AA]／[BB] 選擇人物，勾選本次需要的配件。
6. 加入濾鏡與 3:4。
7. 點「Compose Prompt｜調製新胖譜」。
8. 複製輸出，並確認未勾選配件沒有被寫入。
