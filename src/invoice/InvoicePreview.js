import { SELLER, BANK, TERMS } from "./invoiceConfig";
import { fmt, totalInWords, formatDate } from "./invoiceUtils";
import { IS } from "./invoiceStyles";

export default function InvoicePreview({ invoice, items }) {
  const gstType = invoice.gst_type;

  return (
    <div id="invoice-preview" style={IS.page}>
      <style>{IS.printCSS}</style>

      {/* Header */}
      <div style={IS.header}>
        <div>
          <div style={IS.sellerName}>{SELLER.name}</div>
          <div style={IS.sellerDetail}>
            {SELLER.address}<br />
            {SELLER.city} {SELLER.pincode}<br />
            {SELLER.country}<br />
            GSTIN {SELLER.gstin}<br />
            {SELLER.email}
          </div>
        </div>
        <div>
          <div style={IS.invoiceTitle}>TAX INVOICE</div>
          <div style={IS.invoiceNumber}># {invoice.invoice_number}</div>
        </div>
      </div>

      <div style={IS.divider} />

      {/* Meta + Bill To */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 24 }}>
        <div style={IS.billTo}>
          <div style={IS.billToLabel}>BILL TO</div>
          <div style={IS.billToName}>{invoice.customer_name}</div>
          <div style={IS.billToDetail}>
            {invoice.customer_address && <>{invoice.customer_address}<br /></>}
            {invoice.customer_gstin && <>GSTIN: {invoice.customer_gstin}<br /></>}
            {invoice.customer_phone && <>Ph: {invoice.customer_phone}</>}
          </div>
          {invoice.place_of_supply && (
            <div style={{ fontSize: 12, marginTop: 10, color: "#555" }}>
              Place Of Supply: {invoice.place_of_supply}
            </div>
          )}
        </div>
        <div>
          {[["Invoice Date", formatDate(invoice.created_at || new Date())],
            ["Terms", "Due on Receipt"],
            ["Due Date", formatDate(invoice.due_date)]
          ].map(([label, value]) => (
            <div key={label} style={IS.metaRow}>
              <span style={IS.metaLabel}>{label} :</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items Table */}
      <table style={IS.table}>
        <thead>
          <tr>
            <th style={{ ...IS.th, width: 30 }}>#</th>
            <th style={IS.th}>Item & Description</th>
            <th style={IS.th}>HSN/SAC</th>
            <th style={{ ...IS.thRight, width: 60 }}>Qty</th>
            <th style={{ ...IS.thRight, width: 90 }}>Rate</th>
            <th style={{ ...IS.thRight, width: 100 }}>{gstType === "intra" ? "CGST/SGST" : "IGST"}</th>
            <th style={{ ...IS.thRight, width: 90 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const itemTotal = item.quantity * item.unit_price;
            const gstAmt = itemTotal * item.gst_rate / 100;
            return (
              <tr key={i}>
                <td style={IS.td}>{i + 1}</td>
                <td style={IS.td}>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  {item.description && <div style={{ fontSize: 11, color: "#666" }}>{item.description}</div>}
                </td>
                <td style={IS.td}>{item.hsn_sac}</td>
                <td style={IS.tdRight}>{item.quantity}.00<br /><span style={{ fontSize: 11, color: "#888" }}>pcs</span></td>
                <td style={IS.tdRight}>{fmt(item.unit_price)}</td>
                <td style={IS.tdRight}>{fmt(gstAmt)}<br /><span style={{ fontSize: 11, color: "#888" }}>{item.gst_rate}%</span></td>
                <td style={IS.tdRight}>{fmt(itemTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 12, color: "#555" }}>Items in Total {items.length}.00</div>
        <div style={{ minWidth: 260 }}>
          {[["Sub Total", fmt(invoice.subtotal)],
            gstType === "intra" ? [`CGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(invoice.cgst)] : null,
            gstType === "intra" ? [`SGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(invoice.sgst)] : null,
            gstType === "inter" ? [`IGST${items[0]?.gst_rate ? ` (${items[0].gst_rate}%)` : ""}`, fmt(invoice.igst)] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={IS.totalsRow}>
              <span style={IS.totalsLabel}>{label}</span>
              <span style={IS.totalsValue}>{value}</span>
            </div>
          ))}
          <div style={IS.grandTotal}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 800 }}>₹{fmt(invoice.total)}</span>
          </div>
          <div style={IS.totalInWords}>{totalInWords(invoice.total)}</div>
        </div>
      </div>

      <div style={IS.divider} />

      {/* Bank Details */}
      <div style={IS.sectionTitle}>BANK DETAILS</div>
      <div style={IS.bankDetail}>
        {BANK.name}, {BANK.branch}.<br />
        Account Number: {BANK.account}<br />
        IFSC Code: {BANK.ifsc}
      </div>

      <div style={IS.divider} />

      {/* Terms */}
      <div style={IS.sectionTitle}>Terms & Conditions</div>
      <div style={IS.terms}>
        {TERMS.map((t, i) => <div key={i}>{t}</div>)}
      </div>

      {invoice.notes && (
        <>
          <div style={IS.divider} />
          <div style={IS.sectionTitle}>NOTES</div>
          <div style={IS.terms}>{invoice.notes}</div>
        </>
      )}
    </div>
  );
}
