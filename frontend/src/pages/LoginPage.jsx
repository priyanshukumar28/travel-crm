import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FlightPathScene from "../components/illustrations/FlightPathScene";

const DEMO = {
  CUSTOMER: "customer@acrossassist.demo",
  AGENT: "agent@acrossassist.demo",
  INSURER: "insurer@acrossassist.demo",
  SUPER_ADMIN: "admin@acrossassist.demo",
};

const ROLE_HOME = {
  CUSTOMER: "/customer",
  AGENT: "/agent",
  INSURER: "/insurer",
  SUPER_ADMIN: "/admin",
};

const ROLE_COPY = {
  CUSTOMER: {
    eyebrow: "Customer Portal",
    heading: "Your claim, tracked door to door.",
    body: "Review your policy, lodge a claim in minutes, and follow it through validation, assessment and payout — no phone queues.",
  },
  AGENT: {
    eyebrow: "Agent Portal · Across Assist",
    heading: "Every claim, one clear route.",
    body: "Validate intimations, register claims, and hand off to the insurer with a full audit trail at every stop.",
  },
  INSURER: {
    eyebrow: "Insurer Portal",
    heading: "Assess with the full picture.",
    body: "Medical, personal accident and non-medical assessments in one workspace, with intimation and registration history alongside.",
  },
  SUPER_ADMIN: {
    eyebrow: "Admin Console",
    heading: "Configure the whole network.",
    body: "Stand up policies and coverage, provision Agent and Insurer accounts, and keep an eye on every notification sent.",
  },
};

export default function LoginPage() {
  const [role, setRole] = useState("CUSTOMER");
  const [email, setEmail] = useState(DEMO.CUSTOMER);
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const pickRole = (r) => {
    setRole(r);
    setEmail(DEMO[r]);
    setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || "/login");
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  const copy = ROLE_COPY[role];

  return (
    <div className="login-shell">
      <div className="login-illustration">
        <FlightPathScene />
        <div className="login-illustration-copy">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h2>{copy.heading}</h2>
          <p>{copy.body}</p>
        </div>
      </div>

      <div className="login-formside">
        <div className="login-card">
          <div className="login-head">
            <img src="/logo.png" alt="Across Assist" />
            <h1>Welcome to Across Assist</h1>
            <p>Travel Claims Management Portal</p>
          </div>

          <div className="role-tabs">
            <button className={`role-tab ${role === "CUSTOMER" ? "active" : ""}`} onClick={() => pickRole("CUSTOMER")}>Customer</button>
            <button className={`role-tab ${role === "AGENT" ? "active" : ""}`} onClick={() => pickRole("AGENT")}>Agent (AA)</button>
            <button className={`role-tab ${role === "INSURER" ? "active" : ""}`} onClick={() => pickRole("INSURER")}>Insurer</button>
            <button className={`role-tab ${role === "SUPER_ADMIN" ? "active" : ""}`} onClick={() => pickRole("SUPER_ADMIN")}>Admin</button>
          </div>

          <form className="login-body" onSubmit={onSubmit}>
            {error && <div className="login-error">{error}</div>}
            <div className="field">
              <label className="field-label"><span>Email</span></label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div className="field">
              <label className="field-label"><span>Password</span></label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: "center", marginTop: 4 }}>
              {busy ? "Signing in…" : "Login"}
            </button>
            <p className="login-hint">
              Demo credentials are pre-filled — password for every seeded account is <strong>password123</strong>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}