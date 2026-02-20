(function () {
  'use strict';

  /**
   * kintone モバイル版 テーブル位置揃え
   *
   * 日報入力アプリ: 3番目(税別)・4番目(税額(10%))のテーブルの
   * 開始位置を、2番目テーブル(税込合計)の「当社売上合計」に揃える。
   *
   * ローダー統合版 — kintone にはこのファイルの URL のみ登録する。
   */

  // ── 設定 ──────────────────────────────────────────────
  var CONFIG = {
    // 基準: 税込合計テーブル内の「当社売上合計」ラベル
    base: {
      sectionLabel: '税込合計',           // テーブルのセクション名
      targetLabel: '当社売上合計'        // 位置を取るラベル名
    },

    // シフト対象テーブル
    targets: [
      { sectionLabel: '税別' },
      { sectionLabel: '税額(10%)' }
    ],

    // リトライ (ms): DOM描画やプラグインの遅延に対応
    retryDelays: [0, 200, 500, 1000, 2000, 3500],

    debug: false
  };

  var APPLIED_ATTR = 'data-k-mobile-align-done';
  var debounceTimer = null;
  var observer = null;
  var isApplying = false;

  // ── ヘルパー ───────────────────────────────────────────

  function log() {
    if (!CONFIG.debug || !window.console) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[k-mobile-align]');
    console.log.apply(console, args);
  }

  /** 末端テキストノードのみを対象に検索（子要素を持たない要素） */
  function findLeafByText(text) {
    var all = document.querySelectorAll(
      '.control-label-gaia, .subtable-label-gaia, ' +
      '.label-text-gaia, label, span, th'
    );
    var results = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var t = el.textContent.replace(/\s+/g, '').trim();
      if (t === text.replace(/\s+/g, '').trim()) {
        results.push(el);
      }
    }
    return results;
  }

  /** 一番近い subtable-gaia コンテナを返す */
  function closestSubtable(el) {
    if (!el) return null;
    // .closest() がない環境用フォールバック
    if (el.closest) return el.closest('.subtable-gaia');
    var node = el;
    while (node && node !== document) {
      if (node.classList && node.classList.contains('subtable-gaia')) return node;
      node = node.parentElement;
    }
    return null;
  }

  /**
   * sectionLabel を含む subtable-gaia コンテナを見つける。
   * セクション名ラベル（税込合計, 税別, 税額(10%) etc.）は
   * テーブルの直前の group-label 要素にある場合と、
   * テーブル内のヘッダに埋め込まれる場合がある。
   *
   * 戦略:
   *   1) セクション名のラベル要素を探す
   *   2) ラベルの次の兄弟/直後にある subtable-gaia を取得
   *   3) ラベル自体が subtable-gaia 内にある場合はその親テーブル
   */
  function findSubtableBySectionLabel(sectionLabel) {
    var sectionNodes = findLeafByText(sectionLabel);
    log('findSubtable:', sectionLabel, '→ candidates:', sectionNodes.length);

    for (var i = 0; i < sectionNodes.length; i++) {
      var node = sectionNodes[i];

      // ケースA: ラベルが subtable-gaia の中にある
      var parent = closestSubtable(node);
      if (parent) {
        log('  found inside subtable');
        return parent;
      }

      // ケースB: ラベルが group-label で、次の兄弟が subtable
      // セクション名 → 親をたどり → 兄弟要素で subtable-gaia を探す
      var walker = node;
      for (var depth = 0; depth < 5; depth++) {
        if (!walker.parentElement) break;
        walker = walker.parentElement;

        // walker の次兄弟を探す
        var sibling = walker.nextElementSibling;
        while (sibling) {
          if (sibling.classList && sibling.classList.contains('subtable-gaia')) {
            log('  found as next sibling');
            return sibling;
          }
          // subtable-gaia が子に含まれる場合
          var inner = sibling.querySelector('.subtable-gaia');
          if (inner) {
            log('  found inside next sibling');
            return inner;
          }
          sibling = sibling.nextElementSibling;
        }
      }
    }
    return null;
  }

  /**
   * 指定された subtable コンテナ内で targetLabel のラベルを探す。
   * 見つかったラベル要素を返す。
   */
  function findLabelInSubtable(subtableEl, targetLabel) {
    if (!subtableEl) return null;
    var labels = subtableEl.querySelectorAll(
      '.control-label-gaia, .label-text-gaia, label, span'
    );
    var target = targetLabel.replace(/\s+/g, '').trim();
    for (var i = 0; i < labels.length; i++) {
      var t = labels[i].textContent.replace(/\s+/g, '').trim();
      if (t === target) return labels[i];
    }
    return null;
  }

  /**
   * subtable 全体が既にシフト済みかどうか
   */
  function isAlreadyShifted(subtableEl) {
    return subtableEl && subtableEl.getAttribute(APPLIED_ATTR) === '1';
  }

  // ── メインロジック ──────────────────────────────────────

  function clearAllShifts() {
    var shifted = document.querySelectorAll('[' + APPLIED_ATTR + ']');
    for (var i = 0; i < shifted.length; i++) {
      shifted[i].removeAttribute(APPLIED_ATTR);
      shifted[i].style.removeProperty('margin-left');
      shifted[i].style.removeProperty('outline');
    }
  }

  function applyAlignment() {
    if (isApplying) return;
    isApplying = true;

    try {
      clearAllShifts();

      // ── 基準位置を取得 ──
      var baseSubtable = findSubtableBySectionLabel(CONFIG.base.sectionLabel);
      if (!baseSubtable) {
        log('❌ base subtable not found for:', CONFIG.base.sectionLabel);
        return;
      }
      var baseLabel = findLabelInSubtable(baseSubtable, CONFIG.base.targetLabel);
      if (!baseLabel) {
        log('❌ base label not found:', CONFIG.base.targetLabel, 'in', CONFIG.base.sectionLabel);
        return;
      }

      var baseLeft = baseLabel.getBoundingClientRect().left;
      log('✓ base found:', CONFIG.base.targetLabel, 'left=', baseLeft);

      // ── 各ターゲットをシフト ──
      CONFIG.targets.forEach(function (targetDef, idx) {
        var targetSubtable = findSubtableBySectionLabel(targetDef.sectionLabel);
        if (!targetSubtable) {
          log('❌ target subtable not found:', targetDef.sectionLabel);
          return;
        }

        // ターゲットテーブル内の先頭ラベルの位置を取得
        var firstLabel = targetSubtable.querySelector(
          '.control-label-gaia, .label-text-gaia'
        );
        if (!firstLabel) {
          log('❌ no label in target subtable:', targetDef.sectionLabel);
          return;
        }

        var targetLeft = firstLabel.getBoundingClientRect().left;
        var shift = baseLeft - targetLeft;

        if (Math.abs(shift) < 2) {
          log('→ target', idx, 'already aligned, skip');
          return;
        }

        // margin-left でシフト（transform より安定）
        targetSubtable.style.setProperty('margin-left', shift + 'px', 'important');
        targetSubtable.setAttribute(APPLIED_ATTR, '1');

        if (CONFIG.debug) {
          targetSubtable.style.setProperty('outline', '2px dashed #2b8a3e', 'important');
        }

        log('✓ target', idx, '(' + targetDef.sectionLabel + ') shifted by', shift, 'px');
      });

    } finally {
      isApplying = false;
    }
  }

  /** デバウンス付きの適用スケジュール */
  function scheduleApply() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      applyAlignment();
    }, 100);
  }

  /** 初期化: リトライ付きで適用 + MutationObserver */
  function start() {
    window.__kMobileAlignLoaded = true;
    log('start()');

    // 既存 observer を切断
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // リトライ: プラグインやDOMの遅延描画に対応
    CONFIG.retryDelays.forEach(function (delay) {
      setTimeout(function () {
        log('retry at', delay, 'ms');
        applyAlignment();
      }, delay);
    });

    // MutationObserver: DOM変更に追従（デバウンス付き）
    if (window.MutationObserver && document.body) {
      observer = new MutationObserver(function (mutations) {
        // 自分のシフトによる変更は無視
        var selfCaused = mutations.every(function (m) {
          return m.type === 'attributes' &&
            (m.attributeName === 'style' || m.attributeName === APPLIED_ATTR);
        });
        if (selfCaused) return;
        scheduleApply();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  }

  // ── kintone イベント登録 ──────────────────────────────

  kintone.events.on([
    'mobile.app.record.create.show',
    'mobile.app.record.edit.show',
    'mobile.app.record.detail.show'
  ], function (event) {
    start();
    return event;
  });

})();
