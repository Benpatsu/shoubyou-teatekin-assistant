(function () {
  'use strict';

  /**
   * 重要:
   * - まず fieldCode モードを設定する（最も安定）
   * - 未設定時のみ labelText フォールバックを使う
   */
  var CONFIG = {
    // フィールドコードが分かる場合はこちらを使う（推奨）
    // 例: base: { fieldCode: 'TOTAL_OURS' }
    base: { fieldCode: '', labelText: '当社売上合計' },
    targets: [
      { fieldCode: '', labelText: '当社売上合計', occurrence: 1 },
      { fieldCode: '', labelText: '当社売上税額', occurrence: 0 }
    ],

    fineTunePx: 0,
    shiftScale: 0.65,
    maxShiftPx: 72,
    debug: false
  };

  var MARK_ATTR = 'data-k-mobile-align-shift';
  var rafId = null;
  var observer = null;

  function log() {
    if (!CONFIG.debug || !window.console) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[k-mobile-align]');
    console.log.apply(console, args);
  }

  function toArray(nodes) {
    return Array.prototype.slice.call(nodes || []);
  }

  function normalize(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function clampRight(px) {
    var v = Math.max(0, px);
    var max = Number(CONFIG.maxShiftPx || 0);
    if (!max || max < 0) return v;
    return Math.min(v, max);
  }

  function left(el) {
    return el.getBoundingClientRect().left;
  }

  function findByFieldCode(fieldCode) {
    if (!fieldCode) return null;
    var root = document.querySelector('[data-field-code="' + fieldCode + '"]');
    if (!root) return null;
    // innerが移動しやすい
    return root.querySelector('div, span') || root;
  }

  function findByLabel(labelText, occurrence) {
    var target = normalize(labelText);
    var nodes = toArray(document.querySelectorAll('div, span, th, td, label')).filter(function (el) {
      return normalize(el.textContent) === target;
    });
    var node = nodes[occurrence || 0];
    if (!node || !node.closest) return null;

    var cell =
      node.closest('.subtable-cell-gaia') ||
      node.closest('.recordlist-cell-gaia') ||
      node.closest('td') ||
      node.closest('th');

    if (!cell) return node;
    return cell.querySelector('div, span') || cell.firstElementChild || cell;
  }

  function resolveTarget(def) {
    return findByFieldCode(def.fieldCode) || findByLabel(def.labelText, def.occurrence);
  }

  function clearShift() {
    toArray(document.querySelectorAll('[' + MARK_ATTR + ']')).forEach(function (el) {
      el.removeAttribute(MARK_ATTR);
      el.style.removeProperty('position');
      el.style.removeProperty('left');
      el.style.removeProperty('transform');
      el.style.removeProperty('transition');
    });
  }

  function applyShift(el, rawDelta) {
    var scaled = Math.round(rawDelta * Number(CONFIG.shiftScale || 1));
    var delta = clampRight(scaled + Number(CONFIG.fineTunePx || 0));

    el.setAttribute(MARK_ATTR, '1');
    el.style.setProperty('position', 'relative', 'important');
    el.style.setProperty('left', delta + 'px', 'important');
    el.style.setProperty('transform', 'translateX(' + delta + 'px)', 'important');
    el.style.setProperty('transition', 'none', 'important');

    log('shift applied', { rawDelta: rawDelta, scaled: scaled, final: delta, el: el });
  }

  function applyAlignment() {
    clearShift();

    var baseEl = resolveTarget(CONFIG.base);
    if (!baseEl) {
      log('base not found. fieldCode推奨。');
      return;
    }

    var baseLeft = left(baseEl);

    CONFIG.targets.forEach(function (targetDef) {
      var targetEl = resolveTarget(targetDef);
      if (!targetEl) {
        log('target not found', targetDef);
        return;
      }

      var rawDelta = Math.round(baseLeft - left(targetEl));
      applyShift(targetEl, rawDelta);
    });
  }

  function scheduleApply() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () {
      rafId = null;
      applyAlignment();
    });
  }

  function start() {
    window.__kMobileAlignLoaded = true;
    if (observer) observer.disconnect();

    if (window.MutationObserver && document.body) {
      observer = new MutationObserver(scheduleApply);
      observer.observe(document.body, { childList: true, subtree: true, attributes: false });
    }

    setTimeout(scheduleApply, 0);
    setTimeout(scheduleApply, 100);
    setTimeout(scheduleApply, 250);
    setTimeout(scheduleApply, 600);
  }

  kintone.events.on([
    'mobile.app.record.create.show',
    'mobile.app.record.edit.show',
    'mobile.app.record.detail.show'
  ], function (event) {
    start();
    return event;
  });
})();
