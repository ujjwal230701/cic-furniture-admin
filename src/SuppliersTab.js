import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { S } from "./styles";

const EMPTY = { name: "", contact: "", notes: "" };

export default function SuppliersTab({ role }) {
  const isOwner = role === "owner";
  const [suppliers, setSuppliers] = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const startEdit  = (s) => { setEditId(s.id); setForm({ name: s.name, contact: s.contact || "", notes: s.notes || "" }); };
  const cancelEdit = ()  => { setEditId(null); setForm(EMPTY); };

  const save = async () => {
    if (!form.name.trim()) { alert("Supplier name is required."); return; }
    const payload = { name: form.name.trim(), contact: form.contact || null, notes: form.notes || null };
    if (editId) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", editId);
      if (error) { showToast(error.message, "error"); return; }
      showToast("Supplier updated!");
    } else {
      const { error } = await supabase.from("suppliers").insert([payload]);
      if (error) { showToast(error.message, "error"); return; }
      showToast("Supplier added!");
    }
    cancelEdit();
    fetchSuppliers();
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier? This won't affect existing purchase records.")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    showToast("Supplier deleted");
    fetchSuppliers();
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>SUPPLIERS</h2>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Add / edit form */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>
          {editId ? "EDIT SUPPLIER" : "ADD SUPPLIER"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <label style={S.label}>NAME *</label>
            <input value={form.name} onChange={e => setF("name", e.target.value)}
              style={S.input} placeholder="Supplier name" />
          </div>
          <div>
            <label style={S.label}>CONTACT</label>
            <input value={form.contact} onChange={e => setF("contact", e.target.value)}
              style={S.input} placeholder="Phone / email" />
          </div>
          <div>
            <label style={S.label}>NOTES</label>
            <input value={form.notes} onChange={e => setF("notes", e.target.value)}
              style={S.input} placeholder="Optional" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={save} style={S.btnPrimary}>{editId ? "UPDATE" : "ADD SUPPLIER"}</button>
          {editId && <button onClick={cancelEdit} style={S.btnOutline}>CANCEL</button>}
        </div>
      </div>

      {/* Table */}
      {suppliers.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "#888", fontSize: 13 }}>
          No suppliers yet. Add one above.
        </div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f5f5f0", borderBottom: "2px solid #e8e8e8" }}>
                {["NAME", "CONTACT", "NOTES", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0", background: editId === s.id ? "#fffbea" : "#fff" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>{s.name}</td>
                  <td style={{ padding: "12px 16px", color: "#888" }}>{s.contact || <span style={{ color: "#ccc" }}>—</span>}</td>
                  <td style={{ padding: "12px 16px", color: "#888", fontSize: 12 }}>{s.notes || <span style={{ color: "#ccc" }}>—</span>}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => startEdit(s)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}>EDIT</button>
                      {isOwner && <button onClick={() => deleteSupplier(s.id)} style={{ ...S.btnDanger, padding: "4px 10px" }}>DEL</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
