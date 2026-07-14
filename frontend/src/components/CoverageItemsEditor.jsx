import React from "react";
import { Badge } from "./ui";

// Point 2/3/4/7/8/9/10: the multi-coverage table used both at claim
// initiation ("select" mode — pick category + cover + sub-cover + initial
// reserve, add/remove rows freely) and at Registration/Assessment
// ("review" mode — cover/category locked, edit sub-limit / payable /
// GOP issue date / remarks per row, with a running total footer).

const CATEGORY_LABELS = { MEDICAL: "Medical", NON_MEDICAL: "Non-Medical", TRAVEL: "Travel", PERSONAL_ACCIDENT: "Personal Accident" };

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CoverageItemsEditor({
  items,
  onChange,
  mode = "select", // "select" | "review"
  coverNameCatalog, // { MEDICAL: [...], NON_MEDICAL: [...], TRAVEL: [...], PERSONAL_ACCIDENT: [...] }
  medicalSubCovers, // string[] — only relevant for MEDICAL category rows
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
      { category: defaultCategory, coverageName: catalog[0] || "", subCoverName: null, initialReserve: 0, subLimitAmount: null, payableAmount: null, gopIssueDate: null, remarks: "" },
    ]);
  };

  const total = items.reduce((sum, it) => sum + (Number(it.payableAmount ?? it.initialReserve) || 0), 0);

  return (
    <div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Cover Name</th>
            <th>Sub-Cover</th>
            <th>{mode === "select" ? "Initial Reserve" : "Initial Reserve"}</th>
            {mode === "review" && <th>Sub-Limit</th>}
            {mode === "review" && <th>Payable</th>}
            {mode === "review" && <th>GOP Issue Date</th>}
            {mode === "review" && <th>Remarks</th>}
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
                  ) : (
                    it.coverageName
                  )}
                </td>
                <td>
                  {it.category === "MEDICAL" ? (
                    mode === "select" ? (
                      <select value={it.subCoverName || ""} onChange={(e) => updateItem(i, { subCoverName: e.target.value || null })} style={{ minWidth: 180 }}>
                        <option value="">Select…</option>
                        {(medicalSubCovers || []).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      it.subCoverName || "—"
                    )
                  ) : (
                    <span style={{ color: "var(--muted)" }}>N/A</span>
                  )}
                </td>
                <td>
                  {mode === "select" ? (
                    <input type="number" value={it.initialReserve ?? ""} onChange={(e) => updateItem(i, { initialReserve: e.target.value })} style={{ width: 110 }} />
                  ) : (
                    `USD ${money(it.initialReserve)}`
                  )}
                </td>
                {mode === "review" && (
                  <td><input type="number" value={it.subLimitAmount ?? ""} onChange={(e) => updateItem(i, { subLimitAmount: e.target.value })} style={{ width: 110 }} /></td>
                )}
                {mode === "review" && (
                  <td><input type="number" value={it.payableAmount ?? ""} onChange={(e) => updateItem(i, { payableAmount: e.target.value })} style={{ width: 110 }} /></td>
                )}
                {mode === "review" && (
                  <td><input type="date" value={it.gopIssueDate || ""} onChange={(e) => updateItem(i, { gopIssueDate: e.target.value })} style={{ width: 140 }} /></td>
                )}
                {mode === "review" && (
                  <td><input type="text" value={it.remarks || ""} onChange={(e) => updateItem(i, { remarks: e.target.value })} style={{ width: 160 }} placeholder="Optional" /></td>
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
              <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>Total Payable</td>
              <td style={{ fontWeight: 700 }}>USD {money(total)}</td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
      {mode === "select" && (
        <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={addItem}>
          + Add another coverage
        </button>
      )}
    </div>
  );
}