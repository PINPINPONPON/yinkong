-- 讓家人（anon）能上傳/檢視/刪除 meal-photos 裡的照片
-- 用法：Supabase → SQL Editor → New query → 貼上 → Run

drop policy if exists "meal_photos_family_all" on storage.objects;

create policy "meal_photos_family_all"
on storage.objects for all
to anon
using (bucket_id = 'meal-photos')
with check (bucket_id = 'meal-photos');
