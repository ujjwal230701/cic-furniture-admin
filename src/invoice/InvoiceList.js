import { S } from "../styles";
import { fmt, formatDate } from "./invoiceUtils";

const statusColors = {
  paid: { bg: "#f0fff4", color: "#38a169" },
  unpaid: { bg: "#fff5f5", color: "#e53e3e" },
  partial: { bg: "#fffaf0", color: "#d97706" },
};

export default function InvoiceList({ invoices, onNew, onView, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Invoices <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({invoices.length} total)</span>
        </div>
        <button onClick={onNew} style={S.btnPrimary}>+ NEW INVOICE</button>
      </div>

      <div style={{ display: "grid", gap: 1, background: "#e8e8e8" }}>
        {invoices.map(inv => {
          const sc = statusColors[inv.payment_status] || statusColors.unpaid;
          return (
            <div key={inv.id} style={{ background: "#fff", padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.invoice_number}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{inv.customer_name} · {formatDate(inv.created_at)}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>₹{fmt(inv.total)}</div>
              <div style={{ background: sc.bg, color: sc.color, padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                {inv.payment_status.toUpperCase()}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onView(inv)} style={{ ...S.btnPrimary, padding: "6px 12px" }}>VIEW</button>
                <button onClick={() => onEdit(inv)} style={{ ...S.btnOutline, padding: "6px 12px" }}>EDIT</button>
                <button onClick={() => onDelete(inv.id)} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>DEL</button>
              </div>
            </div>
          );
        })}
        {invoices.length === 0 && (
          <div style={{ background: "#fff", padding: 40, textAlign: "center", color: "#888" }}>
            No invoices yet. Create your first invoice!
          </div>
        )}
      </div>
    </div>
  );
}
