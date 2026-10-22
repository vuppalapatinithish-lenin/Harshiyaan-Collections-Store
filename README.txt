Harshiyaan Collections — Public Product Image / Catalogue Sync Fix

Files in this package:
- index.html: preserves the provided storefront layout, loads the cloud catalog, and no longer discards HTTPS images in the homepage offers renderer.
- offers.html: loads the same cloud catalog so offers show on other devices.
- shared-catalog.js: removes the duplicate save wrapper, serializes product/offer writes, normalizes Google Drive image links to thumbnail URLs, and does not wipe local products when the cloud catalogue is empty.

Deployment steps:
1. Back up the current GitHub files first.
2. Replace repository index.html, offers.html and shared-catalog.js with these same-named files.
3. Commit/push and wait for GitHub Pages to deploy.
4. On the storefront, hard refresh with Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac).
5. Test the same product image on the homepage and Special Offers page, including a second device.

Do NOT replace Code.gs or delete the cloud catalog for this fix. This package does not modify the cloud's existing product/offer records. If an uploaded Drive image is still broken after deployment, verify the Drive file is shared as Anyone with the link / Viewer; the front-end cannot display a private Drive file.
