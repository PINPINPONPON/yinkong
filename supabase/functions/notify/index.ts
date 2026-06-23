// 飲控大作戰 — 推播發送
// 由 pg_cron 帶 CRON_SECRET 呼叫（定時提醒），或 App 帶 {selfTest, memberId} 發測試給自己。
import * as webpush from "jsr:@negrel/webpush@0.3.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const COPY: Record<string, string[]> = {
  water: ["🐭 吱吱！水杯空了喔，喝一口嘛～", "💧 吧嗒吧嗒…身體在喊渴囉", "🥤 補水時間到！咕嚕咕嚕一下"],
  lunch: ["🍙 吧嗒吧嗒…午餐記了嗎？", "🍱 中午囉！拍張午餐給 AI 看看", "😋 午餐吃什麼？順手記一下吧"],
  dinner: ["🍚 吧嗒吧嗒…晚餐別忘了記", "🌆 晚餐時間，今天吃得如何？", "🍳 記一下晚餐，AI 幫你算能量"],
  weight: ["🌙 睡前啦，今天的體重補一下？", "⚖️ 吱吱～站上體重計記錄一下嘛", "📔 睡前小手帳：今天體重多少呢"],
  test: ["🎉 推播測試成功！吱吱～以後我會這樣提醒你"],
};
const pick = (t: string) => { const a = COPY[t] || COPY.test; return a[Math.floor(Math.random() * a.length)]; };

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let appServerPromise: Promise<any> | null = null;
function getAppServer() {
  if (!appServerPromise) {
    appServerPromise = (async () => {
      const keys = await webpush.importVapidKeys(JSON.parse(Deno.env.get("VAPID_KEYS")!), { extractable: false });
      return await webpush.ApplicationServer.new({ contactInformation: "mailto:c.junfu15@gmail.com", vapidKeys: keys });
    })();
  }
  return appServerPromise;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const isCron = b.secret && b.secret === Deno.env.get("CRON_SECRET");
    const isSelf = b.selfTest && b.memberId;
    if (!isCron && !isSelf) return json({ error: "unauthorized" }, 401);

    const type = b.type || "test";
    let q = sb.from("push_subscriptions").select("*");
    if (isSelf) q = q.eq("member_id", b.memberId);
    const { data: subs, error } = await q;
    if (error) return json({ error: error.message }, 500);
    if (!subs || !subs.length) return json({ sent: 0, note: "no subscriptions" });

    const appServer = await getAppServer();
    const payload = JSON.stringify({ title: "飲控大作戰", body: pick(type) });
    let sent = 0, removed = 0;
    for (const s of subs) {
      try {
        const subscriber = appServer.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } });
        await subscriber.pushTextMessage(payload, {});
        sent++;
      } catch (e: any) {
        const code = e?.response?.status;
        if (code === 404 || code === 410) { await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); removed++; }
      }
    }
    return json({ sent, removed, total: subs.length });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
