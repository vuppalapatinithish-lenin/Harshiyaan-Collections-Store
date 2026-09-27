# Harshiyaan Collections — Production-Ready Website

Premium 1-gram-gold jewellery storefront with responsive mobile UI, 12 collection pages, cart, admin dashboard, Razorpay payment verification, customer Order IDs, central order tracking, and email notifications.

## Features
- 12 fixed collections with category hero images
- Premium purple/white/gold visual design
- 360° interactive jewellery experience
- Product cart + checkout
- UPI/Razorpay checkout; COD unavailable
- Customer Order ID format: HC-XXXXXXXX
- Copy Order ID / Save Order Details / Track My Order
- Customer tracking by Order ID + mobile
- Admin status flow: Confirmed → Processing → Shipped → Out for Delivery → Delivered
- Admin product/category/homepage/offer/contact controls
- Exact delivery location capture via browser geolocation
- Order email notifications to Darlingfareed@gmail.com
- Central order storage through Google Apps Script + Vercel proxy; no Firebase
- GitHub Pages-compatible relative asset paths

## Architecture
Customer → GitHub Pages (or Vercel frontend) → Vercel API → Razorpay
Customer/Admin order sync → Vercel API → Google Apps Script storage/email

## Vercel Environment Variables
Set these in Production:
- `RAZORPAY_KEY_ID` = your Live Razorpay key ID
- `RAZORPAY_KEY_SECRET` = matching Live Razorpay secret
- `HC_ORDERS_SCRIPT_URL` = deployed Google Apps Script `/exec` URL

Never commit Razorpay secrets to GitHub.

## Google Apps Script
See `google-apps-script/SETUP.md`. Replace the existing Apps Script code with `google-apps-script/Code.gs`, deploy as a Web App (execute as you, access anyone), then set its `/exec` URL as `HC_ORDERS_SCRIPT_URL` in Vercel and redeploy.

## GitHub Pages
Upload the extracted contents of this ZIP to the repository root. Do not upload the ZIP itself. Relative paths such as `products/product1.png` and `category-images/*.jpg` are intentionally used so the site works under a repository sub-path such as `/Harshiyaan-Collections-Store/`.
