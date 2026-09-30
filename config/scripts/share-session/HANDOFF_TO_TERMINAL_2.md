# Handoff to Terminal #2 (Claude Code)

## 1. 任務與架構全貌 (Mission & Architecture Overview)
Ming 指派之 Twin3 LINE 雙向管理系統已推進至**雲地雙軌架構**：
- **軌道 A（本地即時開發與派工）**：位於 `/Users/cis2042/orca/projects/1/orca/config/scripts/share-session/`，整合 Orca、Web CLI 與本地 Agent 派工。
- **軌道 B（雲端常駐 24/7 中樞 - 根治筆電關機問題）**：已建立獨立微服務專案庫 `/Users/cis2042/APP/twin3-line-bridge`，並已 push 至遠端 `https://github.com/twin3-ai/twin3-line-bridge`。

---

## 2. 已完成與已驗收成果 (Verified Deliverables)

### A. 進度戰報格式全面升級（CTO 雙專案標準範本）
- **規範**：
  - 專案標題列：`{燈號} {圖示} {專案名}　{票數} · {PR數}`（例如 `🔴 🏢 xAgent.id　64 張票 · 8 個 PR`、`🟡 👤 xHuman.id　21 張票 · 8 個 PR`）。
  - `現在到哪：` 具體描述合入進度與主要特性。
  - `待驗收：` 列出 Open PR，一律翻譯為專業繁體中文，且**每一條 PR 都必須附帶 GitHub 官方連結（🔗 url）**。
  - **嚴格約束**：零問候語（嚴禁「Ming 您好」）、零開場白、零結尾贅字、不提 Orca Bridge 或終端。
- **落實檔案**：
  - `config/scripts/share-session/gemini-brain.mjs`
  - `config/scripts/share-session/remote-inspector.mjs`
  - `config/scripts/share-session/line-bot.mjs`
  - 測試套件 `line-bot.test.ts` 18/18 測試全綠。

### B. 徹底拔除「一片黑」無意義 imagemap 卡片
- **問題根因**：原先任務啟動與回查時發送的 `makeImagemapLiveView` 在 LINE 上渲染為無意義的死黑大方塊。
- **改善**：已徹底自 `line-bot.mjs` 拔除該圖片，改為乾淨清晰的單一卡片，並搭配動態綠色藥丸 Quick Replies（隨點隨看）。

### C. 雲端常駐根治方案（筆電關閉依然 24/7 運作）
- **代碼庫**：`/Users/cis2042/APP/twin3-line-bridge`（遠端：`https://github.com/twin3-ai/twin3-line-bridge`，branch `main`）。
- **純雲端 GitHub 檢索**：`src/github-inspector.mjs` 使用原生 fetch GitHub REST API 查詢 `twin3-ai/agent-id` 與 `cis2042/XHuman_ID`，徹底脫離對 MacBook 本地 git 與 `gh` CLI 的依賴。
- **離線狀態感知**：若筆電合蓋休眠，使用者傳入 `@1` 任務時，雲端中樞立即回覆提示「筆電目前離線，任務已加入雲端排程隊列」，絕不靜默無反應。
- **容器與部署**：`Dockerfile` + `.github/workflows/deploy.yml`（部署至 GCP `xer-389903`，Region `asia-east1`，`min-instances: 0`，`max-instances: 2`）。
- **測試與規範**：單檔最高 227 行（全數 `< 600`），全專案無註解，`oxlint` 0 警告 0 錯誤，`vitest` 7/7 全綠。

### D. 0 Push 費用之通知與決策機制（完全不花錢）
- **機制 1（隨手一點動態決策卡）**：任務啟動時附帶 Quick Reply 按鈕 `[ 🔄 查進度與決策 ]`。群員隨手點擊即可消耗免費 Reply Token 揭曉關鍵結論；若有 Blocker 則彈出結構化決策選項（`[ 🟢 同意 ]` / `[ 🔴 駁回 ]`）。
- **機制 2（群聊順風車自然喚醒）**：若有待決策事項，群內任何成員發言時，系統順風車帶出高亮告示，零額外推播費。

---

## 3. 當前運行環境與服務狀態 (Active Runtime State)
- **本地守護進程**：
  - 啟動指令：`node config/scripts/share-session/start-share.mjs --tunnel --password twin3secret`
  - 本地連接埠：`3788`
  - 最新 LINE Webhook 穿透網址：已自動同步至 LINE 官方後台，官方連線檢驗為 200 OK。
- **未決事項 (Pending Actions for #2)**：
  1. 向 Ming 追蹤 GitHub Secrets 配置（在 `twin3-ai/twin3-line-bridge` 設定 `GCP_SA_KEY`），使 GitHub Actions 部署至 Cloud Run 生效。
  2. Cloud Run 上線後，將其固定網址更新至 LINE 官方後台，即可正式關閉本地穿透隧道。
  3. 持續監控 LINE 群組成員的互動與進一步的回饋需求。
