/* ============================================================
   EPM Prototype — persistence store (makes the demo FUNCTIONAL)
   Plain script (no JSX) loaded BEFORE the babel app scripts so
   window.EPMStore and window.usePersistedState exist when the
   React components mount.

   The reference design already performs real edits in component
   state; this layer lifts that mutable data into a single
   localStorage-backed store so every add / edit / save / delete /
   workflow transition SURVIVES navigation and reload.
   ============================================================ */
(function () {
  var KEY = 'epm_live_v2';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }

  var saveTimer = null;
  function persist() {
    // debounce writes so rapid typing doesn't thrash localStorage
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }, 120);
  }

  var Store = {
    has: function (k) { return Object.prototype.hasOwnProperty.call(state, k); },
    get: function (k, fb) {
      if (Store.has(k)) return state[k];
      return typeof fb === 'function' ? fb() : fb;
    },
    set: function (k, v) { state[k] = v; persist(); },
    del: function (k) { delete state[k]; persist(); },
    reset: function () {
      state = {};
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    },
    all: function () { return state; },
  };
  window.EPMStore = Store;

  /* usePersistedState(key, initial)
     Drop-in replacement for React.useState that reads from and writes
     to the store. Supports updater-function setters and re-syncs when
     `key` changes (e.g. scoping by contract). */
  window.usePersistedState = function (key, initial) {
    var R = window.React;
    var resolve = function () { return typeof initial === 'function' ? initial() : initial; };
    var coerce = function (g) { return (g === null || g === undefined) ? resolve() : g; };
    var pair = R.useState(function () { return coerce(Store.get(key, resolve)); });
    var v = pair[0], setV = pair[1];
    var kref = R.useRef(key);
    R.useEffect(function () {
      if (kref.current !== key) {
        kref.current = key;
        setV(coerce(Store.has(key) ? Store.get(key) : resolve()));
      }
    }, [key]);
    R.useEffect(function () { Store.set(key, v); }, [key, v]);
    return [v, setV];
  };

  /* ---- field-level edit persistence (form fields across all modules) ----
     DProjectDetail stamps the current project id; DField reads/writes its
     saved value by (project, scope, field-label) so edits persist + display
     after reload without threading state through every module. */
  window.__epmPid = 'na';
  window.epmFieldGet = function (scope, labelEn, fallback) {
    var k = 'field.' + window.__epmPid + '.' + scope + '.' + labelEn;
    return Store.has(k) ? Store.get(k) : fallback;
  };
  window.epmFieldSet = function (scope, labelEn, val) {
    Store.set('field.' + window.__epmPid + '.' + scope + '.' + labelEn, val);
  };

  /* ---- collection overlay: merge persisted collections onto a rebuilt `d`
     so every module reads the same source of truth (cross-module
     consistency). Called by DProjectDetail after buildProjectDetail. ---- */
  window.epmOverlayD = function (base, pid) {
    if (!base) return base;
    // map each detail collection to the store key its module writes
    var map = { variationOrders: 'vo.rows.', boq: 'boq.rows.', risks: 'risks.rows.', meetings: 'meetings.rows.', drawings: 'drawings.rows.v2.', payments: 'payments.rows.' };
    Object.keys(map).forEach(function (col) {
      var k = map[col] + pid;
      // only overlay a valid persisted array — a null/undefined stored value
      // (e.g. from a reset) must fall back to the seed, never blank the collection
      if (Store.has(k)) { var sv = Store.get(k); if (Array.isArray(sv)) base[col] = sv; }
    });
    // apply persisted field edits onto the field sections
    var applyFields = function (scope, section) {
      if (!section || !section.fields) return;
      section.fields.forEach(function (f) {
        var v = window.epmFieldGet(scope, f.label && f.label.en, undefined);
        if (v !== undefined) f.value = v;
      });
    };
    applyFields('profile', base.profile);
    applyFields('entity', base.entity);
    applyFields('consultant', base.consultant);
    applyFields('contractor', base.contractor);
    applyFields('financial', base.financial);
    // contract sections are nested per-contract; apply the shared 'contract'
    // and 'contractor' scopes to every contract's field set + the singular one
    (base.contracts || []).forEach(function (c) { applyFields('contract', c); if (c.contractor) applyFields('contractor', c.contractor); });
    if (base.contract) applyFields('contract', base.contract);
    return base;
  };

  /* Convenience: reset the whole demo (also wired to a UI button). */
  window.epmResetData = function () { Store.reset(); };

  /* Keyboard escape hatch: Ctrl/Cmd + Shift + R resets the demo data. */
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      if (confirm('إعادة ضبط كل البيانات التجريبية؟ / Reset all demo data?')) Store.reset();
    }
  });
})();
