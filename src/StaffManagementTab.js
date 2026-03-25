import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthProvider";
import { S } from "./styles";
import { Toast } from "./components";

export default function StaffManagementTab() {
  const { session } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("role", "staff")
      .order("created_at", { ascending: false });
    setStaff(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const createStaff = async () => {
    if (!form.name || !form.email || !form.password) {
      showToast("All fields are required", "error");
      return;
    }
    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setSaving(true);

    // Step 1: Create the auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError) {
      setSaving(false);
      showToast(`Error: ${signUpError.message}`, "error");
      return;
    }

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      setSaving(false);
      showToast("Failed to create user account", "error");
      return;
    }

    // If email confirmation is disabled, signUp() creates a new session and
    // replaces the owner's — restore it before the insert so RLS passes.
    if (signUpData.session) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    // Step 2: Insert user_profiles row — RLS "owner insert" policy allows this
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({ id: newUserId, email: form.email, name: form.name, role: "staff" });

    setSaving(false);
    if (profileError) {
      showToast(`Error: ${profileError.message}`, "error");
      return;
    }

    showToast("Staff account created");
    setForm({ name: "", email: "", password: "" });
    setShowForm(false);
    fetchStaff();
  };

  const removeStaff = async (id, email) => {
    if (!window.confirm(`Remove staff account for ${email}?`)) return;
    await supabase.from("user_profiles").delete().eq("id", id);
    showToast("Staff account removed");
    fetchStaff();
  };

  return (
    <div>
      <Toast toast={toast} />

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 440, padding: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>ADD STAFF ACCOUNT</div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>FULL NAME</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input} placeholder="Staff member name" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>EMAIL</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={S.input} placeholder="staff@example.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>TEMPORARY PASSWORD</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={S.input} placeholder="Min. 6 characters" />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={createStaff} disabled={saving} style={{ ...S.btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "CREATING..." : "CREATE ACCOUNT"}
              </button>
              <button onClick={() => { setShowForm(false); setForm({ name: "", email: "", password: "" }); }} style={{ ...S.btnOutline, flex: 1 }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Staff <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({staff.length} accounts)</span>
        </div>
        <button onClick={() => setShowForm(true)} style={S.btnPrimary}>+ ADD STAFF</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gap: 1, background: "#e8e8e8" }}>
          {staff.map(s => (
            <div key={s.id} style={{ background: "#fff", padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name || "—"}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.email}</div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#888", background: "#f5f5f0", padding: "4px 10px" }}>
                STAFF
              </div>
              <button onClick={() => removeStaff(s.id, s.email)} style={S.btnDanger}>REMOVE</button>
            </div>
          ))}
          {staff.length === 0 && (
            <div style={{ background: "#fff", padding: 40, textAlign: "center", color: "#888" }}>
              No staff accounts yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
