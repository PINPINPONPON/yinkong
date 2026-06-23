-- 飲控大作戰 資料庫建表
-- 用法：Supabase → SQL Editor → New query → 整段貼上 → Run

-- 家庭成員
create table if not exists members (
  id                 bigint generated always as identity primary key,
  name               text not null,
  avatar_color       text not null default '#6E7C63',
  goal_text          text default '',
  sort_order         int  default 0,
  pin                text,                 -- 選填 4 位數 PIN
  goal_weight        numeric(5,1),         -- 目標體重
  daily_calorie_goal int,                  -- 每日熱量目標
  daily_water_goal   int default 1500,     -- 每日喝水目標
  sex                text,                 -- 'M'/'F'（算基礎代謝用）
  birth_year         int,                  -- 出生年（算年齡）
  height_cm          numeric(4,1)          -- 身高
);

-- 體重紀錄（每人每天一筆，重複記錄會覆蓋）
create table if not exists weight_logs (
  id         bigint generated always as identity primary key,
  member_id  bigint references members(id) on delete cascade,
  log_date   date not null,
  weight_kg  numeric(5,1) not null,
  created_at timestamptz default now(),
  unique (member_id, log_date)
);

-- 三餐紀錄
create table if not exists meals (
  id          bigint generated always as identity primary key,
  member_id   bigint references members(id) on delete cascade,
  log_date    date not null,
  meal_type   text not null,          -- 早餐 / 午餐 / 晚餐
  photo_url   text,                   -- 第一張照片（列表縮圖／相容）
  photo_urls  text[],                 -- 一餐多張照片
  note        text default '',        -- 手動補充文字
  ai_calories int,                    -- AI 估計熱量
  ai_analysis text,                   -- AI 辨識/分析結果
  created_at  timestamptz default now(),
  unique (member_id, log_date, meal_type)
);

-- 喝水紀錄（每人每天一筆累計）
create table if not exists water_logs (
  id         bigint generated always as identity primary key,
  member_id  bigint references members(id) on delete cascade,
  log_date   date not null,
  amount_ml  int not null default 0,
  unique (member_id, log_date)
);

-- AI 營養師每日手記（每人每天一份，可快取避免重複呼叫）
create table if not exists ai_notes (
  id         bigint generated always as identity primary key,
  member_id  bigint references members(id) on delete cascade,
  log_date   date not null,
  content    text,
  created_at timestamptz default now(),
  unique (member_id, log_date)
);

-- 先放入你家七位成員（顏色沿用前端的莫蘭迪配色）
insert into members (name, avatar_color, goal_text, sort_order) values
  ('爹',   '#84A1A8', '健康管理',  1),
  ('媽咪', '#B89BA3', '維持體態',  2),
  ('大大姐','#8B9A6F', '目標 −3kg', 3),
  ('大姐', '#C2A36B', '維持體態',  4),
  ('二姐', '#9A8FA8', '增肌減脂',  5),
  ('蘋',   '#6E7C63', '目標 65kg', 6),
  ('潔',   '#B27A52', '目標 −3kg', 7)
on conflict do nothing;

-- 簡易家用權限：開放讀寫（沒有密碼登入，靠網址私密性保護）
-- 之後若要加 PIN 或正式登入，再調整以下 policy
alter table members     enable row level security;
alter table weight_logs enable row level security;
alter table meals       enable row level security;
alter table water_logs  enable row level security;
alter table ai_notes    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','weight_logs','meals','water_logs','ai_notes'] loop
    execute format('drop policy if exists "family_all" on %I;', t);
    execute format('create policy "family_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
