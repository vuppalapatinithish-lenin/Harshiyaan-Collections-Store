/* Shared catalogue bridge. Keeps the existing page design and localStorage-based renderers. */
(function () {
  'use strict';
  var API = 'https://harshiyaan-collections-store.vercel.app/api/catalog';
  var keys = { products: 'hc_products', offers: 'hc_offers' };
  function local(key) { try { var x = JSON.parse(localStorage.getItem(keys[key]) || '[]'); return Array.isArray(x) ? x : []; } catch (_) { return []; } }
  function setLocal(key, value) { localStorage.setItem(keys[key], JSON.stringify(value)); }
  function same(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; } }
  async function post(key, data) {
    var r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', key: key, data: data, password: sessionStorage.getItem('hc_admin_password') || '' }) });
    var d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || 'Catalogue save failed');
    if (d.catalog && Array.isArray(d.catalog[key])) setLocal(key, d.catalog[key]);
    return d;
  }
  // Expose for the Admin save wrapper.
  window.hcSaveSharedCatalog = post;
  // Mirror legacy Admin catalogue saves to the shared API.
  if (typeof window.save === 'function' && !window.save.__hcSharedWrapped) {
    var originalSave = window.save;
    var wrappedSave = function (key, value) {
      originalSave(key, value);
      if (key === 'hc_products' || key === 'hc_offers') {
        var catalogKey = key === 'hc_products' ? 'products' : 'offers';
        post(catalogKey, value).catch(function (err) {
          console.error('Shared catalogue save failed:', err);
          alert('Saved only in this browser. Cloud sync failed: ' + (err.message || err) + '. Please retry after checking the deployment.');
        });
      }
    };
    wrappedSave.__hcSharedWrapped = true;
    window.save = wrappedSave;
  }
  // Admin uses a legacy save(key, value) helper; keep its local behavior and mirror catalogue saves.
  if (typeof window.save === 'function' && !window.save.__hcSharedWrapped) {
    var originalSave = window.save;
    var wrappedSave = function (key, value) {
      originalSave(key, value);
      if (key === 'hc_products' || key === 'hc_offers') {
        var catalogKey = key === 'hc_products' ? 'products' : 'offers';
        post(catalogKey, value).catch(function (err) {
          console.error('Shared catalogue save failed:', err);
          alert('Saved only in this browser. Cloud sync failed: ' + (err.message || err) + '. Please retry after checking the deployment.');
        });
      }
    };
    wrappedSave.__hcSharedWrapped = true;
    window.save = wrappedSave;
  }
  async function boot() {
    try {
      var r = await fetch(API, { cache: 'no-store' });
      var d = await r.json();
      if (!r.ok || !d.ok || !d.catalog) throw new Error(d.error || 'Catalogue fetch failed');
      var remote = d.catalog;
      var localProducts = local('products'), localOffers = local('offers');
      // One-time bootstrap: if cloud catalogue is empty, migrate this admin browser's existing data.
      if ((!remote.products || !remote.products.length) && localProducts.length && sessionStorage.getItem('hc_admin_password')) {
        await post('products', localProducts); remote.products = local('products');
      } else if (Array.isArray(remote.products) && !same(localProducts, remote.products)) setLocal('products', remote.products);
      if ((!remote.offers || !remote.offers.length) && localOffers.length && sessionStorage.getItem('hc_admin_password')) {
        await post('offers', localOffers); remote.offers = local('offers');
      } else if (Array.isArray(remote.offers) && !same(localOffers, remote.offers)) setLocal('offers', remote.offers);
      // Current inline renderers read localStorage during page startup. Reload once if data changed.
      var changed = !same(localProducts, local('products')) || !same(localOffers, local('offers'));
      if (changed && !sessionStorage.getItem('hc_catalog_reloaded')) {
        sessionStorage.setItem('hc_catalog_reloaded', '1'); location.reload(); return;
      }
      sessionStorage.removeItem('hc_catalog_reloaded');
      document.documentElement.setAttribute('data-hc-catalog-sync', 'connected');
    } catch (err) {
      console.warn('Harshiyaan catalogue sync unavailable:', err);
      document.documentElement.setAttribute('data-hc-catalog-sync', 'offline');
    }
  }
  window.hcSyncCatalogNow = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
