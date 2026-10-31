// 後から差し替える値はこのファイルだけに置く。

export const AFFILIATE = {
  amazonTag: "", // 例: "yourid-22"。空なら tag なしのリンクを出す
  rakutenPrefix: "", // ASP 承認後に設定。提携リンクの形式を確認してから app.js の buildLinks に反映する
};

// 購入後に使用頻度は想定より落ちる、という当サイトの仮定(統計的事実ではない)
export const USAGE_DECAY = 0.5;

// 3年後の残存価値の目安(価格に対する割合)
export const RESALE_RATE = 0.3;

// 補正後1回あたりコストが below 円未満ならそのランク。上から順に判定する
export const RANK_THRESHOLDS = [
  { rank: "S", below: 100 },
  { rank: "A", below: 500 },
  { rank: "B", below: 2000 },
  { rank: "C", below: Infinity },
];

export const RANK_LABELS = {
  S: "買って正解だった",
  A: "悪くない買い物だった",
  B: "元は取れていない。使い方次第だった",
  C: "引き出しの奥にある",
};

// 同額換算の体験。unitPrice 円で1 unit
export const EXPERIENCES = [
  { label: "外食(ディナー)", unitPrice: 5000, unit: "回" },
  { label: "国内ひとり旅", unitPrice: 30000, unit: "回" },
  { label: "映画", unitPrice: 2000, unit: "本" },
];

// 入力の上限。極端な値で表示が崩れるのを防ぐ
export const LIMITS = {
  priceMax: 100000000,
  monthlyMax: 1000,
  monthsMax: 600,
  nameMax: 100,
  reasonMax: 200,
};

export const DISCLOSURE =
  "当サイトはアフィリエイト広告を含みます。判定は広告収益と無関係に計算しています";
