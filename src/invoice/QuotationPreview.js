import { SELLER, TERMS } from "./invoiceConfig";
import { fmt, totalInWords, formatDate, calcItemTotal, getGSTType } from "./invoiceUtils";
import { IS } from "./invoiceStyles";

export default function QuotationPreview({ quotation, items }) {
  const gstType = getGSTType(quotation.place_of_supply);
  const gstInclusive = quotation.gst_inclusive || false;
  const isIntra = gstType === "intra";

  return (
    <div id="invoice-preview" style={IS.page}>
      <style>{IS.printCSS}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ ...IS.invoiceTitle, fontSize: 28 }}>QUOTATION</div>
        <div style={IS.invoiceNumber}># {quotation.quotation_number}</div>
      </div>
      <div style={IS.divider} />

      <div style={IS.header}>
        <div>
          <div style={IS.sellerName}>{SELLER.name}</div>
          <div style={IS.sellerDetail}>
            {SELLER.address}<br />
            {SELLER.city} {SELLER.pincode}<br />
            {SELLER.country}<br />
            GSTIN: {SELLER.gstin}<br />
            {SELLER.phone}<br />
            {SELLER.email}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 24 }}>
        <div style={IS.billTo}>
          <div style={IS.billToLabel}>PREPARED FOR</div>
          <div style={IS.billToName}>{quotation.customer_name}</div>
          <div style={IS.billToDetail}>
            {quotation.customer_address && <>{quotation.customer_address}<br /></>}
            {quotation.customer_gstin && <>GSTIN: {quotation.customer_gstin}<br /></>}
            {quotation.customer_phone && <>Ph: {quotation.customer_phone}</>}
          </div>
          {quotation.place_of_supply && (
            <div style={{ fontSize: 12, marginTop: 10, color: "#555" }}>
              Place Of Supply: {quotation.place_of_supply}
            </div>
          )}
        </div>
        <div>
          <div style={IS.metaRow}>
            <span style={IS.metaLabel}>Date :</span>
            <span style={{ fontWeight: 500 }}>{formatDate(quotation.created_at || new Date())}</span>
          </div>
          {quotation.valid_till && (
            <div style={IS.metaRow}>
              <span style={IS.metaLabel}>Valid Till :</span>
              <span style={{ fontWeight: 500, color: "#d97706" }}>{formatDate(quotation.valid_till)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ ...IS.table, width: "100%", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...IS.th, width: "4%" }}>#</th>
            <th style={{ ...IS.th, width: "30%" }}>Item & Description</th>
            <th style={{ ...IS.th, width: "8%" }}>HSN/SAC</th>
            <th style={{ ...IS.thRight, width: "6%" }}>Qty</th>
            <th style={{ ...IS.thRight, width: "10%" }}>Rate</th>
            <th style={{ ...IS.thRight, width: "12%" }}>Final Rate</th>
            <th style={{ ...IS.thRight, width: "12%" }}>Taxable Value</th>
            <th style={{ ...IS.thRight, width: "10%" }}>GST</th>
            <th style={{ ...IS.thRight, width: "12%" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const { basePrice, gstAmt, lineTotal, priceAfterDiscount } = calcItemTotal(item, gstInclusive);
            const taxableValue = basePrice * item.quantity;
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
                <td style={IS.tdRight}>{fmt(gstAmt * item.quantity)}<br /><span style={{ fontSize: 11, color: "#888" }}>{item.gst_rate}%</span></td>
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
            ["Sub Total", fmt(quotation.subtotal)],
            isIntra ? [`CGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(quotation.cgst)] : null,
            isIntra ? [`SGST (${items[0]?.gst_rate / 2 || 9}%)`, fmt(quotation.sgst)] : null,
            !isIntra ? [`IGST (${items[0]?.gst_rate || 18}%)`, fmt(quotation.igst)] : null,
          ].filter(Boolean).map(([label, value]) => (
            <div key={label} style={IS.totalsRow}>
              <span style={IS.totalsLabel}>{label}</span>
              <span style={IS.totalsValue}>{value}</span>
            </div>
          ))}
          <div style={IS.grandTotal}>
            <span style={{ fontWeight: 700 }}>Total (Estimated)</span>
            <span style={{ fontWeight: 800 }}>₹{fmt(quotation.total)}</span>
          </div>
          <div style={IS.totalInWords}>{totalInWords(quotation.total)}</div>
        </div>
      </div>

      <div style={IS.divider} />

      {/* Terms */}
      <div style={IS.sectionTitle}>Terms & Conditions</div>
      <div style={IS.terms}>
        {TERMS.map((t, i) => <div key={i}>{t}</div>)}
        {quotation.valid_till && <div>This quotation is valid till {formatDate(quotation.valid_till)}.</div>}
      </div>

      {quotation.notes && (
        <>
          <div style={IS.divider} />
          <div style={IS.sectionTitle}>NOTES</div>
          <div style={IS.terms}>{quotation.notes}</div>
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
