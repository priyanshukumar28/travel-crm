import React, { useState, useEffect, useRef } from "react";
import { Badge } from "./ui";
import { CURRENCIES, COUNTRIES, REGIONS, SUBCOVERS_BY_COVERAGE } from "../lib/catalog";
import client from "../api/client";

const CATEGORY_LABELS = { MEDICAL: "Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Point 3/6: Country/City/Zipcode/Region/Description of Loss are per
// coverage instead of one shared front-page block — but they are still
// CUSTOMER-filled, at intimation time, same as before. Only Date of Loss
// is the single shared field (defaults into every row, editable per row if
// a specific coverage genuinely happened on a different date/place).
// Visible + editable in BOTH "select" mode (Customer/Agent intimating) and
// "review" mode (Agent/Insurer afterwards, in case it needs correcting).
const LOSS_DETAIL_FIELDS = [
  { id: "dateOfLoss", label: "Date of Loss (this coverage)", type: "date", req: true },
  { id: "countryOfLoss", label: "Country of Loss", type: "select", options: COUNTRIES, req: true },
  { id: "cityOfLoss", label: "City", type: "text", req: true },
  { id: "zipcode", label: "Zipcode", type: "text", req: true },
  { id: "regionOfLoss", label: "Region of Loss", type: "select", options: REGIONS, req: true },
  { id: "descriptionOfLoss", label: "Detailed Description of Claim", type: "textarea", req: true, span: 2 },
];

// Point 7: category-specific ASSESSMENT fields — these stay Agent/Insurer
// only, filled in later at Registration/Assessment, hidden from the
// Customer entirely (only shown when mode === "review").
const ASSESSMENT_DETAIL_FIELDS = {
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

// Point 9: debounced, buttonless live FX preview.
function useLiveFxPreview(item, dateOfLoss, onResolved) {
  const timer = useRef(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const amount = item.initialReserve;
    if (amount === "" || amount === undefined || amount === null) return;
    timer.current = setTimeout(async () => {
      try {
        const effectiveDate = item.detail?.dateOfLoss || dateOfLoss;
        const { data } = await client.get("/fx/convert", {
          params: { amount, currency: item.currency || "USD", date: effectiveDate },
        });
        onResolved({ amountUSD: data.amountUSD, amountINR: data.amountINR, exchangeRateUsed: data.exchangeRateUsed });
      } catch {
        // live preview is best-effort — silently keep whatever was last shown
      }
    }, 500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.initialReserve, item.currency, item.detail?.dateOfLoss, dateOfLoss]);
}

function DetailField({ f, value, onChange, fallback }) {
  return (
    <div className="field" style={{ gridColumn: f.span === 2 ? "span 2" : undefined }}>
      <label className="field-label"><span>{f.label}{f.req && <span className="field-req">*</span>}</span></label>
      {f.type === "select" ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === "textarea" ? (
        <textarea rows={2} value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={f.type} value={value ?? fallback ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// Currency + amount rendered as one visually joined control — the standard
// fintech pattern, and it reads much more clearly than two separate cells.
function AmountWithCurrency({ item, onChangeCurrency, onChangeAmount }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <select
        value={item.currency || "USD"}
        onChange={(e) => onChangeCurrency(e.target.value)}
        style={{ border: "none", borderRight: "1px solid var(--line)", background: "#FAFBFD", fontWeight: 700, fontSize: 12, padding: "8px 6px", borderRadius: 0, width: 68 }}
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        value={item.initialReserve ?? ""}
        onChange={(e) => onChangeAmount(e.target.value)}
        style={{ border: "none", borderRadius: 0, textAlign: "right", padding: "8px 10px", width: 110 }}
      />
    </div>
  );
}

function CoverageRow({
  item, index, mode, coverNameCatalog, dateOfLoss,
  expandedIndex, setExpandedIndex, updateItem, updateItemDetail, removeItem,
}) {
  useLiveFxPreview(item, dateOfLoss, (patch) => updateItem(index, patch));

  const catalog = coverNameCatalog?.[item.category] || [];
  const subCovers = SUBCOVERS_BY_COVERAGE[item.coverageName]; // point 5: only present if this coverage genuinely has sub-covers
  const assessmentDetails = mode === "review" ? (ASSESSMENT_DETAIL_FIELDS[item.category] || []) : [];
  const filledLossFields = LOSS_DETAIL_FIELDS.filter((f) => item.detail?.[f.id]).length;
  const lossComplete = filledLossFields === LOSS_DETAIL_FIELDS.length;
  const isExpanded = expandedIndex === index;

  return (
    <React.Fragment>
      <tr style={{ background: isExpanded ? "#F4F7FC" : index % 2 === 1 ? "#FAFBFD" : "transparent" }}>
        <td style={{ verticalAlign: "middle" }}>
          {mode === "select" ? (
            <select
              value={item.category}
              onChange={(e) => updateItem(index, { category: e.target.value, coverageName: (coverNameCatalog?.[e.target.value] || [])[0] || "", subCoverName: null })}
              style={{ minWidth: 130 }}
            >
              {Object.keys(CATEGORY_LABELS).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          ) : (
            <Badge color="#1D4FA0" bg="#E8EFFB">{CATEGORY_LABELS[item.category] || item.category}</Badge>
          )}
        </td>
        <td style={{ verticalAlign: "middle" }}>
          {mode === "select" ? (
            <select value={item.coverageName} onChange={(e) => updateItem(index, { coverageName: e.target.value, subCoverName: null })} style={{ minWidth: 200 }}>
              {catalog.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : <span style={{ fontWeight: 600 }}>{item.coverageName}</span>}
        </td>
        <td style={{ verticalAlign: "middle" }}>
          {subCovers ? (
            mode === "select" ? (
              <select value={item.subCoverName || ""} onChange={(e) => updateItem(index, { subCoverName: e.target.value || null })} style={{ minWidth: 170 }}>
                <option value="">Select…</option>
                {subCovers.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (item.subCoverName || "—")
          ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>N/A</span>}
        </td>
        <td style={{ verticalAlign: "middle" }}>
          <AmountWithCurrency
            item={item}
            onChangeCurrency={(v) => updateItem(index, { currency: v })}
            onChangeAmount={(v) => updateItem(index, { initialReserve: v })}
          />
        </td>
        <td style={{ textAlign: "right", verticalAlign: "middle", fontVariantNumeric: "tabular-nums", color: "var(--brand-blue-dark)", fontWeight: 600 }}>
          {item.amountUSD !== undefined && item.amountUSD !== null ? `$${money(item.amountUSD)}` : <span style={{ color: "var(--muted)" }}>…</span>}
        </td>
        <td style={{ textAlign: "right", verticalAlign: "middle", fontVariantNumeric: "tabular-nums", color: "var(--brand-blue-dark)", fontWeight: 600 }}>
          {item.amountINR !== undefined && item.amountINR !== null ? `₹${money(item.amountINR)}` : <span style={{ color: "var(--muted)" }}>…</span>}
        </td>
        {mode === "review" && (
          <td style={{ verticalAlign: "middle" }}><input type="number" value={item.subLimitAmount ?? ""} onChange={(e) => updateItem(index, { subLimitAmount: e.target.value })} style={{ width: 100, textAlign: "right" }} /></td>
        )}
        {mode === "review" && (
          <td style={{ verticalAlign: "middle" }}><input type="number" value={item.payableAmount ?? ""} onChange={(e) => updateItem(index, { payableAmount: e.target.value })} style={{ width: 100, textAlign: "right" }} /></td>
        )}
        <td style={{ verticalAlign: "middle" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
              style={{
                width: "100%", justifyContent: "center", fontSize: 11.5,
                borderColor: lossComplete ? "var(--success)" : "var(--brand-orange)",
                color: lossComplete ? "var(--success)" : "var(--brand-orange-dark)",
              }}
            >
              {isExpanded ? "Hide Details" : `${lossComplete ? "✓" : "○"} Loss Details ${filledLossFields}/${LOSS_DETAIL_FIELDS.length}`}
            </button>
            {mode === "select" && (
              <button type="button" className="btn btn-secondary" onClick={() => removeItem(index)} style={{ width: "100%", justifyContent: "center", fontSize: 11.5 }}>
                Remove
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={mode === "review" ? 9 : 7} style={{ background: "#F4F7FC", borderTop: "2px solid var(--brand-blue-soft)" }}>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--brand-blue-dark)", marginBottom: 12 }}>
                Details of Loss — {item.coverageName || "this coverage"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px 16px", marginBottom: assessmentDetails.length > 0 ? 18 : 0 }}>
                {LOSS_DETAIL_FIELDS.map((f) => (
                  <DetailField
                    key={f.id}
                    f={f}
                    value={item.detail?.[f.id]}
                    onChange={(v) => updateItemDetail(index, { [f.id]: v })}
                    fallback={f.id === "dateOfLoss" ? dateOfLoss : ""}
                  />
                ))}
              </div>
              {assessmentDetails.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--violet)", margin: "0 0 12px", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                    Assessment Details — {item.coverageName || "this coverage"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px 16px" }}>
                    {assessmentDetails.map((f) => (
                      <DetailField key={f.id} f={f} value={item.detail?.[f.id]} onChange={(v) => updateItemDetail(index, { [f.id]: v })} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

export default function CoverageItemsEditor({
  items,
  onChange,
  mode = "select", // "select" | "review"
  coverNameCatalog,
  defaultCategory = "TRAVEL",
  dateOfLoss, // point 3: the claim's single shared Date of Loss, used to seed each new item
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
      { category: defaultCategory, coverageName: catalog[0] || "", subCoverName: null, currency: "USD", initialReserve: 0, subLimitAmount: null, payableAmount: null, detail: { dateOfLoss: dateOfLoss || null } },
    ]);
  };

  const totalINR = items.reduce((sum, it) => sum + (Number(it.amountINR) || 0), 0);
  const totalUSD = items.reduce((sum, it) => sum + (Number(it.amountUSD) || 0), 0);

  return (
    <div>
      <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", WebkitOverflowScrolling: "touch" }}>
        <table className="data-table" style={{ minWidth: mode === "review" ? 940 : 760, marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 120 }}>Category</th>
              <th style={{ minWidth: 190 }}>Cover Name</th>
              <th style={{ minWidth: 150 }}>Sub-Cover</th>
              <th style={{ minWidth: 180 }}>Amount</th>
              <th style={{ minWidth: 90, textAlign: "right" }}>USD</th>
              <th style={{ minWidth: 90, textAlign: "right" }}>INR</th>
              {mode === "review" && <th style={{ minWidth: 100, textAlign: "right" }}>Sub-Limit</th>}
              {mode === "review" && <th style={{ minWidth: 100, textAlign: "right" }}>Payable</th>}
              <th style={{ minWidth: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <CoverageRow
                key={i}
                item={item}
                index={i}
                mode={mode}
                coverNameCatalog={coverNameCatalog}
                dateOfLoss={dateOfLoss}
                expandedIndex={expandedIndex}
                setExpandedIndex={setExpandedIndex}
                updateItem={updateItem}
                updateItemDetail={updateItemDetail}
                removeItem={removeItem}
              />
            ))}
          </tbody>
          {mode === "review" && items.length > 0 && (
            <tfoot>
              <tr style={{ background: "var(--brand-blue-soft)" }}>
                <td colSpan={4} style={{ textAlign: "right", fontWeight: 800, color: "var(--brand-blue-dark)" }}>Total</td>
                <td style={{ textAlign: "right", fontWeight: 800, color: "var(--brand-blue-dark)", fontVariantNumeric: "tabular-nums" }}>${money(totalUSD)}</td>
                <td style={{ textAlign: "right", fontWeight: 800, color: "var(--brand-blue-dark)", fontVariantNumeric: "tabular-nums" }}>₹{money(totalINR)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {items[0]?.exchangeRateUsed && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          Exchange rate as of {items[0].exchangeRateUsed.asOfDate} ({items[0].exchangeRateUsed.source === "live" ? "live historical rate" : "static reference rate"}) — 1 USD = ₹{items[0].exchangeRateUsed.usdToINR}.
        </p>
      )}
      {mode === "select" && (
        <>
          <button type="button" className="btn btn-secondary" style={{ marginTop: 12 }} onClick={addItem}>
            + Add another coverage
          </button>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            Click "Loss Details" on each coverage above to fill in Country/City/Zipcode/Region/Description of Loss for that specific coverage.
          </p>
        </>
      )}
    </div>
  );
}