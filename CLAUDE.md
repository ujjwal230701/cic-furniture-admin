# CLAUDE.md — cic-furniture-admin

## 1. Project Overview

Admin dashboard for **Chandigarh Industrial Corporation (CIC)** — a furniture company. Handles product catalogue, stock management, GST-compliant invoicing, and sales quotations. Single-page React app backed by Supabase. Used internally by the owner and staff.

Business: `furniturecic@gmail.com` | `+91 9501798358` | 305, Industrial Area, Phase II, Chandigarh – 160002 | GSTIN: `04AEUPK0203R1Z9`

---

## 2. Folder Structure

```
cic-furniture-admin/
├── public/index.html
└── src/
    ├── index.js                 # React root
    ├── App.js                   # Tab routing, auth guard
    ├── AuthProvider.js          # Supabase auth context + role fetching
    ├── config.js                # Supabase URL/KEY + CATEGORIES array
    ├── supabaseClient.js        # createClient() export
    ├── styles.js                # Shared inline style objects (S.input, S.btnPrimary, etc.)
    ├── components.js            # AdminNav, LoginScreen, Toast, StatCard
    ├── DashboardTab.js          # KPIs, low-stock alerts, top products, margin overview
    ├── ProductsTab.js           # Product list, filtering, CRUD, variant expansion
    ├── ProductForm.js           # Add/edit product form — variants, images, SKU
    ├── SkuBuilder.js            # SKU generation from structured category/type/subtype codes
    ├── SkuReferenceTab.js       # Manage sku_reference lookup table
    ├── StaffManagementTab.js    # Owner-only: create staff accounts
    ├── PrintLabelModal.js       # Label printing for Oddy ST-24A4100 (24 labels/A4)
    ├── ReceiveStockModal.js     # Stock-in with supplier info + cost logging
    ├── CsvImportModal.js        # Bulk product import via CSV
    └── invoice/
        ├── invoiceConfig.js     # SELLER, BANK, TERMS, DEFAULT_GST_RATE, INDIAN_STATES
        ├── invoiceUtils.js      # GST calc, fmt(), totalInWords(), generateInvoiceNumber()
        ├── invoiceStyles.js     # Print CSS for invoices/quotations
        ├── InvoiceTab.js        # Invoice list + create/edit/delete/cancel/payment status
        ├── InvoiceForm.js       # Invoice form shell
        ├── InvoiceList.js       # Invoice list view
        ├── InvoicePreview.js    # Printable GST invoice layout
        ├── InvoiceMetaFields.js # Date, invoice number, dispatch fields
        ├── CustomerFields.js    # Customer name, address, GSTIN, phone, place of supply
        ├── GSTToggle.js         # GST inclusive/exclusive toggle
        ├── LineItemsTable.js    # Table of line items
        ├── LineItemRow.js       # Single line item: product dropdown, variant, qty, discount
        ├── InvoiceTotals.js     # Subtotal/GST/total display
        ├── useInvoiceStock.js   # deductStock / restoreStock / adjustStock hooks
        ├── QuotationTab.js      # Quotation list + create/edit/convert to invoice
        ├── QuotationForm.js     # Quotation form
        ├── QuotationList.js     # Quotation list view
        └── QuotationPreview.js  # Printable quotation layout
```

---

## 3. Key Config Values

| Key | Value | Location |
|-----|-------|----------|
| Supabase URL | `https://snjnphnxhoucvlnryqlb.supabase.co` | `src/config.js` |
| Supabase Project Ref | `snjnphnxhoucvlnryqlb` | derived from URL |
| Supabase Anon Key | hardcoded in `src/config.js` (not env vars) | `src/config.js` |
| Storage Bucket | `product-images` | used in ProductForm.js |
| Seller State (for GST) | `"Chandigarh"` (state code `"04"`) | `src/invoice/invoiceConfig.js` |
| Default GST Rate | `18` (%) | `src/invoice/invoiceConfig.js` |
| Invoice number seed | starts at INV-878 | `invoiceUtils.js:generateInvoiceNumber` |
| Quotation number seed | starts at QUO-001 | `invoiceUtils.js:generateQuotationNumber` |
| Product categories | `["Chairs & Seating", "Desks & Tables", "Storage & Shelving", "Accessories & Misc"]` | `src/config.js` |

**Note:** No `.env` files are used — Supabase credentials are hardcoded in `config.js`. The Supabase anon key is safe for client use with RLS policies in place.

---

## 4. Tech Stack & Conventions

### Stack
- **React 19** with Create React App (`react-scripts 5`)
- **Supabase JS v2** — database, auth, storage
- **No TypeScript** — plain JS throughout
- **No routing library** — tab state managed via `useState` in App.js
- **No CSS framework** — all styles are inline via `styles.js` (`S` object) or component-level inline styles
- **No state management library** — React Context for auth only; local state everywhere else

### Conventions
- **Inline styles only** — use the shared `S` object from `src/styles.js` for common elements (`S.input`, `S.btnPrimary`, `S.btnDanger`, `S.btnOutline`, `S.btnSuccess`, `S.card`, `S.label`)
- **Supabase calls directly in components** — no service layer abstraction
- **Role-based rendering** — `role` prop passed down; owner-only UI hidden via conditional rendering
- **Roles:** `"owner"` or `"staff"` stored in `user_profiles.role`
- **Variants** are child products linked via `parent_product_id`; they share the parent's name but have distinct SKU, price, and stock
- **GST logic:** intra-state (place of supply === "Chandigarh") → CGST + SGST (50/50 split); inter-state → IGST only
- **Currency format:** Indian locale via `fmt()` — `₹1,23,456.78`
- **Dates stored/displayed:** ISO in DB; displayed as `dd/mm/yyyy` via `formatDate()`

---

