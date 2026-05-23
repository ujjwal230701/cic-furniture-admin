import { useState, useEffect } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { S } from "./styles";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIES = ["Rent", "Transport", "Marketing", "Salaries", "Utilities", "Repairs", "Miscellaneous"];

// ─── EXPENSE FORM ─────────────────────────────────────────────────────────────

function ExpenseForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    date:         initial?.date         ?? today(),
    category:     initial?.category     ?? CATEGORIES[0],
    amount:       initial?.amount       ?? "",
    paid_to:      initial?.paid_to      ?? "",
    payment_type: initial?.payment_type ?? "cash",
    notes:        initial?.notes        ?? "",
  });

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.amount || Number(form.amount) <= 0) { alert("Enter a valid amount."); return; }
    onSave(form);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
          {initial ? "EDIT EXPENSE" : "NEW EXPENSE"}
        </h2>
      </div>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={S.label}>DATE</label>
            <input type="date" value={form.date} onChange={e => setF("date", e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>CATEGORY</label>
            <select value={form.category} onChange={e => setF("category", e.target.value)} style={S.input}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>AMOUNT (₹)</label>
            <input type="number" value={form.amount} onChange={e => setF("amount", e.target.value)}
              style={S.input} placeholder="0" min={0} />
          </div>
          <div>
            <label style={S.label}>PAID TO</label>
            <input value={form.paid_to} onChange={e => setF("paid_to", e.target.value)}
              style={S.input} placeholder="Optional" />
          </div>

          {/* Payment type toggle */}
          <div>
            <label style={S.label}>PAYMENT TYPE</label>
            <div style={{ display: "flex", gap: 0 }}>
              {["cash", "bank", "upi_veena", "upi_ujjwal"].map(type => (
                <button key={type} onClick={() => setF("payment_type", type)}
                  style={{
                    flex: 1, padding: "10px 4px", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    cursor: "pointer", border: "1px solid #ddd",
                    borderRight: type !== "upi_ujjwal" ? "none" : "1px solid #ddd",
                    background: form.payment_type === type ? "#1a1a1a" : "#fff",
                    color: form.payment_type === type ? "#fff" : "#888",
                  }}>
                  {type === "upi_veena" ? "UPI V" : type === "upi_ujjwal" ? "UPI U" : type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={S.label}>NOTES</label>
            <input value={form.notes} onChange={e => setF("notes", e.target.value)}
              style={S.input} placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...S.card, marginBottom: 24, background: "#1a1a1a", color: "#fff", border: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>AMOUNT</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>₹{(Number(form.amount) || 0).toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>CATEGORY</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{form.category}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>VIA</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {form.payment_type === "upi_veena" ? "UPI Veena" : form.payment_type === "upi_ujjwal" ? "UPI Ujjwal" : form.payment_type.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "SAVING..." : initial ? "UPDATE EXPENSE" : "SAVE EXPENSE"}
        </button>
        <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── EXPENSES LIST ────────────────────────────────────────────────────────────

const PAYMENT_LABEL = { cash: "Cash", bank: "Bank", upi_veena: "UPI Veena", upi_ujjwal: "UPI Ujjwal" };
const CATEGORY_COLOR = {
  Rent: "#6366f1", Transport: "#f59e0b", Marketing: "#ec4899",
  Salaries: "#3b82f6", Utilities: "#14b8a6", Repairs: "#f97316", Miscellaneous: "#888",
};

function ExpensesList({ expenses, onNew, onEdit, onDelete, isOwner }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>EXPENSES</h2>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            {expenses.length} entries &nbsp;·&nbsp; Total: ₹{total.toLocaleString("en-IN")}
          </div>
        </div>
        <button onClick={onNew} style={S.btnPrimary}>+ NEW EXPENSE</button>
      </div>

      {expenses.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "#888", fontSize: 13 }}>
          No expenses logged yet. Click "+ New Expense" to get started.
        </div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f5f0", borderBottom: "2px solid #e8e8e8" }}>
                  {["DATE", "CATEGORY", "PAID TO", "AMOUNT", "VIA", "NOTES", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{e.date}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: CATEGORY_COLOR[e.category] || "#888", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", letterSpacing: 1 }}>
                        {e.category.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{e.paid_to || <span style={{ color: "#ccc" }}>—</span>}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#e53e3e" }}>₹{Number(e.amount).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: "#888" }}>{PAYMENT_LABEL[e.payment_type] || e.payment_type}</td>
                    <td style={{ padding: "12px 16px", color: "#888", fontSize: 12 }}>{e.notes || <span style={{ color: "#ccc" }}>—</span>}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => onEdit(e)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}>EDIT</button>
                        {isOwner && (
                          <button onClick={() => onDelete(e.id)} style={{ ...S.btnDanger, padding: "4px 10px" }}>DEL</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN TAB ─────────────────────────────────────────────────────────────────

export default function ExpensesTab({ role }) {
  const isOwner  = role === "owner";
  const navigate = useNavigate();
  const newMatch  = useMatch("/expenses/new");
  const editMatch = useMatch("/expenses/:id/edit");

  const isNew  = !!newMatch;
  const isEdit = !!editMatch;
  const editId = isEdit ? Number(editMatch.params.id) : null;

  const [expenses, setExpenses] = useState([]);
  const [editData, setEditData] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [saving,   setSaving]   = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
    setExpenses(data || []);
  };

  useEffect(() => { fetchExpenses(); }, []);

  useEffect(() => {
    setEditData(null);
    if (!isEdit || !editId || isNaN(editId)) return;
    let cancelled = false;
    supabase.from("expenses").select("*").eq("id", editId).single().then(({ data }) => {
      if (!cancelled) setEditData(data || null);
    });
    return () => { cancelled = true; };
  }, [editId, isEdit]);

  const save = async (formData) => {
    setSaving(true);
    const payload = {
      date:         formData.date,
      category:     formData.category,
      amount:       Number(formData.amount),
      paid_to:      formData.paid_to  || null,
      payment_type: formData.payment_type,
      notes:        formData.notes    || null,
    };
    if (editData) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editData.id);
      if (error) { showToast(error.message, "error"); setSaving(false); return; }
      showToast("Expense updated!");
    } else {
      const { error } = await supabase.from("expenses").insert([payload]);
      if (error) { showToast(error.message, "error"); setSaving(false); return; }
      showToast("Expense saved!");
    }
    await fetchExpenses();
    navigate("/expenses");
    setSaving(false);
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    showToast("Expense deleted");
    fetchExpenses();
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {!isNew && !isEdit && (
        <ExpensesList
          expenses={expenses}
          onNew={() => navigate("/expenses/new")}
          onEdit={e => navigate(`/expenses/${e.id}/edit`)}
          onDelete={deleteExpense}
          isOwner={isOwner}
        />
      )}

      {isNew && (
        <ExpenseForm onSave={save} onCancel={() => navigate("/expenses")} saving={saving} />
      )}

      {isEdit && (
        editData
          ? <ExpenseForm initial={editData} onSave={save} onCancel={() => navigate("/expenses")} saving={saving} />
          : <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      )}
    </div>
  );
}
