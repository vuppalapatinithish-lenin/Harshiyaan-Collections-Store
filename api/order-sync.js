
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

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const base = process.env.HC_ORDERS_SCRIPT_URL;

  if (!base) {
    return res.status(500).json({
      error: "HC_ORDERS_SCRIPT_URL is not configured"
    });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(base);
      url.searchParams.set("action", req.query?.action || "list");

      if (req.query?.id) {
        url.searchParams.set("id", req.query.id);
      }

      if (req.query?.mobile) {
        url.searchParams.set("mobile", req.query.mobile);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      return res.status(response.status).json(data);
    }

    if (req.method === "POST") {
      const response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body || {})
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Order sync error"
    });
  }
}
