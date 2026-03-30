import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { S } from "./styles";
import { Toast } from "./components";

const thStyle = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  color: "#888",
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "10px 12px", fontSize: 13 };

const blankForm = {
  category_code: "",
  category_name: "",
  product_type_code: "",
  product_type_name: "",
  subtype_code: "",
  subtype_name: "",
};

export default function SkuReferenceTab({ role }) {
  const isOwner = role === "owner";

  const [skuRef, setSkuRef]         = useState([]);
  const [productSkus, setProductSkus] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm]             = useState(blankForm);
  const [saving, setSaving]         = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    const [{ data: refData }, { data: prodData }] = await Promise.all([
      supabase
        .from("sku_reference")
        .select("*")
        .order("category_code")
        .order("product_type_code")
        .order("subtype_code"),
      supabase.from("products").select("sku").not("sku", "is", null),
    ]);
    setSkuRef(refData || []);
    setProductSkus((prodData || []).map(p => p.sku).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Returns the highest sequential number used for a given prefix, or null if none
  const getLastNum = (catCode, typeCode, subCode) => {
    const prefix = `${catCode}-${typeCode}-${subCode}-`;
    let max = 0;
    let found = false;
    productSkus.forEach(sku => {
      if (!sku.startsWith(prefix)) return;
      const num = parseInt(sku.slice(prefix.length), 10);
      if (!isNaN(num)) { found = true; if (num > max) max = num; }
    });
    return found ? max : null;
  };

  // ── Add-form helpers ─────────────────────────────────────────────────────────
  const existingCats  = [...new Map(skuRef.map(r => [r.category_code, r])).values()];
  const existingTypes = form.category_code
    ? [...new Map(
        skuRef.filter(r => r.category_code === form.category_code)
              .map(r => [r.product_type_code, r])
      ).values()]
    : [];

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCatSelect = (code) => {
    if (code === "") {
      setForm(f => ({ ...f, category_code: "", category_name: "", product_type_code: "", product_type_name: "" }));
      return;
    }
    const ref = skuRef.find(r => r.category_code === code);
    setForm(f => ({
      ...f,
      category_code: code,
      category_name: ref ? ref.category_name : f.category_name,
      product_type_code: "",
      product_type_name: "",
    }));
  };

  const handleTypeSelect = (code) => {
    if (code === "") {
      setForm(f => ({ ...f, product_type_code: "", product_type_name: "" }));
      return;
    }
    const ref = skuRef.find(r => r.category_code === form.category_code && r.product_type_code === code);
    setForm(f => ({
      ...f,
      product_type_code: code,
      product_type_name: ref ? ref.product_type_name : f.product_type_name,
    }));
  };

  const saveSubtype = async () => {
    const { category_code, category_name, product_type_code, product_type_name, subtype_code, subtype_name } = form;
    if (!category_code || !category_name || !product_type_code || !product_type_name || !subtype_code || !subtype_name) {
      showToast("All six fields are required.", "error");
      return;
    }
    const duplicate = skuRef.some(
      r => r.category_code === category_code &&
           r.product_type_code === product_type_code &&
           r.subtype_code === subtype_code
    );
    if (duplicate) {
      showToast(`${category_code}-${product_type_code}-${subtype_code} already exists.`, "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sku_reference").insert([form]);
    setSaving(false);
    if (error) { showToast(`Error: ${error.message}`, "error"); return; }
    showToast("Sub-type added!");
    setForm(blankForm);
    setShowAddForm(false);
    fetchData();
  };

  // ── Group data for display ────────────────────────────────────────────────────
  // grouped: { [catCode]: { catName, types: { [typeCode]: { typeName, rows[] } } } }
  const grouped = {};
  skuRef.forEach(r => {
    if (!grouped[r.category_code]) {
      grouped[r.category_code] = { catName: r.category_name, types: {} };
    }
    const types = grouped[r.category_code].types;
    if (!types[r.product_type_code]) {
      types[r.product_type_code] = { typeName: r.product_type_name, rows: [] };
    }
    types[r.product_type_code].rows.push(r);
  });

  const skuPreview = form.category_code && form.product_type_code && form.subtype_code
    ? `${form.category_code}-${form.product_type_code}-${form.subtype_code}-001`
    : null;

  return (
    <div>
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          SKU Reference{" "}
          <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>
            ({skuRef.length} {skuRef.length === 1 ? "entry" : "entries"})
          </span>
        </div>
        {isOwner && (
          <button
            onClick={() => { setShowAddForm(v => !v); setForm(blankForm); }}
            style={showAddForm ? S.btnOutline : S.btnPrimary}
          >
            {showAddForm ? "CANCEL" : "+ ADD SUB-TYPE"}
          </button>
        )}
      </div>

      {/* Add Sub-type Form (owner only) */}
      {isOwner && showAddForm && (
        <div style={{ background: "#fff", border: "1px solid #e8e8e8", padding: 24, marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 18 }}>
            NEW SUB-TYPE
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Category Code */}
            <div>
              <label style={S.label}>CATEGORY CODE</label>
              {existingCats.length > 0 && (
                <select
                  value={existingCats.some(r => r.category_code === form.category_code) ? form.category_code : ""}
                  onChange={e => handleCatSelect(e.target.value)}
                  style={{ ...S.input, marginBottom: 6 }}
                >
                  <option value="">— existing —</option>
                  {existingCats.map(r => (
                    <option key={r.category_code} value={r.category_code}>{r.category_code}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder={existingCats.length > 0 ? "or type a new code" : "e.g. BED"}
                value={form.category_code}
                onChange={e => setField("category_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={10}
                style={S.input}
              />
            </div>

            {/* Category Name */}
            <div>
              <label style={S.label}>CATEGORY NAME</label>
              <input
                type="text"
                placeholder="e.g. Bedroom Furniture"
                value={form.category_name}
                onChange={e => setField("category_name", e.target.value)}
                style={S.input}
              />
            </div>

            {/* Product Type Code */}
            <div>
              <label style={S.label}>PRODUCT TYPE CODE</label>
              {existingTypes.length > 0 && (
                <select
                  value={existingTypes.some(r => r.product_type_code === form.product_type_code) ? form.product_type_code : ""}
                  onChange={e => handleTypeSelect(e.target.value)}
                  style={{ ...S.input, marginBottom: 6 }}
                  disabled={!form.category_code}
                >
                  <option value="">— existing —</option>
                  {existingTypes.map(r => (
                    <option key={r.product_type_code} value={r.product_type_code}>{r.product_type_code}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder={existingTypes.length > 0 ? "or type a new code" : "e.g. BED"}
                value={form.product_type_code}
                onChange={e => setField("product_type_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={10}
                style={S.input}
                disabled={!form.category_code}
              />
            </div>

            {/* Product Type Name */}
            <div>
              <label style={S.label}>PRODUCT TYPE NAME</label>
              <input
                type="text"
                placeholder="e.g. Bed Frame"
                value={form.product_type_name}
                onChange={e => setField("product_type_name", e.target.value)}
                style={S.input}
                disabled={!form.category_code}
              />
            </div>

            {/* Sub-type Code */}
            <div>
              <label style={S.label}>SUB-TYPE CODE</label>
              <input
                type="text"
                placeholder="e.g. KNG"
                value={form.subtype_code}
                onChange={e => setField("subtype_code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={10}
                style={S.input}
                disabled={!form.product_type_code}
              />
            </div>

            {/* Sub-type Name */}
            <div>
              <label style={S.label}>SUB-TYPE NAME</label>
              <input
                type="text"
                placeholder="e.g. King Size"
                value={form.subtype_name}
                onChange={e => setField("subtype_name", e.target.value)}
                style={S.input}
                disabled={!form.product_type_code}
              />
            </div>
          </div>

          {skuPreview && (
            <div style={{ fontSize: 12, color: "#555", marginBottom: 14, fontFamily: "monospace", letterSpacing: "0.5px" }}>
              First SKU will be: <strong>{skuPreview}</strong>
            </div>
          )}

          <button onClick={saveSubtype} style={S.btnPrimary} disabled={saving}>
            {saving ? "SAVING…" : "SAVE SUB-TYPE"}
          </button>
        </div>
      )}

      {/* Reference table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888", background: "#fff", border: "1px solid #e8e8e8" }}>
          No SKU reference entries yet.{isOwner ? " Add the first sub-type above." : ""}
        </div>
      ) : (
        Object.entries(grouped).map(([catCode, { catName, types }]) => (
          <div key={catCode} style={{ marginBottom: 36 }}>
            {/* Category header */}
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#fff",
              background: "#1a1a1a",
              padding: "8px 14px",
              marginBottom: 0,
            }}>
              {catCode} — {catName}
            </div>

            {Object.entries(types).map(([typeCode, { typeName, rows }]) => (
              <div key={typeCode} style={{ marginBottom: 0 }}>
                {/* Product type sub-header */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#555",
                  background: "#f5f5f0",
                  padding: "6px 14px",
                  borderBottom: "1px solid #e8e8e8",
                }}>
                  {typeCode} · {typeName}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e8e8e8" }}>
                        <th style={thStyle}>CODE</th>
                        <th style={thStyle}>SUB-TYPE NAME</th>
                        <th style={thStyle}>FULL PREFIX</th>
                        <th style={thStyle}>LAST USED #</th>
                        <th style={thStyle}>LAST SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const lastNum = getLastNum(r.category_code, r.product_type_code, r.subtype_code);
                        const prefix  = `${r.category_code}-${r.product_type_code}-${r.subtype_code}`;
                        const lastSku = lastNum !== null
                          ? `${prefix}-${String(lastNum).padStart(3, "0")}`
                          : null;
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={tdStyle}>
                              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>
                                {r.subtype_code}
                              </span>
                            </td>
                            <td style={tdStyle}>{r.subtype_name}</td>
                            <td style={{ ...tdStyle, fontFamily: "monospace", color: "#555", fontSize: 12 }}>
                              {prefix}
                            </td>
                            <td style={{ ...tdStyle, fontWeight: lastNum !== null ? 700 : 400, color: lastNum !== null ? "#1a1a1a" : "#bbb" }}>
                              {lastNum !== null ? `#${String(lastNum).padStart(3, "0")}` : "none yet"}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12, color: lastSku ? "#38a169" : "#bbb" }}>
                              {lastSku || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
