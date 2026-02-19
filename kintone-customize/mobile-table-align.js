(function () {
  'use strict';

  /**
   * スマホで「変わらない」対策版
   * 優先順位:
   *  1) fieldCode
   *  2) sectionText + labelText
   *  3) labelText + occurrence
   */
  var CONFIG = {
    base: {
      fieldCode: '',
      sectionText: '税込合計',
      labelText: '当社売上合計',
      occurrence: 0
    },
    targets: [
      { fieldCode: '', sectionText: '税別', labelText: '当社売上合計', occurrence: 1 },
      { fieldCode: '', sectionText: '税額(10%)', labelText: '当社売上税額', occurrence: 0 }
    ],

    fineTunePx: 0,
    shiftScale: 0.75,
    maxShiftPx: 96,

    // true にするとコンソールに検出状況を出力
    debug: true
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

  function qAll() {
    return toArray(document.querySelectorAll('div, span, th, td, label'));
  }

  function findTextNodes(text) {
    var t = normalize(text);
    return qAll().filter(function (el) {
      return normalize(el.textContent) === t;
    });
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

  function top(el) {
    return el.getBoundingClientRect().top;
  }

  function findByFieldCode(fieldCode) {
    if (!fieldCode) return null;
    var root = document.querySelector('[data-field-code="' + fieldCode + '"]');
    if (!root) return null;
    return root.querySelector('div, span') || root;
  }

  function findNearestCell(node) {
    if (!node || !node.closest) return null;
    var cell =
      node.closest('.subtable-cell-gaia') ||
      node.closest('.recordlist-cell-gaia') ||
      node.closest('td') ||
      node.closest('th');
    if (!cell) return node;
    return cell.querySelector('div, span') || cell.firstElementChild || cell;
  }

  function findByLabel(labelText, occurrence) {
    var nodes = findTextNodes(labelText);
    var node = nodes[occurrence || 0];
    if (!node) return null;
    return findNearestCell(node);
  }

  function findBySectionAndLabel(sectionText, labelText) {
    if (!sectionText || !labelText) return null;

    var sectionNodes = findTextNodes(sectionText);
    if (!sectionNodes.length) return null;

    sectionNodes.sort(function (a, b) { return top(a) - top(b); });
    var sectionNode = sectionNodes[0];
    var sectionTop = top(sectionNode);

    var knownSectionTops = [];
    var allSectionNames = [CONFIG.base.sectionText].concat(CONFIG.targets.map(function (x) { return x.sectionText; }));
    allSectionNames.forEach(function (name) {
      if (!name) return;
      findTextNodes(name).forEach(function (n) {
        var t = top(n);
        if (t > sectionTop) knownSectionTops.push(t);
      });
    });
    knownSectionTops.sort(function (a, b) { return a - b; });
    var nextTop = knownSectionTops.length ? knownSectionTops[0] : Infinity;

    var candidates = findTextNodes(labelText).filter(function (n) {
      var t = top(n);
      return t > sectionTop && t < nextTop;
    });

    if (!candidates.length) return null;
    candidates.sort(function (a, b) { return top(a) - top(b); });
    return findNearestCell(candidates[0]);
  }

  function resolve(def) {
    var byCode = findByFieldCode(def.fieldCode);
    if (byCode) {
      log('resolved by fieldCode', def.fieldCode);
      return byCode;
    }

    var bySection = findBySectionAndLabel(def.sectionText, def.labelText);
    if (bySection) {
      log('resolved by section+label', def.sectionText, def.labelText);
      return bySection;
    }

    var byLabel = findByLabel(def.labelText, def.occurrence);
    if (byLabel) {
      log('resolved by label+occurrence', def.labelText, def.occurrence);
      return byLabel;
    }

    return null;
  }

  function clearShift() {
    toArray(document.querySelectorAll('[' + MARK_ATTR + ']')).forEach(function (el) {
      el.removeAttribute(MARK_ATTR);
      el.style.removeProperty('position');
      el.style.removeProperty('left');
      el.style.removeProperty('transform');
      el.style.removeProperty('transition');
      el.style.removeProperty('outline');
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

    if (CONFIG.debug) {
      el.style.setProperty('outline', '1px dashed #2b8a3e', 'important');
    }

    log('shift applied', { rawDelta: rawDelta, scaled: scaled, final: delta });
  }

  function applyAlignment() {
    clearShift();

    var baseEl = resolve(CONFIG.base);
    if (!baseEl) {
      log('base not found', CONFIG.base);
      return;
    }

    var baseLeft = left(baseEl);
    log('base left', baseLeft);

    CONFIG.targets.forEach(function (targetDef, idx) {
      var targetEl = resolve(targetDef);
      if (!targetEl) {
        log('target not found', idx, targetDef);
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
