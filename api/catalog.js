export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowedOrigins = [
    "https://www.harshiyaancollections.com",
    "https://harshiyaancollections.com",
    "https://vuppalapatinithish-lenin.github.io",
    "https://harshiyaan-collections-store.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  if (allowedOrigins.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  const base = process.env.HC_ORDERS_SCRIPT_URL;
  if (!base) return res.status(500).json({ ok:false, error:"HC_ORDERS_SCRIPT_URL is not configured" });
  try {
    if (req.method === "GET") {
      const url = new URL(base);
      url.searchParams.set("action", "catalogGet");
      const upstream = await fetch(url.toString());
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
    if (req.method === "POST") {
      const payload = req.body || {};
      const adminPassword = process.env.HC_ADMIN_PASSWORD;
      if (!adminPassword) return res.status(500).json({ ok:false, error:"HC_ADMIN_PASSWORD is not configured in Vercel" });
      if (payload.action === "auth") {
        return res.status(200).json({ ok: payload.password === adminPassword, error: payload.password === adminPassword ? undefined : "Incorrect admin password" });
      }
      if (payload.password !== adminPassword) return res.status(401).json({ ok:false, error:"Admin authentication required" });
      if (payload.action !== "save" || !["products", "offers"].includes(payload.key) || !Array.isArray(payload.data)) {
        return res.status(400).json({ ok:false, error:"Expected action=save, key=products|offers, and data=array" });
      }
      const upstream = await fetch(base, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"catalogSave", key:payload.key, data:payload.data })
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
    return res.status(405).json({ ok:false, error:"Method not allowed" });
  } catch (error) {
    return res.status(500).json({ ok:false, error:error?.message || "Catalog sync error" });
  }
}
