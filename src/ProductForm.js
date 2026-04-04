import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { S } from "./styles";
import SkuBuilder from "./SkuBuilder";

const incrementSku = (sku) => {
  const match = sku.match(/^(.*-)(\d+)$/);
  if (!match) return sku;
  return match[1] + String(parseInt(match[2], 10) + 1).padStart(match[2].length, "0");
};

const emptyVariant = () => ({
  id: null,
  variant_value: "",
  sku: "",
  price: "",
  cost_price: "",
  floor_price: "",
  stock: "",
  image_url: "",
});

export default function ProductForm({ initial, onSave, onCancel, role }) {
  const isOwner = role === "owner";
  const [form, setForm] = useState(initial || {
    name: "", category: CATEGORIES[0], price: "", description: "",
    sku: "", stock: 0, sold: 0, in_stock: true, featured: false, image_url: "",
    cost_price: "", floor_price: "",
  });
  const [images, setImages] = useState(
    initial?.image_url ? [{ url: initial.image_url, sort_order: 0 }] : []
  );
  const [uploading, setUploading] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const fileRef = useRef();

  // Variant state
  const [hasVariants, setHasVariants] = useState(false);
  const [variantType, setVariantType] = useState("colour");
  const [variants, setVariants] = useState([emptyVariant()]);
  const [sharedSku, setSharedSku] = useState("");
  const [variantUploading, setVariantUploading] = useState(null);

  useEffect(() => {
    supabase.from("products")
      .select("id, name, sku, price, description, category, cost_price, floor_price, image_url, in_stock")
      .order("name")
      .then(({ data }) => setAllProducts(data || []));
  }, []);

  useEffect(() => {
    if (!initial?.id) return;
    // Load extra images for standalone edit
    supabase
      .from("products_images")
      .select("image_url, sort_order")
      .eq("product_id", initial.id)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setImages(prev => [...prev, ...data.map(r => ({ url: r.image_url, sort_order: r.sort_order }))]);
        }
      });
    // Load variants if this is a parent product
    supabase
      .from("products")
      .select("id, variant_value, variant_type, sku, price, cost_price, floor_price, stock, image_url")
      .eq("parent_product_id", initial.id)
      .order("id")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasVariants(true);
          setVariantType(data[0].variant_type || "colour");
          setVariants(data.map(v => ({
            id: v.id,
            variant_value: v.variant_value || "",
            sku: v.sku || "",
            price: v.price ?? "",
            cost_price: v.cost_price ?? "",
            floor_price: v.floor_price ?? "",
            stock: v.stock ?? 0,
            image_url: v.image_url || "",
          })));
        }
      });
  }, []);

  const uploadImages = async (files) => {
    const fileArr = Array.from(files);
    const remaining = 5 - images.length;
    if (remaining <= 0) { alert("Maximum 5 images per product"); return; }
    const toUpload = fileArr.slice(0, remaining);
    if (fileArr.length > remaining) alert(`Only ${remaining} slot(s) remaining. Uploading first ${remaining} image(s).`);
    setUploading(true);
    const uploaded = [];
    for (const file of toUpload) {
      try {
        const ext = file.name.split(".").pop();
        const path = `public/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
        if (error) { alert(`Upload error: ${error.message}`); continue; }
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    }
    setImages(prev => {
      const next = [...prev, ...uploaded.map((url, i) => ({ url, sort_order: prev.length + i }))];
      if (prev.length === 0 && next.length > 0) setForm(f => ({ ...f, image_url: next[0].url }));
      return next;
    });
    setUploading(false);
  };

  const uploadVariantImage = async (index, file) => {
    setVariantUploading(index);
    try {
      const ext = file.name.split(".").pop();
      const path = `public/${Date.now()}_v${index}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) { alert(`Upload error: ${error.message}`); setVariantUploading(null); return; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setVariants(prev => prev.map((v, i) => i === index ? { ...v, image_url: data.publicUrl } : v));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setVariantUploading(null);
  };

  const removeImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    setForm(f => ({ ...f, image_url: updated.length > 0 ? updated[0].url : "" }));
  };

  const setMainImage = (index) => {
    if (index === 0) return;
    const updated = [images[index], ...images.filter((_, i) => i !== index)].map((img, i) => ({ ...img, sort_order: i }));
    setImages(updated);
    setForm(f => ({ ...f, image_url: updated[0].url }));
  };

  const setVariantField = (index, field, value) =>
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));

  const markup = !hasVariants && form.price && form.cost_price && +form.cost_price > 0
    ? (((+form.price - +form.cost_price) / +form.cost_price) * 100).toFixed(1)
    : null;

  const save = async () => {
    if (!form.name || (!hasVariants && !form.price)) return;
    const savedForm = {
      ...form,
      price: hasVariants ? 0 : +form.price,
      stock: hasVariants ? 0 : +form.stock,
      sold: +form.sold || 0,
      cost_price: !hasVariants && form.cost_price !== "" && form.cost_price !== null ? +form.cost_price : null,
      floor_price: !hasVariants && form.floor_price !== "" && form.floor_price !== null ? +form.floor_price : null,
    };
    onSave(savedForm, images, hasVariants ? { variantType, variants } : null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", padding: 32 }}>

        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>
          {initial ? "EDIT PRODUCT" : "ADD NEW PRODUCT"}
        </div>

        {/* Copy from existing — standalone new products only */}
        {!initial && !hasVariants && allProducts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>COPY FROM EXISTING PRODUCT</label>
            <select
              defaultValue=""
              onChange={e => {
                const p = allProducts.find(x => x.id === +e.target.value);
                if (!p) return;
                setForm(f => ({
                  ...f,
                  name: p.name, price: p.price, description: p.description || "",
                  category: p.category, cost_price: p.cost_price ?? "",
                  floor_price: p.floor_price ?? "", image_url: p.image_url || "",
                  in_stock: p.in_stock, sku: p.sku || "",
                }));
                if (p.image_url) setImages([{ url: p.image_url, sort_order: 0 }]);
              }}
              style={S.input}
            >
              <option value="">— Select a product to copy from —</option>
              {allProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* Product Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>PRODUCT NAME</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={S.input} />
        </div>

        {/* Has Variants toggle — owner, new products only */}
        {isOwner && !initial && (
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: hasVariants ? "#f0fff4" : "#f9f9f9", border: `1px solid ${hasVariants ? "#9ae6b4" : "#e8e8e8"}` }}>
            <input
              type="checkbox"
              id="has-variants"
              checked={hasVariants}
              onChange={e => { setHasVariants(e.target.checked); setVariants([emptyVariant()]); setSharedSku(""); }}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <label htmlFor="has-variants" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, cursor: "pointer", color: hasVariants ? "#276749" : "#555" }}>
              THIS PRODUCT HAS VARIANTS (colours, fabrics, sizes)
            </label>
          </div>
        )}
        {isOwner && initial && hasVariants && (
          <div style={{ marginBottom: 16, padding: "8px 12px", background: "#f0fff4", border: "1px solid #9ae6b4", fontSize: 12, color: "#276749", fontWeight: 700 }}>
            PARENT PRODUCT — variants listed below
          </div>
        )}

        {/* ── VARIANT MODE ── */}
        {hasVariants ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>VARIANT TYPE</label>
              <select value={variantType} onChange={e => setVariantType(e.target.value)} style={S.input}>
                <option value="colour">Colour</option>
                <option value="fabric">Fabric</option>
                <option value="size">Size</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>CATEGORY</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={S.input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>DESCRIPTION</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...S.input, resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
                Show on Homepage
              </label>
            </div>

            {/* Variant rows */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 12 }}>
                VARIANTS ({variants.length})
              </div>

              {variants.map((v, i) => (
                <div key={i} style={{ border: "1px solid #e8e8e8", padding: 16, marginBottom: 12, background: "#fafafa" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#555" }}>VARIANT {i + 1}</div>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setVariants(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={S.label}>{variantType.toUpperCase()} VALUE</label>
                      <input
                        value={v.variant_value}
                        onChange={e => setVariantField(i, "variant_value", e.target.value)}
                        style={S.input}
                        placeholder={
                          variantType === "colour" ? "e.g. Grey" :
                          variantType === "fabric" ? "e.g. Mesh/Net" :
                          variantType === "size" ? "e.g. 4X2" : "e.g. Standard"
                        }
                      />
                    </div>
                    <div>
                      <label style={S.label}>SKU</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={v.sku}
                          onChange={e => setVariantField(i, "sku", e.target.value)}
                          style={{ ...S.input, fontFamily: "monospace", flex: 1 }}
                          placeholder="Type or apply →"
                        />
                        {sharedSku && (
                          <button
                            type="button"
                            onClick={() => {
                              setVariantField(i, "sku", sharedSku);
                              setSharedSku(prev => incrementSku(prev));
                            }}
                            title="Apply generated SKU to this variant and auto-increment for the next"
                            style={{ ...S.btnOutline, padding: "8px 10px", fontSize: 10, whiteSpace: "nowrap" }}
                          >
                            ← APPLY
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={S.label}>PRICE (₹)</label>
                      <input type="number" value={v.price} onChange={e => setVariantField(i, "price", e.target.value)} style={S.input} placeholder="0" />
                    </div>
                    <div>
                      <label style={S.label}>STOCK</label>
                      <input type="number" value={v.stock} onChange={e => setVariantField(i, "stock", e.target.value)} style={S.input} placeholder="0" />
                    </div>
                    {isOwner && (
                      <>
                        <div>
                          <label style={S.label}>COST PRICE (₹)</label>
                          <input type="number" value={v.cost_price} onChange={e => setVariantField(i, "cost_price", e.target.value)} style={S.input} placeholder="Optional" />
                        </div>
                        <div>
                          <label style={S.label}>FLOOR PRICE (₹)</label>
                          <input type="number" value={v.floor_price} onChange={e => setVariantField(i, "floor_price", e.target.value)} style={S.input} placeholder="Optional" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Variant image */}
                  <div style={{ marginTop: 10 }}>
                    <label style={S.label}>IMAGE</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {v.image_url && (
                        <img src={v.image_url} alt={v.variant_value} style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid #ddd" }} />
                      )}
                      <div
                        style={{ border: "1px dashed #ddd", padding: "8px 16px", cursor: "pointer", fontSize: 12, color: "#aaa" }}
                        onClick={() => {
                          if (variantUploading !== null) return;
                          const inp = document.createElement("input");
                          inp.type = "file"; inp.accept = "image/*";
                          inp.onchange = e => e.target.files[0] && uploadVariantImage(i, e.target.files[0]);
                          inp.click();
                        }}
                      >
                        {variantUploading === i ? "Uploading..." : v.image_url ? "Change image" : "Add image"}
                      </div>
                      {v.image_url && (
                        <button type="button" onClick={() => setVariantField(i, "image_url", "")} style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 18 }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setVariants(prev => [...prev, emptyVariant()])}
                style={{ ...S.btnOutline, fontSize: 11, padding: "7px 16px" }}
              >
                + ADD VARIANT
              </button>
            </div>

            {/* Shared SKU Generator */}
            <div style={{ background: "#f9f9f9", border: "1px solid #e8e8e8", padding: 16, marginTop: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 12 }}>
                SKU GENERATOR — generate then click ← APPLY on each variant row
              </div>
              <SkuBuilder
                value={sharedSku}
                onChange={setSharedSku}
                isEdit={false}
                initialSku=""
              />
            </div>
          </>
        ) : (
          /* ── STANDALONE MODE — existing flow unchanged ── */
          <>
            {/* Image Upload */}
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>PRODUCT IMAGES ({images.length}/5)</label>
              {images.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                      <img src={img.url} alt={`img-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover", border: i === 0 ? "2px solid #1a1a1a" : "1px solid #ddd" }} />
                      {i === 0
                        ? <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#1a1a1a", color: "#fff", fontSize: 9, textAlign: "center", padding: 2 }}>MAIN</div>
                        : <div onClick={() => setMainImage(i)} style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, textAlign: "center", padding: 2, cursor: "pointer" }}>SET MAIN</div>
                      }
                      <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, background: "#e53e3e", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 5 && (
                <div style={{ border: "1px dashed #ddd", padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => !uploading && fileRef.current.click()}>
                  <div style={{ color: "#aaa", fontSize: 13 }}>{uploading ? "Uploading..." : "Tap to add images"}</div>
                  {!uploading && <div style={{ color: "#bbb", fontSize: 11, marginTop: 4 }}>You can select multiple at once</div>}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => e.target.files.length > 0 && uploadImages(e.target.files)} />
            </div>

            {/* SKU Builder */}
            <SkuBuilder
              value={form.sku}
              onChange={val => setForm(f => ({ ...f, sku: val }))}
              isEdit={!!initial}
              initialSku={initial?.sku || ""}
              onPickExisting={product => setForm(f => ({
                ...f,
                name: product.name, price: product.price, description: product.description || "",
                category: product.category, cost_price: product.cost_price ?? "",
                floor_price: product.floor_price ?? "", image_url: product.image_url || "",
                in_stock: product.in_stock,
              }))}
            />

            {/* Price & Stock */}
            {[["Price (₹)", "price", "number"], ["Stock Quantity", "stock", "number"]].map(([lbl, key, type]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={S.label}>{lbl.toUpperCase()}</label>
                <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={S.input} />
              </div>
            ))}

            {/* Owner-only pricing */}
            {isOwner && (
              <div style={{ background: "#f9f9f9", border: "1px solid #e8e8e8", padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 12 }}>OWNER — COST & FLOOR</div>
                <div style={{ display: "flex", gap: 12, marginBottom: markup ? 10 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>COST PRICE (₹)</label>
                    <input type="number" value={form.cost_price ?? ""} onChange={e => setForm({ ...form, cost_price: e.target.value })} style={S.input} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>FLOOR PRICE (₹)</label>
                    <input type="number" value={form.floor_price ?? ""} onChange={e => setForm({ ...form, floor_price: e.target.value })} style={S.input} placeholder="0" />
                  </div>
                </div>
                {markup !== null && (
                  <div style={{ fontSize: 12, color: +markup >= 0 ? "#38a169" : "#e53e3e", fontWeight: 700 }}>
                    MARKUP: {markup}%
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>CATEGORY</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={S.input}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>DESCRIPTION</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...S.input, resize: "vertical" }} />
            </div>

                    {/* Low stock threshold — owner only */}
            {isOwner && (
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>LOW STOCK ALERT BELOW</label>
                <input
                  type="number"
                  value={form.min_stock_threshold ?? ""}
                  onChange={e => setForm({ ...form, min_stock_threshold: e.target.value === "" ? null : +e.target.value })}
                  style={S.input}
                  placeholder="e.g. 3 (leave blank to disable)"
                  min="0"
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
                Show on Homepage
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.in_stock} onChange={e => setForm({ ...form, in_stock: e.target.checked })} />
                In Stock
              </label>
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={save} style={{ ...S.btnPrimary, flex: 1 }} disabled={uploading || variantUploading !== null}>
            {uploading || variantUploading !== null ? "UPLOADING..." : "SAVE PRODUCT"}
          </button>
          <button onClick={onCancel} style={{ ...S.btnOutline, flex: 1 }}>CANCEL</button>
        </div>

      </div>
    </div>
  );
}
