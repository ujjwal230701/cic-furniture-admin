export const IS = {
  page: { maxWidth: 794, margin: "0 auto", padding: 40, background: "#fff", fontFamily: "Arial, sans-serif", fontSize: 13, color: "#1a1a1a" },
  header: { display: "flex", justifyContent: "space-between", marginBottom: 32, alignItems: "flex-start" },
  sellerName: { fontSize: 16, fontWeight: 800, marginBottom: 4 },
  sellerDetail: { fontSize: 12, color: "#444", lineHeight: 1.8 },
  invoiceTitle: { fontSize: 32, fontWeight: 800, textAlign: "right", letterSpacing: 2 },
  invoiceNumber: { fontSize: 13, textAlign: "right", color: "#555", marginTop: 4 },
  metaRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #f0f0f0" },
  metaLabel: { color: "#666" },
  billTo: { marginBottom: 24 },
  billToLabel: { fontSize: 11, color: "#888", letterSpacing: 2, marginBottom: 6 },
  billToName: { fontWeight: 700, fontSize: 15 },
  billToDetail: { fontSize: 12, color: "#555", lineHeight: 1.7 },
  table: { width: "100%", borderCollapse: "collapse", marginBottom: 24 },
  th: { background: "#1a1a1a", color: "#fff", padding: "10px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textAlign: "left" },
  thRight: { background: "#1a1a1a", color: "#fff", padding: "10px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textAlign: "right" },
  td: { padding: "10px 12px", borderBottom: "1px solid #e8e8e8", fontSize: 13, verticalAlign: "top" },
  tdRight: { padding: "10px 12px", borderBottom: "1px solid #e8e8e8", fontSize: 13, textAlign: "right", verticalAlign: "top" },
  totalsRow: { display: "flex", justifyContent: "space-between", padding: "6px 0" },
  totalsLabel: { color: "#555", fontSize: 13 },
  totalsValue: { fontWeight: 600, fontSize: 13 },
  grandTotal: { display: "flex", justifyContent: "space-between", background: "#1a1a1a", color: "#fff", padding: "10px 16px", marginTop: 8, fontSize: 15 },
  totalInWords: { fontSize: 11, color: "#666", fontStyle: "italic", marginTop: 8, textAlign: "right" },
  divider: { borderTop: "1px solid #e8e8e8", margin: "20px 0" },
  sectionTitle: { fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 8 },
  bankDetail: { fontSize: 12, color: "#444", lineHeight: 1.8 },
  terms: { fontSize: 12, color: "#555", lineHeight: 1.8 },
  printCSS: `
    @media print {
      body * { visibility: hidden; }
      #invoice-preview, #invoice-preview * { visibility: visible; }
      #invoice-preview { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
    }
  `,
};
