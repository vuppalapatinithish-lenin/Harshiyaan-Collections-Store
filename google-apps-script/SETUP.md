# Google Apps Script central order storage

1. Open your existing Apps Script project.
2. Replace its Code.gs with `Code.gs` from this folder.
3. Deploy as Web app: Execute as **Me**, access **Anyone**.
4. Copy the `/exec` URL.
5. In Vercel → Project → Settings → Environment Variables, add:
   `HC_ORDERS_SCRIPT_URL` = your `/exec` URL (Production).
6. Redeploy Vercel.

This script stores orders centrally in Script Properties, sends order emails to Darlingfareed@gmail.com, supports customer tracking by Order ID + mobile, and supports admin status updates. No Firebase is required.


## Customer confirmation email
The order form requires a customer email. On a successful paid order, the Apps Script sends one complete order email to the store and one confirmation email to the customer's email address. The confirmation includes Order ID, item names/IDs, quantity, amount paid, Razorpay payment IDs, delivery date, and tracking instructions. The script avoids duplicate emails when the same order is retried.
