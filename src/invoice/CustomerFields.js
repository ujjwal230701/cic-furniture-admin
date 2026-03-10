import { S } from "../styles";
import { INDIAN_STATES } from "./invoiceConfig";

export default function CustomerFields({ invoice, setInvoice }) {
  const update = (key, value) => setInvoice(prev => ({ ...prev, [key]: value }));
  return (
    <div style={{ background: "#f9f9f9", padding: 20, marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>CUSTOMER DETAILS</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={S.label}>CUSTOMER NAME</label>
          <input value={invoice.customer_name} onChange={e => update("customer_name", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>PHONE</label>
          <input value={invoice.customer_phone} onChange={e => update("customer_phone", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>GSTIN</label>
          <input value={invoice.customer_gstin} onChange={e => update("customer_gstin", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>PLACE OF SUPPLY</label>
          <select value={invoice.place_of_supply} onChange={e => update("place_of_supply", e.target.value)} style={S.input}>
            {INDIAN_STATES.map(s => <option key={s.code} value={s.name}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={S.label}>ADDRESS</label>
          <textarea value={invoice.customer_address} onChange={e => update("customer_address", e.target.value)} rows={2} style={{ ...S.input, resize: "vertical" }} />
        </div>
      </div>
    </div>
  );
}
