# Oagent Mobile Gateway & LINE Bridge

Orcagent 原生官方行動端閘道器（Mobile Bridge），提供透過 LINE 官方帳號進行雙向安全遠端協同、多 Agent 調度及即時 Web CLI 終端串流功能。

## 核心架構與職責

| 模組 | 檔案 | 職責 |
| :--- | :--- | :--- |
| **Gateway 核心** | `server.mjs` | 本地 HTTP / SSE 伺服端、Token/Ticket 權限驗證、Terminal Backlog 緩衝與圖標靜態路由 |
| **LINE 協同核心** | `line-bot.mjs` | LINE Webhook 簽名驗證、群組鎖定（Group Lock）、多 Agent 指令路由、進程執行與 3s 心跳廣播 |
| **智慧長效大腦** | `gemini-brain.mjs` | Gemini 2.5 Flash 長效對話記憶、全繁體中文翻譯規範、PR 進度總結 |
| **遠端 PR 檢測** | `remote-inspector.mjs` | 調用 GitHub CLI 撈取當前與綁定專案之真實 Open PR、CI 通過狀態與 PR 點擊網址 |
| **UI 模板與圖標** | `line-templates.mjs` | Quick Reply 菜單、Ag / Hu / T3 / Be 專屬文字色彩圖標映射、訊息傳送者頭像 |
| **手機 Web CLI** | `ui.html` | 專用手機終端介面、雙軌 2 秒主動輪詢同步、Working Bar 動態指示器、SSE 自動重連 |
| **啟動守護進程** | `start-share.mjs` | Cloudflare Tunnel 公網通道建立、LINE Console Webhook 自動同步更新 |

## 啟動與操作指令

在 `orca` 專案根目錄下執行：

```bash
# 啟動 LINE Mobile Gateway（含公網 Cloudflare 隧道與自動 Webhook 同步）
pnpm run share:line

# 執行單元與整合測試（17/17 綠燈通過）
pnpm run share:line:test

# 執行程式碼靜態品質檢查（0 警告、0 錯誤）
pnpm run share:line:lint
```

## 專案圖示規範 (Ag, Hu, T3, Be)

- **Ag** (`xagent.id`): 科技深藍底 + 白色大字 Ag
- **Hu** (`xhuman.id`): 翡翠綠底 + 白色大字 Hu
- **T3** (`twin3.sdk`): 靛藍紫底 + 白色大字 T3
- **Be** (`bitbee`): 鮮明蜂巢黃底 + 深黑大字 Be（**Be 是黃的**）

## 安全與信任邊界

1. **群組鎖定 (Group Lock)**：服務首次在授權 LINE 群組互動後自動鎖定，私聊與群外訊息一律 403 拒絕。
2. **24 小時安全票據 (Ticket-bound CLI)**：手機 Web CLI 必須持有綁定該群組之安全 Ticket，未獲授權之訪問即刻封鎖。
3. **零金鑰外洩 (Zero-Key)**：任何環境變數與金鑰絕不回傳前端，僅在伺服端完成安全調用。
