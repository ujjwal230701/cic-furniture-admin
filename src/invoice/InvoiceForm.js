import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { S } from "../styles";
import { getGSTType, calcTotals, generateInvoiceNumber } from "./invoiceUtils";
import { DEFAULT_GST_RATE } from "./invoiceConfig";
import GSTToggle from "./GSTToggle";
import InvoiceMetaFields from "./InvoiceMetaFields";
import CustomerFields from "./CustomerFields";
import LineItemsTable from "./LineItemsTable";
import InvoiceTotals from "./InvoiceTotals";

const today = () => new Date().toISOString().split("T")[0];
export const emptyItem = () => ({
  product_id: null, product_name: "", description: "", hsn_sac: "",
  quantity: 1, catalogue_price: 0, unit_price: 0, discount_pct: 0, gst_rate: DEFAULT_GST_RATE,
});

export default function InvoiceForm({ onSave, onCancel, initial }) {
  const [products, setProducts] = useState([]);
  const [gstInclusive, setGstInclusive] = useState(initial?.gst_inclusive || false);
  const [invoice, setInvoice] = useState(initial || {
    invoice_number: "", customer_name: "", customer_address: "",
    customer_gstin: "", customer_phone: "", place_of_supply: "Chandigarh",
    due_date: today(), payment_status: "unpaid", notes: "", status: "active",
  });
  const [items, setItems] = useState(initial?.items || [emptyItem()]);

  useEffect(() => {
    supabase.from("products").select("id, name, price, sku").order("name")
      .then(({ data }) => setProducts(data || []));
    if (!initial) {
      supabase.from("invoices").select("invoice_number").order("id", { ascending: false }).limit(1)
        .then(({ data }) => {
          setInvoice(i => ({ ...i, invoice_number: generateInvoiceNumber(data?.[0]?.invoice_number) }));
        });
    }
  }, []);

  const gstType = getGSTType(invoice.place_of_supply);
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
    if (!invoice.customer_name || items.length === 0) return;
    const manualItems = items.filter(item => !item.product_id && item.product_name);
    if (manualItems.length > 0) {
      const names = manualItems.map(i => i.product_name).join(", ");
      const proceed = window.confirm(`⚠️ These items are not from your catalogue:\n\n${names}\n\nStock will NOT be updated for these items.\n\nProceed anyway?`);
      if (!proceed) return;
    }
    onSave({ ...invoice, ...totals, gst_type: gstType, gst_inclusive: gstInclusive }, items);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{initial ? "EDIT INVOICE" : "NEW INVOICE"}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} style={S.btnPrimary}>SAVE INVOICE</button>
          <button onClick={onCancel} style={S.btnOutline}>CANCEL</button>
        </div>
      </div>
      <GSTToggle gstInclusive={gstInclusive} setGstInclusive={setGstInclusive} gstType={gstType} />
      <InvoiceMetaFields invoice={invoice} setInvoice={setInvoice} />
      <CustomerFields invoice={invoice} setInvoice={setInvoice} />
      <LineItemsTable items={items} products={products} gstInclusive={gstInclusive} gstType={gstType}
        onChange={updateItem} onAdd={() => setItems(p => [...p, emptyItem()])} onRemove={i => setItems(p => p.filter((_, idx) => idx !== i))} />
      <InvoiceTotals totals={totals} gstType={gstType} />
    </div>
  );
}
