# 🎬 Oagent Multi-Agent A2A 演示與錄影操作指南

本腳本旨在向社群媒體展示復刻版本 **Oagent** 強大的 **Agent-to-Agent (A2A)** 自動化溝通與協同能力。

---

## 🌟 展示核心亮點

1. **自主多 Agent 組織架構 (1+N+1)**：
   - 👑 **@1 Integrator（主控協調者）**：負責切分工作包（Work packages）與下發合約規格。
   - ⚡ **@2 Worker（核心實作者）**：在隔離工作區專注編程，實作 TokenBucketRateLimiter。
   - 🛡️ **@3 QC Auditor（獨立質檢者）**：唯讀設計 32 項高壓邊界測試與零漏洞審查。
2. **自然協商與閉環節奏（約 3.5 ~ 4 分鐘）**：
   - 派工 ➔ 簽收 ➔ 邊界歧異對齊（雙向溝通）➔ Commit 交接 ➔ 獨立模糊測試 ➔ 合併閉環。
3. **Oagent 專屬五色主題能量光束全展示**：
   - 🔥 **烈焰 (flame)**：Integrator ➔ Worker 派工與合併指令。
   - 💧 **冰藍流水 (water)**：Integrator ➔ QC 下發測試合約與發佈確認。
   - 🌿 **綠葉藤蔓 (foliage)**：QC ➔ Worker 發起拒絕案例確認，以及質檢通過認證。
   - 🌪️ **洋紅旋風 (tornado)**：Worker ➔ QC 邊界錯誤型別對齊確認。
   - ⛓️ **金屬鎖鏈 (chain)**：Worker ➔ QC 提交代碼 SHA 進行交接鎖定。
4. **即時發射/接收脈衝雷達環** 與 **終端浮動狀態標籤** 動態呈現。

---

## 🎥 錄影建議操作步驟

1. **開啟 Oagent 視窗**：
   - 確保 Oagent 視窗處於可見狀態，且可以清楚看到終端 Tab 標籤與內容區域。
2. **啟動螢幕錄影**：
   - 建議框選 Oagent 視窗區域或全螢幕錄影，確保能捕捉到上方光束動畫與終端打字效果。
3. **執行展示腳本**：
   開啟一個外部終端或在 Oagent 終端中執行：
   ```bash
   node /Users/cis2042/orca/projects/1/orca/demos/a2a-orchestration/run-demo.mjs
   ```
4. **靜待腳本自動演繹（約 3.5 ~ 4 分鐘）**：
   - 腳本會自動建立 `@2` 與 `@3` 標籤分頁。
   - 各 Agent 會以自然人機敲擊速度在終端打印輸出、彼此來回傳遞 A2A 消息並激發五彩主題光束。
   - 當印出 `★ Oagent Multi-Agent A2A 演示順利完成！` 時停止錄影。
