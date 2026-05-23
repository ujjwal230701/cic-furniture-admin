import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { StatCard } from "./components";
import { S } from "./styles";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const fmt      = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtShort = (n) => {
  const v = Math.abs(Number(n || 0));
  if (v >= 100000) return `₹${(Number(n) / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(Number(n) / 1000).toFixed(0)}K`;
  return `₹${Number(n || 0)}`;
};

function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end   = new Date(year, month, 0).toISOString().slice(0, 10);
  return { start, end };
}

function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const year  = d.getFullYear();
    const month = d.getMonth() + 1;
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    return { year, month, label, ...monthBounds(year, month) };
  });
}

function periodDates(key, customFrom, customTo) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  if (key === "this_month")  return monthBounds(y, m);
  if (key === "last_month")  { const d = new Date(y, m - 2, 1); return monthBounds(d.getFullYear(), d.getMonth() + 1); }
  if (key === "last_3") {
    const d = new Date(y, m - 3, 1);
    return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, end: monthBounds(y, m).end };
  }
  if (key === "this_year")   return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (key === "custom" && customFrom && customTo) return { start: customFrom, end: customTo };
  return null;
}

const PERIODS = [
  { label: "This Month",    key: "this_month" },
  { label: "Last Month",    key: "last_month" },
  { label: "Last 3 Months", key: "last_3" },
  { label: "This Year",     key: "this_year" },
  { label: "Custom",        key: "custom" },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", padding: "10px 14px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmt(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function DashboardTab({ role }) {
  const isOwner = role === "owner";
  const months6 = useMemo(() => last6Months(), []);

  const [products,     setProducts]     = useState([]);
  const [salesData,    setSalesData]    = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [saleItems,    setSaleItems]    = useState([]);
  const [payables,     setPayables]     = useState([]);

  const [period,     setPeriod]     = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");

  // Fetch 12 months back to cover "This Year" + chart
  const fetchFrom = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    supabase.from("products").select("*")
      .then(({ data }) => setProducts(data || []));

    supabase.from("sales_log").select("*")
      .gte("date", fetchFrom).order("date")
      .then(({ data }) => setSalesData(data || []));

    supabase.from("expenses").select("*")
      .gte("date", fetchFrom).order("date")
      .then(({ data }) => setExpensesData(data || []));

    supabase.from("sales_log_items").select("*")
      .then(({ data }) => setSaleItems(data || []));

    supabase.from("stock_movements")
      .select("*, suppliers(name)")
      .eq("movement_type", "in")
      .eq("payment_type", "credit")
      .eq("payment_status", "pending")
      .not("purchase_ref", "is", null)
      .order("payment_due_date")
      .then(({ data }) => setPayables(data || []));
  }, [fetchFrom]);

  // ─── PERIOD FILTER ─────────────────────────────────────────────────────────
  const dates = useMemo(() => periodDates(period, customFrom, customTo), [period, customFrom, customTo]);

  const filteredSales    = useMemo(() => dates ? salesData.filter(s    => s.date >= dates.start && s.date <= dates.end) : [], [salesData,    dates]);
  const filteredExpenses = useMemo(() => dates ? expensesData.filter(e => e.date >= dates.start && e.date <= dates.end) : [], [expensesData, dates]);

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const kpiRevenue     = filteredSales.reduce((s, r) => s + Number(r.total_amount || 0) - Number(r.gst_collected || 0), 0);
  const kpiCOGS        = filteredSales.reduce((s, r) => s + Number(r.total_cost   || 0), 0);
  const kpiGrossProfit = kpiRevenue - kpiCOGS;
  const kpiExpenses    = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const kpiNetProfit   = kpiGrossProfit - kpiExpenses;
  const kpiGrossMargin = kpiRevenue > 0 ? ((kpiGrossProfit / kpiRevenue) * 100).toFixed(1) : "—";

  // ─── CHART DATA (last 6 months, always) ────────────────────────────────────
  const chartData = useMemo(() => months6.map(({ label, start, end }) => {
    const rev  = salesData.filter(s => s.date >= start && s.date <= end)
                   .reduce((s, r) => s + Number(r.total_amount || 0) - Number(r.gst_collected || 0), 0);
    const cogs = salesData.filter(s => s.date >= start && s.date <= end)
                   .reduce((s, r) => s + Number(r.total_cost || 0), 0);
    const exp  = expensesData.filter(e => e.date >= start && e.date <= end)
                   .reduce((s, e) => s + Number(e.amount || 0), 0);
    return { month: label, Revenue: rev, Expenses: exp, "Net Profit": rev - cogs - exp };
  }), [months6, salesData, expensesData]);

  // ─── TOP PRODUCTS ──────────────────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const saleIdSet = new Set(filteredSales.map(s => s.id));
    const filtered  = saleItems.filter(i => saleIdSet.has(i.sale_id));
    const groups    = {};
    for (const item of filtered) {
      const key = item.product_id ?? `_${item.product_name}`;
      if (!groups[key]) groups[key] = { name: item.product_name, revenue: 0, cost: 0, qty: 0 };
      groups[key].revenue += Number(item.total        || 0);
      groups[key].cost    += Number(item.cost_price   || 0) * Number(item.quantity || 0);
      groups[key].qty     += Number(item.quantity     || 0);
    }
    return Object.values(groups)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map(p => ({ ...p, margin: p.revenue > 0 ? (((p.revenue - p.cost) / p.revenue) * 100).toFixed(1) : "0" }));
  }, [saleItems, filteredSales]);

  // ─── PAYABLES ──────────────────────────────────────────────────────────────
  const payableGroups = useMemo(() => {
    const groups = {};
    for (const p of payables) {
      const ref = p.purchase_ref;
      if (!groups[ref]) groups[ref] = { ref, supplier: p.suppliers?.name || p.supplier_name || "—", due: p.payment_due_date, total: 0 };
      groups[ref].total += Number(p.total_cost || 0);
    }
    return Object.values(groups).sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  }, [payables]);
  const totalPayable   = payableGroups.reduce((s, p) => s + p.total, 0);
  const today          = new Date().toISOString().slice(0, 10);

  // ─── INVENTORY (existing) ──────────────────────────────────────────────────
  const lowStock      = products.filter(p => p.min_stock_threshold != null && p.stock <= p.min_stock_threshold && !p.parent_product_id);
  const totalValue    = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const costProducts  = products.filter(p => p.cost_price != null && p.cost_price > 0);
  const totalCostVal  = costProducts.reduce((s, p) => s + (p.cost_price * p.stock), 0);
  const totalSellVal  = costProducts.reduce((s, p) => s + (p.price     * p.stock), 0);
  const overallMarkup = totalCostVal > 0 ? (((totalSellVal - totalCostVal) / totalCostVal) * 100).toFixed(1) : null;

  return (
    <div>

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            style={{ padding: "7px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
              border: "1px solid #ddd",
              background: period === p.key ? "#1a1a1a" : "#fff",
              color:      period === p.key ? "#fff"    : "#888" }}>
            {p.label.toUpperCase()}
          </button>
        ))}
        {period === "custom" && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ ...S.input, width: 150 }} />
            <span style={{ color: "#888", fontSize: 12 }}>to</span>
            <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   style={{ ...S.input, width: 150 }} />
          </>
        )}
      </div>

      {/* ── P&L KPIs ────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Revenue"      value={fmt(kpiRevenue)}      color="#3b82f6" />
        <StatCard label="COGS"         value={fmt(kpiCOGS)}         color="#f59e0b" />
        <StatCard label="Gross Profit" value={fmt(kpiGrossProfit)}  color="#8b5cf6" />
        <StatCard label="Gross Margin" value={`${kpiGrossMargin}%`} color="#06b6d4" />
        <StatCard label="Expenses"     value={fmt(kpiExpenses)}     color="#e53e3e" />
        <StatCard label="Net Profit"   value={fmt(kpiNetProfit)}    color={kpiNetProfit >= 0 ? "#38a169" : "#e53e3e"} />
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 20 }}>
          LAST 6 MONTHS — REVENUE · EXPENSES · NET PROFIT
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar dataKey="Revenue"    fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={36} />
            <Bar dataKey="Expenses"   fill="#fca5a5" radius={[3, 3, 0, 0]} maxBarSize={36} />
            <Line dataKey="Net Profit" stroke="#38a169" strokeWidth={2.5} dot={{ r: 4, fill: "#38a169" }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top products + Payables ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>

        <div style={S.card}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>TOP PRODUCTS BY REVENUE</div>
          {topProducts.length === 0 ? (
            <div style={{ color: "#bbb", fontSize: 13 }}>No sales in this period.</div>
          ) : topProducts.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#ccc", fontSize: 11, minWidth: 18 }}>#{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>{p.qty} units</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>{fmt(p.revenue)}</div>
                <div style={{ fontSize: 11, color: Number(p.margin) >= 20 ? "#38a169" : "#f59e0b" }}>{p.margin}% margin</div>
              </div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888" }}>SUPPLIER PAYABLES</div>
            {totalPayable > 0 && <span style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>{fmt(totalPayable)}</span>}
          </div>
          {payableGroups.length === 0 ? (
            <div style={{ color: "#bbb", fontSize: 13 }}>No outstanding payables. ✓</div>
          ) : payableGroups.map((p, i) => {
            const overdue = p.due && p.due < today;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "9px 0", borderBottom: "1px solid #f0f0f0", fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.supplier}</div>
                  {p.due && (
                    <div style={{ fontSize: 11, color: overdue ? "#e53e3e" : "#888" }}>
                      {overdue ? "⚠️ overdue · " : "due "}
                      {p.due}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: 700, color: overdue ? "#e53e3e" : "#f59e0b" }}>{fmt(p.total)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Monthly P&L table ────────────────────────────────────────────────── */}
      <div style={{ ...S.card, marginBottom: 24, overflowX: "auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#888", marginBottom: 16 }}>MONTHLY P&L — LAST 6 MONTHS</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e8e8e8", background: "#f9f9f9" }}>
              {["MONTH", "REVENUE", "COGS", "GROSS PROFIT", "MARGIN", "EXPENSES", "NET PROFIT"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: h === "MONTH" ? "left" : "right",
                  fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#888", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...months6].reverse().map(({ label, start, end }) => {
              const rev   = salesData.filter(s => s.date >= start && s.date <= end)
                              .reduce((s, r) => s + Number(r.total_amount || 0) - Number(r.gst_collected || 0), 0);
              const cogs  = salesData.filter(s => s.date >= start && s.date <= end)
                              .reduce((s, r) => s + Number(r.total_cost || 0), 0);
              const exp   = expensesData.filter(e => e.date >= start && e.date <= end)
                              .reduce((s, e) => s + Number(e.amount || 0), 0);
              const gross = rev - cogs;
              const net   = gross - exp;
              const margin = rev > 0 ? ((gross / rev) * 100).toFixed(1) : "—";
              return (
                <tr key={label} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "11px 12px", fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right" }}>{fmt(rev)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", color: "#888" }}>{fmt(cogs)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", color: "#8b5cf6", fontWeight: 600 }}>{fmt(gross)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 12,
                    color: Number(margin) >= 20 ? "#38a169" : "#f59e0b" }}>{margin}{margin !== "—" ? "%" : ""}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", color: "#e53e3e" }}>{fmt(exp)}</td>
                  <td style={{ padding: "11px 12px", textAlign: "right", fontWeight: 700,
                    color: net >= 0 ? "#38a169" : "#e53e3e" }}>{fmt(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Low stock (existing) ─────────────────────────────────────────────── */}
      {lowStock.length > 0 && (
        <div style={{ ...S.card, border: "1px solid #feb2b2", background: "#fff5f5", marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: "#c53030", marginBottom: 12 }}>⚠️ LOW STOCK ALERTS</div>
          {lowStock.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #fed7d7", fontSize: 13 }}>
              <span>{p.name} {p.sku && <span style={{ color: "#aaa" }}>({p.sku})</span>}</span>
              <span style={{ fontWeight: 700, color: "#c53030" }}>{p.stock} left
                <span style={{ fontWeight: 400, fontSize: 11 }}> (threshold: {p.min_stock_threshold})</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Inventory overview (existing, owner only) ────────────────────────── */}
      {isOwner && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <StatCard label="Total Products"  value={products.length}    color="#2d6a9f" />
          <StatCard label="Inventory Value" value={fmt(totalValue)}    color="#38a169" />
          {overallMarkup && <StatCard label="Overall Markup"  value={`${overallMarkup}%`} color="#805ad5" />}
          {totalCostVal > 0 && <StatCard label="Cost Value"   value={fmt(totalCostVal)} color="#d97706" />}
        </div>
      )}
    </div>
  );
}
