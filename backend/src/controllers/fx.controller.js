const { asyncHandler } = require("../middleware/errorHandler");
const { convert } = require("../utils/exchangeRate");

// GET /api/fx/convert?amount=1000&currency=EUR&date=2026-07-01
// Point 9: called live (debounced, no button) from the Coverage Items
// editor as the customer/agent types an amount or changes currency, so
// USD/INR shows immediately. Uses the exact same convert() function the
// backend uses when a claim is actually saved, so the live preview is
// never out of sync with the authoritative saved values.
const previewConvert = asyncHandler(async (req, res) => {
  const { amount, currency, date } = req.query;
  if (amount === undefined || amount === "") {
    return res.status(400).json({ message: "amount query param is required." });
  }
  const result = await convert(amount, currency || "USD", date);
  res.json(result);
});

module.exports = { previewConvert };