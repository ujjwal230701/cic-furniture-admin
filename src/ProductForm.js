import { useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { S } from "./styles";

export default function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: "", category: CATEGORIES[0], price: "", description: "",
    sku: "", stock: 0, sold: 0, in_stock: true, featured: false, image_url: ""
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const uploadImage = async (file) => {
    if (images.length >= 5) { alert("Maximum 5 images per product"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) { alert(`Upload error: ${error.message}`); setUploading(false); return; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      const newImage = { url: data.publicUrl, sort_order: images.length };
      setImages(prev => [...prev, newImage]);
      if (images.length === 0) setForm(f => ({ ...f, image_url: data.publicUrl }));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    setForm(f => ({ ...f, image_url: updated.length > 0 ? updated[0].url : "" }));
  };

  const save = async () => {
    if (!form.name || !form.price) return;
    const savedForm = { ...form, price: +form.price, stock: +form.stock, sold: +form.sold };
    onSave(savedForm, images);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>
          {initial ? "EDIT PRODUCT" : "ADD NEW PRODUCT"}
        </div>

        {/* Image Upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>PRODUCT IMAGES ({images.length}/5)</label>

          {/* Image Previews */}
          {images.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                  <img src={img.url} alt={`img-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover", border: i === 0 ? "2px solid #1a1a1a" : "1px solid #ddd" }} />
                  {i === 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#1a1a1a", color: "#fff", fontSize: 9, textAlign: "center", padding: 2 }}>MAIN</div>}
                  <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, background: "#e53e3e", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {images.length < 5 && (
            <div style={{ border: "1px dashed #ddd", padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => !uploading && fileRef.current.click()}>
              <div style={{ color: "#aaa", fontSize: 13 }}>{uploading ? "Uploading..." : "Tap to add image"}</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
        </div>

        {/* Text Fields */}
        {[["Product Name", "name", "text"], ["SKU", "sku", "text"], ["Price (₹)", "price", "number"], ["Stock Quantity", "stock", "number"]].map(([lbl, key, type]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={S.label}>{lbl.toUpperCase()}</label>
            <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={S.input} />
          </div>
        ))}

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

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={save} style={{ ...S.btnPrimary, flex: 1 }} disabled={uploading}>
            {uploading ? "UPLOADING..." : "SAVE PRODUCT"}
          </button>
          <button onClick={onCancel} style={{ ...S.btnOutline, flex: 1 }}>CANCEL</button>
        </div>
      </div>
    </div>
  );
}
