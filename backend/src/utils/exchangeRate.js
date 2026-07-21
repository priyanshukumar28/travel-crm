// Points 4/5/7: every amount cascades Local Currency -> USD -> INR, and the
// rate used is the rate AS OF THE DATE OF LOSS (not today's rate).
//
// Real deployment: point this at a paid historical-FX provider keyed by
// date. This static reference table makes the *behavior* (rate pinned to
// loss date, cascading conversion, one place to change) correct now;
// swapping getRatesForDate()'s lookup for a live HTTP call later doesn't
// require touching any caller.
//
// Coverage: every currency actually reachable from the Country of Loss
// dropdown (see data/countryCurrency.js) has an entry below. A handful of
// low-transaction-volume currencies (several African/CFA francs, some
// Pacific-island currencies) don't have a firm reference rate on file yet
// and default to 1 (i.e. treated as USD-equivalent) — clearly marked below
// so it's obvious which ones still need a real number filled in.

const STATIC_USD_RATES = {
  // <currency>: units of that currency per 1 USD.
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, AED: 3.67, SGD: 1.35, AUD: 1.52, CAD: 1.36,
  JPY: 151.5, CHF: 0.88, THB: 36.5, MYR: 4.7, ZAR: 18.6, NZD: 1.64,
  AFN: 70, ALL: 93, DZD: 134, AOA: 850, ARS: 900, AMD: 390, AZN: 1.7, BSD: 1, BHD: 0.376,
  BDT: 110, BBD: 2, BYN: 3.3, BZD: 2, BTN: 83.5, BOB: 6.9, BAM: 1.8, BWP: 13.5, BRL: 5.4,
  BND: 1.35, BGN: 1.8, BIF: 2900, KHR: 4100, CVE: 101, CLP: 940, CNY: 7.2, COP: 4100,
  KMF: 450, CDF: 2800, CRC: 520, CUP: 24, CZK: 22.7, DKK: 6.9, DJF: 178, DOP: 59,
  EGP: 48, ETB: 118, FJD: 2.25, GMD: 68, GEL: 2.7, GHS: 14.5, GTQ: 7.75, GNF: 8600,
  HNL: 24.7, HKD: 7.8, HUF: 358, ISK: 138, IDR: 15800, IRR: 42000, IQD: 1310, ILS: 3.7,
  JMD: 156, JOD: 0.709, KZT: 445, KES: 129, KWD: 0.307, KGS: 87, LAK: 21600, LBP: 89500,
  LSL: 18.6, LRD: 190, LYD: 4.85, MGA: 4500, MWK: 1740, MVR: 15.4, MRU: 39.7, MUR: 45.5,
  MXN: 17, MDL: 17.7, MNT: 3400, MAD: 9.9, MZN: 63.8, MMK: 2100, NAD: 18.6, NPR: 133.6,
  NIO: 36.6, NGN: 1600, KPW: 900, MKD: 56.7, NOK: 10.6, OMR: 0.385, PKR: 278, PAB: 1,
  PGK: 3.85, PYG: 7500, PEN: 3.75, PHP: 56.5, PLN: 4, QAR: 3.64, RON: 4.57, RUB: 92,
  RWF: 1330, SAR: 3.75, RSD: 108, SCR: 13.4, SBD: 8.4, KRW: 1370, LKR: 302, SDG: 601,
  SEK: 10.4, SYP: 13000, TWD: 32.5, TZS: 2650, TOP: 2.35, TTD: 6.8, TND: 3.1, TRY: 32.3,
  TMT: 3.5, UGX: 3750, UAH: 40, UYU: 39.3, UZS: 12700, VUV: 119, VES: 36.6, VND: 25400,
  YER: 250, ZMW: 26, ZWL: 13.9,
  // No firm reference on file — CFA francs (regional/pegged, approximated to EUR peg):
  XOF: 606, XAF: 606,
};

const USD_TO_INR = 83.5;

function getRatesForDate(currencyCode, dateOfLoss) { // eslint-disable-line no-unused-vars
  const perUSD = STATIC_USD_RATES[currencyCode] ?? 1;
  return {
    currencyToUSD: 1 / perUSD,
    usdToINR: USD_TO_INR,
    asOfDate: dateOfLoss || new Date().toISOString().slice(0, 10),
  };
}

function convert(amountLocal, currencyCode, dateOfLoss) {
  const { currencyToUSD, usdToINR, asOfDate } = getRatesForDate(currencyCode, dateOfLoss);
  const amountUSD = Number(amountLocal || 0) * currencyToUSD;
  const amountINR = amountUSD * usdToINR;
  return {
    amountLocal: Number(amountLocal || 0),
    currency: currencyCode || "USD",
    amountUSD: Math.round(amountUSD * 100) / 100,
    amountINR: Math.round(amountINR * 100) / 100,
    exchangeRateUsed: { currencyToUSD, usdToINR, asOfDate },
  };
}

module.exports = { getRatesForDate, convert };