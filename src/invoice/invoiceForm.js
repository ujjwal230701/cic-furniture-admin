import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { INDIAN_STATES, DEFAULT_GST_RATE } from "./invoiceConfig";
import { getGSTType, calcTotals, fmt, generateInvoiceNumber } from "./invoiceUtils";
import { S } from "../styles";

const today = () => new Date().toISOString().split("T")[0];

const emptyItem = () => ({
  product_name: "", description: "", hsn_sac: "",
  quantity: 1, unit_price: 0, gst_rate: DEFAULT_GST_RATE, total: 0
});

export default function InvoiceForm({ onSave, onCancel, initial }) {
  const [products, setProducts] = useState([]);
  const [invoice, setInvoice] = useState(initial || {
    invoice_number: "", customer_name: "", customer_address: "",
    customer_gstin: "", customer_phone: "", place_of_supply: "Chandigarh",
    due_date: today(), payment_status: "unpaid", notes: "",
  });
  const [items, setItems] = useState(initial?.items || [emptyItem()]);

  useEffect(() => {
    supabase.from("products").select("id, name, price").order("name")
      .then(({ data }) => setProducts(data || []));
    if (!initial) {
      supabase.from("invoices").select("invoice_number").order("id", { ascending: false }).limit(1)
        .then(({ data }) => {
          const last = data?.[0]?.invoice_number;
          setInvoice(i => ({ ...i, invoice_number: generateInvoiceNumber(last) }));
        });
    }
  }, []);

  const gstType = getGSTType(invoice.place_of_supply);
  const totals = calcTotals(items, gstType);

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === "product_name") {
        const product = products.find(p => p.name === value);
        if (product) updated.unit_price = product.price;
      }
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const save = () => {
    if (!invoice.customer_name || items.length === 0) return;
    onSave({ ...invoice, ...totals, gst_type: gstType }, items);
  };

  const inputStyle = { ...S.input, marginBottom: 0 };

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{initial ? "EDIT INVOICE" : "NEW INVOICE"}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} style={S.btnPrimary}>SAVE INVOICE</button>
          <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
        </div>
      </div>

      {/* Invoice Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[["Invoice Number", "invoice_number"], ["Due Date", "due_date", "date"]].map(([label, key, type]) => (
          <div key={key}>
            <label style={S.label}>{label.toUpperCase()}</label>
            <input type={type || "text"} value={invoice[key]} onChange={e => setInvoice({ ...invoice, [key]: e.target.value })} style={inputStyle} />
          </div>
        ))}
      </div>

      {/* Customer Details */}
      <div style={{ background: "#f9f9f9", padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>CUSTOMER DETAILS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[["Customer Name", "customer_name"], ["Phone", "customer_phone"], ["GSTIN", "customer_gstin"]].map(([label, key]) => (
            <div key={key}>
              <label style={S.label}>{label.toUpperCase()}</label>
              <input value={invoice[key]} onChange={e => setInvoice({ ...invoice, [key]: e.target.value })} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={S.label}>PLACE OF SUPPLY</label>
            <select value={invoice.place_of_supply} onChange={e => setInvoice({ ...invoice, place_of_supply: e.target.value })} style={inputStyle}>
              {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={S.label}>ADDRESS</label>
            <textarea value={invoice.customer_address} onChange={e => setInvoice({ ...invoice, customer_address: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
      </div>

      {/* GST Type indicator */}
      <div style={{ marginBottom: 16, padding: "8px 14px", background: gstType === "intra" ? "#f0fff4" : "#ebf8ff", fontSize: 12, fontWeight: 700, color: gstType === "intra" ? "#38a169" : "#2b6cb0" }}>
        {gstType === "intra" ? "INTRA-STATE SUPPLY → CGST + SGST will apply" : "INTER-STATE SUPPLY → IGST will apply"}
      </div>

      {/* Line Items */}
      <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>LINE ITEMS</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
        <thead>
          <tr>
            {["ITEM", "HSN/SAC", "QTY", "RATE (₹)", `GST %`, "TOTAL", ""].map((h, i) => (
              <th key={i} style={{ background: "#1a1a1a", color: "#fff", padding: "8px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textAlign: i > 1 ? "right" : "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #e8e8e8" }}>
              <td style={{ padding: "8px 6px", minWidth: 180 }}>
                <input list={`products-${index}`} value={item.product_name} onChange={e => updateItem(index, "product_name", e.target.value)} placeholder="Product name" style={{ ...inputStyle, marginBottom: 4 }} />
                <datalist id={`products-${index}`}>
                  {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
                <input value={item.description} onChange={e => updateItem(index, "description", e.target.value)} placeholder="Description (optional)" style={{ ...inputStyle, fontSize: 11, color: "#666" }} />
              </td>
              <td style={{ padding: "8px 6px", width: 90 }}>
                <input value={item.hsn_sac} onChange={e => updateItem(index, "hsn_sac", e.target.value)} style={inputStyle} />
              </td>
              <td style={{ padding: "8px 6px", width: 60 }}>
                <input type="number" value={item.quantity} onChange={e => updateItem(index, "quantity", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
              </td>
              <td style={{ padding: "8px 6px", width: 100 }}>
                <input type="number" value={item.unit_price} onChange={e => updateItem(index, "unit_price", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
              </td>
              <td style={{ padding: "8px 6px", width: 60 }}>
                <input type="number" value={item.gst_rate} onChange={e => updateItem(index, "gst_rate", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
              </td>
              <td style={{ padding: "8px 6px", width: 100, textAlign: "right", fontWeight: 600 }}>
                ₹{fmt(item.quantity * item.unit_price)}
              </td>
              <td style={{ padding: "8px 6px", width: 30 }}>
                {items.length > 1 && <button onClick={() => removeItem(index)} style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 16 }}>✕</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addItem} style={{ ...S.btnOutline, fontSize: 11, padding: "7px 16px", marginBottom: 24 }}>+ ADD ITEM</button>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ minWidth: 280 }}>
          {[["Subtotal", `₹${fmt(totals.subtotal)}`],
            gstType === "intra" ? [`CGST`, `₹${fmt(totals.cgst)}`] : null,
            gstType === "intra" ? [`SGST`, `₹${fmt(totals.sgst)}`] : null,
            gstType === "inter" ? [`IGST`, `₹${fmt(totals.igst)}`] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
              <span style={{ color: "#555" }}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", background: "#1a1a1a", color: "#fff", padding: "10px 16px", marginTop: 8 }}>
            <span style={{ fontWeight: 700 }}>TOTAL</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>₹{fmt(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Status & Notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={S.label}>PAYMENT STATUS</label>
          <select value={invoice.payment_status} onChange={e => setInvoice({ ...invoice, payment_status: e.target.value })} style={inputStyle}>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div>
          <label style={S.label}>NOTES</label>
          <input value={invoice.notes} onChange={e => setInvoice({ ...invoice, notes: e.target.value })} style={inputStyle} placeholder="Any additional notes..." />
        </div>
      </div>
    </div>
  );
}
