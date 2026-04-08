/**
 * site-admin.js — floating in-page editor for MedStudy
 *
 * Features:
 *  • Click the ✏️ gear button (bottom-right) to open admin panel
 *  • Rename any card title/subtitle shown on the page
 *  • Configure sidebar "placeholder" subject slots (name + colour)
 *  • All edits stored in localStorage under key 'ms_admin'
 *  • Edits apply live and persist across page refreshes
 */
(function () {
  'use strict';

  var STORE_KEY = 'ms_admin';

  /* ─── Load / Save ─────────────────────────────────────────────────────── */
  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveData(d) {
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  }

  /* ─── Apply stored card overrides ────────────────────────────────────── */
  function applyCardEdits() {
    var data = loadData();
    var overrides = data.cards || {};
    document.querySelectorAll('a.card[href]').forEach(function (card) {
      var key = cardKey(card);
      if (!overrides[key]) return;
      var o = overrides[key];
      var titleEl = card.querySelector('.card-title');
      var subEl   = card.querySelector('.card-sub');
      if (titleEl && o.title !== undefined) titleEl.textContent = o.title;
      if (subEl   && o.sub   !== undefined) subEl.textContent   = o.sub;
    });
  }

  function cardKey(card) {
    // Use href + page path as stable key
    var page = location.pathname.replace(/.*\//, '') || 'index.html';
    return page + '|' + card.getAttribute('href');
  }

  /* ─── Apply sidebar placeholder entries ──────────────────────────────── */
  function applyPlaceholders() {
    var data = loadData();
    var slots = data.placeholders || [];
    // Remove existing auto-placeholder items
    document.querySelectorAll('.sb-placeholder').forEach(function (el) { el.remove(); });
    if (!slots.length) return;

    // Find the sidebar nav section list — last <ul> in .sb
    var sb = document.querySelector('.sb');
    if (!sb) return;
    var uls = sb.querySelectorAll('ul');
    var targetUl = uls[uls.length - 1];
    if (!targetUl) return;

    slots.forEach(function (slot) {
      if (!slot.name) return;
      var li = document.createElement('li');
      li.className = 'sb-placeholder';
      li.style.cssText = 'opacity:.45;cursor:default';
      li.innerHTML =
        '<a href="#" onclick="return false" style="pointer-events:none">' +
        '<span class="sb-dot" style="background:' + (slot.color || '#555') + ';opacity:.6"></span>' +
        slot.name +
        '</a>';
      targetUl.appendChild(li);
    });
  }

  /* ─── Build Admin Panel UI ───────────────────────────────────────────── */
  function buildPanel() {
    var data = loadData();

    // ── Gear button ──
    var btn = document.createElement('button');
    btn.id = 'ms-admin-btn';
    btn.innerHTML = '✏️';
    btn.title = 'Edit page (admin)';
    btn.style.cssText = [
      'position:fixed;bottom:22px;right:22px;z-index:9999',
      'width:40px;height:40px;border-radius:50%;border:none',
      'background:rgba(30,30,36,.85);backdrop-filter:blur(8px)',
      'color:#fff;font-size:1rem;cursor:pointer',
      'box-shadow:0 2px 12px rgba(0,0,0,.5)',
      'display:flex;align-items:center;justify-content:center',
      'transition:transform .15s'
    ].join(';');

    // ── Panel ──
    var panel = document.createElement('div');
    panel.id = 'ms-admin-panel';
    panel.style.cssText = [
      'position:fixed;bottom:72px;right:22px;z-index:9999',
      'width:320px;max-height:70vh;overflow-y:auto',
      'background:#1a1a22;border:1px solid #2a2a36;border-radius:14px',
      'padding:18px;box-shadow:0 8px 32px rgba(0,0,0,.6)',
      'display:none;font-family:Inter,system-ui,sans-serif;font-size:.88rem;color:#e0e0e8'
    ].join(';');

    panel.innerHTML = buildPanelHTML(data);

    btn.addEventListener('click', function () {
      var open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : 'block';
      if (!open) panel.innerHTML = buildPanelHTML(loadData());
      bindPanelEvents(panel);
    });

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  function buildPanelHTML(data) {
    var cards = document.querySelectorAll('a.card[href]');
    var overrides = data.cards || {};
    var slots = data.placeholders || [];

    var cardRows = '';
    cards.forEach(function (card) {
      var key = cardKey(card);
      var o = overrides[key] || {};
      var titleEl = card.querySelector('.card-title');
      var subEl   = card.querySelector('.card-sub');
      var curTitle = o.title !== undefined ? o.title : (titleEl ? titleEl.textContent : '');
      var curSub   = o.sub   !== undefined ? o.sub   : (subEl   ? subEl.textContent   : '');
      cardRows += [
        '<div style="margin-bottom:14px;border-bottom:1px solid #2a2a36;padding-bottom:14px">',
        '  <div style="font-size:.75rem;color:#666;margin-bottom:4px">',
          card.getAttribute('href') + '</div>',
        '  <input data-card-key="' + esc(key) + '" data-field="title"',
          ' value="' + esc(curTitle) + '"',
          ' placeholder="Card title"',
          ' style="' + inputStyle() + 'margin-bottom:5px">',
        '  <input data-card-key="' + esc(key) + '" data-field="sub"',
          ' value="' + esc(curSub) + '"',
          ' placeholder="Subtitle"',
          ' style="' + inputStyle() + '">',
        '</div>'
      ].join('');
    });

    var slotRows = '';
    for (var i = 0; i < Math.max(slots.length, 2); i++) {
      var s = slots[i] || { name: '', color: '#555' };
      slotRows += [
        '<div style="display:flex;gap:6px;margin-bottom:6px">',
        '  <input data-slot="' + i + '" data-field="name"',
          ' value="' + esc(s.name) + '"',
          ' placeholder="Subject name (leave blank to hide)"',
          ' style="' + inputStyle() + 'flex:1">',
        '  <input data-slot="' + i + '" data-field="color"',
          ' type="color"',
          ' value="' + esc(s.color || '#5b8fd9') + '"',
          ' style="width:34px;height:34px;border:none;border-radius:6px;',
            'cursor:pointer;background:transparent">',
        '</div>'
      ].join('');
    }

    return [
      '<div style="display:flex;justify-content:space-between;align-items:center;',
        'margin-bottom:16px">',
      '  <span style="font-weight:700;font-size:.95rem">⚙️ Page Editor</span>',
      '  <button id="ms-admin-save" style="',
          'background:#3b82f6;color:#fff;border:none;border-radius:8px;',
          'padding:5px 14px;cursor:pointer;font-size:.82rem;font-weight:600">',
          'Save</button>',
      '</div>',

      cards.length ? [
        '<div style="font-weight:600;margin-bottom:8px;color:#aaa;',
          'font-size:.78rem;letter-spacing:.06em;text-transform:uppercase">',
          'Cards on this page</div>',
        cardRows
      ].join('') : '',

      '<div style="font-weight:600;margin-bottom:8px;color:#aaa;margin-top:4px;',
        'font-size:.78rem;letter-spacing:.06em;text-transform:uppercase">',
        'Sidebar placeholders</div>',
      '<div style="font-size:.75rem;color:#555;margin-bottom:8px">',
        'Add future subjects to the sidebar (greyed out)</div>',
      slotRows,

      '<button id="ms-admin-add-slot" style="',
          'background:#2a2a36;color:#aaa;border:none;border-radius:8px;',
          'padding:4px 10px;cursor:pointer;font-size:.8rem;margin-top:4px">',
          '+ Add slot</button>',

      '<div style="margin-top:14px;border-top:1px solid #2a2a36;padding-top:10px;',
        'text-align:right">',
        '<button id="ms-admin-clear" style="',
          'background:transparent;color:#e05;border:none;cursor:pointer;',
          'font-size:.78rem">Clear all edits</button>',
      '</div>'
    ].join('');
  }

  function bindPanelEvents(panel) {
    var saveBtn  = panel.querySelector('#ms-admin-save');
    var clearBtn = panel.querySelector('#ms-admin-clear');
    var addSlot  = panel.querySelector('#ms-admin-add-slot');

    if (saveBtn) saveBtn.addEventListener('click', function () {
      var data = loadData();
      if (!data.cards) data.cards = {};
      if (!data.placeholders) data.placeholders = [];

      // Card edits
      panel.querySelectorAll('[data-card-key]').forEach(function (inp) {
        var key   = inp.getAttribute('data-card-key');
        var field = inp.getAttribute('data-field');
        if (!data.cards[key]) data.cards[key] = {};
        data.cards[key][field] = inp.value;
      });

      // Placeholder slots
      var maxSlot = -1;
      panel.querySelectorAll('[data-slot]').forEach(function (inp) {
        maxSlot = Math.max(maxSlot, parseInt(inp.getAttribute('data-slot'), 10));
      });
      var slots = [];
      for (var i = 0; i <= maxSlot; i++) {
        var nameEl  = panel.querySelector('[data-slot="' + i + '"][data-field="name"]');
        var colorEl = panel.querySelector('[data-slot="' + i + '"][data-field="color"]');
        slots.push({
          name:  nameEl  ? nameEl.value  : '',
          color: colorEl ? colorEl.value : '#555'
        });
      }
      data.placeholders = slots.filter(function (s) { return s.name.trim(); });

      saveData(data);
      applyCardEdits();
      applyPlaceholders();

      // Brief feedback
      saveBtn.textContent = '✓ Saved';
      saveBtn.style.background = '#22c55e';
      setTimeout(function () {
        saveBtn.textContent = 'Save';
        saveBtn.style.background = '#3b82f6';
      }, 1500);
    });

    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (confirm('Clear all page edits? This cannot be undone.')) {
        localStorage.removeItem(STORE_KEY);
        location.reload();
      }
    });

    if (addSlot) addSlot.addEventListener('click', function () {
      var data = loadData();
      if (!data.placeholders) data.placeholders = [];
      data.placeholders.push({ name: '', color: '#5b8fd9' });
      saveData(data);
      panel.innerHTML = buildPanelHTML(data);
      bindPanelEvents(panel);
    });
  }

  /* ─── Helpers ─────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function inputStyle() {
    return [
      'width:100%;padding:6px 10px;border-radius:7px;',
      'border:1px solid #2a2a36;background:#0c0c0e;',
      'color:#e0e0e8;font-size:.84rem;',
      'outline:none;box-sizing:border-box;display:block;'
    ].join('');
  }

  /* ─── Init ────────────────────────────────────────────────────────────── */
  function init() {
    applyCardEdits();
    applyPlaceholders();
    buildPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
