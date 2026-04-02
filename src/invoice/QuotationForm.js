import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { S } from "../styles";
import { getGSTType, calcTotals, generateQuotationNumber } from "./invoiceUtils";
import { DEFAULT_GST_RATE } from "./invoiceConfig";
import GSTToggle from "./GSTToggle";
import CustomerFields from "./CustomerFields";
import LineItemsTable from "./LineItemsTable";
import InvoiceTotals from "./InvoiceTotals";

const today = () => new Date().toISOString().split("T")[0];
const thirtyDaysLater = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

export const emptyItem = () => ({
  product_id: null, product_name: "", description: "", hsn_sac: "",
  quantity: 1, catalogue_price: 0, unit_price: 0, discount_pct: 0, gst_rate: DEFAULT_GST_RATE,
  _pending_parent_id: null, _pending_parent_name: null,
});

export default function QuotationForm({ onSave, onCancel, initial }) {
  const [products, setProducts] = useState([]);
  const [gstInclusive, setGstInclusive] = useState(initial?.gst_inclusive || false);
  const [quotation, setQuotation] = useState(initial || {
    quotation_number: "", customer_name: "", customer_address: "",
    customer_gstin: "", customer_phone: "", place_of_supply: "Chandigarh",
    valid_till: thirtyDaysLater(), quo_status: "draft", notes: "",
  });
  const [items, setItems] = useState(initial?.items || [emptyItem()]);

  useEffect(() => {
    supabase.from("products").select("id, name, price, sku, parent_product_id, variant_type, variant_value").order("name")
      .then(({ data }) => setProducts(data || []));
    if (!initial) {
      supabase.from("quotations").select("quotation_number").order("id", { ascending: false }).limit(1)
        .then(({ data }) => {
          setQuotation(q => ({ ...q, quotation_number: generateQuotationNumber(data?.[0]?.quotation_number) }));
        });
    }
  }, []);

  const update = (key, value) => setQuotation(q => ({ ...q, [key]: value }));
  const gstType = getGSTType(quotation.place_of_supply);
  const totals = calcTotals(items, gstType, gstInclusive);

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      let updated = { ...item, [field]: value };
      if (field === "product_name") {
        const product = products.find(p => p.name === value);
        if (product) { updated.product_id = product.id; updated.catalogue_price = product.price; updated.unit_price = product.price; updated.hsn_sac = product.sku || ""; }
        else updated.product_id = null;
      }
      if (field === "catalogue_price") updated.unit_price = value * (1 - (updated.discount_pct || 0) / 100);
      if (field === "discount_pct") updated.unit_price = updated.catalogue_price * (1 - value / 100);
      return updated;
    }));
  };

  const save = () => {
    if (!quotation.customer_name || items.length === 0) return;
    onSave({ ...quotation, ...totals, gst_type: gstType, gst_inclusive: gstInclusive }, items);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{initial ? "EDIT QUOTATION" : "NEW QUOTATION"}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} style={S.btnPrimary}>SAVE QUOTATION</button>
          <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={S.label}>QUOTATION NUMBER</label>
          <input value={quotation.quotation_number} onChange={e => update("quotation_number", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>VALID TILL</label>
          <input type="date" value={quotation.valid_till} onChange={e => update("valid_till", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>STATUS</label>
          <select value={quotation.quo_status} onChange={e => update("quo_status", e.target.value)} style={S.input}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div>
          <label style={S.label}>NOTES</label>
          <input value={quotation.notes} onChange={e => update("notes", e.target.value)} style={S.input} placeholder="Any additional notes..." />
        </div>
      </div>

      <GSTToggle gstInclusive={gstInclusive} setGstInclusive={setGstInclusive} gstType={gstType} />
      <CustomerFields invoice={quotation} setInvoice={setQuotation} />
      <LineItemsTable items={items} products={products} gstInclusive={gstInclusive} gstType={gstType}
        onChange={updateItem} onAdd={() => setItems(p => [...p, emptyItem()])} onRemove={i => setItems(p => p.filter((_, idx) => idx !== i))} />
      <InvoiceTotals totals={totals} gstType={gstType} />
    </div>
  );
}
