import { SELLER } from "./invoiceConfig";

// ── GST Type based on place of supply ─────
export function getGSTType(placeOfSupply) {
  return placeOfSupply === SELLER.state ? "intra" : "inter";
}

// ── Calculate invoice totals ───────────────
export function calcTotals(items, gstType) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalGST = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unit_price;
    return sum + (itemTotal * item.gst_rate / 100);
  }, 0);

  return {
    subtotal,
    cgst: gstType === "intra" ? totalGST / 2 : 0,
    sgst: gstType === "intra" ? totalGST / 2 : 0,
    igst: gstType === "inter" ? totalGST : 0,
    total: subtotal + totalGST,
  };
}

// ── Number to words ────────────────────────
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function numToWords(n) {
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
  return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
}

export function totalInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = "Indian Rupee " + numToWords(rupees);
  if (paise > 0) words += " and " + numToWords(paise) + " Paise";
  return words + " Only";
}

// ── Format currency ────────────────────────
export function fmt(amount) {
  return Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Generate invoice number ────────────────
export function generateInvoiceNumber(lastNumber) {
  const num = lastNumber ? parseInt(lastNumber.replace("INV-", "")) + 1 : 1;
  return `INV-${num}`;
}

// ── Format date ────────────────────────────
export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
