import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { S } from "../styles";
import { fmt } from "./invoiceUtils";
import InvoiceList from "./InvoiceList";
import InvoiceForm from "./InvoiceForm";
import InvoicePreview from "./InvoicePreview";
import { SELLER } from "./invoiceConfig";

export default function InvoiceTab() {
  const [view, setView] = useState("list"); // list | form | preview
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editInvoice, setEditInvoice] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase.from("invoices").select("*").order("id", { ascending: false });
    setInvoices(data || []);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const fetchItems = async (invoiceId) => {
    const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);
    return data || [];
  };

  const save = async (invoiceData, items) => {
    let invoiceId;
    if (editInvoice) {
      await supabase.from("invoices").update(invoiceData).eq("id", editInvoice.id);
      await supabase.from("invoice_items").delete().eq("invoice_id", editInvoice.id);
      invoiceId = editInvoice.id;
      showToast("Invoice updated!");
    } else {
      const { data, error } = await supabase.from("invoices").insert([invoiceData]).select();
      if (error) { showToast(`Error: ${error.message}`, "error"); return; }
      invoiceId = data[0].id;
      showToast("Invoice created!");
    }
    const itemRows = items.map(item => ({ ...item, invoice_id: invoiceId, total: item.quantity * item.unit_price }));
    await supabase.from("invoice_items").insert(itemRows);
    setEditInvoice(null);
    setView("list");
    fetchInvoices();
  };

  const viewInvoice = async (inv) => {
    const items = await fetchItems(inv.id);
    setSelectedInvoice(inv);
    setSelectedItems(items);
    setView("preview");
  };

  const editInvoiceHandler = async (inv) => {
    const items = await fetchItems(inv.id);
    setEditInvoice({ ...inv, items });
    setView("form");
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    showToast("Invoice deleted");
    fetchInvoices();
  };

  const updatePaymentStatus = async (id, status) => {
    await supabase.from("invoices").update({ payment_status: status }).eq("id", id);
    showToast(`Marked as ${status}`);
    fetchInvoices();
    if (selectedInvoice?.id === id) setSelectedInvoice(inv => ({ ...inv, payment_status: status }));
  };

  const printInvoice = () => window.print();

  const whatsappShare = () => {
    if (!selectedInvoice) return;
    const msg = `*TAX INVOICE - ${selectedInvoice.invoice_number}*\n\nDear ${selectedInvoice.customer_name},\n\nPlease find your invoice details:\n\nSubtotal: ₹${fmt(selectedInvoice.subtotal)}\nGST: ₹${fmt((selectedInvoice.igst || 0) + (selectedInvoice.cgst || 0) + (selectedInvoice.sgst || 0))}\n*Total: ₹${fmt(selectedInvoice.total)}*\n\nThank you for your business!\n\n${SELLER.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>
          {toast.msg}
        </div>
      )}

      {view === "list" && (
        <InvoiceList
          invoices={invoices}
          onNew={() => { setEditInvoice(null); setView("form"); }}
          onView={viewInvoice}
          onEdit={editInvoiceHandler}
          onDelete={deleteInvoice}
        />
      )}

      {view === "form" && (
        <InvoiceForm
          initial={editInvoice}
          onSave={save}
          onCancel={() => setView("list")}
        />
      )}

      {view === "preview" && selectedInvoice && (
        <div>
          {/* Action Bar */}
          <div className="no-print" style={{ display: "flex", gap: 10, padding: "16px 32px", borderBottom: "1px solid #e8e8e8", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setView("list")} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
            <button onClick={printInvoice} style={S.btnPrimary}>🖨 PRINT / DOWNLOAD PDF</button>
            <button onClick={whatsappShare} style={{ ...S.btnPrimary, background: "#25d366" }}>📱 SHARE ON WHATSAPP</button>
            <button onClick={() => editInvoiceHandler(selectedInvoice)} style={{ ...S.btnOutline, padding: "8px 16px" }}>EDIT</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#888" }}>PAYMENT:</span>
              {["paid", "unpaid", "partial"].map(status => (
                <button key={status} onClick={() => updatePaymentStatus(selectedInvoice.id, status)}
                  style={{ padding: "6px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", border: "1px solid", borderColor: selectedInvoice.payment_status === status ? "#1a1a1a" : "#ddd", background: selectedInvoice.payment_status === status ? "#1a1a1a" : "#fff", color: selectedInvoice.payment_status === status ? "#fff" : "#444" }}>
                  {status.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <InvoicePreview invoice={selectedInvoice} items={selectedItems} />
        </div>
      )}
    </div>
  );
}
