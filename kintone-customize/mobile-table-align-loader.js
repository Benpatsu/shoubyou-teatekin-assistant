(function () {
  'use strict';

  /**
   * GitHub Pages 前提の loader。
   * kintone にはこの loader.js の URL だけ登録する。
   * 実体 mobile-table-align.js を同じディレクトリから読み込む。
   */

  function currentScriptUrl() {
    if (document.currentScript && document.currentScript.src) return document.currentScript.src;

    var scripts = document.getElementsByTagName('script');
    if (!scripts.length) return '';
    return scripts[scripts.length - 1].src || '';
  }

  function resolveRuntimeScriptUrl() {
    var src = currentScriptUrl();
    if (!src) return 'mobile-table-align.js';

    var clean = src.split('#')[0].split('?')[0];
    var baseDir = clean.slice(0, clean.lastIndexOf('/') + 1);
    return baseDir + 'mobile-table-align.js';
  }

  // キャッシュ対策: 5分単位で更新
  var cacheKey = String(Math.floor(Date.now() / (1000 * 60 * 5)));
  var runtimeUrl = resolveRuntimeScriptUrl();

  var script = document.createElement('script');
  script.src = runtimeUrl + '?v=' + encodeURIComponent(cacheKey);
  script.async = false;
  document.head.appendChild(script);
})();
