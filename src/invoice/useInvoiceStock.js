import { supabase } from "../supabaseClient";

async function updateProductStock(productId, qtyChange) {
  const { data } = await supabase.from("products").select("stock, sold").eq("id", productId).single();
  if (!data) return;
  await supabase.from("products").update({
    stock: Math.max(0, data.stock + qtyChange),
    sold: Math.max(0, (data.sold || 0) - qtyChange),
  }).eq("id", productId);
}

async function logMovements(items, type, invoiceId) {
  const rows = items
    .filter(item => item.product_id)
    .map(item => ({
      product_id: item.product_id,
      movement_type: type,
      quantity: item.quantity,
      reference: invoiceId ? String(invoiceId) : "manual",
      notes: null,
      cost_price_at_time: null,
      date: new Date().toISOString().split("T")[0],
    }));
  if (rows.length > 0) {
    await supabase.from("stock_movements").insert(rows);
  }
}

export async function deductStock(items, invoiceId) {
  for (const item of items) {
    if (!item.product_id) continue;
    await updateProductStock(item.product_id, -item.quantity);
  }
  await logMovements(items, "out", invoiceId);
}

export async function restoreStock(items, invoiceId) {
  for (const item of items) {
    if (!item.product_id) continue;
    await updateProductStock(item.product_id, +item.quantity);
  }
  await logMovements(items, "in", invoiceId);
}

export async function adjustStock(oldItems, newItems, invoiceId) {
  await restoreStock(oldItems, invoiceId);
  await deductStock(newItems, invoiceId);
}
