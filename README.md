# 飲控大作戰

家庭共用的飲食 / 體重紀錄網站（蘋家七人）。手機網頁，文青風。

## 功能
- 點頭像選成員（無密碼，給長輩方便）
- 每日記錄：體重、三餐（拍照＋手動補字）、喝水
- 體重趨勢圖、家庭減重排行榜
- AI 營養師建議（第二階段，接 Gemini）

## 技術
- 前端：單檔 `index.html`（原生 JS、Chart.js、supabase-js，皆走 CDN）
- 資料庫 / 照片儲存：Supabase
- 部署：Vercel
- AI：Gemini（第二階段，serverless function）

## 設定
見 `SETUP.md`。資料庫建表為 `supabase-schema.sql`，照片權限為 `storage-policy.sql`。
