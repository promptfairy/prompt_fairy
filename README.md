# prompt_fairy｜胖譜小精靈

胖譜小精靈是一個 local-first 的圖像 Prompt 拆解、置換、重組與版本管理工具。

目前產品只有一套介面與一套本機規則引擎：

- 產品入口：根目錄 `index.html`（自動轉入新版介面）
- 唯一應用程式：`_experiments/recipe-engine-v1/index.html`

## 部署後網址

如果部署到 GitHub Pages：

- 固定預覽：`https://promptfairy.github.io/prompt_fairy/`

## 本機開發

需要 Node.js。啟動根目錄伺服器：

```bash
node scripts/local-server.js
```

預設網址：

- 產品入口：`http://127.0.0.1:5177/`
- 直接開啟應用程式：`http://127.0.0.1:5177/_experiments/recipe-engine-v1/`

如果要讓同一個 Wi-Fi 裡的手機測試：

```bash
HOST=0.0.0.0 node scripts/local-server.js
```

Windows PowerShell：

```powershell
$env:HOST="0.0.0.0"
node scripts/local-server.js
```

## 隱私與資料

- 人物設定、材料、胖譜館藏與草稿只存在使用者自己的瀏覽器儲存空間。
- 確定性編譯使用本機分類與規則包，不呼叫 OpenAI、Gemini 或其他生成 API。
- 設定頁只管理本機資料、匯入匯出與規則包。

## 共同開發建議

- 不另建舊殼或第二套導覽；所有頁面使用相同頂部導覽與 hash 路由。
- 新功能先開 feature branch，確認不破壞本機資料與確定性編譯後再合併。
