
import crypto from "node:crypto";

const ALLOWED_ORIGINS = [
  "https://www.harshiyaancollections.com",
  "https://harshiyaancollections.com",
  "https://vuppalapatinithish-lenin.github.io",
  "https://harshiyaan-collections-store.vercel.app",
  "https://harshiyaan-collections.vercel.app",
  "https://harshiyaan-collections-igbnf4dda-nithish-746f.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
];

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      verified: false,
      error: "Method not allowed"
    });
  }

  try {
    const {
      order_id,
      payment_id,
      signature
    } = req.body || {};

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      return res.status(500).json({
        verified: false,
        error: "Razorpay secret is not configured"
      });
    }

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        verified: false,
        error: "Missing payment verification fields"
      });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const signatureBuffer = Buffer.from(
      String(signature),
      "hex"
    );

    const verified =
      expectedBuffer.length === signatureBuffer.length &&
      expectedBuffer.length > 0 &&
      crypto.timingSafeEqual(
        expectedBuffer,
        signatureBuffer
      );

    if (!verified) {
      return res.status(400).json({
        verified: false,
        error: "Invalid Razorpay signature"
      });
    }

    return res.status(200).json({
      verified: true,
      order_id,
      payment_id
    });

  } catch (error) {
    console.error("Payment verification error:", error);

    return res.status(500).json({
      verified: false,
      error: "Payment verification failed"
    });
  }
}

function setCors(req, res) {
  const origin = req.headers.origin || "";

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept"
  );

  res.setHeader("Access-Control-Max-Age", "86400");
}
