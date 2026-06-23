-- 飲控大作戰 — 新增「每日運動紀錄」資料表
-- 用法：Supabase → SQL Editor → New query → 整段貼上 → Run

create table if not exists exercise_logs (
  id                 bigint generated always as identity primary key,
  member_id          bigint references members(id) on delete cascade,
  log_date           date not null,
  description        text default '',     -- 今天做了什麼運動（可多項）
  ai_calories_burned int,                 -- AI 估計消耗大卡
  ai_analysis        text,                -- AI 簡短分析
  created_at         timestamptz default now(),
  unique (member_id, log_date)
);

-- 家用開放讀寫（與其他表一致，靠網址私密性保護）
alter table exercise_logs enable row level security;
drop policy if exists "family_all" on exercise_logs;
create policy "family_all" on exercise_logs for all using (true) with check (true);
