# V11 — Razorpay click fix

- Fixed a JavaScript syntax error in `razorpay-client.js` that prevented the Razorpay client from loading at all.
- Corrected the API-base trailing-slash regex from an invalid escaped pattern to `/\/$/`.
- Preserved the current Vercel production endpoint: `https://harshiyaan-collections-store.vercel.app`.
- Preserved the existing create-order, verify-payment and order-sync APIs.
