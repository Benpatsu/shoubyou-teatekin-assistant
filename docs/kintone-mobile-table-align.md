# kintone モバイル版テーブル開始位置合わせ（GitHub Pages運用版）

表示が変わらない時は、まず **loaderは動いているが対象検出が外れている** ことが多いです。  
この版は検出を 3段階（fieldCode → section+label → label+occurrence）にしてあります。

- 実体: `kintone-customize/mobile-table-align.js`
- loader: `kintone-customize/mobile-table-align-loader.js`
- Pagesデプロイ: `.github/workflows/deploy-pages.yml`

---

## 1) kintone に登録する URL（Benpatsu さん用）

```text
https://benpatsu.github.io/shoubyou-teatekin-assistant/kintone-customize/mobile-table-align-loader.js
```

---

## 2) いますぐ確認（最重要）

1. モバイル画面で DevTools を開く
2. `window.__kMobileAlignLoaded` を実行
3. `true` なら loader + 本体JSは実行中

---

## 3) 今回の実装ポイント

### 検出優先順位

1. `fieldCode`（最優先）
2. `sectionText + labelText`
3. `labelText + occurrence`

### デバッグ可視化

`debug: true` のとき、適用対象に緑の点線枠を表示します。

---

## 4) CONFIG（初期値）

```javascript
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
  debug: true
};
```

- まず `debug: true` のまま動作確認
- 枠が出るなら検出は成功。位置だけ `shiftScale` / `fineTunePx` で調整
- 枠が出ないなら fieldCode を入れる（最優先）

---

## 5) fieldCode を使う例

```javascript
base: { fieldCode: 'our_sales_total', sectionText: '税込合計', labelText: '当社売上合計', occurrence: 0 },
targets: [
  { fieldCode: 'our_sales_total_sub', sectionText: '税別', labelText: '当社売上合計', occurrence: 1 },
  { fieldCode: 'our_sales_tax_10', sectionText: '税額(10%)', labelText: '当社売上税額', occurrence: 0 }
]
```

