// 飲控大作戰 — AI 營養師 Edge Function
// action:"meal"  → 看餐點照片，估熱量＋營養分析
// action:"daily" → 綜合當日三餐＋體重，寫每日營養師總評
// Gemini 金鑰存在 Supabase secret（GEMINI_API_KEY），不進前端、不進 repo。

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type GenOpts = { json?: boolean; schema?: unknown };

async function callGemini(parts: unknown[], opts: GenOpts = {}): Promise<string> {
  let lastErr = "";
  for (const model of MODELS) {
    const genCfg: Record<string, unknown> = { maxOutputTokens: 2048, temperature: 0.4 };
    if (opts.json) {
      genCfg.responseMimeType = "application/json";
      if (opts.schema) genCfg.responseSchema = opts.schema;
    }
    // 2.5 系列預設會「思考」吃掉輸出額度，這裡關掉以求穩定、便宜
    if (model.startsWith("gemini-2.5")) genCfg.thinkingConfig = { thinkingBudget: 0 };
    const body = JSON.stringify({ contents: [{ parts }], generationConfig: genCfg });

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );
      if (res.status === 503 || res.status === 429) {
        lastErr = `HTTP ${res.status}`;
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue; // 忙線，重試
      }
      if (!res.ok) {
        lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        break; // 換下一個模型
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text as string;
      lastErr = "empty response";
      break;
    }
  }
  throw new Error("Gemini 無法回應（" + lastErr + "）");
}

const MEAL_SCHEMA = {
  type: "object",
  properties: {
    calories: { type: "integer" },
    items: { type: "array", items: { type: "string" } },
    analysis: { type: "string" },
  },
  required: ["calories", "analysis"],
};

async function handleMeal(b: any) {
  const note = (b.note ?? "").trim();
  const prompt =
    "你是專業營養師。看這張餐點照片，估計「整份」的總熱量（大卡，整數）、" +
    "列出主要食物項目（陣列），並用繁體中文寫一句 30 字內的營養分析" +
    "（蛋白質／蔬菜／澱粉／油脂是否均衡）。" +
    (note ? `使用者補充：「${note}」，請一併參考。` : "") +
    "若照片看不清楚或不是食物，calories 給 0、analysis 說明原因。";
  const parts: unknown[] = [{ text: prompt }];
  if (b.imageBase64) {
    parts.push({ inline_data: { mime_type: b.mimeType || "image/jpeg", data: b.imageBase64 } });
  } else if (note) {
    parts[0] = { text: prompt.replace("看這張餐點照片", `根據文字「${note}」`) };
  } else {
    return json({ error: "沒有照片也沒有文字" }, 400);
  }
  const text = await callGemini(parts, { json: true, schema: MEAL_SCHEMA });
  let p: any = {};
  try { p = JSON.parse(text); } catch { p = { calories: 0, analysis: text.slice(0, 120) }; }
  return json({
    calories: Math.max(0, Math.round(Number(p.calories) || 0)),
    items: Array.isArray(p.items) ? p.items : [],
    analysis: String(p.analysis || ""),
  });
}

async function handleDaily(b: any) {
  const meals = Array.isArray(b.meals) ? b.meals : [];
  const lines = meals.length
    ? meals.map((m: any) => `・${m.type}：${m.calories ? m.calories + " 大卡，" : ""}${m.analysis || "（無分析）"}`).join("\n")
    : "（今天還沒記錄三餐）";
  const total = meals.reduce((s: number, m: any) => s + (Number(m.calories) || 0), 0);
  const prompt =
    "你是親切、專業的家庭營養師。根據以下某位家人今天的紀錄，用繁體中文寫建議。\n" +
    `目標：${b.goalText || "維持健康"}\n` +
    `今日體重：${b.weightKg ? b.weightKg + " kg" : "未記錄"}` +
    `${b.deltaKg != null ? `（較前次 ${b.deltaKg > 0 ? "+" : ""}${b.deltaKg} kg）` : ""}\n` +
    `今日飲水：${b.waterMl ?? 0} cc\n` +
    `今日三餐（合計約 ${total} 大卡）：\n${lines}\n\n` +
    "請輸出三段，每段開頭用【今日總評】【小提醒】【運動建議】標示，" +
    "語氣溫暖、具體、不說教，每段 2～3 句即可。不要使用 markdown 符號。";
  const text = await callGemini([{ text: prompt }], { json: false });
  return json({ note: text.trim(), totalCalories: total });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!GEMINI_API_KEY) return json({ error: "伺服器未設定 GEMINI_API_KEY" }, 500);
  try {
    const b = await req.json();
    if (b.action === "meal") return await handleMeal(b);
    if (b.action === "daily") return await handleDaily(b);
    return json({ error: "未知的 action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
