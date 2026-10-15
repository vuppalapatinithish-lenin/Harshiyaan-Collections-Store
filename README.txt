Harshiyaan Collections — Product ID and Special Offers update

Files:
- admin.html: Product item numbers are entered as digits and saved with an HC- prefix (for example HC-1001). Special Offers form now includes an optional offer-specific image upload/preview.
- index.html: Homepage product-ID search accepts HC-1001 and legacy 1001 inputs; product/cart/offer actions support string IDs.
- offers.html: Special Offers page matches HC-prefixed IDs and uses the uploaded offer image when provided.

Install:
1. Back up your current files first.
2. In the GitHub repository, replace the existing root-level admin.html, index.html, and offers.html with these files.
3. Commit the changes and wait for GitHub Pages/Vercel deployment as applicable.
4. Test with a new product ID such as 1005 (saved as HC-1005), then add an offer with the same number and upload an offer image.

Important:
The current admin implementation saves product and offer data/images in browser localStorage. These UI changes do not make product/offer edits shared across different visitors or devices. Shared storefront updates require connecting the admin and storefront to a central database/API.
