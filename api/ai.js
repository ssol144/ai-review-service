// Vercel Serverless Function. Keep the API key on the server; never expose it in browser code.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "OPENAI_API_KEY is not configured" });
  const { prompt, kind } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 6000) {
    return res.status(400).json({ error: "A valid prompt is required (max 6000 characters)." });
  }
  const system = "당신은 소상공인을 돕는 한국어 매장 운영 AI입니다. 리뷰 답글은 정중하고 구체적이며 기계적인 반복 문구를 피합니다. 사실을 지어내거나 고객 개인정보를 추론하지 않습니다. 불만 리뷰에는 공감과 사과를 우선하며 보상이나 조치를 확정적으로 약속하지 않습니다.";
  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: kind === "review" ? 0.85 : 0.7,
        messages: [{ role: "system", content: system }, { role: "user", content: prompt }]
      })
    });
    const data = await upstream.json();
    if (!upstream.ok) return res.status(502).json({ error: "AI provider request failed", detail: data.error?.message || "Unknown provider error" });
    return res.status(200).json({ text: data.choices?.[0]?.message?.content?.trim() || "" });
  } catch (error) {
    return res.status(500).json({ error: "AI request failed" });
  }
}
