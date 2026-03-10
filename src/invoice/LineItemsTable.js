import { S } from "../styles";
import LineItemRow from "./LineItemRow";

const TH = ({ children, right }) => (
  <th style={{ background: "#1a1a1a", color: "#fff", padding: "8px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textAlign: right ? "right" : "left" }}>
    {children}
  </th>
);

export default function LineItemsTable({ items, products, gstInclusive, gstType, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>LINE ITEMS</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              <TH>#</TH>
              <TH>ITEM</TH>
              <TH>HSN</TH>
              <TH right>QTY</TH>
              <TH right>CATALOGUE ₹</TH>
              <TH right>DISC %</TH>
              <TH right>FINAL RATE</TH>
              <TH right>GST %</TH>
              <TH right>AMOUNT</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <LineItemRow
                key={index}
                item={item}
                index={index}
                products={products}
                gstInclusive={gstInclusive}
                onChange={onChange}
                onRemove={onRemove}
                showRemove={items.length > 1}
              />
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onAdd} style={{ ...S.btnOutline, fontSize: 11, padding: "7px 16px", marginTop: 12 }}>
        + ADD ITEM
      </button>
    </div>
  );
}
