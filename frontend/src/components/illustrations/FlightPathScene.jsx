import React from "react";
import { SOURCE_META, statusColor, statusLabel, STAGES, STAGE_LABEL, isFieldEditable } from "../../lib/permissions";
import EmptyRoute from "./EmptyRoute";
import RouteStrip from "./RouteStrip";

export function Badge({ children, color, bg }) {
  return (
    <span className="badge" style={{ color, backgroundColor: bg }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const { color, bg } = statusColor(status);
  return <Badge color={color} bg={bg}>{statusLabel(status)}</Badge>;
}

export function HeroBanner({ title, subtitle }) {
  return (
    <div className="hero-banner">
      <RouteStrip className="route-strip" />
      <div className="hero-banner-inner">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function Card({ title, subtitle, children, right }) {
  return (
    <div className="card">
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function InfoTile({ label, value }) {
  return (
    <div className="info-tile">
      <div className="label">{label}</div>
      <div className="value">{value ?? "—"}</div>
    </div>
  );
}

export function EmptyNote({ text }) {
  return (
    <div className="empty-note">
      <EmptyRoute />
      <span>{text}</span>
    </div>
  );
}

export function PrimaryBtn({ children, onClick, disabled, type = "button" }) {
  return (
    <button type={type} className="btn btn-primary" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export function SecondaryBtn({ children, onClick, disabled }) {
  return (
    <button className="btn btn-secondary" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export function DangerBtn({ children, onClick, disabled }) {
  return (
    <button className="btn btn-danger" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
export function BlueBtn({ children, onClick, disabled }) {
  return (
    <button className="btn btn-blue" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function FieldInput({ field, value, onChange, editable }) {
  const common = {
    disabled: !editable,
    value: value ?? "",
    onChange: (e) => onChange(field.id, e.target.value),
  };
  if (field.type === "select") {
    return (
      <select {...common}>
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") return <textarea rows={2} {...common} />;
  return <input type={field.type === "number" ? "number" : field.type} {...common} />;
}

export function FieldRow({ field, value, onChange, role, stage }) {
  const meta = SOURCE_META[field.source];
  const editable = isFieldEditable({ role, source: field.source, stage });
  return (
    <div className="field">
      <div className="field-label">
        <span>
          {field.label}
          {field.req && <span className="field-req">{field.req}</span>}
        </span>
        <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
      </div>
      <FieldInput field={field} value={value} onChange={onChange} editable={editable} />
    </div>
  );
}

export function SchemaGroup({ group, data, onChange, role, stage, defaultOpen }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary>
        {group.title}
        <span style={{ fontSize: 11, color: "var(--muted)" }}>▾</span>
      </summary>
      <div className="group-body">
        {group.fields.map((f) => (
          <FieldRow key={f.id} field={f} value={data?.[f.id]} onChange={onChange} role={role} stage={stage} />
        ))}
      </div>
    </details>
  );
}

export function StageStepper({ stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="stepper">
      {STAGES.map((s, i) => {
        const done = i < idx || stage === "CLOSED";
        const active = i === idx;
        return (
          <React.Fragment key={s}>
            <div className="step">
              <div className={`step-circle ${done ? "done" : ""} ${active ? "active" : ""}`}>{i + 1}</div>
              <div className={`step-label ${active ? "active" : ""}`}>{STAGE_LABEL[s]}</div>
            </div>
            {i < STAGES.length - 1 && <div className={`step-line ${i < idx ? "done" : ""}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ClaimRow({ claim, onClick }) {
  return (
    <button className="claim-row" onClick={onClick}>
      <div>
        <div className="cid">{claim.claimNumber}</div>
        <div className="meta">
          {claim.claimType} · {claim.coverages?.join(", ")} · Policy {claim.policy?.policyNumber}
        </div>
      </div>
      <StatusBadge status={claim.status} />
    </button>
  );
}


const FlightPathScene = () => {
  return (
    <div className="flight-path-scene">
      <HeroBanner
        title="Across Assist"
        subtitle="Travel Claims Management Portal"
      />
    </div>
  );
};

export default FlightPathScene;