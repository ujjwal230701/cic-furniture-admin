import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { S } from "../styles";
import { fmt, generateInvoiceNumber } from "./invoiceUtils";
import { SELLER } from "./invoiceConfig";
import { deductStock } from "./useInvoiceStock";
import QuotationList from "./QuotationList";
import QuotationForm from "./QuotationForm";
import QuotationPreview from "./QuotationPreview";
import InvoiceForm from "./InvoiceForm";

export default function QuotationTab({ role }) {
  const isOwner = role === "owner";
  const [view, setView] = useState("list");
  const [quotations, setQuotations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editData, setEditData] = useState(null);
  const [convertData, setConvertData] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchQuotations = async () => {
    const { data } = await supabase.from("quotations").select("*").order("id", { ascending: false });
    setQuotations(data || []);
  };

  const fetchItems = async (id) => {
    const { data } = await supabase.from("quotation_items").select("*").eq("quotation_id", id);
    return data || [];
  };

  useEffect(() => { fetchQuotations(); }, []);

  const save = async (quotationData, items) => {
    let quotationId;
    if (editData) {
      await supabase.from("quotations").update(quotationData).eq("id", editData.id);
      await supabase.from("quotation_items").delete().eq("quotation_id", editData.id);
      quotationId = editData.id;
      showToast("Quotation updated!");
    } else {
      const { data, error } = await supabase.from("quotations").insert([quotationData]).select();
      if (error) { showToast(`Error: ${error.message}`, "error"); return; }
      quotationId = data[0].id;
      showToast("Quotation created!");
    }

    await supabase.from("quotation_items").insert(items.map(item => ({
      quotation_id: quotationId,
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

    setEditData(null);
    setView("list");
    fetchQuotations();
  };

  const convertToInvoice = async (quotation) => {
    const items = await fetchItems(quotation.id);
    const { data } = await supabase.from("invoices").select("invoice_number").order("id", { ascending: false }).limit(1);
    const invoiceNumber = generateInvoiceNumber(data?.[0]?.invoice_number);
    setConvertData({ quotation, items, invoiceNumber });
    setView("convert");
  };

  const saveConvertedInvoice = async (invoiceData, items) => {
    const { data, error } = await supabase.from("invoices").insert([{ ...invoiceData, status: "active" }]).select();
    if (error) { showToast(`Error: ${error.message}`, "error"); return; }
    const invoiceId = data[0].id;

    await deductStock(items, invoiceId);

    await supabase.from("invoice_items").insert(items.map(item => ({
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

    await supabase.from("quotations").update({ quo_status: "accepted" }).eq("id", convertData.quotation.id);

    showToast(`Invoice ${invoiceData.invoice_number} created!`);
    setConvertData(null);
    setView("list");
    fetchQuotations();
  };

  const deleteQuotation = async (id) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;
    await supabase.from("quotation_items").delete().eq("quotation_id", id);
    await supabase.from("quotations").delete().eq("id", id);
    showToast("Quotation deleted");
    fetchQuotations();
  };

  const viewQuotation = async (q) => { setSelected(q); setSelectedItems(await fetchItems(q.id)); setView("preview"); };
  const editQuotation = async (q) => { setEditData({ ...q, items: await fetchItems(q.id) }); setView("form"); };

  const whatsapp = () => {
    if (!selected) return;
    const gst = (selected.igst || 0) + (selected.cgst || 0) + (selected.sgst || 0);
    const msg = `*QUOTATION - ${selected.quotation_number}*\n\nDear ${selected.customer_name},\n\nSubtotal: ₹${fmt(selected.subtotal)}\nGST: ₹${fmt(gst)}\n*Total: ₹${fmt(selected.total)}*\n\nValid till: ${selected.valid_till || "N/A"}\n\nThank you!\n${SELLER.name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, background: toast.type === "error" ? "#e53e3e" : "#38a169", color: "#fff", padding: "10px 20px", fontWeight: 700, fontSize: 13, zIndex: 999 }}>{toast.msg}</div>}

      {view === "list" && (
        <QuotationList
          quotations={quotations}
          onNew={() => { setEditData(null); setView("form"); }}
          onView={viewQuotation}
          onEdit={editQuotation}
          onDelete={deleteQuotation}
          onConvert={convertToInvoice}
          isOwner={isOwner}
        />
      )}

      {view === "form" && (
        <QuotationForm initial={editData} onSave={save} onCancel={() => setView("list")} />
      )}

      {view === "convert" && convertData && (
        <div>
          <div className="no-print" style={{ padding: "12px 32px", background: "#fffaf0", borderBottom: "1px solid #e8e8e8", fontSize: 13, color: "#d97706", fontWeight: 600 }}>
            Converting {convertData.quotation.quotation_number} → Invoice — review details and save
          </div>
          <InvoiceForm
            initial={{
              ...convertData.quotation,
              invoice_number: convertData.invoiceNumber,
              due_date: new Date().toISOString().split("T")[0],
              payment_status: "unpaid",
              items: convertData.items,
            }}
            onSave={saveConvertedInvoice}
            onCancel={() => { setConvertData(null); setView("list"); }}
          />
        </div>
      )}

      {view === "preview" && selected && (
        <div>
          <div className="no-print" style={{ display: "flex", gap: 10, padding: "16px 32px", borderBottom: "1px solid #e8e8e8", flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => setView("list")} style={{ ...S.btnOutline, padding: "8px 16px" }}>← BACK</button>
            <button onClick={() => window.print()} style={S.btnPrimary}>🖨 PRINT / PDF</button>
            <button onClick={whatsapp} style={{ ...S.btnPrimary, background: "#25d366" }}>📱 WHATSAPP</button>
            {isOwner && (
              <>
                <button onClick={() => editQuotation(selected)} style={{ ...S.btnOutline, padding: "8px 16px" }}>EDIT</button>
                {selected.quo_status !== "accepted" && (
                  <button onClick={() => convertToInvoice(selected)} style={{ background: "#38a169", color: "#fff", border: "none", padding: "8px 16px", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}>→ CONVERT TO INVOICE</button>
                )}
              </>
            )}
          </div>
          <QuotationPreview quotation={selected} items={selectedItems} />
        </div>
      )}
    </div>
  );
}
