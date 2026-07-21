import React, { useState } from "react";
import { Badge } from "./ui";
import { CURRENCIES } from "../lib/catalog";

const CATEGORY_LABELS = { MEDICAL: "Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Category-specific detail fields — these used to be flat, claim-level
// fields in fieldSchemas.js that only ever reflected the FIRST coverage on
// a claim. They now live per-row here instead, under item.detail.*, so a
// claim with e.g. a Medical coverage AND a Travel coverage gets two fully
// independent sets of these fields, not one shared set.
const DETAIL_FIELDS = {
  MEDICAL: [
    { id: "medCoverSubSection", label: "Cover Sub Section", type: "select", options: ["Room Charges", "ICU Charges", "Doctor Charges", "Surgeon Charges", "OT Charges", "Nursing Charges", "Pharmacy Charges", "Pathology Charges", "Radiology Charges", "Pre Hospitalization", "Post Hospitalization", "Ambulance Charges", "Miscellaneous"] },
    { id: "gstPct", label: "GST %", type: "select", options: ["0%", "5%", "12%", "18%", "28%"] },
    { id: "totalBillAmount", label: "Total Bill Amount", type: "number" },
    { id: "deductible", label: "Deductible", type: "number" },
    { id: "disallowedAmount", label: "Disallowed Amount", type: "number" },
    { id: "disallowedRemarks", label: "Disallowed Remarks", type: "text" },
  ],
  PERSONAL_ACCIDENT: [
    { id: "typeOfIncident", label: "Type of Incident", type: "select", options: ["Accidental Death", "Permanent Total Disablement"] },
    { id: "pctDisability", label: "Percentage of Disability", type: "text" },
    { id: "disallowedAmount", label: "Disallowed Amount", type: "number" },
  ],
  TRAVEL: [
    { id: "maxAllowableSI", label: "Maximum Allowable SI", type: "number" },
    { id: "discount", label: "Discount", type: "number" },
    { id: "disallowedAmount", label: "Disallowed Amount", type: "number" },
  ],
};

export default function CoverageItemsEditor({
  items,
  onChange,
  mode = "select", // "select" | "review"
  coverNameCatalog,
  medicalSubCovers,
  defaultCategory = "TRAVEL",
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const updateItem = (index, patch) => {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(next);
  };
  const updateItemDetail = (index, patch) => {
    const next = items.map((it, i) => (i === index ? { ...it, detail: { ...it.detail, ...patch } } : it));
    onChange(next);
  };
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => {
    const catalog = coverNameCatalog?.[defaultCategory] || [];
    onChange([
      ...items,
      { category: defaultCategory, coverageName: catalog[0] || "", subCoverName: null, currency: "USD", initialReserve: 0, subLimitAmount: null, payableAmount: null, detail: {} },
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const catalog = coverNameCatalog?.[it.category] || [];
            const details = DETAIL_FIELDS[it.category] || [];
            return (
              <React.Fragment key={i}>
                <tr>
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
                  <td style={{ display: "flex", gap: 6 }}>
                    {mode === "review" && details.length > 0 && (
                      <button type="button" className="btn btn-secondary" onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}>
                        {expandedIndex === i ? "Hide" : "Details"}
                      </button>
                    )}
                    {mode === "select" && (
                      <button type="button" className="btn btn-secondary" onClick={() => removeItem(i)}>Remove</button>
                    )}
                  </td>
                </tr>
                {mode === "review" && expandedIndex === i && details.length > 0 && (
                  <tr>
                    <td colSpan={10} style={{ background: "#FAFBFD" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "12px 4px" }}>
                        {details.map((f) => (
                          <div key={f.id} className="field" style={{ minWidth: 160 }}>
                            <label className="field-label"><span>{f.label}</span></label>
                            {f.type === "select" ? (
                              <select value={it.detail?.[f.id] || ""} onChange={(e) => updateItemDetail(i, { [f.id]: e.target.value })}>
                                <option value="">Select…</option>
                                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input type={f.type} value={it.detail?.[f.id] ?? ""} onChange={(e) => updateItemDetail(i, { [f.id]: e.target.value })} />
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {mode === "review" && items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
              <td colSpan={2} style={{ fontWeight: 700 }}>${money(totalUSD)} / ₹{money(totalINR)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        )}
      </table>
      {items[0]?.exchangeRateUsed && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          Exchange rate pinned to Date of Loss ({items[0].exchangeRateUsed.asOfDate}) — 1 USD = ₹{items[0].exchangeRateUsed.usdToINR}.
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