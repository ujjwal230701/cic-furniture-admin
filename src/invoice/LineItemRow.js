import { S } from "../styles";
import { calcItemTotal, fmt } from "./invoiceUtils";
import { supabase } from "../supabaseClient";

export default function LineItemRow({ item, index, products, gstInclusive, onChange, onRemove, showRemove }) {
  const { lineTotal } = calcItemTotal(item, gstInclusive);
  const isManual = !item.product_id && item.product_name;

  const addToCatalogue = async () => {
    const { error } = await supabase.from("products").insert([{
      name: item.product_name, price: item.catalogue_price,
      category: "Accessories & Misc", stock: 0, sold: 0, in_stock: true, featured: false,
    }]);
    alert(error ? `Error: ${error.message}` : `"${item.product_name}" added to catalogue!`);
  };

  const inputStyle = { ...S.input, marginBottom: 0 };

  return (
    <tr style={{ borderBottom: "1px solid #e8e8e8", background: isManual ? "#fffaf0" : "#fff" }}>
      <td style={{ padding: "8px 6px", fontSize: 12 }}>{index + 1}</td>

      {/* Item name + description */}
      <td style={{ padding: "8px 6px", minWidth: 160 }}>
        <input list={`products-${index}`} value={item.product_name}
          onChange={e => onChange(index, "product_name", e.target.value)}
          placeholder="Type or pick product..." style={{ ...inputStyle, marginBottom: 4 }} />
        <datalist id={`products-${index}`}>
          {products.map(p => <option key={p.id} value={p.name} />)}
        </datalist>
        <input value={item.description} onChange={e => onChange(index, "description", e.target.value)}
          placeholder="Description..." style={{ ...inputStyle, fontSize: 11, color: "#666" }} />
        {isManual && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#d97706" }}>⚠️ Not in catalogue</span>
            <button onClick={addToCatalogue} style={{ fontSize: 9, padding: "2px 6px", background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer" }}>
              + ADD TO CATALOGUE
            </button>
          </div>
        )}
      </td>

      {/* HSN */}
      <td style={{ padding: "8px 4px", width: 80 }}>
        <input value={item.hsn_sac} onChange={e => onChange(index, "hsn_sac", e.target.value)} style={inputStyle} />
      </td>

      {/* Qty */}
      <td style={{ padding: "8px 4px", width: 50 }}>
        <input type="number" value={item.quantity} onChange={e => onChange(index, "quantity", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
      </td>

      {/* Catalogue price */}
      <td style={{ padding: "8px 4px", width: 90 }}>
        <input type="number" value={item.catalogue_price} onChange={e => onChange(index, "catalogue_price", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
      </td>

      {/* Discount % */}
      <td style={{ padding: "8px 4px", width: 70 }}>
        <input type="number" value={item.discount_pct} onChange={e => onChange(index, "discount_pct", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
      </td>

      {/* Final rate (read only) */}
      <td style={{ padding: "8px 4px", width: 90, textAlign: "right", fontWeight: 600, fontSize: 13 }}>
        ₹{fmt(item.catalogue_price * (1 - (item.discount_pct || 0) / 100))}
      </td>

      {/* GST % */}
      <td style={{ padding: "8px 4px", width: 60 }}>
        <input type="number" value={item.gst_rate} onChange={e => onChange(index, "gst_rate", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
      </td>

      {/* Line total */}
      <td style={{ padding: "8px 4px", width: 90, textAlign: "right", fontWeight: 700, fontSize: 13 }}>
        ₹{fmt(lineTotal)}
      </td>

      {/* Remove */}
      <td style={{ padding: "8px 4px" }}>
        {showRemove && <button onClick={() => onRemove(index)} style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 16 }}>✕</button>}
      </td>
    </tr>
  );
}
