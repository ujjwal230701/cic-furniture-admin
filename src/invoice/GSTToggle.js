export default function GSTToggle({ gstInclusive, setGstInclusive, gstType }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Inclusive/Exclusive toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: gstInclusive ? "#ebf8ff" : "#f0fff4", border: `1px solid ${gstInclusive ? "#90cdf4" : "#9ae6b4"}`, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>PRICES ARE:</span>
        {["exclusive", "inclusive"].map(type => (
          <button key={type} onClick={() => setGstInclusive(type === "inclusive")}
            style={{ padding: "6px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", border: "1px solid", borderColor: (gstInclusive ? "inclusive" : "exclusive") === type ? "#1a1a1a" : "#ddd", background: (gstInclusive ? "inclusive" : "exclusive") === type ? "#1a1a1a" : "#fff", color: (gstInclusive ? "inclusive" : "exclusive") === type ? "#fff" : "#444" }}>
            {type === "exclusive" ? "EXCLUSIVE OF GST" : "INCLUSIVE OF GST"}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#888" }}>
          {gstInclusive ? "Prices include GST — system back-calculates base" : "GST added on top of entered prices"}
        </span>
      </div>

      {/* Inter/Intra indicator */}
      <div style={{ padding: "8px 14px", background: gstType === "intra" ? "#f0fff4" : "#ebf8ff", fontSize: 12, fontWeight: 700, color: gstType === "intra" ? "#38a169" : "#2b6cb0" }}>
        {gstType === "intra" ? "INTRA-STATE → CGST + SGST will apply" : "INTER-STATE → IGST will apply"}
      </div>
    </div>
  );
}
