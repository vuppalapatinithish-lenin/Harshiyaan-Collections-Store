/* Shared catalogue bridge for Harshiyaan Collections.
   Keeps the current admin UI/localStorage renderers, serializes catalogue writes,
   and reports cloud failures without silently losing the local edit. */
(function () {
  'use strict';

  var API = 'https://harshiyaan-collections-store.vercel.app/api/catalog';
  var keys = { products: 'hc_products', offers: 'hc_offers' };
  var writeQueue = Promise.resolve();

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
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch (_) { return false; }
  }

  async function postNow(key, data) {
    var response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        key: key,
        data: data,
        password: sessionStorage.getItem('hc_admin_password') || ''
      })
    });

    var raw = await response.text();
    var result;
    try { result = JSON.parse(raw); }
    catch (_) {
      throw new Error('Catalogue API returned a non-JSON response (HTTP ' + response.status + '): ' + raw.replace(/\s+/g, ' ').slice(0, 180));
    }

    if (!response.ok || !result || result.ok !== true) {
      throw new Error((result && result.error) || ('Catalogue save failed (HTTP ' + response.status + ')'));
    }
    if (result.catalog && Array.isArray(result.catalog[key])) {
      setLocal(key, result.catalog[key]);
    }
    return result;
  }

  // Serialize full-catalogue writes so near-simultaneous product/offer changes
  // do not overwrite each other when both POST requests read/write the same file.
  function saveSharedCatalog(key, data) {
    if (!Object.prototype.hasOwnProperty.call(keys, key)) {
      return Promise.reject(new Error('Invalid catalogue key: ' + key));
    }
    var snapshot;
    try { snapshot = JSON.parse(JSON.stringify(data)); }
    catch (_) { return Promise.reject(new Error('Catalogue data could not be copied.')); }
    if (!Array.isArray(snapshot)) return Promise.reject(new Error('Catalogue data must be an array.'));

    var task = writeQueue.catch(function () {}).then(function () {
      return postNow(key, snapshot);
    });
    writeQueue = task.catch(function () {});
    return task;
  }

  window.hcSaveSharedCatalog = saveSharedCatalog;

  // Wrap the legacy local save helper exactly once. Local state is saved first,
  // and the returned Promise allows add/edit/delete handlers to await cloud sync.
  if (typeof window.save === 'function' && !window.save.__hcSharedWrapped) {
    var originalSave = window.save;
    var wrappedSave = function (storageKey, value) {
      originalSave(storageKey, value);
      if (storageKey === 'hc_products' || storageKey === 'hc_offers') {
        var catalogueKey = storageKey === 'hc_products' ? 'products' : 'offers';
        return saveSharedCatalog(catalogueKey, value);
      }
      return undefined;
    };
    wrappedSave.__hcSharedWrapped = true;
    window.save = wrappedSave;
  }

  async function boot() {
    try {
      var response = await fetch(API, { cache: 'no-store' });
      var raw = await response.text();
      var data;
      try { data = JSON.parse(raw); }
      catch (_) { throw new Error('Catalogue API returned a non-JSON response (HTTP ' + response.status + ').'); }
      if (!response.ok || !data.ok || !data.catalog) {
        throw new Error(data.error || ('Catalogue fetch failed (HTTP ' + response.status + ')'));
      }

      var remote = data.catalog;
      var localProducts = local('products');
      var localOffers = local('offers');
      var canMigrateLocal = !!sessionStorage.getItem('hc_admin_password');

      // Migrate this authenticated admin browser's data only when cloud arrays are empty.
      if ((!Array.isArray(remote.products) || !remote.products.length) && localProducts.length && canMigrateLocal) {
        await saveSharedCatalog('products', localProducts);
      } else if (Array.isArray(remote.products) && !same(localProducts, remote.products)) {
        setLocal('products', remote.products);
      }

      if ((!Array.isArray(remote.offers) || !remote.offers.length) && localOffers.length && canMigrateLocal) {
        await saveSharedCatalog('offers', localOffers);
      } else if (Array.isArray(remote.offers) && !same(localOffers, remote.offers)) {
        setLocal('offers', remote.offers);
      }

      var changed = !same(localProducts, local('products')) || !same(localOffers, local('offers'));
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
