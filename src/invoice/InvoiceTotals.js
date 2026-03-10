import { fmt } from "./invoiceUtils";

export default function InvoiceTotals({ totals, gstType }) {
  const rows = [
    ["Subtotal", totals.subtotal],
    ...(gstType === "intra" ? [["CGST", totals.cgst], ["SGST", totals.sgst]] : [["IGST", totals.igst]]),
  ];
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
      <div style={{ minWidth: 280 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
            <span style={{ color: "#555" }}>{label}</span>
            <span>₹{fmt(value)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", background: "#1a1a1a", color: "#fff", padding: "10px 16px", marginTop: 8 }}>
          <span style={{ fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>₹{fmt(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}
