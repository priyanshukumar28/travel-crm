// Points 4/5/7/8/9: every amount cascades Local Currency -> USD -> INR, and
// the rate used is the rate AS OF THE DATE OF LOSS (not today's rate).
//
// Point 8: calls currencyapi.net's Historical Rates endpoint (v2) when
// EXCHANGE_RATE_API_KEY is configured, falling back to the static table
// below if no key is set, the API errors, the plan doesn't include
// historical data, or the request times out — the app never breaks even
// if the FX provider has an outage. Results are cached in-memory per date
// so a claim with 5 coverages on the same Date of Loss makes ONE outbound
// call, not five (historical rates for a past date never change anyway).
//
// Provider: currencyapi.net — GET /api/v2/history?key=...&date=YYYY-MM-DD&base=USD&output=json
//   -> { valid: true, base: "USD", date: "...", rates: { INR: 83.1, EUR: 0.92, ... } }
// (A currency with no data for that date comes back as `null` in `rates` —
// handled below by falling through to the static table for that currency.)

const STATIC_USD_RATES = {
  // <currency>: units of that currency per 1 USD.
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 96.45, AED: 3.67, SGD: 1.35, AUD: 1.52, CAD: 1.36,
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
  XOF: 606, XAF: 606,
};

const USD_TO_INR_STATIC = 96.45;

// date string -> { rates: {CODE: perUSD}, fetchedAt }
const rateCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — historical rates for a past date never change, but keep it bounded

function buildHistoricalUrl(dateStr) {
  const apiUrl = process.env.EXCHANGE_RATE_API_BASE_URL || "https://currencyapi.net/api/v2/history";
  const key = process.env.EXCHANGE_RATE_API_KEY;
  const params = new URLSearchParams({ key, date: dateStr, base: "USD", output: "json" });
  return `${apiUrl}?${params.toString()}`;
}

async function fetchLiveRates(dateStr) {
  const cached = rateCache.get(dateStr);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.rates;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(buildHistoricalUrl(dateStr), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`FX API responded ${res.status}`);
    const data = await res.json();
    if (!data.valid || !data.rates) throw new Error(`Unexpected FX API response (valid=${data.valid})`);
    rateCache.set(dateStr, { rates: data.rates, fetchedAt: Date.now() });
    return data.rates;
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[exchangeRate] Live FX fetch failed for ${dateStr}, falling back to static table:`, err.message);
    return null;
  }
}

// Returns { currencyToUSD, usdToINR, asOfDate, source: "live"|"static" }
async function getRatesForDate(currencyCode, dateOfLoss) {
  const asOfDate = dateOfLoss || new Date().toISOString().slice(0, 10);
  const code = currencyCode || "USD";

  if (process.env.EXCHANGE_RATE_API_KEY) {
    const liveRates = await fetchLiveRates(asOfDate);
    if (liveRates && liveRates[code] && liveRates.INR) {
      return {
        currencyToUSD: 1 / liveRates[code],
        usdToINR: liveRates.INR,
        asOfDate,
        source: "live",
      };
    }
  }

  const perUSD = STATIC_USD_RATES[code] ?? 1;
  return {
    currencyToUSD: 1 / perUSD,
    usdToINR: USD_TO_INR_STATIC,
    asOfDate,
    source: "static",
  };
}

async function convert(amountLocal, currencyCode, dateOfLoss) {
  const { currencyToUSD, usdToINR, asOfDate, source } = await getRatesForDate(currencyCode, dateOfLoss);
  const amountUSD = Number(amountLocal || 0) * currencyToUSD;
  const amountINR = amountUSD * usdToINR;
  return {
    amountLocal: Number(amountLocal || 0),
    currency: currencyCode || "USD",
    amountUSD: Math.round(amountUSD * 100) / 100,
    amountINR: Math.round(amountINR * 100) / 100,
    exchangeRateUsed: { currencyToUSD, usdToINR, asOfDate, source },
  };
}

module.exports = { getRatesForDate, convert };