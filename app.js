import {
  AFFILIATE,
  USAGE_DECAY,
  RESALE_RATE,
  RANK_THRESHOLDS,
  RANK_LABELS,
  EXPERIENCES,
  LIMITS,
  DISCLOSURE,
} from "./config.js";
import { LETTERS, SIGNATURES, experienceLine, reasonLine } from "./letters.js";

const $ = (id) => document.getElementById(id);

const numberFormat = new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 });

let state = null; // { values, calc, rank, ctx, lastTemplate }

// ---- 入力 ----------------------------------------------------------

function parseInteger(raw, label, max) {
  const s = raw.normalize("NFKC").trim(); // 全角数字を半角にそろえる
  if (s === "") return { error: `${label}を入力してください。` };
  if (/^[-−ー]/.test(s)) {
    return { error: `${label}は1以上の整数で入力してください(マイナスは使えません)。` };
  }
  if (!/^\d+$/.test(s)) {
    return { error: `${label}は数字だけで入力してください(カンマ・小数点・単位は不要です)。` };
  }
  const n = Number(s);
  if (n < 1) return { error: `${label}は1以上の整数で入力してください(0は使えません)。` };
  if (n > max) return { error: `${label}は${max.toLocaleString("ja-JP")}以下で入力してください。` };
  return { value: n };
}

function parseText(raw, label, max, required) {
  const s = raw.trim();
  if (required && s === "") return { error: `${label}を入力してください。` };
  if ([...s].length > max) return { error: `${label}は${max}文字以内で入力してください。` };
  return { value: s };
}

function readForm() {
  const results = {
    name: parseText($("name").value, "商品名", LIMITS.nameMax, true),
    price: parseInteger($("price").value, "価格", LIMITS.priceMax),
    monthly: parseInteger($("monthly").value, "月に使う回数", LIMITS.monthlyMax),
    months: parseInteger($("months").value, "使う予定の期間", LIMITS.monthsMax),
    reason: parseText($("reason").value, "買う理由", LIMITS.reasonMax, false),
  };
  const values = {};
  let firstInvalid = null;
  for (const [key, r] of Object.entries(results)) {
    $(`err-${key}`).textContent = r.error ?? "";
    if (r.error) {
      $(key).setAttribute("aria-invalid", "true");
      firstInvalid ??= $(key);
    } else {
      $(key).removeAttribute("aria-invalid");
      values[key] = r.value;
    }
  }
  return firstInvalid ? { firstInvalid } : { values };
}

// ---- 計算 ----------------------------------------------------------

function calculate({ price, monthly, months }) {
  const totalExpected = monthly * months;
  const totalAdjusted = totalExpected * USAGE_DECAY;
  return {
    totalExpected,
    totalAdjusted,
    expected: price / totalExpected,
    adjusted: price / totalAdjusted,
    resale: price * RESALE_RATE,
  };
}

function rankOf(costPerUse) {
  return RANK_THRESHOLDS.find((t) => costPerUse < t.below).rank;
}

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 同額で買える体験。切り捨てて1未満のものは出さない。最大2つ
function pickExperiences(price) {
  const available = EXPERIENCES.map((e) => ({
    label: e.label,
    unit: e.unit,
    count: Math.floor(price / e.unitPrice),
  })).filter((e) => e.count >= 1);
  return shuffle(available).slice(0, 2);
}

function yen(x) {
  const r = Math.round(x);
  return r < 1 ? "1円未満" : `${r.toLocaleString("ja-JP")}円`;
}

// 3年後の今日。うるう日などで存在しない日付になる場合は月末に丸める
function threeYearsLater(now = new Date()) {
  const y = now.getFullYear() + 3;
  const m = now.getMonth();
  const d = new Date(y, m, now.getDate());
  return d.getMonth() === m ? d : new Date(y, m + 1, 0);
}

function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function buildContext(values, calc, rank) {
  return {
    name: values.name,
    reason: values.reason,
    rank,
    price: yen(values.price),
    expected: yen(calc.expected),
    adjusted: yen(calc.adjusted),
    gap: yen(calc.adjusted - calc.expected),
    monthly: numberFormat.format(values.monthly),
    months: numberFormat.format(values.months),
    totalExpected: numberFormat.format(calc.totalExpected),
    totalAdjusted: numberFormat.format(calc.totalAdjusted),
    experiences: [], // renderLetter が引くたびに選び直す
  };
}

// ---- リンク --------------------------------------------------------

