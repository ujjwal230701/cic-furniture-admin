import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { Toast } from "./components";
import ProductForm from "./ProductForm";
import CsvImportModal from "./CsvImportModal";
import ReceiveStockModal from "./ReceiveStockModal";
import PrintLabelModal from "./PrintLabelModal";
import { S } from "./styles";

const fmt = (p) => `₹${p.toLocaleString("en-IN")}`;

// Business decision: staff can see floor price (for negotiation) but not cost price.
// This is intentional — do not treat as a bug.
const STAFF_CAN_SEE_FLOOR_PRICE = true;

export default function ProductsTab({ role }) {
  const isOwner = role === "owner";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [receiveProduct, setReceiveProduct] = useState(null);
  const [labelProduct, setLabelProduct] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [expandedParents, setExpandedParents] = useState(new Set());

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

  const toggleExpand = (id) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async (form, images, variantData) => {
    let productId;
    if (editProduct) {
      const { error } = await supabase.from("products").update(form).eq("id", editProduct.id);
      if (error) { showToast(`Error: ${error.message}`, "error"); return; }
      productId = editProduct.id;
      showToast("Product updated!");
    } else {
      const { data, error } = await supabase.from("products").insert([form]).select();
      if (error) { showToast(`Error: ${error.message}`, "error"); return; }
      productId = data[0].id;
      showToast("Product added!");
    }

    // Save extra images for standalone products
    if (!variantData) {
      await supabase.from("products_images").delete().eq("product_id", productId);
      if (images && images.length > 1) {
        const imageRows = images.slice(1).map((img, i) => ({
          product_id: productId,
          image_url: img.url,
          sort_order: i + 1,
        }));
        const { error } = await supabase.from("products_images").insert(imageRows);
        if (error) showToast(`Image save error: ${error.message}`, "error");
      }
    }

    // Save variants
    if (variantData) {
      const { variantType, variants } = variantData;
      for (const v of variants) {
        if (!v.variant_value) continue;
        const variantRow = {
          name: form.name,
          category: form.category,
          description: form.description || "",
          parent_product_id: productId,
          variant_type: variantType,
          variant_value: v.variant_value,
          sku: v.sku || null,
          price: +v.price || 0,
          cost_price: v.cost_price !== "" && v.cost_price !== null ? +v.cost_price : null,
          floor_price: v.floor_price !== "" && v.floor_price !== null ? +v.floor_price : null,
          stock: +v.stock || 0,
          sold: v.id ? undefined : 0,
          in_stock: (+v.stock || 0) > 0,
          image_url: v.image_url || null,
          featured: false,
        };
        // Remove undefined fields for updates
        if (v.id) {
          const { sold: _sold, ...updateRow } = variantRow;
          await supabase.from("products").update(updateRow).eq("id", v.id);
        } else {
          await supabase.from("products").insert([{ ...variantRow, sold: 0 }]);
        }
      }
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
      sold: (product.sold || 0) + qty,
    }).eq("id", product.id);
    showToast(`Sale recorded: ${qty}x ${product.name}`);
    fetchProducts();
  };

  // Identify parent product IDs (products that have at least one variant child)
  const parentIds = new Set(products.filter(p => p.parent_product_id).map(p => p.parent_product_id));

  // Main list: exclude variant children (they appear under their parent when expanded)
  const filtered = products.filter(p => {
    if (p.parent_product_id !== null) return false;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const renderProductRow = (p) => {
    const isParent = parentIds.has(p.id);
    const isExpanded = expandedParents.has(p.id);
    const variants = isParent ? products.filter(v => v.parent_product_id === p.id) : [];

    return (
      <div key={p.id}>
        {/* Main product row */}
        <div style={{ background: "#fff", padding: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 60, height: 60, background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {p.image_url
              ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 28 }}>📦</span>}
          </div>

          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
              {isParent && (
                <span style={{ background: "#1a1a1a", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", letterSpacing: 1 }}>
                  PARENT · {variants.length} VARIANT{variants.length !== 1 ? "S" : ""}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{p.sku || "—"} · {p.category}</div>
            {!isParent && (
              <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: "#38a169", fontWeight: 700 }}>{fmt(p.price)}</span>
                <span style={{ color: p.stock <= 5 ? "#e53e3e" : "#555" }}>Stock: {p.stock}{p.stock <= 5 ? " ⚠️" : ""}</span>
                <span style={{ color: "#888" }}>Sold: {p.sold || 0}</span>
                {p.featured && <span style={{ background: "#1a1a1a", color: "#fff", padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>FEATURED</span>}
              </div>
            )}
            {isParent && (
              <div style={{ fontSize: 12, marginTop: 4, color: "#888" }}>
                Price range: {variants.length > 0
                  ? (() => {
                      const prices = variants.map(v => v.price);
                      const min = Math.min(...prices), max = Math.max(...prices);
                      return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
                    })()
                  : "—"
                }
                {" · "}Total stock: {variants.reduce((s, v) => s + (v.stock || 0), 0)}
              </div>
            )}
            {!isParent && (isOwner || STAFF_CAN_SEE_FLOOR_PRICE) && (p.cost_price != null || p.floor_price != null) && (
              <div style={{ fontSize: 11, marginTop: 4, display: "flex", gap: 12, color: "#888" }}>
                {isOwner && p.cost_price != null && <span>Cost: <span style={{ fontWeight: 700, color: "#d97706" }}>{fmt(p.cost_price)}</span></span>}
                {(isOwner || STAFF_CAN_SEE_FLOOR_PRICE) && p.floor_price != null && <span>Floor: <span style={{ fontWeight: 700, color: "#555" }}>{fmt(p.floor_price)}</span></span>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
            {isParent && (
              <button
                onClick={() => toggleExpand(p.id)}
                style={{ ...S.btnOutline, padding: "6px 12px", fontSize: 11 }}
              >
                {isExpanded ? "▲ HIDE" : "▼ VARIANTS"}
              </button>
            )}
            {!isParent && <button onClick={() => setLabelProduct(p)} style={{ ...S.btnOutline, padding: "6px 12px" }}>LABEL</button>}
            {isOwner && (
              <>
                {!isParent && (
                  <>
                    <button onClick={() => setReceiveProduct(p)} style={{ ...S.btnOutline, padding: "6px 12px" }}>+STOCK</button>
                    <button onClick={() => recordSale(p)} style={S.btnSuccess}>SALE</button>
                  </>
                )}
                <button onClick={() => setEditProduct(p)} style={{ ...S.btnOutline, padding: "6px 12px" }}>EDIT</button>
                <button onClick={() => remove(p.id)} style={S.btnDanger}>DEL</button>
              </>
            )}
          </div>
        </div>

        {/* Variant sub-rows */}
        {isParent && isExpanded && (
          <div style={{ background: "#f9f9f9", borderTop: "1px solid #e8e8e8" }}>
            {variants.map(v => (
              <div key={v.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px 10px 36px", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, background: "#f0f0ec", flexShrink: 0, overflow: "hidden" }}>
                  {v.image_url
                    ? <img src={v.image_url} alt={v.variant_value} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>🎨</span>}
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {v.variant_value}
                    <span style={{ fontSize: 10, color: "#888", marginLeft: 8, fontWeight: 400 }}>{v.variant_type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>{v.sku || "—"}</div>
                  <div style={{ fontSize: 12, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ color: "#38a169", fontWeight: 700 }}>{fmt(v.price)}</span>
                    <span style={{ color: v.stock <= 5 ? "#e53e3e" : "#555" }}>Stock: {v.stock}{v.stock <= 5 ? " ⚠️" : ""}</span>
                    <span style={{ color: "#888" }}>Sold: {v.sold || 0}</span>
                  </div>
                  {isOwner && (v.cost_price != null || v.floor_price != null) && (
                    <div style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 10, color: "#888" }}>
                      {v.cost_price != null && <span>Cost: <span style={{ fontWeight: 700, color: "#d97706" }}>{fmt(v.cost_price)}</span></span>}
                      {v.floor_price != null && <span>Floor: <span style={{ fontWeight: 700 }}>{fmt(v.floor_price)}</span></span>}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setLabelProduct(v)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 10 }}>LABEL</button>
                  {isOwner && (
                    <>
                      <button onClick={() => setReceiveProduct(v)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 10 }}>+STOCK</button>
                      <button onClick={() => recordSale(v)} style={{ ...S.btnSuccess, padding: "4px 10px", fontSize: 10 }}>SALE</button>
                      <button onClick={() => setEditProduct(v)} style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 10 }}>EDIT</button>
                      <button onClick={() => remove(v.id)} style={{ ...S.btnDanger, padding: "4px 10px", fontSize: 10 }}>DEL</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <Toast toast={toast} />
      {(showForm || editProduct) && (
        <ProductForm
          initial={editProduct}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditProduct(null); }}
          role={role}
        />
      )}
      {receiveProduct && (
        <ReceiveStockModal
          product={receiveProduct}
          onClose={() => setReceiveProduct(null)}
          onSuccess={(qty) => {
            setReceiveProduct(null);
            showToast(`+${qty} units received for ${receiveProduct.name}`);
            fetchProducts();
          }}
        />
      )}
      {labelProduct && (
        <PrintLabelModal product={labelProduct} onClose={() => setLabelProduct(null)} />
      )}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onSuccess={(count) => {
            setShowCsvImport(false);
            showToast(`${count} product${count !== 1 ? "s" : ""} imported successfully!`);
            fetchProducts();
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Products <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>({products.filter(p => !p.parent_product_id).length} products · {products.filter(p => p.parent_product_id).length} variants)</span>
        </div>
        {isOwner && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCsvImport(true)} style={S.btnOutline}>IMPORT CSV</button>
            <button onClick={() => setShowForm(true)} style={S.btnPrimary}>+ ADD PRODUCT</button>
          </div>
        )}
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
          {filtered.map(p => renderProductRow(p))}
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
