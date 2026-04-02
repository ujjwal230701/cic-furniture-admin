import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { S } from "./styles";

// Assembles SKU from 3 dropdowns + sequential number.
// Props:
//   value       — current sku string (controlled)
//   onChange    — called with new sku string
//   isEdit      — true when editing an existing product
//   initialSku  — the sku the product had when the form opened (for change warning)
export default function SkuBuilder({ value, onChange, isEdit, initialSku, onPickExisting }) {
  const [skuRef, setSkuRef] = useState([]);
  const [refLoading, setRefLoading] = useState(true);

  const [catCode, setCatCode] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [subtypeCode, setSubtypeCode] = useState("");

  const [generatedSku, setGeneratedSku] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [existingSkus, setExistingSkus] = useState([]);
  const [pickedSku, setPickedSku] = useState("__new__");

  // override = user wants to type a custom SKU
  const [override, setOverride] = useState(false);

  // Prevent auto-generation on initial parse of an existing SKU
  const skipNextGen = useRef(false);

  // Load all sku_reference rows once
  useEffect(() => {
    supabase
      .from("sku_reference")
      .select("*")
      .order("category_code")
      .order("product_type_code")
      .order("subtype_code")
      .then(({ data }) => {
        setSkuRef(data || []);
        setRefLoading(false);
      });
  }, []);

  // When editing, try to parse the existing SKU into the three dropdowns
  useEffect(() => {
    if (!isEdit || !initialSku || refLoading || skuRef.length === 0) return;

    const parts = initialSku.split("-");
    if (parts.length >= 4) {
      const cat = parts[0];
      const type = parts[1];
      const sub = parts[2];
      const catExists  = skuRef.some(r => r.category_code === cat);
      const typeExists = skuRef.some(r => r.category_code === cat && r.product_type_code === type);
      const subExists  = skuRef.some(r => r.category_code === cat && r.product_type_code === type && r.subtype_code === sub);

      if (catExists && typeExists && subExists) {
        skipNextGen.current = true; // don't re-query; keep the existing SKU as-is
        setCatCode(cat);
        setTypeCode(type);
        setSubtypeCode(sub);
        setGeneratedSku(initialSku);
        // value is already initialSku via parent form state — no onChange call needed
        return;
      }
    }
    // SKU doesn't match structured pattern → open override mode with current value
    setOverride(true);
  }, [refLoading]); // intentionally only re-runs when ref data finishes loading

  // Auto-generate: query max sequential number for this prefix and build SKU
  const generateSku = async (cat, type, sub) => {
    if (!cat || !type || !sub) return;
    if (skipNextGen.current) { skipNextGen.current = false; return; }

    const prefix = `${cat}-${type}-${sub}`;
    setGenLoading(true);
    const { data } = await supabase
      .from("products")
      .select("sku, name")
      .like("sku", `${prefix}-%`);

    let max = 0;
    const existing = [];
    const seen = new Set();
    (data || []).forEach(p => {
      const tail = (p.sku || "").slice(prefix.length + 1);
      const num  = parseInt(tail, 10);
      if (!isNaN(num) && num > max) max = num;
      if (p.sku && !seen.has(p.sku)) { seen.add(p.sku); existing.push({ sku: p.sku, name: p.name }); }
    });
    existing.sort((a, b) => a.sku.localeCompare(b.sku));

    const next = String(max + 1).padStart(3, "0");
    const sku  = `${prefix}-${next}`;
    setExistingSkus(existing);
    setPickedSku("__new__");
    setGeneratedSku(sku);
    onChange(sku);
    setGenLoading(false);
  };

  // Derived lists
  const categories   = [...new Map(skuRef.map(r => [r.category_code, r])).values()];
  const productTypes = [...new Map(
    skuRef.filter(r => r.category_code === catCode).map(r => [r.product_type_code, r])
  ).values()];
  const subtypes = skuRef.filter(r => r.category_code === catCode && r.product_type_code === typeCode);

  const handleCatChange = (code) => {
    setCatCode(code);
    setTypeCode("");
    setSubtypeCode("");
    setGeneratedSku("");
    setExistingSkus([]);
    setPickedSku("__new__");
    onChange("");
  };

  const handleTypeChange = (code) => {
    setTypeCode(code);
    setSubtypeCode("");
    setGeneratedSku("");
    setExistingSkus([]);
    setPickedSku("__new__");
    onChange("");
  };

  const handleSubtypeChange = (code) => {
    setSubtypeCode(code);
    generateSku(catCode, typeCode, code);
  };

  const handleSkuPick = async (val) => {
    setPickedSku(val);
    if (val === "__new__") {
      onChange(generatedSku);
      return;
    }
    onChange(val);
    if (onPickExisting) {
      const { data } = await supabase
        .from("products")
        .select("name, price, description, category, cost_price, floor_price, image_url, in_stock")
        .eq("sku", val)
        .limit(1)
        .single();
      if (data) onPickExisting(data);
    }
  };

  const enableOverride = () => {
    setOverride(true);
    // keep whatever is currently in value
  };

  const disableOverride = () => {
    setOverride(false);
    // restore generated SKU if available
    if (generatedSku) onChange(generatedSku);
  };

  const skuChanged = isEdit && initialSku && value && value !== initialSku;

  if (refLoading) {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>SKU</label>
        <div style={{ ...S.input, color: "#aaa" }}>Loading SKU reference…</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>SKU</label>

      {/* Dropdowns (hidden in override mode) */}
      {!override && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select
            value={catCode}
            onChange={e => handleCatChange(e.target.value)}
            style={{ ...S.input, flex: "1 1 150px" }}
          >
            <option value="">— Category —</option>
            {categories.map(r => (
              <option key={r.category_code} value={r.category_code}>
                {r.category_code} · {r.category_name}
              </option>
            ))}
          </select>

          <select
            value={typeCode}
            onChange={e => handleTypeChange(e.target.value)}
            style={{ ...S.input, flex: "1 1 150px" }}
            disabled={!catCode}
          >
            <option value="">— Product Type —</option>
            {productTypes.map(r => (
              <option key={r.product_type_code} value={r.product_type_code}>
                {r.product_type_code} · {r.product_type_name}
              </option>
            ))}
          </select>

          <select
            value={subtypeCode}
            onChange={e => handleSubtypeChange(e.target.value)}
            style={{ ...S.input, flex: "1 1 150px" }}
            disabled={!typeCode}
          >
            <option value="">— Sub-type —</option>
            {subtypes.map(r => (
              <option key={r.subtype_code} value={r.subtype_code}>
                {r.subtype_code} · {r.subtype_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Existing SKU picker — shown once subtype is selected and existing SKUs exist */}
      {!override && subtypeCode && existingSkus.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <select
            value={pickedSku}
            onChange={e => handleSkuPick(e.target.value)}
            style={{ ...S.input, width: "100%", fontFamily: "monospace" }}
          >
            <option value="__new__">✦ New — {generatedSku}</option>
            {existingSkus.map(e => (
              <option key={e.sku} value={e.sku}>{e.sku} — {e.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Generated / manual SKU field */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="text"
          value={override ? (value || "") : (genLoading ? "Generating…" : (pickedSku === "__new__" ? generatedSku : pickedSku) || "")}
          onChange={override ? e => onChange(e.target.value) : undefined}
          readOnly={!override}
          placeholder={override ? "Type custom SKU" : "Select all three above to generate"}
          style={{
            ...S.input,
            flex: 1,
            background: override ? "#fff" : "#f9f9f9",
            color: override ? "#1a1a1a" : "#555",
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}
        />
        {override ? (
          <button
            type="button"
            onClick={disableOverride}
            title="Switch back to auto-generated SKU"
            style={{ ...S.btnOutline, padding: "10px 14px", fontSize: 10, whiteSpace: "nowrap" }}
          >
            USE AUTO
          </button>
        ) : (
          <button
            type="button"
            onClick={enableOverride}
            title="Unlock field to type a custom SKU"
            style={{ ...S.btnOutline, padding: "10px 14px", fontSize: 10, whiteSpace: "nowrap" }}
          >
            OVERRIDE
          </button>
        )}
      </div>

      {/* Edit-mode change warning */}
      {skuChanged && (
        <div style={{ fontSize: 11, color: "#d97706", marginTop: 6, lineHeight: 1.4 }}>
          ⚠ SKU changed from <span style={{ fontFamily: "monospace" }}>{initialSku}</span> to{" "}
          <span style={{ fontFamily: "monospace" }}>{value}</span>. Existing invoice records that
          reference the old SKU will not be updated automatically.
        </div>
      )}
    </div>
  );
}
