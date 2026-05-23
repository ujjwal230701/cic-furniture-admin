import { useState, useEffect } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { S } from "./styles";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_ITEM = { _rowId: null, product_id: null, product_name: "", quantity: 1, unit_cost: "" };

function groupPurchases(movements, payments) {
  const payByRef = {};
  for (const p of payments) {
    if (!payByRef[p.purchase_ref]) payByRef[p.purchase_ref] = [];
    payByRef[p.purchase_ref].push(p);
  }

  const groups = {};
  for (const m of movements) {
    const ref = m.purchase_ref;
    if (!groups[ref]) {
      groups[ref] = {
        purchase_ref:     ref,
        date:             m.date,
        supplier_id:      m.supplier_id,
        supplier_name:    m.suppliers?.name || m.supplier_name || "—",
        payment_type:     m.payment_type     || "cash",
        payment_due_date: m.payment_due_date || null,
        notes:            m.notes            || "",
        items:            [],
        total_cost:       0,
        payments:         payByRef[ref]      || [],
      };
    }
    groups[ref].items.push(m);
    groups[ref].total_cost += Number(m.total_cost || 0);
  }

  for (const g of Object.values(groups)) {
    g.total_paid = g.payments.reduce((s, p) => s + Number(p.amount), 0);
    g.balance    = Math.max(0, g.total_cost - g.total_paid);
    if (g.payment_type === "cash") {
      g.display_status = "cash";
    } else if (g.balance <= 0) {
      g.display_status = "paid";
    } else if (g.total_paid > 0) {
      g.display_status = "partial";
    } else {
      g.display_status = "pending";
    }
  }

  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────

function PaymentModal({ purchase, existingPayment, onClose, onSave, saving }) {
  // When editing, max allowed = total_cost minus all OTHER payments
  const otherPaid = existingPayment
    ? purchase.payments.filter(p => p.id !== existingPayment.id).reduce((s, p) => s + Number(p.amount), 0)
    : purchase.total_paid;
  const maxAmount = Math.max(0, purchase.total_cost - otherPaid);

  const [form, setForm] = useState({
    date:   existingPayment?.date   ?? today(),
    amount: existingPayment ? String(Number(existingPayment.amount).toFixed(0)) : purchase.balance.toFixed(0),
    notes:  existingPayment?.notes  ?? "",
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const remaining = Math.max(0, purchase.total_cost - otherPaid - (Number(form.amount) || 0));

  const submit = () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0)          { alert("Enter a valid amount."); return; }
    if (amt > maxAmount + 0.01)    { alert(`Amount exceeds maximum of ₹${maxAmount.toLocaleString("en-IN")}.`); return; }
    onSave(form);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", padding: 32, width: 380, maxWidth: "100%" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800, letterSpacing: 2 }}>
          {existingPayment ? "EDIT PAYMENT" : "RECORD PAYMENT"}
        </h3>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{purchase.supplier_name}</span>
          <span style={{ marginLeft: 12 }}>
            {existingPayment ? "Max:" : "Outstanding:"}{" "}
            <strong style={{ color: "#f59e0b" }}>₹{maxAmount.toLocaleString("en-IN")}</strong>
          </span>
        </div>

        <label style={S.label}>DATE</label>
        <input type="date" value={form.date} onChange={e => setF("date", e.target.value)}
          style={{ ...S.input, marginBottom: 12 }} />

        <label style={S.label}>AMOUNT PAID (₹)</label>
        <input type="number" value={form.amount} onChange={e => setF("amount", e.target.value)}
          style={{ ...S.input, marginBottom: 12 }} min={1} max={maxAmount} />

        <label style={S.label}>NOTES</label>
        <input value={form.notes} onChange={e => setF("notes", e.target.value)}
          style={{ ...S.input, marginBottom: 20 }} placeholder="Optional" />

        <div style={{ background: "#f5f5f0", padding: "10px 14px", marginBottom: 20, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#888" }}>Remaining after payment</span>
            <strong style={{ color: remaining === 0 ? "#38a169" : "#f59e0b" }}>
              ₹{remaining.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? "SAVING..." : existingPayment ? "UPDATE PAYMENT" : "SAVE PAYMENT"}
          </button>
          <button onClick={onClose} style={S.btnOutline}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}

// ─── PURCHASE LIST ────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  cash:    { background: "#e6f4ea", color: "#38a169", label: "CASH" },
  paid:    { background: "#e6f4ea", color: "#38a169", label: "PAID" },
  partial: { background: "#fff0d4", color: "#d97706", label: "PARTIAL" },
  pending: { background: "#fff8e6", color: "#f59e0b", label: "PENDING" },
};

function PurchaseList({ purchases, onNew, onEdit, onDelete, onRecordPayment, onEditPayment, isOwner }) {
  const [expanded, setExpanded] = useState(null);

  const totalOutstanding = purchases
    .filter(p => p.payment_type === "credit" && p.balance > 0)
    .reduce((s, p) => s + p.balance, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>PURCHASE LOG</h2>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            {purchases.length} entries
            {totalOutstanding > 0 && (
              <span style={{ color: "#f59e0b", marginLeft: 12 }}>
                · ₹{totalOutstanding.toLocaleString("en-IN")} outstanding
              </span>
            )}
          </div>
        </div>
        <button onClick={onNew} style={S.btnPrimary}>+ NEW PURCHASE</button>
      </div>

      {purchases.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "#888", fontSize: 13 }}>
          No purchases logged yet. Click "+ New Purchase" to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {purchases.map(p => {
            const st        = STATUS_STYLE[p.display_status] || STATUS_STYLE.pending;
            const isExp     = expanded === p.purchase_ref;
            const hasCredit = p.payment_type === "credit";
            const overdue   = hasCredit && p.balance > 0 && p.payment_due_date && p.payment_due_date < today();

            return (
              <div key={p.purchase_ref} style={{ ...S.card, padding: 0, overflow: "hidden", borderLeft: overdue ? "4px solid #e53e3e" : "4px solid transparent" }}>

                {/* Summary row */}
                <div onClick={() => setExpanded(isExp ? null : p.purchase_ref)}
                  style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 12,
                    cursor: "pointer", flexWrap: "wrap", background: isExp ? "#fafafa" : "#fff" }}>

                  <span style={{ fontSize: 12, fontFamily: "monospace", color: "#888", minWidth: 90 }}>{p.date}</span>
                  <span style={{ fontWeight: 700, flex: 1, minWidth: 120 }}>{p.supplier_name}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{p.items.length} item{p.items.length !== 1 ? "s" : ""}</span>

                  {/* Cost / balance */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>₹{p.total_cost.toLocaleString("en-IN")}</div>
                    {hasCredit && p.total_paid > 0 && p.balance > 0 && (
                      <div style={{ fontSize: 11, color: "#f59e0b" }}>₹{p.balance.toLocaleString("en-IN")} left</div>
                    )}
                  </div>

                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", letterSpacing: 1, ...st }}>
                    {st.label}
                  </span>

                  {hasCredit && p.payment_due_date && p.balance > 0 && (
                    <span style={{ fontSize: 11, color: overdue ? "#e53e3e" : "#aaa" }}>
                      {overdue ? "⚠️ " : ""}due {p.payment_due_date}
                    </span>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    {hasCredit && p.balance > 0 && (
                      <button onClick={() => onRecordPayment(p)}
                        style={{ ...S.btnSuccess, padding: "4px 10px", fontSize: 10 }}>
                        + PAYMENT
                      </button>
                    )}
                    <button onClick={() => onEdit(p)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}>EDIT</button>
                    {isOwner && <button onClick={() => onDelete(p.purchase_ref)} style={{ ...S.btnDanger, padding: "4px 10px" }}>DEL</button>}
                  </div>

                  <span style={{ color: "#bbb", fontSize: 11 }}>{isExp ? "▲" : "▼"}</span>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>

                    {/* Items */}
                    {p.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", padding: "10px 16px 10px 32px", gap: 16,
                        borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                        <span style={{ flex: 1 }}>{item.product_name || item.products?.name || "—"}</span>
                        <span style={{ color: "#888" }}>× {item.quantity}</span>
                        <span style={{ color: "#888" }}>@ ₹{Number(item.cost_price_at_time || 0).toLocaleString("en-IN")}</span>
                        <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>
                          ₹{Number(item.total_cost || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}

                    {p.notes && (
                      <div style={{ padding: "8px 16px 8px 32px", fontSize: 12, color: "#888", fontStyle: "italic", borderBottom: "1px solid #f0f0f0" }}>
                        {p.notes}
                      </div>
                    )}

                    {/* Payment history */}
                    {hasCredit && (
                      <div style={{ padding: "12px 16px 12px 32px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#aaa", marginBottom: 8 }}>
                          PAYMENT HISTORY
                        </div>
                        {p.payments.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#bbb" }}>No payments recorded yet.</div>
                        ) : (
                          p.payments
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((pay, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13,
                                padding: "6px 0", borderBottom: i < p.payments.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                                <span style={{ color: "#888" }}>{pay.date}{pay.notes ? ` · ${pay.notes}` : ""}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontWeight: 700, color: "#38a169" }}>₹{Number(pay.amount).toLocaleString("en-IN")}</span>
                                  <button onClick={e => { e.stopPropagation(); onEditPayment(p, pay); }}
                                    style={{ background: "none", border: "1px solid #ddd", color: "#888", fontSize: 10, padding: "2px 8px", cursor: "pointer", letterSpacing: 1 }}>
                                    EDIT
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                        {p.payments.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, fontWeight: 700 }}>
                            <span>Balance</span>
                            <span style={{ color: p.balance > 0 ? "#f59e0b" : "#38a169" }}>
                              ₹{p.balance.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PURCHASE FORM ────────────────────────────────────────────────────────────

function PurchaseForm({ initial, products, suppliers, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    date:             initial?.date             ?? today(),
    supplier_id:      initial?.supplier_id      ?? "",
    payment_type:     initial?.payment_type     ?? "cash",
    payment_due_date: initial?.payment_due_date ?? "",
    notes:            initial?.notes            ?? "",
  });
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map(i => ({ _rowId: i._rowId || null, product_id: i.product_id, product_name: i.product_name || "", quantity: i.quantity, unit_cost: i.unit_cost ?? "" }))
      : [{ ...EMPTY_ITEM }]
  );

  const setF      = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalCost = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_cost) || 0), 0);

  const updateItem = (idx, key, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };
      if (key === "product_id") {
        const prod = products.find(p => p.id === Number(val));
        if (prod) { updated.product_name = prod.name; updated.unit_cost = updated.unit_cost || prod.cost_price || ""; }
        else        updated.product_id = null;
      }
      return updated;
    }));
  };

  const addItem    = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));

  const submit = () => {
    if (!form.supplier_id)                                              { alert("Select a supplier."); return; }
    if (!items.some(i => i.product_name?.trim()))                       { alert("Add at least one item."); return; }
    if (form.payment_type === "credit" && !form.payment_due_date)       { alert("Enter a due date for credit purchases."); return; }
    onSave(form, items, totalCost);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
          {initial ? "EDIT PURCHASE" : "NEW PURCHASE"}
        </h2>
      </div>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={S.label}>DATE</label>
            <input type="date" value={form.date} onChange={e => setF("date", e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>SUPPLIER</label>
            <select value={form.supplier_id} onChange={e => setF("supplier_id", e.target.value)} style={S.input}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>PAYMENT TYPE</label>
            <div style={{ display: "flex" }}>
              {["cash", "credit"].map((type, ti) => (
                <button key={type} onClick={() => setF("payment_type", type)}
                  style={{ flex: 1, padding: "10px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
                    border: "1px solid #ddd", borderRight: ti === 0 ? "none" : "1px solid #ddd",
                    background: form.payment_type === type ? "#1a1a1a" : "#fff",
                    color:      form.payment_type === type ? "#fff"    : "#888" }}>
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {form.payment_type === "credit" && (
            <div>
              <label style={S.label}>DUE DATE</label>
              <input type="date" value={form.payment_due_date} onChange={e => setF("payment_due_date", e.target.value)} style={S.input} />
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={S.label}>NOTES</label>
            <input value={form.notes} onChange={e => setF("notes", e.target.value)} style={S.input} placeholder="Optional" />
          </div>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 16, overflowX: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>ITEMS PURCHASED</div>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 110px 32px", gap: 8, marginBottom: 8 }}>
            {["PRODUCT", "QTY", "UNIT COST (₹)", "TOTAL", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#aaa" }}>{h}</div>
            ))}
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 100px 130px 110px 32px", gap: 8, marginBottom: 8, alignItems: "start" }}>
              <div>
                <select value={item.product_id || ""} onChange={e => updateItem(idx, "product_id", e.target.value)}
                  style={{ ...S.input, marginBottom: item.product_id ? 0 : 4 }}>
                  <option value="">— Type custom below —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!item.product_id && (
                  <input value={item.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)}
                    style={S.input} placeholder="Product name" />
                )}
              </div>
              <input type="number" value={item.quantity} min={1} onChange={e => updateItem(idx, "quantity", e.target.value)} style={S.input} />
              <input type="number" value={item.unit_cost} min={0} onChange={e => updateItem(idx, "unit_cost", e.target.value)} style={S.input} placeholder="0" />
              <div style={{ padding: "10px 0", fontSize: 13, fontWeight: 700 }}>
                ₹{(Number(item.quantity) * Number(item.unit_cost) || 0).toLocaleString("en-IN")}
              </div>
              <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#e53e3e", fontSize: 18, padding: "8px 0", opacity: items.length === 1 ? 0.3 : 1 }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={addItem} style={{ ...S.btnOutline, padding: "8px 16px", marginTop: 8 }}>+ ADD ITEM</button>
      </div>

      <div style={{ ...S.card, marginBottom: 24, background: "#1a1a1a", color: "#fff", border: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>TOTAL COST</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>₹{totalCost.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>PAYMENT</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{form.payment_type.toUpperCase()}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>DUE DATE</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{form.payment_type === "credit" ? (form.payment_due_date || "—") : "N/A"}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "SAVING..." : initial ? "UPDATE PURCHASE" : "SAVE PURCHASE"}
        </button>
        <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── MAIN TAB ─────────────────────────────────────────────────────────────────

export default function PurchaseLogTab({ role }) {
  const isOwner  = role === "owner";
  const navigate = useNavigate();
  const newMatch  = useMatch("/purchases/new");
  const editMatch = useMatch("/purchases/:ref/edit");

  const isNew   = !!newMatch;
  const isEdit  = !!editMatch;
  const editRef = isEdit ? decodeURIComponent(editMatch.params.ref) : null;

  const [purchases,      setPurchases]      = useState([]);
  const [editData,       setEditData]       = useState(null);
  const [products,       setProducts]       = useState([]);
  const [suppliers,      setSuppliers]      = useState([]);
  const [paymentTarget,     setPaymentTarget]     = useState(null);
  const [editPaymentTarget, setEditPaymentTarget] = useState(null);
  const [toast,             setToast]             = useState(null);
  const [saving,            setSaving]            = useState(false);
  const [paymentSaving,     setPaymentSaving]     = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchPurchases = async () => {
    const [{ data: movements }, { data: payments }] = await Promise.all([
      supabase.from("stock_movements").select("*, suppliers(name)")
        .eq("movement_type", "in").not("purchase_ref", "is", null)
        .order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("purchase_payments").select("*").order("date"),
    ]);
    setPurchases(groupPurchases(movements || [], payments || []));
  };

  useEffect(() => {
    fetchPurchases();
    supabase.from("products").select("id, name, cost_price, stock").order("name").then(({ data }) => setProducts(data || []));
    supabase.from("suppliers").select("*").order("name").then(({ data }) => setSuppliers(data || []));
  }, []);

  useEffect(() => {
    setEditData(null);
    if (!isEdit || !editRef) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("stock_movements").select("*").eq("purchase_ref", editRef);
      if (cancelled || !data?.length) return;
      const first = data[0];
      setEditData({
        date:             first.date,
        supplier_id:      first.supplier_id,
        payment_type:     first.payment_type     || "cash",
        payment_due_date: first.payment_due_date || "",
        notes:            first.notes            || "",
        items: data.map(m => ({ _rowId: m.id, product_id: m.product_id, product_name: m.product_name || "", quantity: m.quantity, unit_cost: m.cost_price_at_time ?? "" })),
      });
    })();
    return () => { cancelled = true; };
  }, [editRef, isEdit]);

  const save = async (formData, items, totalCost) => {
    setSaving(true);
    try {
      const supplier    = suppliers.find(s => s.id === Number(formData.supplier_id));
      const purchaseRef = editRef || `PUR-${Date.now()}`;
      const validItems  = items.filter(i => i.product_name?.trim());

      const sharedFields = item => ({
        product_id:         item.product_id  || null,
        product_name:       item.product_name,
        quantity:           Number(item.quantity),
        cost_price_at_time: Number(item.unit_cost) || null,
        total_cost:         Number(item.quantity) * (Number(item.unit_cost) || 0),
        supplier_id:        Number(formData.supplier_id),
        supplier_name:      supplier?.name   || "",
        payment_type:       formData.payment_type,
        payment_status:     formData.payment_type === "cash" ? "paid" : "pending",
        payment_due_date:   formData.payment_type === "credit" ? formData.payment_due_date : null,
        date:               formData.date,
        notes:              formData.notes   || null,
      });

      if (editRef) {
        // Fetch current DB rows so we can reverse their stock
        const { data: oldRows } = await supabase.from("stock_movements").select("*").eq("purchase_ref", editRef);

        // Reverse stock for every old row
        for (const m of (oldRows || [])) {
          if (m.product_id) {
            const { data: prod } = await supabase.from("products").select("stock").eq("id", m.product_id).single();
            if (prod) await supabase.from("products").update({ stock: Math.max(0, prod.stock - m.quantity) }).eq("id", m.product_id);
          }
        }

        // Which DB row IDs the form still contains
        const keptIds   = new Set(validItems.map(i => i._rowId).filter(Boolean));
        const allOldIds = (oldRows || []).map(r => r.id);

        // Delete rows the user removed from the form
        const removedIds = allOldIds.filter(id => !keptIds.has(id));
        if (removedIds.length > 0) {
          await supabase.from("stock_movements").delete().in("id", removedIds);
        }

        // UPDATE rows that already exist in DB
        for (const item of validItems.filter(i => i._rowId)) {
          const { error: upErr } = await supabase.from("stock_movements")
            .update(sharedFields(item))
            .eq("id", item._rowId);
          if (upErr) { showToast(upErr.message, "error"); setSaving(false); return; }
        }

        // INSERT only newly added rows (no _rowId)
        const newItems = validItems.filter(i => !i._rowId);
        if (newItems.length > 0) {
          const { error: insErr } = await supabase.from("stock_movements").insert(
            newItems.map(item => ({ ...sharedFields(item), movement_type: "in", purchase_ref: purchaseRef, reference: purchaseRef }))
          );
          if (insErr) { showToast(insErr.message, "error"); setSaving(false); return; }
        }

        // Add new stock quantities
        for (const item of validItems) {
          if (!item.product_id) continue;
          const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
          if (prod) await supabase.from("products").update({ stock: prod.stock + Number(item.quantity), cost_price: Number(item.unit_cost) || undefined }).eq("id", item.product_id);
        }

        showToast("Purchase updated!");
        await fetchPurchases();
        navigate("/purchases");
        setSaving(false);
        return;
      }

      // ── NEW PURCHASE ──
      const { error } = await supabase.from("stock_movements").insert(
        validItems.map(item => ({ ...sharedFields(item), movement_type: "in", purchase_ref: purchaseRef, reference: purchaseRef }))
      );
      if (error) { showToast(error.message, "error"); setSaving(false); return; }

      for (const item of validItems) {
        if (!item.product_id) continue;
        const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
        if (prod) await supabase.from("products").update({ stock: prod.stock + Number(item.quantity), cost_price: Number(item.unit_cost) || undefined }).eq("id", item.product_id);
      }

      showToast("Purchase saved!");
      await fetchPurchases();
      navigate("/purchases");
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const recordPayment = async (form) => {
    setPaymentSaving(true);
    const ref = paymentTarget.purchase_ref;
    const { error } = await supabase.from("purchase_payments").insert([{
      purchase_ref: ref,
      amount:       Number(form.amount),
      date:         form.date,
      notes:        form.notes || null,
    }]);
    if (error) { showToast(error.message, "error"); setPaymentSaving(false); return; }

    // If fully paid, update stock_movements status to "paid"
    const newBalance = paymentTarget.balance - Number(form.amount);
    if (newBalance <= 0.01) {
      await supabase.from("stock_movements").update({ payment_status: "paid" }).eq("purchase_ref", ref);
    }

    showToast("Payment recorded!");
    setPaymentTarget(null);
    setPaymentSaving(false);
    fetchPurchases();
  };

  const updatePayment = async (form) => {
    setPaymentSaving(true);
    const { purchase, payment } = editPaymentTarget;
    const { error } = await supabase.from("purchase_payments").update({
      amount: Number(form.amount),
      date:   form.date,
      notes:  form.notes || null,
    }).eq("id", payment.id);
    if (error) { showToast(error.message, "error"); setPaymentSaving(false); return; }

    // Recalculate payment_status on stock_movements
    const otherPaid  = purchase.payments.filter(p => p.id !== payment.id).reduce((s, p) => s + Number(p.amount), 0);
    const newBalance = Math.max(0, purchase.total_cost - otherPaid - Number(form.amount));
    await supabase.from("stock_movements").update({ payment_status: newBalance <= 0.01 ? "paid" : "pending" }).eq("purchase_ref", purchase.purchase_ref);

    showToast("Payment updated!");
    setEditPaymentTarget(null);
    setPaymentSaving(false);
    fetchPurchases();
  };

  const deletePurchase = async (purchaseRef) => {
    if (!window.confirm("Delete this purchase? Stock will be reversed and all payment records removed.")) return;
    const { data: rows } = await supabase.from("stock_movements").select("*").eq("purchase_ref", purchaseRef);
    for (const m of (rows || [])) {
      if (m.product_id) {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", m.product_id).single();
        if (prod) await supabase.from("products").update({ stock: Math.max(0, prod.stock - m.quantity) }).eq("id", m.product_id);
      }
    }
    await supabase.from("stock_movements").delete().eq("purchase_ref", purchaseRef);
    await supabase.from("purchase_payments").delete().eq("purchase_ref", purchaseRef);
    showToast("Purchase deleted — stock reversed");
    fetchPurchases();
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {paymentTarget && (
        <PaymentModal
          purchase={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSave={recordPayment}
          saving={paymentSaving}
        />
      )}

      {editPaymentTarget && (
        <PaymentModal
          purchase={editPaymentTarget.purchase}
          existingPayment={editPaymentTarget.payment}
          onClose={() => setEditPaymentTarget(null)}
          onSave={updatePayment}
          saving={paymentSaving}
        />
      )}

      {!isNew && !isEdit && (
        <PurchaseList
          purchases={purchases}
          onNew={() => navigate("/purchases/new")}
          onEdit={p => navigate(`/purchases/${encodeURIComponent(p.purchase_ref)}/edit`)}
          onDelete={deletePurchase}
          onRecordPayment={setPaymentTarget}
          onEditPayment={(purchase, payment) => setEditPaymentTarget({ purchase, payment })}
          isOwner={isOwner}
        />
      )}

      {isNew && (
        <PurchaseForm products={products} suppliers={suppliers} onSave={save} onCancel={() => navigate("/purchases")} saving={saving} />
      )}

      {isEdit && (
        editData
          ? <PurchaseForm initial={editData} products={products} suppliers={suppliers} onSave={save} onCancel={() => navigate("/purchases")} saving={saving} />
          : <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      )}
    </div>
  );
}
