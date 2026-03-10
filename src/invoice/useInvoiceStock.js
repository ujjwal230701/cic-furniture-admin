import { supabase } from "../supabaseClient";

async function updateProductStock(productId, qtyChange) {
  const { data } = await supabase.from("products").select("stock, sold").eq("id", productId).single();
  if (!data) return;
  await supabase.from("products").update({
    stock: Math.max(0, data.stock + qtyChange),
    sold: Math.max(0, (data.sold || 0) - qtyChange),
  }).eq("id", productId);
}

export async function deductStock(items) {
  for (const item of items) {
    if (!item.product_id) continue;
    await updateProductStock(item.product_id, -item.quantity);
  }
}

export async function restoreStock(items) {
  for (const item of items) {
    if (!item.product_id) continue;
    await updateProductStock(item.product_id, +item.quantity);
  }
}

export async function adjustStock(oldItems, newItems) {
  await restoreStock(oldItems);
  await deductStock(newItems);
}
