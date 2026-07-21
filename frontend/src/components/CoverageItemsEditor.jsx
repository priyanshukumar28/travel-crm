import React from "react";
import { Badge } from "./ui";
import { CURRENCIES } from "../lib/catalog";

const CATEGORY_LABELS = { MEDICAL: "Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Points 4/5/7/9: currency + computed USD/INR cascade, pinned to Date of Loss.
// Initial Reserve is editable in BOTH modes now — Agent/Insurer can revise
// it after intimation, not just at claim creation.
// GOP Issue Date and Remarks are NOT editable here — GOP Issue Date will be
// autofetched once the insurer feed sends it; Remarks lives on the claim's
// own Remarks tab instead of duplicated per coverage row.
export default function CoverageItemsEditor({
  items,
  onChange,
  mode = "select", // "select" | "review"
  coverNameCatalog,
  medicalSubCovers,
  defaultCategory = "TRAVEL",
}) {
  const updateItem = (index, patch) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  };
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => {
    const catalog = coverNameCatalog?.[defaultCategory] || [];
    onChange([
      ...items,
      { category: defaultCategory, coverageName: catalog[0] || "", subCoverName: null, currency: "USD", initialReserve: 0, subLimitAmount: null, payableAmount: null, gopIssueDate: null, remarks: "" },
    ]);
  };

  const totalINR = items.reduce((sum, it) => sum + (Number(it.amountINR) || 0), 0);
  const totalUSD = items.reduce((sum, it) => sum + (Number(it.amountUSD) || 0), 0);

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Cover Name</th>
            <th>Sub-Cover</th>
            <th>Currency</th>
            <th>Initial Reserve (Local)</th>
            <th>USD</th>
            <th>INR</th>
            {mode === "review" && <th>Sub-Limit</th>}
            {mode === "review" && <th>Payable</th>}
            {mode === "select" && <th></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const catalog = coverNameCatalog?.[it.category] || [];
            return (
              <tr key={i}>
                <td>
                  {mode === "select" ? (
                    <select
                      value={it.category}
                      onChange={(e) => updateItem(i, { category: e.target.value, coverageName: (coverNameCatalog?.[e.target.value] || [])[0] || "", subCoverName: null })}
                      style={{ minWidth: 140 }}
                    >
                      {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  ) : (
                    <Badge color="#1D4FA0" bg="#E8EFFB">{CATEGORY_LABELS[it.category] || it.category}</Badge>
                  )}
                </td>
                <td>
                  {mode === "select" ? (
                    <select value={it.coverageName} onChange={(e) => updateItem(i, { coverageName: e.target.value })} style={{ minWidth: 220 }}>
                      {catalog.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : it.coverageName}
                </td>
                <td>
                  {it.category === "MEDICAL" ? (
                    mode === "select" ? (
                      <select value={it.subCoverName || ""} onChange={(e) => updateItem(i, { subCoverName: e.target.value || null })} style={{ minWidth: 180 }}>
                        <option value="">Select…</option>
                        {(medicalSubCovers || []).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (it.subCoverName || "—")
                  ) : <span style={{ color: "var(--muted)" }}>N/A</span>}
                </td>
                <td>
                  <select value={it.currency || "USD"} onChange={(e) => updateItem(i, { currency: e.target.value })} style={{ width: 80 }}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  {/* Editable in both modes — point: allow editing initial reserve after intimation too */}
                  <input type="number" value={it.initialReserve ?? ""} onChange={(e) => updateItem(i, { initialReserve: e.target.value })} style={{ width: 110 }} />
                </td>
                <td>{it.amountUSD !== undefined && it.amountUSD !== null ? `$${money(it.amountUSD)}` : "—"}</td>
                <td>{it.amountINR !== undefined && it.amountINR !== null ? `₹${money(it.amountINR)}` : "—"}</td>
                {mode === "review" && (
                  <td><input type="number" value={it.subLimitAmount ?? ""} onChange={(e) => updateItem(i, { subLimitAmount: e.target.value })} style={{ width: 100 }} /></td>
                )}
                {mode === "review" && (
                  <td><input type="number" value={it.payableAmount ?? ""} onChange={(e) => updateItem(i, { payableAmount: e.target.value })} style={{ width: 100 }} /></td>
                )}
                {mode === "select" && (
                  <td><button type="button" className="btn btn-secondary" onClick={() => removeItem(i)}>Remove</button></td>
                )}
              </tr>
            );
          })}
        </tbody>
        {mode === "review" && items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={6} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
              <td style={{ fontWeight: 700 }}>${money(totalUSD)} / ₹{money(totalINR)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
      {items[0]?.exchangeRateUsed && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          Exchange rate pinned to Date of Loss ({items[0].exchangeRateUsed.asOfDate}) — 1 USD = ₹{items[0].exchangeRateUsed.usdToINR}. Changing the Initial Reserve above recalculates USD/INR on save.
        </p>
      )}
      {mode === "select" && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addItem}>
          + Add another coverage
        </button>
      )}
    </div>
  );
}