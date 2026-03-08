import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { StatCard, Toast } from "./components";
import { S } from "./styles";

const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;

export default function DashboardTab() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    supabase.from("products").select("*").then(({ data }) => setProducts(data || []));
  }, []);

  const totalValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const totalRevenue = products.reduce((s, p) => s + (p.price * (p.sold || 0)), 0);
  const lowStock = products.filter(p => p.stock <= 5);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Products" value={products.length} color="#2d6a9f" />
        <StatCard label="Stock Value" value={fmt(totalValue)} color="#38a169" />
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} color="#805ad5" />
        <StatCard label="Low Stock Items" value={lowStock.length} color={lowStock.length > 0 ? "#e53e3e" : "#38a169"} />
      </div>

      {lowStock.length > 0 && (
        <div style={{ ...S.card, border: "1px solid #feb2b2", background: "#fff5f5", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#c53030", marginBottom: 12 }}>⚠️ LOW STOCK ALERTS</div>
          {lowStock.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #fed7d7", fontSize: 13 }}>
              <span>{p.name} <span style={{ color: "#aaa" }}>({p.sku})</span></span>
              <span style={{ fontWeight: 700, color: "#c53030" }}>{p.stock} left</span>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>TOP SELLING PRODUCTS</div>
        {[...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5).map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
            <span><span style={{ color: "#aaa", marginRight: 10 }}>#{i + 1}</span>{p.name}</span>
            <span style={{ fontWeight: 700 }}>{p.sold || 0} sold · {fmt((p.sold || 0) * p.price)}</span>
          </div>
        ))}
        {products.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>No products yet.</div>}
      </div>
    </div>
  );
}
