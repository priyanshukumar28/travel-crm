// Point 23 — exact country + currency table from the client's PDF.
// COUNTRIES is the dropdown list for Country of Loss (order preserved from
// source). CURRENCY_BY_COUNTRY maps each to its primary ISO currency code
// (a few countries list two currencies in the source — the first/primary
// one is used, e.g. Panama -> PAB not USD, El Salvador -> USD not BTC).
const CURRENCY_BY_COUNTRY = {
  "Afghanistan": "AFN", "Albania": "ALL", "Algeria": "DZD", "Andorra": "EUR", "Angola": "AOA",
  "Argentina": "ARS", "Armenia": "AMD", "Australia": "AUD", "Austria": "EUR", "Azerbaijan": "AZN",
  "Bahamas": "BSD", "Bahrain": "BHD", "Bangladesh": "BDT", "Barbados": "BBD", "Belarus": "BYN",
  "Belgium": "EUR", "Belize": "BZD", "Benin": "XOF", "Bhutan": "BTN", "Bolivia": "BOB",
  "Bosnia & Herzegovina": "BAM", "Botswana": "BWP", "Brazil": "BRL", "Brunei": "BND", "Bulgaria": "BGN",
  "Burkina Faso": "XOF", "Burundi": "BIF", "Cambodia": "KHR", "Cameroon": "XAF", "Canada": "CAD",
  "Cape Verde": "CVE", "Central African Republic": "XAF", "Chad": "XAF", "Chile": "CLP", "China": "CNY",
  "Colombia": "COP", "Comoros": "KMF", "Congo (DRC)": "CDF", "Costa Rica": "CRC", "Croatia": "EUR",
  "Cuba": "CUP", "Cyprus": "EUR", "Czech Republic": "CZK", "Denmark": "DKK", "Djibouti": "DJF",
  "Dominican Republic": "DOP", "Ecuador": "USD", "Egypt": "EGP", "El Salvador": "USD", "Ethiopia": "ETB",
  "Eurozone": "EUR", "Fiji": "FJD", "Finland": "EUR", "France": "EUR", "Gabon": "XAF",
  "Gambia": "GMD", "Georgia": "GEL", "Germany": "EUR", "Ghana": "GHS", "Greece": "EUR",
  "Guatemala": "GTQ", "Guinea": "GNF", "Honduras": "HNL", "Hong Kong": "HKD", "Hungary": "HUF",
  "Iceland": "ISK", "India": "INR", "Indonesia": "IDR", "Iran": "IRR", "Iraq": "IQD",
  "Ireland": "EUR", "Israel": "ILS", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY",
  "Jordan": "JOD", "Kazakhstan": "KZT", "Kenya": "KES", "Kuwait": "KWD", "Kyrgyzstan": "KGS",
  "Laos": "LAK", "Latvia": "EUR", "Lebanon": "LBP", "Lesotho": "LSL", "Liberia": "LRD",
  "Libya": "LYD", "Liechtenstein": "CHF", "Lithuania": "EUR", "Luxembourg": "EUR", "Madagascar": "MGA",
  "Malawi": "MWK", "Malaysia": "MYR", "Maldives": "MVR", "Mali": "XOF", "Malta": "EUR",
  "Mauritania": "MRU", "Mauritius": "MUR", "Mexico": "MXN", "Moldova": "MDL", "Monaco": "EUR",
  "Mongolia": "MNT", "Montenegro": "EUR", "Morocco": "MAD", "Mozambique": "MZN", "Myanmar": "MMK",
  "Namibia": "NAD", "Nepal": "NPR", "Netherlands": "EUR", "New Zealand": "NZD", "Nicaragua": "NIO",
  "Niger": "XOF", "Nigeria": "NGN", "North Korea": "KPW", "North Macedonia": "MKD", "Norway": "NOK",
  "Oman": "OMR", "Pakistan": "PKR", "Palestine": "ILS", "Panama": "PAB", "Papua New Guinea": "PGK",
  "Paraguay": "PYG", "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR",
  "Qatar": "QAR", "Romania": "RON", "Russia": "RUB", "Rwanda": "RWF", "Saudi Arabia": "SAR",
  "Senegal": "XOF", "Serbia": "RSD", "Seychelles": "SCR", "Singapore": "SGD", "Slovakia": "EUR",
  "Slovenia": "EUR", "Solomon Islands": "SBD", "South Africa": "ZAR", "South Korea": "KRW", "Spain": "EUR",
  "Sri Lanka": "LKR", "Sudan": "SDG", "Sweden": "SEK", "Switzerland": "CHF", "Syria": "SYP",
  "Taiwan": "TWD", "Tanzania": "TZS", "Thailand": "THB", "Togo": "XOF", "Tonga": "TOP",
  "Trinidad & Tobago": "TTD", "Tunisia": "TND", "Turkey": "TRY", "Turkmenistan": "TMT", "Uganda": "UGX",
  "Ukraine": "UAH", "United Arab Emirates": "AED", "United Kingdom": "GBP", "United States": "USD",
  "Uruguay": "UYU", "Uzbekistan": "UZS", "Vanuatu": "VUV", "Vatican City": "EUR", "Venezuela": "VES",
  "Vietnam": "VND", "Yemen": "YER", "Zambia": "ZMW", "Zimbabwe": "ZWL",
};

const COUNTRIES = Object.keys(CURRENCY_BY_COUNTRY);
const CURRENCIES = [...new Set(Object.values(CURRENCY_BY_COUNTRY))].sort();

module.exports = { COUNTRIES, CURRENCY_BY_COUNTRY, CURRENCIES };