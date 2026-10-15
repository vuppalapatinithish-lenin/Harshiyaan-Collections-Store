```javascript
export default async function handler(req, res) {
  // CORS configuration
  const origin = req.headers.origin || "";

  const allowedOrigins = [
    "https://www.harshiyaancollections.com",
    "https://harshiyaancollections.com",
    "https://harshiyaan-collections-store.vercel.app",
    "https://harshiyaan-collections.vercel.app",
    "https://vuppalapatinithish-lenin.github.io"
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Only POST is allowed for order creation
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};

    const amount = body.amount;
    const currency = body.currency || "INR";
    const receipt = body.receipt;
    const notes = body.notes || {};

    // Amount must be in paise
    const paise = Number(amount);

    if (!Number.isSafeInteger(paise) || paise < 100) {
      return res.status(400).json({
        error: "Invalid amount"
      });
    }

    const key = process.env.RAZORPAY_KEY_ID;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key || !secret) {
      return res.status(500).json({
        error: "Razorpay server credentials are not configured"
      });
    }

    // Build Basic Auth without template literals
    const auth = Buffer.from(
      key + ":" + secret
    ).toString("base64");

    const payload = {
      amount: paise,
      currency: currency,
      receipt: String(receipt || ("HC-" + Date.now())),
      notes: notes
    };

    const upstream = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + auth,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error(
        "Razorpay order creation failed:",
        upstream.status,
        data && data.error
          ? data.error.code || data.error.description
          : "Unknown error"
      );

      return res.status(502).json({
        error:
          data && data.error && data.error.description
            ? data.error.description
            : "Razorpay order creation failed"
      });
    }

    return res.status(200).json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: key
    });
  } catch (error) {
    console.error(
      "Create-order API error:",
      error.message
    );

    return res.status(500).json({
      error: "Unable to create payment order"
    });
  }
}
```
