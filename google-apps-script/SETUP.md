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


## Shared products and offers (added)
The same Web App now supports a Drive-backed shared catalogue. Product/offer records are stored in a private JSON file in the script owner's Google Drive. Uploaded product images are placed in Drive and made viewable by anyone with the image link so the public store can display them. Keep the Web App deployed as Execute as **Me**, access **Anyone**. After replacing `Code.gs`, create a **new deployment version** (Deploy → Manage deployments → Edit → New version → Deploy). Keep the same `/exec` URL in `HC_ORDERS_SCRIPT_URL`, then redeploy Vercel.

The website now calls `/api/catalog` to read and write the shared catalogue. The first browser that has existing products can seed an empty cloud catalogue; verify those products appear in Admin before testing another device.


## Shared products and offers (added)
The same Web App now supports a Drive-backed shared catalogue. Product/offer records are stored in a private JSON file in the script owner's Google Drive. Uploaded product images are placed in Drive and made viewable by anyone with the image link so the public store can display them. Keep the Web App deployed as Execute as **Me**, access **Anyone**. After replacing `Code.gs`, create a **new deployment version** (Deploy → Manage deployments → Edit → New version → Deploy). Keep the same `/exec` URL in `HC_ORDERS_SCRIPT_URL`, then redeploy Vercel.

The website now calls `/api/catalog` to read and write the shared catalogue. The first browser that has existing products can seed an empty cloud catalogue; verify those products appear in Admin before testing another device.


## Vercel admin authentication requirement
Add `HC_ADMIN_PASSWORD` as a Vercel Production environment variable. Use the admin password you want to keep private; the updated `admin.html` no longer contains a hardcoded password. Redeploy Vercel after setting it. Catalogue writes are rejected unless the password has been verified by the Vercel API.
