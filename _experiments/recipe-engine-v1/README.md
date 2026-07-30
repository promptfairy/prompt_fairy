# 配方引擎實驗版 v1

這個目錄是 `feature/recipe-engine-v1` 分支上的獨立實驗版，不會覆蓋根目錄穩定版，也不會修改 `_experiments/local-rule-engine/`。

## 目標

- 完全本機運作，不呼叫 OpenAI 或 Gemini API。
- 將原始胖譜拆成可編輯的 `PromptFragment`。
- 看不懂的內容標記為「未分類」，原文完整保留。
- 支援鎖定、停用、改分類、改順序與手動編輯。
- 可替換人物主調、添加濾鏡與尺寸設定。
- 以「保持原順序」或「標準配方順序」重新編譯。
- 顯示這次調製做了什麼，不在背後自動刪詞。

## 隔離

- localStorage key：`prompt-fairy-recipe-engine-v1`
- 入口：`_experiments/recipe-engine-v1/index.html`
- 現有穩定版與舊實驗版的資料不會被讀取或寫入。

## 驗收路徑

1. 貼入完整 Prompt。
2. 點「拆成材料」。
3. 確認所有原文片段仍存在。
4. 輸入新人物設定，加入濾鏡與 3:4。
5. 點「調製新胖譜」。
6. 複製輸出，並確認修改摘要。