// 孤立サロゲートがあると encodeURIComponent が例外を投げるので置き換える
function encode(text) {
  const wellFormed = text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "�",
  );
  return encodeURIComponent(wellFormed);
}

function buildLinks(name) {
  const q = encode(name);
  const amazon = `https://www.amazon.co.jp/s?k=${q}` +
    (AFFILIATE.amazonTag ? `&tag=${encode(AFFILIATE.amazonTag)}` : "");
  // TODO: AFFILIATE.rakutenPrefix は ASP 承認後に提携リンク形式を確認して反映する
  const rakuten = `https://search.rakuten.co.jp/search/mall/${q}/`;
  return {
    alternatives: [
      { text: "中古で探す(メルカリ)", href: `https://jp.mercari.com/search?keyword=${q}` },
      { text: "まず借りて試す(レンタルを検索)", href: `https://www.google.com/search?q=${encode(`${name} レンタル`)}` },
    ],
    buy: [
      { text: "Amazon で探す", href: amazon },
      { text: "楽天で探す", href: rakuten },
    ],
  };
}

function externalLink(text, href) {
  const a = document.createElement("a");
  a.textContent = text;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer sponsored";
  return a;
}

function fillLinks(listId, links) {
  const ul = $(listId);
  ul.replaceChildren(
    ...links.map((l) => {
      const li = document.createElement("li");
      li.append(externalLink(l.text, l.href));
      return li;
    }),
  );
}

// ---- 描画 ----------------------------------------------------------

function restartAnimation(el, className) {
  el.classList.remove("again");
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  if (className) el.classList.add(className);
}

function renderLetter(replay) {
  const { rank, ctx } = state;
  const templates = LETTERS[rank];
  let index;
  do {
    index = Math.floor(Math.random() * templates.length);
  } while (templates.length > 1 && index === state.lastTemplate);
  state.lastTemplate = index;

  ctx.experiences = pickExperiences(state.values.price);
  const t = templates[index];
  const paragraphs = [t.opening(ctx), t.cost(ctx)];
  if (ctx.experiences.length > 0) paragraphs.push(experienceLine(ctx));
  if (ctx.reason) paragraphs.push(reasonLine(ctx));
  paragraphs.push(t.closing(ctx));

  $("letter-body").replaceChildren(
    ...paragraphs.map((text) => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }),
  );
  $("letter-date").textContent = formatDate(threeYearsLater());
  $("letter-sign").textContent = SIGNATURES[Math.floor(Math.random() * SIGNATURES.length)];
  if (replay) restartAnimation($("letter"), "again");
}

function renderShare() {
  const { rank, calc } = state;
  const text = `3年後の自分からの手紙が届いた。判定は${rank}ランク(${RANK_LABELS[rank]})、補正後の1回あたりコストは${yen(calc.adjusted)}。`;
  const url = `${location.origin}${location.pathname}`;
  $("share").href = `https://x.com/intent/post?text=${encode(text)}&url=${encode(url)}`;
}

function renderResult() {
  const { values, calc, rank } = state;
  $("result").hidden = false;
  restartAnimation($("envelope").querySelector(".envelope-flap"));
  restartAnimation($("letter"));
  renderLetter(false);

  $("s-rank").textContent = `${rank}(${RANK_LABELS[rank]})`;
  $("s-expected").textContent = yen(calc.expected);
  $("s-adjusted").textContent = yen(calc.adjusted);
  $("s-resale").textContent = `約${yen(calc.resale)}`;

  const links = buildLinks(values.name);
  fillLinks("links-alt", links.alternatives);
  fillLinks("links-buy", links.buy);
  renderShare();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("result").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

// ---- イベント ------------------------------------------------------

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const parsed = readForm();
  if (parsed.firstInvalid) {
    parsed.firstInvalid.focus();
    return;
  }
  const calc = calculate(parsed.values);
  const rank = rankOf(calc.adjusted);
  state = {
    values: parsed.values,
    calc,
    rank,
    ctx: buildContext(parsed.values, calc, rank),
    lastTemplate: -1,
  };
  renderResult();
});

for (const key of ["name", "price", "monthly", "months", "reason"]) {
  $(key).addEventListener("input", () => {
    $(`err-${key}`).textContent = "";
    $(key).removeAttribute("aria-invalid");
  });
}

$("reroll").addEventListener("click", () => {
  if (state) renderLetter(true);
});

$("disclosure").textContent = DISCLOSURE;
$("footer-disclosure").textContent = DISCLOSURE;
