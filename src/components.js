import { useState } from "react";
import { S } from "./styles";

export function AdminNav({ tab, setTab, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "products", label: "Products" },
    { key: "invoices", label: "Invoices" },
  ];
  const goTo = (key) => { setTab(key); setMenuOpen(false); };

  return (
    <>
      <nav style={{ background: "#1a1a1a", color: "#fff", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 3 }}>CIC</span>
            <span style={{ fontSize: 9, letterSpacing: 3, color: "#555", marginLeft: 8 }}>ADMIN</span>
          </div>

          {/* Desktop tabs */}
          <div className="admin-desktop-nav" style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => goTo(t.key)}
                style={{ background: tab === t.key ? "#fff" : "transparent", color: tab === t.key ? "#1a1a1a" : "#aaa", border: "none", padding: "8px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={onLogout} className="admin-desktop-nav"
              style={{ background: "none", border: "1px solid #333", color: "#aaa", padding: "6px 14px", fontSize: 10, letterSpacing: 1, cursor: "pointer" }}>
              LOGOUT
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="admin-mobile-nav"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#fff", padding: 4 }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="admin-mobile-nav" style={{ position: "fixed", top: 60, left: 0, right: 0, bottom: 0, background: "#1a1a1a", zIndex: 99, padding: 32, display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map(t => (
  <button key={t.key} onClick={() => goTo(t.key)}
    style={{ width: "100%", background: tab === t.key ? "rgba(255,255,255,0.1)" : "transparent", border: "none", borderLeft: tab === t.key ? "3px solid #fff" : "3px solid transparent", color: tab === t.key ? "#fff" : "#aaa", cursor: "pointer", fontSize: 16, fontWeight: tab === t.key ? 700 : 400, padding: "16px 20px", textAlign: "left", letterSpacing: 1, display: "block" }}>
    {t.label}
  </button>
))}
<button onClick={onLogout} style={{ width: "100%", marginTop: 24, background: "none", border: "1px solid #333", color: "#aaa", padding: "14px 16px", fontSize: 12, cursor: "pointer", textAlign: "left", display: "block" }}>
  LOGOUT
</button>

          ))}
          <button onClick={onLogout} style={{ marginTop: 24, background: "none", border: "1px solid #333", color: "#aaa", padding: "12px 16px", fontSize: 12, cursor: "pointer", textAlign: "left" }}>
            LOGOUT
          </button>
        </div>
      )}

      <style>{`
        .admin-desktop-nav { display: flex !important; }
        .admin-mobile-nav { display: none !important; }
        @media (max-width: 768px) {
          .admin-desktop-nav { display: none !important; }
          .admin-mobile-nav { display: block !important; }
        }
      `}</style>
    </>
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