## 5. Common Commands

```bash
npm start        # Dev server on http://localhost:3000
npm run build    # Production build to build/
```

No test suite, no linting config, no CI/CD configuration files present.

---

## 6. Supabase Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | `id, email, name, role, created_at` — auth + RBAC |
| `products` | Main catalog; `parent_product_id` links variants to parents |
| `products_images` | Extra images: `product_id, image_url, sort_order` |
| `sku_reference` | SKU code lookup: `category_code, category_name, product_type_code, product_type_name, subtype_code, subtype_name` |
| `invoices` | GST invoices with customer, totals, payment/dispatch status |
| `invoice_items` | Line items: `invoice_id, product_id, hsn_sac, quantity, unit_price, catalogue_price, discount_pct, gst_rate, total` |
| `quotations` | Sales quotes; no stock impact until converted to invoice |
| `quotation_items` | Line items for quotations |
| `stock_movements` | Audit trail: `product_id, movement_type (in/out), quantity, reference, supplier_name, cost_price_at_time, date, notes, created_by` |

**Storage bucket:** `product-images` — path pattern: `public/{timestamp}-{random}.{ext}`

---

## 7. Known Gotchas & Bugs

- **Supabase credentials in source code** — `config.js` has the anon key hardcoded. This is intentional (anon key is safe with RLS), but the service role key must never be added here.
- **Invoice number seed** — `generateInvoiceNumber` starts at 878 if no last invoice exists. If the DB is wiped, it will restart from INV-878, not INV-001.
- **GST inclusive discount** — discount is applied to `catalogue_price`, then GST is back-calculated from the discounted price. The base price is `priceAfterDiscount / (1 + gstRate/100)`.
- **Variant stock independence** — each variant has its own stock. The parent product's stock is not the sum of variants — they are separate rows.
- **Stock deduction on invoice** — happens in `useInvoiceStock.js` after invoice save. If the save succeeds but stock deduction fails, stock won't reflect the sale. No transaction wrapping.
- **Quotation edit subtotal bug (fixed)** — previously, editing a quotation didn't update subtotals because items from quotation state were being used instead of freshly fetched items. Fixed in commit `71d18cda`.
- **Label printing** — optimized for **Oddy ST-24A4100** sheets (24 labels per A4). Other label sheet formats will not align correctly without CSS changes in `PrintLabelModal.js`.
- **No deploy config** — no `netlify.toml`, `vercel.json`, or CI config. Deployment is manual.
- **Build folder committed** — `build/` is in `.gitignore` but may have been committed earlier; check before deploying.

---

## 8. Pricing & Business Logic

### Price Fields on Products
| Field | Visible to | Purpose |
|-------|-----------|---------|
| `price` | All | Selling price shown to customers |
| `cost_price` | Owner only | Purchase cost for margin calculation |
| `floor_price` | Owner + Staff | Minimum negotiation price |

### GST Calculation Flow (`invoiceUtils.js`)
```
catalogue_price
  → apply discount_pct → priceAfterDiscount
  → if GST-inclusive: basePrice = priceAfterDiscount / (1 + gstRate/100)
  → if GST-exclusive: basePrice = priceAfterDiscount
  → gstAmt = basePrice × gstRate / 100
  → lineTotal = (basePrice + gstAmt) × quantity

subtotal = sum of (basePrice × quantity)
totalGST = sum of (gstAmt × quantity)
  → intra-state: cgst = sgst = totalGST / 2
  → inter-state: igst = totalGST
total = subtotal + totalGST
```

### Invoice vs Quotation Differences
- **Invoice** → deducts stock immediately on creation; restores on cancellation
- **Quotation** → no stock impact; converting to invoice deducts stock at that point
- Both support GST inclusive/exclusive, line-level discounts, and IGST/CGST+SGST split

### Role-Based Feature Access
| Feature | Owner | Staff |
|---------|-------|-------|
| View/search products | Yes | Yes |
| Edit/delete products | Yes | No |
| View cost price & margin | Yes | No |
| View floor price | Yes | Yes |
| Receive stock manually | Yes | No |
| Create invoices & quotations | Yes | Yes |
| Manage staff accounts | Yes | No |
| Print labels | Yes | Yes |

### SKU Format
`CAT-TYPE-SUBTYPE-###` — example: `CH-OF-ME-001`
- Codes sourced from `sku_reference` table
- Sequential number auto-increments within same subtype
- Custom SKU override is available in the form

### Bank Details (for invoice)
PNB — A/C: `3247002100150236` — IFSC: `PUNB0324700` — Industrial Area Phase-2, Chandigarh

---

## 9. Business Context & Pricing Logic

- ~30% margin target on large furniture; working formula: `cost × 1.43 = selling price`
- Almirahs are basket-openers — evaluate as conversion starters, not standalone margin drivers
- MRP anchoring does not work with walk-in customers in this market; use category-based margins
- Owner (Vinod Bansal) handles day-to-day ops and customer interactions; Ujjwal handles tech/strategy
- Shop is in Industrial Area Phase II — nearby furniture market closed, positioning CIC as the area hub

---

## 10. Inventory Status (as of April 2026)

- 17 almirah SKUs fully entered with pricing
- Mesh office chairs and bar stools: in inventory, not fully catalogued
- Photography pipeline: iPhone → remove.bg → Canva (1200×1200, #F5F5F3 bg) → Squoosh (WebP, <200KB)
- Label printer: Oddy ST-24A4100 (24 labels/A4, 64×34mm); print settings: Margins None, Scale 100%

---

## 11. SEO & Deployment

- Live at cicfurniture.in on Vercel
- Google Search Console verified, sitemap submitted
- Supabase keep-alive cron job active (prevents free tier pause)
- Known unresolved: one product's images returning broken Supabase Storage public URL
