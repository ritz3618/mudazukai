# 3年後の自分からの手紙(仮称)

欲しい物の情報を入力すると、3年後の自分から「手紙」が届くサイト。仕様は [SPEC.md](SPEC.md)。
素の HTML / CSS / JavaScript のみ。ビルド工程もバックエンドもなく、入力内容は送信・保存しない。

## ローカルで確認する

`app.js` と `config.js` は ES Modules のため、`index.html` をダブルクリック(`file://`)で開くと
ブラウザの CORS 制限で動かない。簡易サーバーを立てる。

```bash
python3 -m http.server 8000
```

`http://localhost:8000/` を開く。

## 公開する(GitHub Pages)

1. リポジトリの Settings → Pages で、公開するブランチとルート(`/`)を選ぶ
2. 数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

静的ファイルだけなので、他の静的ホスティング(Cloudflare Pages、Netlify など)でもそのまま置ける。

## 後から差し替える値(config.js)

| 値 | 用途 |
|---|---|
| `AFFILIATE.amazonTag` | Amazon アソシエイトのトラッキング ID。空なら tag なしのリンク |
| `AFFILIATE.rakutenPrefix` | 楽天 ASP の提携リンク用。承認後、提携リンクの形式を確認して `app.js` の `buildLinks` に反映する(現状は未使用) |
| `USAGE_DECAY` | 購入後の使用頻度の補正係数(当サイトの仮定) |
| `RESALE_RATE` | 3年後の残存価値の目安の割合 |
| `RANK_THRESHOLDS` | S/A/B/C のしきい値(補正後1回あたりコスト) |
| `EXPERIENCES` | 同額換算に使う体験と単価 |
| `LIMITS` | 入力の上限値 |

手紙の文面は `letters.js`。ランクごとにテンプレートを足すと、抽選の候補が増える。

## 運用メモ

- 判定ロジックは広告収益に影響されない。リンクは判定の後に表示するだけ
- 開示文(「当サイトはアフィリエイト広告を含みます…」)は ID の設定有無にかかわらず常に表示する(SPEC §8 の受け入れ条件を優先)
- 手紙・入力値はすべて `textContent` で描画する。`innerHTML` は使わない
- 外部へのネットワークアクセスは、リンクをクリックしたときだけ。Web フォントや解析タグを足さないこと
