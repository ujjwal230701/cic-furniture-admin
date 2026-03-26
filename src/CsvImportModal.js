import { useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { CATEGORIES } from "./config";
import { S } from "./styles";

const PREVIEW_COLS = ["name", "sku", "category", "price", "cost_price", "floor_price", "stock", "featured", "in_stock", "description"];

function parseBool(val) {
  return ["true", "1", "yes"].includes(String(val ?? "").toLowerCase().trim());
}

function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { error: "CSV must have a header row and at least one data row." };

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z_]/g, "").trim());
  const missing = ["name", "price"].filter(c => !headers.includes(c));
  if (missing.length) return { error: `Missing required column(s): ${missing.join(", ")}` };

  const rows = lines.slice(1).map((line, i) => {
    const values = parseCsvLine(line);
    const raw = {};
    headers.forEach((h, idx) => { raw[h] = values[idx] ?? ""; });

    const errors = [];
    if (!String(raw.name || "").trim()) errors.push("name is required");
    if (!raw.price || isNaN(Number(raw.price))) errors.push("price must be a number");
    if (raw.stock && isNaN(Number(raw.stock))) errors.push("stock must be a number");
    if (raw.cost_price && isNaN(Number(raw.cost_price))) errors.push("cost_price must be a number");
    if (raw.floor_price && isNaN(Number(raw.floor_price))) errors.push("floor_price must be a number");

    return { _index: i + 1, _errors: errors, ...raw };
  });

  return { headers, rows };
}

function toProductRow(raw) {
  return {
    name: String(raw.name || "").trim(),
    sku: String(raw.sku || "").trim() || null,
    category: String(raw.category || "").trim() || CATEGORIES[0],
    price: Number(raw.price) || 0,
    stock: Number(raw.stock) || 0,
    cost_price: raw.cost_price && !isNaN(Number(raw.cost_price)) ? Number(raw.cost_price) : null,
    floor_price: raw.floor_price && !isNaN(Number(raw.floor_price)) ? Number(raw.floor_price) : null,
    description: String(raw.description || "").trim() || null,
    featured: parseBool(raw.featured),
    in_stock: String(raw.in_stock || "").trim() !== "" ? parseBool(raw.in_stock) : true,
  };
}

export default function CsvImportModal({ onClose, onSuccess }) {
  const fileRef = useRef();
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState(null);
  const [rows, setRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setRows(null);
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCSV(ev.target.result);
      if (result.error) { setParseError(result.error); return; }
      setRows(result.rows);
    };
    reader.readAsText(file);
  };

  const validRows = rows ? rows.filter(r => r._errors.length === 0) : [];
  const invalidCount = rows ? rows.length - validRows.length : 0;

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setImportError(null);
    const { error } = await supabase.from("products").insert(validRows.map(toProductRow));
    setImporting(false);
    if (error) { setImportError(error.message); return; }
    onSuccess(validRows.length);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 860, maxHeight: "90vh", overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>IMPORT PRODUCTS FROM CSV</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888", lineHeight: 1 }}>✕</button>
        </div>

        {/* Instructions */}
        <div style={{ background: "#f9f9f9", border: "1px solid #eee", padding: 14, fontSize: 12, color: "#555", lineHeight: 1.9 }}>
          <strong>Supported columns:</strong> name*, sku, category, price*, cost_price, floor_price, stock, description, featured, in_stock<br />
          <strong>featured</strong> / <strong>in_stock</strong>: <code>true</code> or <code>false</code> &nbsp;·&nbsp;
          <strong>price</strong> / <strong>stock</strong>: numbers &nbsp;·&nbsp;
          Columns marked <strong>*</strong> are required.<br />
          First row must be headers. Column names are case-insensitive.
        </div>

        {/* File picker */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />
          <button onClick={() => { fileRef.current.click(); }} style={S.btnOutline}>CHOOSE FILE</button>
          <span style={{ fontSize: 13, color: "#888" }}>{fileName || "No file selected"}</span>
        </div>

        {/* Parse error */}
        {parseError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", padding: 12, fontSize: 13, color: "#c53030" }}>
            ⚠ {parseError}
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", padding: 12, fontSize: 13, color: "#c53030" }}>
            ⚠ Import failed: {importError}
          </div>
        )}

        {/* Preview */}
        {rows && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#888" }}>
              PREVIEW — {rows.length} ROW{rows.length !== 1 ? "S" : ""}
              {invalidCount > 0 && <span style={{ color: "#e53e3e" }}> · {invalidCount} row{invalidCount !== 1 ? "s" : ""} with errors will be skipped</span>}
            </div>

            <div style={{ overflowX: "auto", border: "1px solid #e8e8e8" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f5f5f0" }}>
                    <th style={thStyle}>#</th>
                    {PREVIEW_COLS.map(h => <th key={h} style={thStyle}>{h.toUpperCase()}</th>)}
                    <th style={thStyle}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const hasError = row._errors.length > 0;
                    return (
                      <tr key={row._index} style={{ background: hasError ? "#fff5f5" : "#fff", borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ ...tdStyle, color: "#aaa" }}>{row._index}</td>
                        {PREVIEW_COLS.map(col => (
                          <td key={col} style={{ ...tdStyle, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row[col] !== undefined && row[col] !== ""
                              ? String(row[col])
                              : <span style={{ color: "#ccc" }}>—</span>}
                          </td>
                        ))}
                        <td style={tdStyle}>
                          {hasError
                            ? <span style={{ color: "#e53e3e", fontSize: 11 }}>⚠ {row._errors.join("; ")}</span>
                            : <span style={{ color: "#38a169", fontSize: 11 }}>✓ OK</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleImport}
            disabled={!validRows.length || importing}
            style={{ ...S.btnPrimary, flex: 1, opacity: (!validRows.length || importing) ? 0.4 : 1, cursor: (!validRows.length || importing) ? "default" : "pointer" }}
          >
            {importing
              ? "IMPORTING..."
              : validRows.length
                ? `IMPORT ${validRows.length} PRODUCT${validRows.length !== 1 ? "S" : ""}`
                : "IMPORT"}
          </button>
          <button onClick={onClose} style={{ ...S.btnOutline, flex: 1 }}>CANCEL</button>
        </div>

      </div>
    </div>
  );
}

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 1,
  color: "#555",
  whiteSpace: "nowrap",
  borderBottom: "2px solid #e8e8e8",
};

const tdStyle = {
  padding: "7px 10px",
};
