import React, { useEffect, useState } from "react";
import client from "../../api/client";
import { Card, PrimaryBtn, EmptyNote, Badge } from "../../components/ui";

const ROLE_BADGE = {
  CUSTOMER: { color: "#1D4FA0", bg: "#E8EFFB" },
  AGENT: { color: "#B5790C", bg: "#FBF0D6" },
  INSURER: { color: "#6D5BAF", bg: "#ECE8F8" },
  SUPER_ADMIN: { color: "#1D8A5F", bg: "#DEF3E9" },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", role: "AGENT", phone: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/admin/users");
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await client.post("/admin/users", form);
      setNotice(`${form.role} account created for ${form.email}. Password: ${form.password || "password123"}`);
      setForm({ name: "", email: "", role: "AGENT", phone: "", password: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create user.");
    }
  };

  return (
    <div>
      <Card title="Create Agent / Insurer / Admin Account">
        <form onSubmit={submit} className="grid-2">
          <div className="field"><label className="field-label"><span>Full Name</span></label><input required value={form.name} onChange={(e) => setF("name", e.target.value)} /></div>
          <div className="field"><label className="field-label"><span>Email</span></label><input required type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} /></div>
          <div className="field">
            <label className="field-label"><span>Role</span></label>
            <select value={form.role} onChange={(e) => setF("role", e.target.value)}>
              <option value="AGENT">Agent (AA)</option>
              <option value="INSURER">Insurer</option>
              <option value="SUPER_ADMIN">Admin</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>
          <div className="field"><label className="field-label"><span>Phone (optional)</span></label><input value={form.phone} onChange={(e) => setF("phone", e.target.value)} /></div>
          <div className="field"><label className="field-label"><span>Password (optional — defaults to password123)</span></label><input value={form.password} onChange={(e) => setF("password", e.target.value)} /></div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <PrimaryBtn type="submit">Create Account</PrimaryBtn>
          </div>
        </form>
        {notice && <p style={{ color: "var(--success)", fontSize: 12.5, marginTop: 12 }}>{notice}</p>}
        {error && <p style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 12 }}>{error}</p>}
      </Card>

      <Card title="All Users">
        {loading ? (
          <EmptyNote text="Loading…" />
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const rb = ROLE_BADGE[u.role] || {};
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><Badge color={rb.color} bg={rb.bg}>{u.role}</Badge></td>
                    <td>{u.phone || "—"}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}