# 飲控大作戰 — 上線設定指南

這份是「**只有你能做、我沒辦法幫你做**」的部分：註冊帳號、拿金鑰。
程式碼、部署都由 Claude 幫你完成。你照著做，把最後的幾個值貼回來給 Claude 就好。

預計花費：全部免費額度即可，AI 用量小通常也免費。

---

## ① Supabase（資料庫 ＋ 照片儲存）

1. 開 https://supabase.com → 用 Google 帳號登入（右上 Start your project）
2. 點 **New project**
   - Name：填 `yinkong`（或任意）
   - Database Password：**自己設一組密碼，記下來**（之後不一定用得到，但要留著）
   - Region：選 **Northeast Asia (Tokyo)**（離台灣最近）
3. 等 1～2 分鐘專案建好
4. 左側齒輪 **Project Settings → API**，複製這兩個值貼回來給 Claude：
   - `Project URL`（長得像 `https://xxxx.supabase.co`）
   - `anon public` 金鑰（很長一串）
5. 建照片儲存區：左側 **Storage → New bucket**
   - 名稱填 `meal-photos`
   - 勾選 **Public bucket**（讓家人能看到照片）→ Create
6. 建資料表：左側 **SQL Editor → New query**，把 `supabase-schema.sql` 這個檔的內容整段貼進去 → 按 **Run**（看到 Success 就完成）

➡️ 需要交給 Claude：**Project URL**、**anon public 金鑰**

---

## ② Gemini（AI 營養師的大腦）

1. 開 https://aistudio.google.com → Google 帳號登入
2. 左上 **Get API key → Create API key**
3. 複製那串金鑰

➡️ 需要交給 Claude：**Gemini API key**
（這把金鑰會放在後台函式裡，不會出現在網頁，別人看不到）

---

## ③ Vercel（網站上線、拿到網址）

1. 開 https://vercel.com → 用 **GitHub 帳號**登入（沒有 GitHub 就先辦一個，也是免費）
2. 之後 Claude 會幫你把程式放上去，這裡先有帳號即可

➡️ 需要交給 Claude：跟 Claude 說「Vercel 帳號好了」即可

---

## 完成後交給 Claude 這幾樣

```
Supabase Project URL：
Supabase anon key：
Gemini API key：
（Vercel 帳號：已建好）
```

把上面填好貼回對話，Claude 就會把整個 App 接起來、部署上線，給你一個家人能用的網址。

> 小提醒：用「點頭像、不設密碼」最方便長輩，代價是拿到網址的人都能看資料。
> 自家私用通常沒問題；之後若想加每人一組 PIN 碼，再跟 Claude 說即可。
