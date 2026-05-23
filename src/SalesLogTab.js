import { useState, useEffect } from "react";
import { useNavigate, useMatch } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { S } from "./styles";
import { deductStock, restoreStock, adjustStock } from "./invoice/useInvoiceStock";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_ITEM = { product_id: null, product_name: "", quantity: 1, selling_price: "", cost_price: "", total: 0 };

function calcTotals(items, gst_collected) {
  const total_amount = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.selling_price) || 0), 0);
  const total_cost   = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.cost_price)   || 0), 0);
  const gst          = Number(gst_collected) || 0;
  return { total_amount, total_cost, gst_collected: gst, gross_profit: total_amount - gst - total_cost };
}

// ─── SALE FORM ────────────────────────────────────────────────────────────────

function SaleForm({ initial, products, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    date:          initial?.date          ?? today(),
    customer_name: initial?.customer_name ?? "",
    notes:         initial?.notes         ?? "",
    payment_bank:        initial?.payment_bank        ?? "",
    payment_cash:        initial?.payment_cash        ?? "",
    payment_upi_veena:   initial?.payment_upi_veena   ?? "",
    payment_upi_ujjwal:  initial?.payment_upi_ujjwal  ?? "",
    gst_collected:       initial?.gst_collected       ?? "",
  });
  const [items, setItems] = useState(
    initial?.items?.length ? initial.items.map(i => ({ ...i })) : [{ ...EMPTY_ITEM }]
  );

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totals = calcTotals(items, form.gst_collected);
  const totalReceived = (Number(form.payment_bank) || 0) + (Number(form.payment_cash) || 0)
    + (Number(form.payment_upi_veena) || 0) + (Number(form.payment_upi_ujjwal) || 0);

  const updateItem = (idx, key, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };
      if (key === "product_id") {
        const prod = products.find(p => p.id === Number(val));
        if (prod) {
          updated.product_name  = prod.name;
          updated.cost_price    = prod.cost_price ?? "";
          updated.selling_price = updated.selling_price || prod.price || "";
        } else {
          updated.product_id = null;
        }
      }
      updated.total = (Number(updated.quantity) * Number(updated.selling_price)) || 0;
      return updated;
    }));
  };

  const addItem    = () => setItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));

  const submit = () => {
    if (!items.some(i => i.product_name.trim())) {
      alert("Add at least one item.");
      return;
    }
    onSave(form, items, totals);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onCancel} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>
          {initial ? "EDIT SALE" : "NEW SALE"}
        </h2>
      </div>

      {/* Basic fields */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={S.label}>DATE</label>
            <input type="date" value={form.date} onChange={e => setF("date", e.target.value)} style={S.input} />
          </div>
          <div>
            <label style={S.label}>CUSTOMER NAME</label>
            <input value={form.customer_name} onChange={e => setF("customer_name", e.target.value)}
              style={S.input} placeholder="Optional" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={S.label}>NOTES</label>
            <input value={form.notes} onChange={e => setF("notes", e.target.value)}
              style={S.input} placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ ...S.card, marginBottom: 16, overflowX: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>ITEMS</div>

        <div style={{ minWidth: 640 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 120px 120px 100px 32px", gap: 8, marginBottom: 8 }}>
            {["PRODUCT", "QTY", "SELL PRICE (₹)", "COST PRICE (₹)", "TOTAL", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#aaa" }}>{h}</div>
            ))}
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 80px 120px 120px 100px 32px", gap: 8, marginBottom: 8, alignItems: "start" }}>
              <div>
                <select
                  value={item.product_id || ""}
                  onChange={e => updateItem(idx, "product_id", e.target.value)}
                  style={{ ...S.input, marginBottom: item.product_id ? 0 : 4 }}
                >
                  <option value="">— Type custom below —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {!item.product_id && (
                  <input value={item.product_name}
                    onChange={e => updateItem(idx, "product_name", e.target.value)}
                    style={S.input} placeholder="Product name" />
                )}
              </div>
              <input type="number" value={item.quantity} min={1}
                onChange={e => updateItem(idx, "quantity", e.target.value)} style={S.input} />
              <input type="number" value={item.selling_price} min={0}
                onChange={e => updateItem(idx, "selling_price", e.target.value)}
                style={S.input} placeholder="0" />
              <input type="number" value={item.cost_price} min={0}
                onChange={e => updateItem(idx, "cost_price", e.target.value)}
                style={S.input} placeholder="0" />
              <div style={{ padding: "10px 0", fontSize: 13, fontWeight: 700 }}>
                ₹{(Number(item.quantity) * Number(item.selling_price) || 0).toLocaleString("en-IN")}
              </div>
              <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#e53e3e", fontSize: 18, padding: "8px 0", opacity: items.length === 1 ? 0.3 : 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>

        <button onClick={addItem} style={{ ...S.btnOutline, padding: "8px 16px", marginTop: 8 }}>+ ADD ITEM</button>
      </div>

      {/* Payment split */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>PAYMENT RECEIVED</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <div>
            <label style={S.label}>BANK (₹)</label>
            <input type="number" value={form.payment_bank}
              onChange={e => setF("payment_bank", e.target.value)}
              style={S.input} placeholder="0" min={0} />
          </div>
          <div>
            <label style={S.label}>CASH (₹)</label>
            <input type="number" value={form.payment_cash}
              onChange={e => setF("payment_cash", e.target.value)}
              style={S.input} placeholder="0" min={0} />
          </div>
          <div>
            <label style={S.label}>UPI — VEENA (₹)</label>
            <input type="number" value={form.payment_upi_veena}
              onChange={e => setF("payment_upi_veena", e.target.value)}
              style={S.input} placeholder="0" min={0} />
          </div>
          <div>
            <label style={S.label}>UPI — UJJWAL (₹)</label>
            <input type="number" value={form.payment_upi_ujjwal}
              onChange={e => setF("payment_upi_ujjwal", e.target.value)}
              style={S.input} placeholder="0" min={0} />
          </div>
          <div>
            <label style={S.label}>GST COLLECTED (₹)</label>
            <input type="number" value={form.gst_collected}
              onChange={e => setF("gst_collected", e.target.value)}
              style={{ ...S.input, borderColor: Number(form.gst_collected) > 0 ? "#e53e3e" : "#ddd" }}
              placeholder="0 — leave blank if off-book" min={0} />
          </div>
          <div>
            <label style={S.label}>TOTAL RECEIVED</label>
            <div style={{ padding: "10px 12px", background: "#f5f5f0", fontSize: 14, fontWeight: 700, border: "1px solid #ddd" }}>
              ₹{totalReceived.toLocaleString("en-IN")}
            </div>
          </div>
          {totalReceived < totals.total_amount && totals.total_amount > 0 && (
            <div>
              <label style={S.label}>BALANCE PENDING</label>
              <div style={{ padding: "10px 12px", background: "#fff5f5", fontSize: 14, fontWeight: 700, color: "#e53e3e", border: "1px solid #fed7d7" }}>
                ₹{(totals.total_amount - totalReceived).toLocaleString("en-IN")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ ...S.card, marginBottom: 24, background: "#1a1a1a", color: "#fff", border: "none" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${totals.gst_collected > 0 ? 4 : 3}, 1fr)`, gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>TOTAL SALE</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>₹{totals.total_amount.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>TOTAL COST</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>₹{totals.total_cost.toLocaleString("en-IN")}</div>
          </div>
          {totals.gst_collected > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>GST (EXCLUDED)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#e53e3e" }}>
                − ₹{totals.gst_collected.toLocaleString("en-IN")}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", marginBottom: 4 }}>GROSS PROFIT</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: totals.gross_profit >= 0 ? "#38a169" : "#e53e3e" }}>
              ₹{totals.gross_profit.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={submit} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? "SAVING..." : initial ? "UPDATE SALE" : "SAVE SALE"}
        </button>
        <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
      </div>
    </div>
  );
}

// ─── SALES LIST ───────────────────────────────────────────────────────────────

function SalesList({ sales, onNew, onEdit, onDelete, isOwner }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>SALES LOG</h2>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{sales.length} entries</div>
        </div>
        <button onClick={onNew} style={S.btnPrimary}>+ NEW SALE</button>
      </div>

      {sales.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 48, color: "#888", fontSize: 13 }}>
          No sales logged yet. Click "+ New Sale" to get started.
        </div>
      ) : (
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f5f0", borderBottom: "2px solid #e8e8e8" }}>
                  {["DATE", "CUSTOMER", "ITEMS", "BANK", "CASH", "UPI VEENA", "UPI UJJWAL", "TOTAL", "PROFIT", "MARGIN", ""].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(s => {
                  const margin = s.total_amount > 0 ? ((s.gross_profit / s.total_amount) * 100).toFixed(1) : 0;
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.date}</td>
                      <td style={{ padding: "12px 16px" }}>{s.customer_name || <span style={{ color: "#ccc" }}>—</span>}</td>
                      <td style={{ padding: "12px 16px", color: "#888", textAlign: "center" }}>{s.item_count}</td>
                      <td style={{ padding: "12px 16px", color: "#888" }}>
                        {Number(s.payment_bank) > 0 ? `₹${Number(s.payment_bank).toLocaleString("en-IN")}` : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888" }}>
                        {Number(s.payment_cash) > 0 ? `₹${Number(s.payment_cash).toLocaleString("en-IN")}` : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888" }}>
                        {Number(s.payment_upi_veena) > 0 ? `₹${Number(s.payment_upi_veena).toLocaleString("en-IN")}` : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888" }}>
                        {Number(s.payment_upi_ujjwal) > 0 ? `₹${Number(s.payment_upi_ujjwal).toLocaleString("en-IN")}` : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>₹{Number(s.total_amount).toLocaleString("en-IN")}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: Number(s.gross_profit) >= 0 ? "#38a169" : "#e53e3e" }}>
                        ₹{Number(s.gross_profit).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: Number(margin) >= 20 ? "#38a169" : "#888" }}>
                        {margin}%
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => onEdit(s)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}>EDIT</button>
                          {isOwner && (
                            <button onClick={() => onDelete(s.id)} style={{ ...S.btnDanger, padding: "4px 10px" }}>DEL</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN TAB ─────────────────────────────────────────────────────────────────

export default function SalesLogTab({ role }) {
  const isOwner  = role === "owner";
  const navigate = useNavigate();
  const newMatch  = useMatch("/sales/new");
  const editMatch = useMatch("/sales/:id/edit");

  const isNew  = !!newMatch;
  const isEdit = !!editMatch;
  const editId = isEdit ? Number(editMatch.params.id) : null;

  const [sales,    setSales]    = useState([]);
  const [editData, setEditData] = useState(null);
  const [products, setProducts] = useState([]);
  const [toast,    setToast]    = useState(null);
  const [saving,   setSaving]   = useState(false);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales_log")
      .select("*, sales_log_items(count)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    setSales((data || []).map(s => ({ ...s, item_count: s.sales_log_items?.[0]?.count ?? 0 })));
  };

  useEffect(() => {
    fetchSales();
    supabase.from("products").select("id, name, price, cost_price, stock").order("name")
      .then(({ data }) => setProducts(data || []));
  }, []);

  // Load edit data
  useEffect(() => {
    setEditData(null);
    if (!isEdit || !editId || isNaN(editId)) return;
    let cancelled = false;
    (async () => {
      const { data: sale }  = await supabase.from("sales_log").select("*").eq("id", editId).single();
      const { data: items } = await supabase.from("sales_log_items").select("*").eq("sale_id", editId);
      if (cancelled) return;
      setEditData(sale ? { ...sale, items: items || [] } : null);
    })();
    return () => { cancelled = true; };
  }, [editId, isEdit]);

  const save = async (formData, items, totals) => {
    setSaving(true);
    try {
      const payload = {
        date:          formData.date,
        customer_name: formData.customer_name || null,
        notes:         formData.notes         || null,
        payment_bank:        Number(formData.payment_bank)       || 0,
        payment_cash:        Number(formData.payment_cash)       || 0,
        payment_upi_veena:   Number(formData.payment_upi_veena)  || 0,
        payment_upi_ujjwal:  Number(formData.payment_upi_ujjwal) || 0,
        gst_collected:       Number(formData.gst_collected)      || 0,
        total_amount:  totals.total_amount,
        total_cost:    totals.total_cost,
        gross_profit:  totals.gross_profit,
      };

      let saleId;

      if (editData) {
        const { error } = await supabase.from("sales_log").update(payload).eq("id", editData.id);
        if (error) { showToast(error.message, "error"); setSaving(false); return; }
        await supabase.from("sales_log_items").delete().eq("sale_id", editData.id);
        await adjustStock(editData.items || [], items, editData.id);
        saleId = editData.id;
        showToast("Sale updated!");
      } else {
        const { data, error } = await supabase.from("sales_log").insert([payload]).select();
        if (error) { showToast(error.message, "error"); setSaving(false); return; }
        saleId = data[0].id;
        await deductStock(items, saleId);
        showToast("Sale saved!");
      }

      const itemRows = items
        .filter(i => i.product_name?.trim())
        .map(i => ({
          sale_id:       saleId,
          product_id:    i.product_id    || null,
          product_name:  i.product_name,
          quantity:      Number(i.quantity),
          selling_price: Number(i.selling_price) || 0,
          cost_price:    Number(i.cost_price)    || 0,
          total:         Number(i.quantity) * (Number(i.selling_price) || 0),
        }));

      await supabase.from("sales_log_items").insert(itemRows);
      await fetchSales();
      navigate("/sales");
    } catch (e) {
      showToast(e.message, "error");
    }
    setSaving(false);
  };

  const deleteSale = async (id) => {
    if (!window.confirm("Delete this sale? Stock will be restored.")) return;
    const { data: items } = await supabase.from("sales_log_items").select("*").eq("sale_id", id);
    await restoreStock(items || [], id);
    await supabase.from("sales_log_items").delete().eq("sale_id", id);
    await supabase.from("sales_log").delete().eq("id", id);
    showToast("Sale deleted — stock restored");
    fetchSales();
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {!isNew && !isEdit && (
        <SalesList
          sales={sales}
          onNew={() => navigate("/sales/new")}
          onEdit={s => navigate(`/sales/${s.id}/edit`)}
          onDelete={deleteSale}
          isOwner={isOwner}
        />
      )}

      {isNew && (
        <SaleForm products={products} onSave={save} onCancel={() => navigate("/sales")} saving={saving} />
      )}

      {isEdit && (
        editData
          ? <SaleForm initial={editData} products={products} onSave={save} onCancel={() => navigate("/sales")} saving={saving} />
          : <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      )}
    </div>
  );
}
