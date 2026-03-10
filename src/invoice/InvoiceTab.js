import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { S } from "../styles";
import { fmt } from "./invoiceUtils";
import { deductStock, restoreStock, adjustStock } from "./useInvoiceStock";
import { SELLER } from "./invoiceConfig";
import InvoiceList from "./InvoiceList";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";

export default function InvoiceTab() {
  const [view, setView] = useState("list");
  const [invoices, setInvoices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editData, setEditData] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fetchInvoices = async () => { const { data } = await supabase.from("invoices").select("*").order("id", { ascending: false }); setInvoices(data || []); };
  const fetchItems = async (id) => { const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", id); return data || []; };

  useEffect(() => { fetchInvoices(); }, []);

  const save = async (invoiceData, items) => {
    let invoiceId;
    if (editData) {
      const oldItems = await fetchItems(editData.id);
      await supabase.from("invoices").update(invoiceData).eq("id", editData.id);
      await supabase.from("invoice_items").delete().eq("invoice_id", editData.id);
      await adjustStock(oldItems, items);
      invoiceId = editData.id;
      showToast("Invoice updated!");
    } else {
      const { data, error } = await supabase.from("invoices").insert([{ ...invoiceData, status: "active" }]).select();
      if (error) { showToast(`Error: ${error.message}`, "error"); return; }
      invoiceId = data[0].id;
      await deductStock(items);
      showToast("Invoice created!");
    }
    console.log("Saving items for invoiceId:", invoiceId, "Items:", items);

    const { error: itemsError } = await supabase.from("invoice_items").insert(items.map(item => ({
  invoice_id: invoiceId,
  product_id: item.product_id || null,
  product_name: item.product_name,
  description: item.description || "",
  hsn_sac: item.hsn_sac || "",
  quantity: item.quantity,
  unit_price: item.catalogue_price * (1 - (item.discount_pct || 0) / 100),
  catalogue_price: item.catalogue_price || 0,
  discount_pct: item.discount_pct || 0,
  gst_rate: item.gst_rate,
  total: item.quantity * item.catalogue_price * (1 - (item.discount_pct || 0) / 100),
})));
if (itemsError) showToast(`Items error: ${itemsError.message}`, "error");

    setEditData(null);
    setView("list");
    fetchInvoices();
  };

  const viewInvoice = async (inv) => { setSelected(inv); setSelectedItems(await fetchItems(inv.id)); setView("preview"); };
  const editInvoice = async (inv) => { setEditData({ ...inv, items: await fetchItems(inv.id) }); setView("form"); };

  const cancelInvoice = async (inv) => {
    if (!window.confirm(`Cancel ${inv.invoice_number}? Stock will be restored.`)) return;
    const items = await fetchItems(inv.id);
    await supabase.from("invoices").update({ status: "cancelled" }).eq("id", inv.id);
    await restoreStock(items);
    showToast(`${inv.invoice_number} cancelled — stock restored`);
    fetchInvoices();
  };

  const updatePayment = async (id, status) => {
    await supabase.from("invoices").update({ payment_status: status }).eq("id", id);
    showToast(`Marked as ${status}`);
    fetchInvoices();
    setSelected(s => s ? { ...s, payment_status: status } : s);
  };

  const whatsapp = () => {
    if (!selected) return;
    const gst = (selected.igst || 0) + (selected.cgst || 0) + (selected.sgst || 0);
    const msg = `*TAX INVOICE - ${selected.invoice_number}*\n\nDear ${selected.customer_name},\n\nSubtotal: ₹${fmt(selected.subtotal)}\nGST: ₹${fmt(gst)}\n*Total: ₹${fmt(selected.total)}*\n\nThank you!\n${SELLER.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>{toast.msg}</div>}

      {view === "list" && <InvoiceList invoices={invoices} onNew={() => { setEditData(null); setView("form"); }} onView={viewInvoice} onEdit={editInvoice} onCancel={cancelInvoice} />}

      {view === "form" && <InvoiceForm initial={editData} onSave={save} onCancel={() => setView("list")} />}

      {view === "preview" && selected && (
        <div>
          <div className="no-print" style={{ display: "flex", gap: 10, padding: "16px 32px", borderBottom: "1px solid #e8e8e8", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setView("list")} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
            {selected.status !== "cancelled" ? (
              <>
                <button onClick={() => window.print()} style={S.btnPrimary}>🖨 PRINT / PDF</button>
                <button onClick={whatsapp} style={{ ...S.btnPrimary, background: "#25d366" }}>📱 WHATSAPP</button>
                <button onClick={() => editInvoice(selected)} style={{ ...S.btnOutline, padding: "8px 16px" }}>EDIT</button>
                <button onClick={() => cancelInvoice(selected)} style={{ ...S.btnOutline, padding: "8px 16px", color: "#e53e3e", borderColor: "#e53e3e" }}>CANCEL INVOICE</button>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#888" }}>PAYMENT:</span>
                  {["paid", "unpaid", "partial"].map(s => (
                    <button key={s} onClick={() => updatePayment(selected.id, s)}
                      style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: selected.payment_status === s ? "#1a1a1a" : "#ddd", background: selected.payment_status === s ? "#1a1a1a" : "#fff", color: selected.payment_status === s ? "#fff" : "#444" }}>
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "8px 16px", background: "#fff5f5", color: "#e53e3e", fontWeight: 700, fontSize: 12 }}>⚠️ THIS INVOICE IS CANCELLED</div>
            )}
          </div>
          <InvoicePreview invoice={selected} items={selectedItems} />
        </div>
      )}
    </div>
  );
}
