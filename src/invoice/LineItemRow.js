import { useState } from "react";
import { S } from "../styles";
import { calcItemTotal, fmt } from "./invoiceUtils";
import { supabase } from "../supabaseClient";

export default function LineItemRow({ item, index, products, gstInclusive, onChange, onRemove, showRemove }) {
  const { lineTotal } = calcItemTotal(item, gstInclusive);
  const isManual = !item.product_id && item.product_name;
  const [showDropdown, setShowDropdown] = useState(false);

  const finalRate = item.catalogue_price * (1 - (item.discount_pct || 0) / 100);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes((item.product_name || "").toLowerCase())
  );

  const selectProduct = (product) => {
    onChange(index, "product_name", product.name);
    onChange(index, "catalogue_price", product.price);
    onChange(index, "unit_price", product.price);
    onChange(index, "hsn_sac", product.sku || "");
    onChange(index, "product_id", product.id);
    onChange(index, "discount_pct", 0);
    setShowDropdown(false);
  };

  const handleFinalRateChange = (value) => {
    const final = +value;
    const catalogue = item.catalogue_price;
    if (catalogue > 0) {
      const disc = Math.round(((catalogue - final) / catalogue) * 10000) / 100;
      onChange(index, "discount_pct", Math.max(0, disc));
    }
  };

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

      {/* Item name with custom dropdown */}
      <td style={{ padding: "8px 6px", minWidth: 180, position: "relative" }}>
        <input
          value={item.product_name}
          onChange={e => { onChange(index, "product_name", e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Type to search..."
          style={{ ...inputStyle, marginBottom: 4 }}
        />

        {/* Dropdown list */}
{showDropdown && filteredProducts.length > 0 && (
  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", zIndex: 100, maxHeight: 180, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
    {filteredProducts.map(p => (
      <div
        key={p.id}
        onMouseDown={() => selectProduct(p)}
        onTouchStart={() => selectProduct(p)}
        style={{ padding: "10px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f0f0f0" }}
        onMouseEnter={e => e.currentTarget.style.background = "#f5f5f0"}
        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
      >
        <div style={{ fontWeight: 600 }}>{p.name}</div>
        <div style={{ fontSize: 11, color: "#888" }}>₹{fmt(p.price)}</div>
      </div>
    ))}
  </div>
)}


        <input value={item.description} onChange={e => onChange(index, "description", e.target.value)}
          placeholder="Description..." style={{ ...inputStyle, fontSize: 11, color: "#666" }} />

        {isManual && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "#d97706" }}>⚠️ Not in catalogue</span>
            <button onMouseDown={addToCatalogue} style={{ fontSize: 9, padding: "2px 6px", background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer" }}>
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

      {/* Discount % — auto calculated */}
      <td style={{ padding: "8px 4px", width: 70 }}>
        <input type="number" value={item.discount_pct} onChange={e => onChange(index, "discount_pct", +e.target.value)} style={{ ...inputStyle, textAlign: "right" }} />
        {item.discount_pct > 0 && (
          <div style={{ fontSize: 9, color: "#38a169", textAlign: "right", marginTop: 2 }}>
            Save ₹{fmt(item.catalogue_price * item.discount_pct / 100)}
          </div>
        )}
      </td>

      {/* Final rate — editable, back-calculates discount */}
      <td style={{ padding: "8px 4px", width: 90 }}>
        <input
          type="number"
          value={finalRate}
          onChange={e => handleFinalRateChange(e.target.value)}
          style={{ ...inputStyle, textAlign: "right", fontWeight: 600 }}
        />
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
