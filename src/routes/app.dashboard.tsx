/**
 * Professional Dashboard — BakeryHUB
 * KPI cards, trend charts, doughnut, sales vs wastage, inventory alerts.
 * Fully wired to the backend with date-range and period filtering.
 * file: src/routes/app.dashboard.tsx
 */
 
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ShoppingBag,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  Download,
  ShoppingCart,
  Boxes,
  PackageX,
  ReceiptText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
 
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { currency } from "@/lib/mock-data";
import { apiClient } from "@/lib/api-backend";
 
export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });
 
// ── Types ──────────────────────────────────────────────────────────────────
 
type Period = "today" | "yesterday" | "last7" | "last30" | "this_month" | "last_month" | "custom";
 
interface DashboardFilters {
  period: Period;
  start_date?: string;
  end_date?: string;
}
 
// ── API call ────────────────────────────────────────────────────────────────
 
async function fetchDashboard(filters: DashboardFilters) {
  const params = new URLSearchParams();
  if (filters.period === "custom" && filters.start_date && filters.end_date) {
    params.set("start_date", filters.start_date);
    params.set("end_date", filters.end_date);
  } else {
    params.set("period", filters.period);
  }
  const res = await apiClient.get(`/reports/dashboard/?${params.toString()}`);
  return res.data?.data ?? res.data;
}
 
// ── Period helpers ──────────────────────────────────────────────────────────
 
const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};
 
const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
 
const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};
 
// ── Reusable growth badge ────────────────────────────────────────────────────
 
function GrowthBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0%</span>;
  const up = pct > 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? "text-chart-4" : "text-destructive"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}% vs prior period
    </span>
  );
}
 
// ── Loading skeleton ─────────────────────────────────────────────────────────
 
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
 
// ── Main component ───────────────────────────────────────────────────────────
 
function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
 
  return user.role === "salesperson" ? <SalespersonDashboard /> : <ExecutiveDashboard />;
}
 
// ── Executive dashboard ──────────────────────────────────────────────────────
 
function ExecutiveDashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<DashboardFilters>({ period: "today" });
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
 
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", filters],
    queryFn: () => fetchDashboard(filters),
    staleTime: 30_000,
  });
 
  function selectPeriod(p: Period) {
    if (p === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    setFilters({ period: p });
  }
 
  function applyCustom() {
    if (!customStart || !customEnd) return;
    setFilters({ period: "custom", start_date: customStart, end_date: customEnd });
    setShowCustom(false);
  }
 
  // ── Derived values ──────────────────────────────────────────────────────
 
  const stats = data?.today_stats ?? {};
  const comparison = data?.period_comparison ?? {};
  const topProducts = (data?.top_products ?? []).map((p: any) => ({
    id: p.product__id,
    name: p.product__name ?? "Unknown",
    qty: p.total_qty ?? 0,
    revenue: parseFloat(p.total_revenue ?? 0),
  }));
  const lowStockAlerts: any[] = data?.low_stock_alerts ?? [];
  const wastageBreakdown: any[] = data?.wastage_breakdown ?? [];
  const trend: any[] = data?.trend ?? [];
  const salesVsWastage: any[] = data?.sales_vs_wastage ?? [];
 
  const totalRevenue = stats?.sales?.total_revenue ?? 0;
  const transactionCount = stats?.sales?.transaction_count ?? 0;
  const averageSale = stats?.sales?.average_sale ?? 0;
  const itemsSold = stats?.items?.total_sold ?? 0;
  const wastageLoss = stats?.wastage?.total_loss ?? 0;
  const wastageItems = stats?.wastage?.total_items ?? 0;
  const wastageRate = stats?.wastage?.wastage_rate ?? 0;
  const lowStockCount = stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = stats?.stock?.out_of_stock_count ?? 0;
  const growthPct = comparison?.change_percent ?? 0;
  const bestProduct = topProducts[0]?.name ?? "—";
  const bestProductQty = topProducts[0]?.qty ?? 0;
 
  // Doughnut — top products by qty
  const doughnutData = topProducts.slice(0, 6);
  const totalQty = doughnutData.reduce((s: number, p: any) => s + p.qty, 0);
 
  // Out-of-stock vs low-stock split
  const outOfStockItems = lowStockAlerts.filter((p) => p.stock === 0);
  const lowStockItems = lowStockAlerts.filter((p) => p.stock > 0);
 
  // Download CSV helper
  function downloadCsv() {
    const rows = topProducts.map((p: any) => [p.name, p.qty, p.revenue.toFixed(2)]);
    const csv = ["Product,Qty Sold,Revenue", ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${filters.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
 
  // Trend chart x-axis label
  const isSingleDay = filters.period === "today" || filters.period === "yesterday";
  const trendXKey = isSingleDay ? "hour" : "date";
 
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live view of sales, wastage, and inventory health."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period pills */}
            {(["today", "yesterday", "last7", "last30", "this_month", "last_month"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => selectPeriod(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filters.period === p && !showCustom
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button
              onClick={() => selectPeriod("custom")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                filters.period === "custom"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              Custom
            </button>
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
          </div>
        }
      />
 
      {/* Custom date picker */}
      {showCustom && (
        <Card className="p-4 mb-4 flex flex-wrap items-end gap-4 bg-slate-50 border-slate-200">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-600">From</Label>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-600">To</Label>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 w-40" />
          </div>
          <Button size="sm" onClick={applyCustom} disabled={!customStart || !customEnd}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
            Cancel
          </Button>
        </Card>
      )}
 
      {isLoading && <DashboardSkeleton />}
 
      {isError && (
        <Card className="p-6 text-center text-destructive text-sm font-semibold">
          Failed to load dashboard data. Please refresh.
        </Card>
      )}
 
      {!isLoading && !isError && (
        <>
          {/* ── KPI Row ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Sales */}
            <Card className="p-4 rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Sales</p>
              <p className="text-2xl font-bold tracking-tight">{currency(totalRevenue)}</p>
              <GrowthBadge pct={growthPct} />
            </Card>
 
            {/* Items Sold */}
            <Card className="p-4 rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Items Sold</p>
              <p className="text-2xl font-bold tracking-tight">{itemsSold.toLocaleString()}</p>
              <span className="text-xs text-muted-foreground">{PERIOD_LABELS[filters.period]}</span>
            </Card>
 
            {/* Transactions */}
            <Card className="p-4 rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Transactions</p>
              <p className="text-2xl font-bold tracking-tight">{transactionCount.toLocaleString()}</p>
              <span className="text-xs text-muted-foreground">Avg {currency(averageSale)} / sale</span>
            </Card>
 
            {/* Sales Growth */}
            <Card className={`p-4 rounded-xl ${growthPct >= 0 ? "bg-chart-4/5" : "bg-destructive/5"}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sales Growth</p>
              <p className={`text-2xl font-bold tracking-tight ${growthPct >= 0 ? "text-chart-4" : "text-destructive"}`}>
                {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground">vs prior period</span>
            </Card>
 
            {/* Best Selling Item */}
            <Card className="p-4 rounded-xl bg-amber-50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Best Seller</p>
              <p className="text-sm font-bold text-slate-800 truncate">{bestProduct}</p>
              <span className="text-xs text-amber-700 font-semibold">{bestProductQty} units sold</span>
            </Card>
 
            {/* Wastage Qty */}
            <Card className="p-4 rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Wastage</p>
              <p className="text-2xl font-bold tracking-tight text-destructive">{wastageItems.toLocaleString()} units</p>
              <span className="text-xs text-muted-foreground">{currency(wastageLoss)} loss</span>
            </Card>
 
            {/* Wastage Rate */}
            <Card className={`p-4 rounded-xl ${wastageRate > 10 ? "bg-destructive/5" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Wastage Rate</p>
              <p className={`text-2xl font-bold tracking-tight ${wastageRate > 10 ? "text-destructive" : "text-slate-800"}`}>
                {wastageRate.toFixed(1)}%
              </p>
              <span className="text-xs text-muted-foreground">of items sold</span>
            </Card>
 
            {/* Average Sale */}
            <Card className="p-4 rounded-xl">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Avg Sale Value</p>
              <p className="text-2xl font-bold tracking-tight">{currency(averageSale)}</p>
              <span className="text-xs text-muted-foreground">per transaction</span>
            </Card>
 
            {/* Low Stock */}
            <Card className={`p-4 rounded-xl ${lowStockCount > 0 ? "bg-amber-50" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Low Stock</p>
              <p className={`text-2xl font-bold tracking-tight ${lowStockCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {lowStockCount}
              </p>
              <span className="text-xs text-muted-foreground">products below minimum</span>
            </Card>
 
            {/* Out of Stock */}
            <Card className={`p-4 rounded-xl ${outOfStockCount > 0 ? "bg-destructive/5" : ""}`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Out of Stock</p>
              <p className={`text-2xl font-bold tracking-tight ${outOfStockCount > 0 ? "text-destructive" : "text-slate-800"}`}>
                {outOfStockCount}
              </p>
              <span className="text-xs text-muted-foreground">products empty</span>
            </Card>
          </div>
 
          {/* ── Row 1: Sales Trend + Doughnut ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <ChartCard
              title={isSingleDay ? "Today's Sales by Hour" : "Sales Trend"}
              description={
                isSingleDay ? "Hourly revenue breakdown" : `${PERIOD_LABELS[filters.period]} — daily revenue`
              }
              className="lg:col-span-2"
            >
              {trend.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No sales data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey={trendXKey} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [currency(v), "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#grad1)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
 
            <ChartCard title="Sales by Item" description="Share of quantity sold">
              {doughnutData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No sales data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={doughnutData}
                      dataKey="qty"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {doughnutData.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any, _: any, entry: any) => [
                        `${v} units (${totalQty > 0 ? ((v / totalQty) * 100).toFixed(1) : 0}%)`,
                        entry.payload.name,
                      ]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
 
          {/* ── Row 2: Sales vs Wastage + Top Products ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Sales vs Wastage" description="Quantity comparison per day">
              {salesVsWastage.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={salesVsWastage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="sold" name="Sold" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="wasted" name="Wasted" fill="var(--destructive)" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
 
            <ChartCard title="Top Selling Products" description="By quantity sold">
              {topProducts.length === 0 ? (
                <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">No sales data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topProducts.slice(0, 6)} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={120} stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} units`, "Qty"]} />
                    <Bar dataKey="qty" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
 
          {/* ── Row 3: Inventory Alerts ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Out of Stock */}
            <Card className="rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800">Out of Stock</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Products with zero inventory</p>
                </div>
                {outOfStockCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive border-0 font-bold">
                    {outOfStockCount} items
                  </Badge>
                )}
              </div>
              {outOfStockItems.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-muted-foreground">All products are in stock. ✓</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="text-left px-5 py-2 text-xs font-bold text-slate-500 uppercase">Product</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">SKU</th>
                        <th className="text-left px-3 py-2 text-xs font-bold text-slate-500 uppercase">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outOfStockItems.slice(0, 8).map((p: any) => (
                        <tr key={p.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-2.5 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{p.sku || "—"}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="secondary" className="text-xs font-bold">
                              {p.category__name || "—"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
 
            {/* Low Stock */}
            <Card className="rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800">Low Stock</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Below minimum threshold</p>
                </div>
                {lowStockCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-0 font-bold">
                    {lowStockCount} items
                  </Badge>
                )}
              </div>
              {lowStockItems.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-muted-foreground">All stock levels are healthy. ✓</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="text-left px-5 py-2 text-xs font-bold text-slate-500 uppercase">Product</th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 uppercase">Current</th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 uppercase">Minimum</th>
                        <th className="text-right px-3 py-2 text-xs font-bold text-slate-500 uppercase">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.slice(0, 8).map((p: any) => (
                        <tr key={p.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-5 py-2.5 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-amber-700">{p.stock}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{p.min_stock}</td>
                          <td className="px-3 py-2.5 text-right text-destructive font-bold">
                            -{p.min_stock - p.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
 
// ── Salesperson dashboard (simpler view, no date picker) ─────────────────────
 
function SalespersonDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", { period: "today" }],
    queryFn: () => fetchDashboard({ period: "today" }),
    staleTime: 30_000,
  });
 
  const stats = data?.today_stats ?? {};
  const topProducts = (data?.top_products ?? []).map((p: any) => ({
    id: p.product__id,
    name: p.product__name ?? "Unknown",
    qty: p.total_qty ?? 0,
    revenue: parseFloat(p.total_revenue ?? 0),
  }));
  const lowStockCount = stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = stats?.stock?.out_of_stock_count ?? 0;
 
  return (
    <>
      <PageHeader title="Today's Overview" description="Your shift at a glance." />
 
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sales today" value={currency(stats?.sales?.total_revenue ?? 0)} icon={TrendingUp} />
        <StatCard label="Transactions" value={stats?.sales?.transaction_count ?? 0} icon={ShoppingCart} accent="amber" />
        <StatCard label="Items sold" value={stats?.items?.total_sold ?? 0} icon={ShoppingBag} accent="sage" />
        <StatCard label="Stock alerts" value={lowStockCount + outOfStockCount} icon={AlertTriangle} accent="destructive" />
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Top products today" description="Units sold" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProducts.slice(0, 7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
 
        <Card className="rounded-xl p-5">
          <h3 className="font-semibold mb-4">Quick actions</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { href: "/app/sales", icon: ShoppingCart, label: "New sale" },
              { href: "/app/wastage", icon: Trash2, label: "Record wastage" },
              { href: "/app/stock", icon: Boxes, label: "Update stock" },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={href}
                href={href}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}