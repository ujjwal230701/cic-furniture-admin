import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { Toast } from "./components";
import ProductForm from "./ProductForm";
import { S } from "./styles";

const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const save = async (form) => {
    if (editProduct) {
      await supabase.from("products").update(form).eq("id", editProduct.id);
      showToast("Product updated!");
    } else {
      await supabase.from("products").insert([form]);
      showToast("Product added!");
    }
    setShowForm(false);
    setEditProduct(null);
    fetchProducts();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    showToast("Product deleted");
    fetchProducts();
  };

  const recordSale = async (product) => {
    const qty = parseInt(window.prompt(`Record sale for ${product.name}. Units sold?`, "1"));
    if (!qty || qty < 1 || qty > product.stock) return;
    await supabase.from("products").update({
      stock: product.stock - qty,
      sold: (product.sold || 0) + qty
    }).eq("id", product.id);
    showToast(`Sale recorded: ${qty}x ${product.name}`);
    fetchProducts();
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <Toast toast={toast} />
      {(showForm || editProduct) && (
        <ProductForm
          initial={editProduct}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditProduct(null); }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Products <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({products.length} total)</span>
        </div>
        <button onClick={() => setShowForm(true)} style={S.btnPrimary}>+ ADD PRODUCT</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, flex: 1, minWidth: 180 }} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...S.input, width: "auto" }}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      ) : (
        <div style={{ display: "grid", gap: 1, background: "#e8e8e8" }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: "#fff", padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 60, height: 60, background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 28 }}>📦</span>}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{p.sku} · {p.category}</div>
                <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#38a169", fontWeight: 700 }}>{fmt(p.price)}</span>
                  <span style={{ color: p.stock <= 5 ? "#e53e3e" : "#555" }}>Stock: {p.stock}{p.stock <= 5 ? " ⚠️" : ""}</span>
                  <span style={{ color: "#888" }}>Sold: {p.sold || 0}</span>
                  {p.featured && <span style={{ background: "#1a1a1a", color: "#fff", padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>FEATURED</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => recordSale(p)} style={S.btnSuccess}>SALE</button>
                <button onClick={() => setEditProduct(p)} style={{ ...S.btnOutline, padding: "6px 12px" }}>EDIT</button>
                <button onClick={() => remove(p.id)} style={S.btnDanger}>DEL</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ background: "#fff", padding: 40, textAlign: "center", color: "#888" }}>
              No products found. Add your first product!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
