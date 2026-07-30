# 胖譜小精靈

胖譜小精靈是一個 local-first 的 AI 圖像 prompt 整理、置換與版本管理工具。  
目前 repo 內保留兩個版本，方便共同開發與比較。

## 版本

- 穩定版：根目錄 `index.html`
- 規則引擎實驗版：`_experiments/local-rule-engine/index.html`

如果部署到 GitHub Pages：

- 穩定版網址：`https://<你的帳號>.github.io/<repo>/`
- 規則引擎實驗版網址：`https://<你的帳號>.github.io/<repo>/_experiments/local-rule-engine/`

## 本機開發

需要 Node.js。啟動根目錄伺服器：

```bash
node scripts/local-server.js
```

預設網址：

- 穩定版：`http://127.0.0.1:5177/`
- 規則引擎實驗版：`http://127.0.0.1:5177/_experiments/local-rule-engine/`

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

- 角色卡、咒語匣、胖譜庫、圖片紀錄預設存在使用者自己的瀏覽器儲存空間。
- API key 不應提交到 GitHub。現階段 key 只會存在瀏覽器 localStorage。
- 若部署為公開網站，使用者仍需要在自己的瀏覽器輸入自己的設定與資料。

## 共同開發建議

- `main` 放穩定版。
- `experiment/local-rule-engine` 放規則引擎實驗。
- 穩定版里程碑可打 tag，例如 `v1.0-v8`。
- 新功能先開 feature branch，確認不破壞穩定版後再合併。

