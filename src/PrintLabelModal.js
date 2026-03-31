import { useState } from "react";
import { S } from "./styles";

const fmt = (p) => `₹${Number(p).toLocaleString("en-IN")}`;

export default function PrintLabelModal({ product, onClose }) {
  const [copies, setCopies] = useState(1);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [skip, setSkip] = useState(0);

  const totalCopies = useCustom
    ? Math.max(1, Math.min(100, parseInt(customInput) || 1))
    : copies;

  const printDebug = () => {
    // Fills all 24 cells with borders — overlay on physical sheet to verify alignment
    const debugLabel = (i) =>
      `<div class="label debug-label"><span style="font-size:2mm;color:#999">#${i + 1}</span></div>`;
    const cells = Array.from({ length: 24 }, (_, i) => debugLabel(i)).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      @page { size: 210mm 297mm; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { width: 210mm; font-family: sans-serif; }
      .label-grid {
        width: 210mm; height: 297mm;
        padding-top: 10.7mm; padding-left: 4.7mm;
        display: grid;
        grid-template-columns: repeat(3, 64mm);
        grid-template-rows: repeat(8, 34mm);
        column-gap: 2.5mm; row-gap: 0;
        border: 1px solid red;
      }
      .debug-label {
        width: 64mm; height: 34mm;
        border: 1px solid blue;
        display: flex; align-items: center; justify-content: center;
      }
    </style></head><body>
    <div class="label-grid">${cells}</div>
    <script>window.onload=function(){setTimeout(function(){window.print();},150);}</script>
    </body></html>`;
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) { alert("Pop-up blocked."); return; }
    win.document.write(html);
    win.document.close();
  };

  const printLabels = () => {
    const labelHtml = `<div class="label"><div class="label-name">${escapeHtml(product.name)}</div><div class="label-sku">${escapeHtml(product.sku || "\u2014")}</div><div class="label-price">${fmt(product.price)}</div></div>`;

    const emptyLabel = `<div class="label"></div>`;

    const allLabels = 
      Array(skip).fill(emptyLabel).join("") + 
      Array(totalCopies).fill(labelHtml).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Label — ${escapeHtml(product.name)}</title>
  <style>
    @page {
      size: 210mm 297mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 210mm;
      height: 297mm;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .label-grid {
      width: 210mm;
      height: 297mm;
      padding-top: 10.7mm;
      padding-left: 4.65mm;
      display: grid;
      grid-template-columns: repeat(3, 63.5mm);
      grid-template-rows: repeat(8, 33.86mm);
      column-gap: 2.54mm;
      row-gap: 0mm;
    }

    .label {
      width: 63.5mm;
      height: 33.86mm;
      padding: 3mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5mm;
    }

    .label-name {
      font-size: 2.8mm;
      font-weight: 700;
      line-height: 1.3;
      color: #000;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .label {
      padding-left: 7mm !important;
    }
    .label-sku {
      font-size: 2.5mm;
      font-family: 'Courier New', monospace;
      color: #333;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label-price {
      font-size: 6.5mm;
      font-weight: 800;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="label-grid">${allLabels}</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 150);
    };
  </script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 400, padding: 32 }}>

        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>
          PRINT LABEL
        </div>

        {/* Live label preview */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 8 }}>
            PREVIEW
          </div>
          <div style={{
            display: "inline-flex",
            flexDirection: "column",
            gap: 5,
            border: "1.5px solid #1a1a1a",
            padding: "8px 12px",
            minWidth: 180,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #e8e8e8", paddingBottom: 5, lineHeight: 1.35 }}>
              {product.name}
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.5px", color: "#555", fontFamily: "monospace" }}>
              {product.sku || "—"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>
              {fmt(product.price)}
            </div>
          </div>
        </div>

        {/* Copy count */}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>NUMBER OF COPIES</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => { setCopies(n); setUseCustom(false); }}
                style={{
                  ...(!useCustom && copies === n ? S.btnPrimary : S.btnOutline),
                  padding: "8px 0",
                  width: 48,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => { setUseCustom(true); setTimeout(() => document.getElementById("custom-copies-input")?.focus(), 50); }}
              style={{
                ...(useCustom ? S.btnPrimary : S.btnOutline),
                padding: "8px 14px",
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              CUSTOM
            </button>
          </div>

          {useCustom && (
            <input
              id="custom-copies-input"
              type="number"
              min="1"
              max="100"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="Enter quantity (max 100)"
              style={{ ...S.input, marginTop: 10 }}
            />
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>SKIP LABELS (0–23)</label>
          <input
            type="number"
            min="0"
            max="23"
            value={skip}
            onChange={e => setSkip(Number(e.target.value))}
            style={{ ...S.input, marginTop: 8 }}
            placeholder="e.g., 10"
          />
        </div>

        <div style={{ fontSize: 12, color: "#888", marginBottom: 24 }}>
          {totalCopies} label{totalCopies !== 1 ? "s" : ""} will be laid out on one page.
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <button onClick={printLabels} style={{ ...S.btnPrimary, flex: 1 }}>
            PRINT {totalCopies} LABEL{totalCopies !== 1 ? "S" : ""}
          </button>
          <button onClick={onClose} style={{ ...S.btnOutline, flex: 1 }}>
            CANCEL
          </button>
        </div>
        <button onClick={printDebug} style={{ ...S.btnOutline, width: "100%", fontSize: 10, color: "#888", borderColor: "#ddd" }}>
          PRINT ALIGNMENT TEST (debug)
        </button>

      </div>
    </div>
  );
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
