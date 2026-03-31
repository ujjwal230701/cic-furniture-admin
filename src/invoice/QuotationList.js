import { S } from "../styles";
import { fmt, formatDate } from "./invoiceUtils";

const statusColors = {
  draft:    { bg: "#f7f7f7", color: "#888" },
  sent:     { bg: "#ebf8ff", color: "#2b6cb0" },
  accepted: { bg: "#f0fff4", color: "#38a169" },
  expired:  { bg: "#fff5f5", color: "#e53e3e" },
};

export default function QuotationList({ quotations, onNew, onView, onEdit, onDelete, onConvert, isOwner }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Quotations <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({quotations.length} total)</span>
        </div>
        <button onClick={onNew} style={S.btnPrimary}>+ NEW QUOTATION</button>
      </div>

      <div style={{ display: "grid", gap: 1, background: "#e8e8e8" }}>
        {quotations.map(q => {
          const sc = statusColors[q.quo_status] || statusColors.draft;
          return (
            <div key={q.id} style={{ background: "#fff", padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{q.quotation_number}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{q.customer_name} · {formatDate(q.created_at)}</div>
                {q.valid_till && (
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 2 }}>Valid till: {formatDate(q.valid_till)}</div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>₹{fmt(q.total)}</div>
              <div style={{ background: sc.bg, color: sc.color, padding: "4px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                {(q.quo_status || "draft").toUpperCase()}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onView(q)} style={{ ...S.btnPrimary, padding: "6px 12px" }}>VIEW</button>
                {isOwner && (
                  <>
                    <button onClick={() => onEdit(q)} style={{ ...S.btnOutline, padding: "6px 12px" }}>EDIT</button>
                    {q.quo_status !== "accepted" && (
                      <button onClick={() => onConvert(q)} style={{ background: "#38a169", color: "#fff", border: "none", padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>→ INVOICE</button>
                    )}
                    <button onClick={() => onDelete(q.id)} style={{ background: "#e53e3e", color: "#fff", border: "none", padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>DEL</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {quotations.length === 0 && (
          <div style={{ background: "#fff", padding: 40, textAlign: "center", color: "#888" }}>
            No quotations yet. Create your first quotation!
          </div>
        )}
      </div>
    </div>
  );
}
