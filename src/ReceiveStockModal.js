import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthProvider";
import { S } from "./styles";

const today = () => new Date().toISOString().split("T")[0];

export default function ReceiveStockModal({ product, onClose, onSuccess }) {
  const { session } = useAuth();
  const [form, setForm] = useState({
    quantity: "",
    supplier_name: "",
    cost_price_at_time: "",
    date: today(),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.quantity || +form.quantity < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    setSaving(true);
    setError("");

    const qty = parseInt(form.quantity);

    // Update product stock
    const { data: current, error: fetchError } = await supabase
      .from("products")
      .select("stock")
      .eq("id", product.id)
      .single();

    if (fetchError) { setError(fetchError.message); setSaving(false); return; }

    const { error: stockError } = await supabase
      .from("products")
      .update({ stock: current.stock + qty })
      .eq("id", product.id);

    if (stockError) { setError(stockError.message); setSaving(false); return; }

    // Log to stock_movements
    const { error: movError } = await supabase.from("stock_movements").insert({
      product_id: product.id,
      movement_type: "in",
      quantity: qty,
      reference: "manual",
      supplier_name: form.supplier_name || null,
      cost_price_at_time: form.cost_price_at_time !== "" ? +form.cost_price_at_time : null,
      date: form.date,
      notes: form.notes || null,
      created_by: session?.user?.id ?? null,
    });

    if (movError) { setError(movError.message); setSaving(false); return; }

    setSaving(false);
    onSuccess(qty);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>RECEIVE STOCK</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 24 }}>{product.name}</div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>QUANTITY RECEIVED</label>
          <input
            type="number" min="1"
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })}
            style={S.input} placeholder="0" autoFocus
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>DATE</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              style={S.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>COST PRICE PAID (₹)</label>
            <input
              type="number"
              value={form.cost_price_at_time}
              onChange={e => setForm({ ...form, cost_price_at_time: e.target.value })}
              style={S.input} placeholder="Optional"
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>SUPPLIER NAME</label>
          <input
            type="text"
            value={form.supplier_name}
            onChange={e => setForm({ ...form, supplier_name: e.target.value })}
            style={S.input} placeholder="Optional"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>NOTES</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            style={{ ...S.input, resize: "vertical" }}
            placeholder="Optional"
          />
        </div>

        {error && <div style={{ fontSize: 12, color: "#e53e3e", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={save} disabled={saving} style={{ ...S.btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
            {saving ? "SAVING..." : "CONFIRM RECEIPT"}
          </button>
          <button onClick={onClose} style={{ ...S.btnOutline, flex: 1 }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
