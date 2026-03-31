import { SELLER, BANK, TERMS } from "./invoiceConfig";
import { fmt, totalInWords, formatDate, calcItemTotal, getGSTType } from "./invoiceUtils";
import { IS } from "./invoiceStyles";

export default function InvoicePreview({ invoice, items }) {
  const gstType = getGSTType(invoice.place_of_supply);
  const gstInclusive = invoice.gst_inclusive || false;
  const isIntra = gstType === "intra";

  return (
    <div id="invoice-preview" style={IS.page}>
      <style>{IS.printCSS}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={IS.invoiceTitle}>TAX INVOICE</div>
        <div style={IS.invoiceNumber}># {invoice.invoice_number}</div>
      </div>
      <div style={IS.divider} />
      <div style={IS.header}>
        <div>
          <div style={IS.sellerName}>{SELLER.name}</div>
          <div style={IS.sellerDetail}>
            {SELLER.address}<br />
            {SELLER.city} {SELLER.pincode}<br />
            {SELLER.country}<br />
            GSTIN: {SELLER.gstin} | State Code: {SELLER.stateCode}<br />
            {SELLER.phone}<br />
            {SELLER.email}
          </div>
        </div>
      </div>

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
          <div style={IS.metaRow}>
            <span style={IS.metaLabel}>Invoice Date :</span>
            <span style={{ fontWeight: 500 }}>{formatDate(invoice.created_at || new Date())}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ ...IS.table, width: "100%", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...IS.th, width: "4%" }}>#</th>
            <th style={{ ...IS.th, width: isIntra ? "22%" : "26%" }}>Item & Description</th>
            <th style={{ ...IS.th, width: "8%" }}>HSN/SAC</th>
            <th style={{ ...IS.thRight, width: "5%" }}>Qty</th>
            <th style={{ ...IS.thRight, width: "9%" }}>Rate</th>
            <th style={{ ...IS.thRight, width: "10%" }}>Final Rate</th>
            <th style={{ ...IS.thRight, width: "10%" }}>Taxable Value</th>
            {isIntra ? (
              <>
                <th style={{ ...IS.thRight, width: "9%" }}>CGST</th>
                <th style={{ ...IS.thRight, width: "9%" }}>SGST</th>
              </>
            ) : (
              <th style={{ ...IS.thRight, width: "13%" }}>IGST</th>
            )}
            <th style={{ ...IS.thRight, width: isIntra ? "10%" : "12%" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const { basePrice, gstAmt, lineTotal, priceAfterDiscount } = calcItemTotal(item, gstInclusive);
            const taxableValue = basePrice * item.quantity;
            const halfGstRate = item.gst_rate / 2;
            const halfGstAmt = (gstAmt * item.quantity) / 2;
            return (
              <tr key={i}>
                <td style={IS.td}>{i + 1}</td>
                <td style={IS.td}>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  {item.description && <div style={{ fontSize: 11, color: "#666" }}>{item.description}</div>}
                </td>
                <td style={IS.td}>{item.hsn_sac}</td>
                <td style={IS.tdRight}>{item.quantity}<br /><span style={{ fontSize: 11, color: "#888" }}>pcs</span></td>
                <td style={IS.tdRight}>{fmt(item.catalogue_price || item.unit_price)}</td>
                <td style={IS.tdRight}>
                  {fmt(priceAfterDiscount || basePrice)}
                  {item.discount_pct > 0 && <><br /><span style={{ fontSize: 11, color: "#38a169" }}>{item.discount_pct}% off</span></>}
                </td>
                <td style={IS.tdRight}>{fmt(taxableValue)}</td>
                {isIntra ? (
                  <>
                    <td style={IS.tdRight}>{fmt(halfGstAmt)}<br /><span style={{ fontSize: 11, color: "#888" }}>{halfGstRate}%</span></td>
                    <td style={IS.tdRight}>{fmt(halfGstAmt)}<br /><span style={{ fontSize: 11, color: "#888" }}>{halfGstRate}%</span></td>
                  </>
                ) : (
                  <td style={IS.tdRight}>{fmt(gstAmt * item.quantity)}<br /><span style={{ fontSize: 11, color: "#888" }}>{item.gst_rate}%</span></td>
                )}
                <td style={IS.tdRight}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#555" }}>Items in Total: {items.length}</div>
        <div style={{ width: "38%" }}>
          {[
            ["Sub Total", fmt(invoice.subtotal)],
            isIntra ? [`CGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(invoice.cgst)] : null,
            isIntra ? [`SGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(invoice.sgst)] : null,
            !isIntra ? [`IGST (${items[0]?.gst_rate || 18}%)`, fmt(invoice.igst)] : null,
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
      <div style={IS.bankSectionTitle}>BANK DETAILS</div>
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

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 48 }}>
        <div style={{ textAlign: "center", width: 200 }}>
          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 8, fontSize: 12, fontWeight: 700 }}>
            For {SELLER.name}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}
