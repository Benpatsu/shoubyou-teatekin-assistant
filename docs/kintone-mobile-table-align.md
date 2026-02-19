# kintone モバイル版テーブル開始位置合わせ（GitHub Pages運用版）

もちろん可能です。  
今回は **GitHub Pages でそのまま配信できる形** を用意しました。

- 実体: `kintone-customize/mobile-table-align.js`
- loader: `kintone-customize/mobile-table-align-loader.js`
- Pagesデプロイ: `.github/workflows/deploy-pages.yml`

---

## 1) まず GitHub Pages を有効化

このリポジトリに push すると、`work` ブランチをトリガーに
GitHub Actions が Pages へデプロイします。

ワークフロー: `.github/workflows/deploy-pages.yml`

---

## 2) kintone に登録する URL

kintone（スマホ用JavaScript）には **loader のURLだけ** 登録します。

```text
https://<GitHubユーザー名>.github.io/<リポジトリ名>/kintone-customize/mobile-table-align-loader.js
```

例（リポジトリ名が `shoubyou-teatekin-assistant` の場合）:

```text
https://<GitHubユーザー名>.github.io/shoubyou-teatekin-assistant/kintone-customize/mobile-table-align-loader.js
```

---

## 3) loader がやっていること

- 自分自身（loader.js）の URL から同じディレクトリを特定
- 同じ場所の `mobile-table-align.js` を読み込み
- `?v=...` を付けてキャッシュを軽減

つまり、**kintone 側URLは固定のまま**、`mobile-table-align.js` を更新するだけで反映運用できます。

---

## 4) align 本体（fieldCode 優先）

`mobile-table-align.js` の `CONFIG` で、可能なら `fieldCode` を埋めてください。
`labelText` より安定します。

```javascript
var CONFIG = {
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
```
