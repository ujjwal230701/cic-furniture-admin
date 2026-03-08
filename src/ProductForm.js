import { useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { S } from "./styles";

export default function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: "", category: CATEGORIES[0], price: "", description: "",
    sku: "", stock: 0, sold: 0, in_stock: true, featured: false, image_url: ""
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initial?.image_url || "");
  const fileRef = useRef();

  const uploadImage = async (file) => {
  setUploading(true);
  try {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    
    if (uploadError) {
      alert(`Upload error: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setPreview(data.publicUrl);
    alert(`Success! URL: ${data.publicUrl}`);
  } catch (err) {
    alert(`Caught error: ${err.message}`);
  }
  setUploading(false);
};


  const save = () => {
    if (!form.name || !form.price) return;
    onSave({ ...form, price: +form.price, stock: +form.stock, sold: +form.sold });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 24 }}>
          {initial ? "EDIT PRODUCT" : "ADD NEW PRODUCT"}
        </div>

        {/* Image Upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>PRODUCT IMAGE</label>
          <div style={{ border: "1px dashed #ddd", padding: 20, textAlign: "center", cursor: "pointer" }} onClick={() => fileRef.current.click()}>
            {preview
              ? <img src={preview} alt="preview" style={{ maxHeight: 160, maxWidth: "100%", objectFit: "contain" }} />
              : <div style={{ color: "#aaa", fontSize: 13 }}>{uploading ? "Uploading..." : "Tap to upload image"}</div>}
          </div>
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
