Harshiyaan Collections — Cart ID Compatibility Fix

Why the cart stopped working:
The admin now allows alphanumeric Product IDs such as HC1001 and GOLD-25, but the storefront generated inline handlers like addToCart(HC1001) without string quotes. The browser treats HC1001 as a variable and throws a ReferenceError. Cart matching also used strict numeric/string comparisons.

Files in this patch:
- index.html: preserves the image URL/catalogue fix and quotes dynamic product/offer IDs in cart actions.
- category-pages/*.html: quotes alphanumeric IDs in Add to Cart and quantity controls, compares IDs consistently as strings, and loads the shared catalogue bridge on category pages so catalogue data is refreshed from cloud storage.
- offers.html and shared-catalog.js: included unchanged from the image-display fix so the complete set stays together.

Installation:
1. Back up existing files first.
2. Replace repository index.html, all HTML files in category-pages/ with the same-named files here. Replace offers.html and shared-catalog.js only if the image-display fix version is not already deployed (these copies are included unchanged).
3. Keep the folder path category-pages/ the same. Do not replace admin.html, Code.gs, API files, Razorpay files or product data.
4. Commit and let GitHub Pages publish. Hard-refresh with Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).
5. Test an alphanumeric-ID product (e.g. HC1001): Add to Cart, open Cart, change quantity up/down, remove by reducing to zero, then test checkout form flow without making a live payment. Also test one numeric-ID product if any remain.

Safety notes:
- This patch does not clear hc_cart or change product/order/payment data.
- Do not replace index.html with an older version outside this package; this index includes the public image URL support from the previously prepared image fix.
- A live payment must not be made just for testing.
