# V14 — Mandatory Customer Confirmation + Single Email Flow

- Customer email is mandatory at checkout.
- Removed the browser-side direct Apps Script email call that caused duplicate emails.
- One central order-sync request now sends the store email and customer confirmation.
- Store email includes customer details, items, Product IDs, quantities, paid amount, Razorpay IDs, delivery and tracking information.
- Customer email includes the same order summary plus Track ID / Order ID and tracking link.
- Email delivery flags prevent duplicate emails on retries.
- Existing Razorpay, cart, admin, tracking and mobile layouts remain locked.
