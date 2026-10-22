/* Shared catalogue bridge for Admin and public storefront pages. */
(function () {
  'use strict';
  var API = 'https://harshiyaan-collections-store.vercel.app/api/catalog';
  var keys = { products: 'hc_products', offers: 'hc_offers' };
  var queues = { products: Promise.resolve(), offers: Promise.resolve() };

  function local(key) {
    try {
      var value = JSON.parse(localStorage.getItem(keys[key]) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }
  function setLocal(key, value) {
    localStorage.setItem(keys[key], JSON.stringify(value));
  }
  function same(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; }
  }
  function normalizeImage(value) {
    if (typeof value !== 'string' || !value) return value || '';
    // Drive's /uc?export=view links may return a preview/redirect page in an <img>.
    // Use its thumbnail endpoint for a direct embeddable image instead.
    if (/drive\.google\.com/i.test(value)) {
      var match = value.match(/[?&]id=([^&]+)/i) || value.match(/\/file\/d\/([^/?]+)/i) || value.match(/\/d\/([^/?]+)/i);
      if (match && match[1]) {
        try { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(decodeURIComponent(match[1])) + '&sz=w1200'; }
        catch (_) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(match[1]) + '&sz=w1200'; }
      }
    }
    return value;
  }
  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(function (item) {
      if (!item || typeof item !== 'object') return item;
      var copy = Object.assign({}, item);
      if (typeof copy.img === 'string') copy.img = normalizeImage(copy.img);
      return copy;
    });
  }
  function apiError(response, data) {
    return (data && (data.error || data.message)) || ('Catalogue API failed (' + response.status + ')');
  }
  async function postNow(key, data) {
    var response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save', key: key, data: data,
        password: sessionStorage.getItem('hc_admin_password') || ''
      })
    });
    var result = await response.json().catch(function () { return null; });
    if (!response.ok || !result || !result.ok) throw new Error(apiError(response, result));
    if (result.catalog && Array.isArray(result.catalog[key])) {
      setLocal(key, normalizeItems(result.catalog[key]));
    } else {
      setLocal(key, normalizeItems(data));
    }
    return result;
  }
  function post(key, data) {
    var snapshot = Array.isArray(data) ? data.slice() : [];
    var task = queues[key].catch(function () {}).then(function () { return postNow(key, snapshot); });
    queues[key] = task.catch(function () {});
    return task;
  }

  window.hcSaveSharedCatalog = post;

  // Admin uses save(key, value) for products/offers. Keep its local write and mirror to cloud.
  if (typeof window.save === 'function' && !window.save.__hcSharedWrapped) {
    var originalSave = window.save;
    var wrappedSave = function (key, value) {
      var result = originalSave.apply(this, arguments);
      if (key === 'hc_products' || key === 'hc_offers') {
        var catalogKey = key === 'hc_products' ? 'products' : 'offers';
        post(catalogKey, value).catch(function (error) {
          console.error('Shared catalogue save failed:', error);
          alert('Saved only in this browser. Cloud sync failed: ' + (error.message || error) + '. Please check the connection and retry.');
        });
      }
      return result;
    };
    wrappedSave.__hcSharedWrapped = true;
    window.save = wrappedSave;
  }

  async function boot() {
    try {
      var response = await fetch(API, { cache: 'no-store' });
      var data = await response.json().catch(function () { return null; });
      if (!response.ok || !data || !data.ok || !data.catalog) throw new Error(apiError(response, data));

      var remoteProducts = normalizeItems(data.catalog.products);
      var remoteOffers = normalizeItems(data.catalog.offers);
      var localProducts = local('products');
      var localOffers = local('offers');
      var password = sessionStorage.getItem('hc_admin_password') || '';
      var changed = false;

      // If cloud is empty, only an authenticated Admin page may bootstrap local data.
      if (!remoteProducts.length && localProducts.length && password) {
        await post('products', localProducts);
        remoteProducts = local('products');
      } else if (remoteProducts.length && !same(localProducts, remoteProducts)) {
        setLocal('products', remoteProducts); changed = true;
      }
      if (!remoteOffers.length && localOffers.length && password) {
        await post('offers', localOffers);
        remoteOffers = local('offers');
      } else if (remoteOffers.length && !same(localOffers, remoteOffers)) {
        setLocal('offers', remoteOffers); changed = true;
      }

      // Public pages read localStorage during initial parsing, so reload once after cloud data changes.
      if (changed && !sessionStorage.getItem('hc_catalog_reloaded')) {
        sessionStorage.setItem('hc_catalog_reloaded', '1');
        location.reload();
        return;
      }
      sessionStorage.removeItem('hc_catalog_reloaded');
      document.documentElement.setAttribute('data-hc-catalog-sync', 'connected');
    } catch (error) {
      console.warn('Harshiyaan catalogue sync unavailable:', error);
      document.documentElement.setAttribute('data-hc-catalog-sync', 'offline');
    }
  }

  window.hcSyncCatalogNow = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
