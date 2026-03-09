import { useState } from "react";
import { S } from "./styles";

export function AdminNav({ tab, setTab, onLogout }) {
  const tabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "invoices", label: "Invoices" },
];

  return (
    <nav style={{ background: "#1a1a1a", color: "#fff", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 50 }}>
      <div>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3 }}>CIC</span>
        <span style={{ fontSize: 9, letterSpacing: 3, color: "#555", marginLeft: 8 }}>ADMIN</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1a1a1a" : "#aaa", border: "none", padding: "8px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>
      <button onClick={onLogout} style={{ background: "none", border: "1px solid #333", color: "#aaa", padding: "6px 14px", fontSize: 10, letterSpacing: 1, cursor: "pointer" }}>LOGOUT</button>
    </nav>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
      {toast.msg}
    </div>
  );
}

export function StatCard({ label, value, color }) {
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 4, letterSpacing: 1 }}>{label.toUpperCase()}</div>
    </div>
  );
}

export function LoginScreen({ onLogin, adminPassword }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (pw === adminPassword) onLogin();
    else { setError(true); setTimeout(() => setError(false), 2000); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 48, width: 360, border: "1px solid #e8e8e8" }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, marginBottom: 4 }}>CIC</div>
        <div style={{ fontSize: 9, letterSpacing: 4, color: "#888", marginBottom: 32 }}>ADMIN PANEL</div>
        <label style={S.label}>PASSWORD</label>
        <input
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ ...S.input, marginBottom: 16, borderColor: error ? "#e53e3e" : "#ddd" }}
          placeholder="Enter admin password"
        />
        {error && <div style={{ fontSize: 12, color: "#e53e3e", marginBottom: 12 }}>Incorrect password</div>}
        <button onClick={submit} style={{ ...S.btnPrimary, width: "100%" }}>LOGIN</button>
      </div>
    </div>
  );
}
