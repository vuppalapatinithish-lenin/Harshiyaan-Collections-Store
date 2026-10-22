/* Shared catalogue bridge. Single-write queue, Drive image URL handling, and safe retry of local pending changes. */
(function () {
  'use strict';
  var API = 'https://harshiyaan-collections-store.vercel.app/api/catalog';
  var keys = { products: 'hc_products', offers: 'hc_offers' };
  var writeQueue = Promise.resolve();

  function storageKey(key) { return 'hc_' + key; }
  function pendingKey(key) { return 'hc_catalog_pending_' + key; }
  function local(key) {
    try { var value = JSON.parse(localStorage.getItem(storageKey(key)) || '[]'); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function setLocal(key, value) { localStorage.setItem(storageKey(key), JSON.stringify(value)); }
  function same(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (_) { return false; } }
  function normalizeImage(value) {
    if (typeof value !== 'string' || !value) return value || '';
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
    return Array.isArray(items) ? items.map(function (item) {
      if (!item || typeof item !== 'object') return item;
      var copy = Object.assign({}, item);
      if (typeof copy.img === 'string') copy.img = normalizeImage(copy.img);
      return copy;
    }) : [];
  }
  async function readJson(response) {
    var raw = await response.text();
    try { return JSON.parse(raw); }
    catch (_) { throw new Error('Catalogue API returned non-JSON (HTTP ' + response.status + '): ' + raw.replace(/\s+/g, ' ').slice(0, 160)); }
  }
  function identity(key, item) {
    if (!item) return '';
    if (key === 'products') return String(item.id == null ? '' : item.id);
    return String(item.id != null ? item.id : (item.productId == null ? '' : item.productId));
  }
  function mergeLocalAdditions(key, remote, localItems) {
    var merged = [], positions = Object.create(null);
    (Array.isArray(remote) ? remote : []).forEach(function (item) {
      var id = identity(key, item);
      if (!id) { merged.push(item); return; }
      positions[id] = merged.length; merged.push(item);
    });
    (Array.isArray(localItems) ? localItems : []).forEach(function (item) {
      var id = identity(key, item);
      if (!id || !Object.prototype.hasOwnProperty.call(positions, id)) {
        if (id) positions[id] = merged.length;
        merged.push(item);
      }
    });
    return merged;
  }
  async function postNow(key, data) {
    var response = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', key: key, data: data, password: sessionStorage.getItem('hc_admin_password') || '' })
    });
    var result = await readJson(response);
    if (!response.ok || !result || result.ok !== true) throw new Error((result && (result.error || result.message)) || ('Catalogue save failed (HTTP ' + response.status + ')'));
    if (result.catalog && Array.isArray(result.catalog[key])) setLocal(key, normalizeItems(result.catalog[key]));
    else setLocal(key, normalizeItems(data));
    localStorage.removeItem(pendingKey(key));
    return result;
  }
  function saveSharedCatalog(key, data) {
    if (!Object.prototype.hasOwnProperty.call(keys, key)) return Promise.reject(new Error('Invalid catalogue key: ' + key));
    var snapshot;
    try { snapshot = JSON.parse(JSON.stringify(data)); }
    catch (_) { return Promise.reject(new Error('Could not snapshot catalogue before saving.')); }
    if (!Array.isArray(snapshot)) return Promise.reject(new Error('Catalogue data must be an array.'));
    var task = writeQueue.catch(function () {}).then(function () { return postNow(key, snapshot); });
    writeQueue = task.catch(function () {});
    return task;
  }
  window.hcSaveSharedCatalog = saveSharedCatalog;

  // The repaired admin explicitly calls persistCatalog(). Return this promise from save()
  // so persistCatalog can await it and does not issue a second POST.
  if (typeof window.save === 'function' && !window.save.__hcSharedWrapped) {
    var originalSave = window.save;
    var wrappedSave = function (key, value) {
      originalSave.apply(this, arguments);
      if (key === 'hc_products' || key === 'hc_offers') {
        var catalogKey = key === 'hc_products' ? 'products' : 'offers';
        return saveSharedCatalog(catalogKey, value).catch(function (error) {
          localStorage.setItem(pendingKey(catalogKey), '1');
          throw error;
        });
      }
      return undefined;
    };
    wrappedSave.__hcSharedWrapped = true;
    window.save = wrappedSave;
  }

  async function boot() {
    try {
      var response = await fetch(API, { cache: 'no-store' });
      var data = await readJson(response);
      if (!response.ok || !data || data.ok !== true || !data.catalog) throw new Error((data && data.error) || ('Catalogue fetch failed (HTTP ' + response.status + ')'));
      var remote = { products: normalizeItems(data.catalog.products), offers: normalizeItems(data.catalog.offers) };
      var canAdmin = !!sessionStorage.getItem('hc_admin_password');
      var changed = false;
      for (var key of ['products', 'offers']) {
        var localItems = local(key);
        var hasPending = localStorage.getItem(pendingKey(key)) === '1';
        if (canAdmin && (hasPending || (!remote[key].length && localItems.length))) {
          await saveSharedCatalog(key, localItems);
          remote[key] = local(key);
          changed = true;
          continue;
        }
        if (canAdmin && remote[key].length && localItems.length > remote[key].length) {
          var merged = mergeLocalAdditions(key, remote[key], localItems);
          if (merged.length > remote[key].length) {
            await saveSharedCatalog(key, merged);
            remote[key] = local(key);
            changed = true;
            continue;
          }
        }
        if (localStorage.getItem(pendingKey(key)) === '1' && !canAdmin) continue;
        if (!same(localItems, remote[key])) { setLocal(key, remote[key]); changed = true; }
      }
      if (changed && !sessionStorage.getItem('hc_catalog_reloaded')) {
        sessionStorage.setItem('hc_catalog_reloaded', '1'); location.reload(); return;
      }
      sessionStorage.removeItem('hc_catalog_reloaded');
      document.documentElement.setAttribute('data-hc-catalog-sync', 'connected');
    } catch (error) {
      console.warn('Harshiyaan catalogue sync unavailable:', error);
      document.documentElement.setAttribute('data-hc-catalog-sync', 'offline');
    }
  }
  window.hcSyncCatalogNow = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
