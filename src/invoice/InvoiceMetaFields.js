import { S } from "../styles";

export default function InvoiceMetaFields({ invoice, setInvoice }) {
  const update = (key, value) => setInvoice(prev => ({ ...prev, [key]: value }));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
      <div>
        <label style={S.label}>INVOICE NUMBER</label>
        <input value={invoice.invoice_number} onChange={e => update("invoice_number", e.target.value)} style={S.input} />
      </div>
      <div>
        <label style={S.label}>DUE DATE</label>
        <input type="date" value={invoice.due_date} onChange={e => update("due_date", e.target.value)} style={S.input} />
      </div>
      <div>
        <label style={S.label}>PAYMENT STATUS</label>
        <select value={invoice.payment_status} onChange={e => update("payment_status", e.target.value)} style={S.input}>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
        </select>
      </div>
      <div>
        <label style={S.label}>NOTES</label>
        <input value={invoice.notes} onChange={e => update("notes", e.target.value)} style={S.input} placeholder="Any additional notes..." />
      </div>
    </div>
  );
}
