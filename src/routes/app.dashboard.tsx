/**
 * Fully Synchronized Executive & Salesperson KPI Performance Analytics Center
 * DESIGN: Integrates fail-safe object fallback extractions to handle dynamic response envelopes.
 * file: src/routes/app.dashboard.tsx
 */

import { createFileRoute, useRouter } from "@tanstack/react-router";
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
  AlertTriangle,
  Star,
  Plus,
  Download,
  ShoppingCart,
  Boxes,
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { currency } from "@/lib/mock-data";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import api from "@/lib/api-backend";

export const Route = createFileRoute("/app/dashboard")({ component: DashboardPage });

type DashboardProductSalesItem = {
  id: string | number;
  name: string;
  qty: number;
  revenue: number;
};

type DashboardLowStockItem = {
  id: string | number;
  name: string;
  stock: number;
  minStock: number;
  category?: string | null;
};

const PIE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#eab308",
  "#10b981",
];

function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "salesperson" ? <SalespersonDashboard /> : <ExecutiveDashboard />;
}

function ExecutiveDashboard() {
  const router = useRouter();

  // FIX TS2769 + TS2339: wrap queryFn in an arrow function so TanStack Query's
  // context object is never forwarded to api.getDashboardData, and type the
  // result as `any` so response?.data is always resolvable.
  const { data: response, isLoading } = useQuery<any>({
    queryKey: ["dashboard-executive"],
    queryFn: () => api.getDashboardData({ date: new Date().toISOString().split("T")[0], period: "today" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-slate-400 font-bold">
        <div className="text-center space-y-2">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-slate-700" />
          <p className="text-xs uppercase tracking-widest font-bold">Compiling business ledger analytics...</p>
        </div>
      </div>
    );
  }

  // Safety interlock extracts enveloped properties or falls back directly to the object root
  const data = response?.data ?? response;

  // Extract KPI metrics from today_stats with optional chaining fallbacks
  const totalSalesToday = data?.today_stats?.sales?.total_revenue ?? 0;
  const totalItemsToday = data?.today_stats?.sales?.transaction_count ?? 0;
  const wastageCost = data?.today_stats?.wastage?.total_loss ?? 0;
  const lowStockCount = data?.today_stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = data?.today_stats?.stock?.out_of_stock_count ?? 0;

  // Map list data from API response with safe variable extractions
  const lowStock: DashboardLowStockItem[] =
    data?.low_stock_alerts?.map((item: any) => ({
      id: item?.id ?? "",
      name: item?.name ?? "",
      stock: Number(item?.stock ?? 0),
      minStock: Number(item?.min_stock ?? 0),
      category: item?.category_name ?? item?.category__name ?? "General",
    })) ?? [];

  const productSales: DashboardProductSalesItem[] =
    data?.top_products?.map((p: any) => ({
      id: p?.product_id ?? p?.product__id ?? "",
      name: p?.product_name ?? p?.product__name ?? "Unknown Item",
      qty: Number(p?.total_qty ?? p?.qty ?? 0),
      revenue: Number(p?.total_revenue ?? p?.revenue ?? 0),
    })) ?? [];

  const best = productSales?.[0];

  // Map wastage breakdown arrays smoothly
  const wastageTrend =
    data?.wastage_breakdown?.map((w: any) => ({
      reason: w?.reason ?? "Other",
      count: Number(w?.count ?? 0),
      loss: Number(w?.total_loss ?? w?.loss ?? 0),
    })) ?? [];

  return (
    <>
      <PageHeader
        title="Executive operation dashboard"
        description="Real-time view of master outlet performance parameters, live inventory volumes and cost shrinkages."
        actions={
          <>
            <Tabs defaultValue="today">
              <TabsList className="rounded-lg">
                <TabsTrigger value="today" className="font-bold">Today</TabsTrigger>
                <TabsTrigger value="week" className="font-bold">Week</TabsTrigger>
                <TabsTrigger value="month" className="font-bold">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              className="font-bold border-slate-200"
              onClick={() => {
                try {
                  const rows = productSales.map((p) => [p.name, p.qty, p.revenue]);
                  const header = ["product", "qty", "revenue"];
                  const csv = [header.join(",")].concat(rows.map((r) => r.join(","))).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `dashboard-top-products.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  toast.success("CSV file exported successfully.");
                } catch (e) {
                  console.error("Export failed:", e);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Sales today" value={currency(totalSalesToday)} delta="+12.4% vs yesterday" trend="up" icon={ShoppingBag} />
        <StatCard label="Items sold headcount" value={totalItemsToday} delta="+8.1%" trend="up" icon={ShoppingBag} accent="amber" />
        <StatCard label="Wastage leakage cost" value={currency(wastageCost)} delta="-4.2% vs avg" trend="down" icon={Trash2} accent="destructive" />
        <StatCard label="Net store revenue" value={currency(totalSalesToday - wastageCost)} delta="+11.6%" trend="up" icon={TrendingUp} accent="sage" />
        <StatCard label="Low stock alerts" value={lowStockCount + outOfStockCount} delta={`${lowStockCount + outOfStockCount} items need restock`} trend="down" icon={AlertTriangle} accent="destructive" />
        <StatCard label="Top item variant" value={best?.name ?? "—"} delta={`${best?.qty ?? 0} units checkouts`} icon={Star} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Daily sales cash flow velocity timeline" description="Gross transaction volumes tracking timeline" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.period_comparison?.current_period?.dates ?? []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#g1)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category mixing share" description="Share distribution percentage of total revenue streams">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data?.period_comparison?.current_period?.categories ?? []}
                dataKey="total"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
              >
                {(data?.period_comparison?.current_period?.categories ?? []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: "bold" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Sales distribution by hourly window" description="Shift performance timeline logs">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.period_comparison?.current_period?.hourly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sales" name="Invoices Filed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Wastage loss tracking by cause" description="Comparative shrinkage categories cost line">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={wastageTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="reason" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
              <Line type="monotone" dataKey="loss" name="Loss Value" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top performing product profiles" description="Ranked by total quantity sold metrics">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productSales.slice(0, 5)} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" name="Units Dispatched" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="rounded-xl p-5 lg:col-span-2 bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Top selling bakery items catalog profiles</h3>
            <Button variant="ghost" size="sm" className="font-bold text-slate-500 hover:text-slate-800" onClick={() => router.navigate({ to: "/app/sales" })}>
              Open POS Desk
            </Button>
          </div>
          <div className="space-y-2">
            {productSales.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0 text-xs font-bold transition">
                <div>
                  <div className="text-slate-800 font-extrabold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {p.qty} units cataloged · Gross: {currency(p.revenue)}
                  </div>
                </div>
                <div className="text-slate-900 font-black">{currency(p.revenue)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-xl p-5 bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Active inventory safety flags</h3>
            <Badge variant="secondary" className="bg-red-50 text-red-700 border border-red-100 font-black">
              {lowStockCount + outOfStockCount} Alerts
            </Badge>
          </div>
          <div className="space-y-2">
            {lowStock.length === 0 && (
              <p className="text-center py-12 text-slate-400 font-semibold text-xs">All inventory configurations mapping cleanly above threshold parameters.</p>
            )}
            {lowStock.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0 text-xs font-bold">
                <div>
                  <div className="text-slate-800 font-extrabold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    Safety Constant Minimum: {p.minStock} units · Link: {p.category || "Bakery Core"}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-extrabold text-[10px] border",
                    p.stock === 0
                      ? "bg-red-50 text-red-700 border-red-100 animate-pulse"
                      : "bg-amber-50 text-amber-700 border-amber-100"
                  )}
                >
                  {p.stock === 0 ? "Out" : `${p.stock} left`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// The salesperson dashboard focuses explicitly on shift transaction counts
// while the factory manager coordinates dispatch truck logistics separately
function SalespersonDashboard() {
  // FIX TS2769 + TS2339: same pattern — wrap queryFn and type result as `any`
  const { data: response, isLoading } = useQuery<any>({
    queryKey: ["dashboard-salesperson"],
    queryFn: () => api.getDashboardData({ date: new Date().toISOString().split("T")[0], period: "today" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-slate-400 font-bold">
        <div className="text-center space-y-2">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-slate-700" />
          <p className="text-xs uppercase tracking-widest font-bold">Loading shift workspace view...</p>
        </div>
      </div>
    );
  }

  const data = response?.data ?? response;
  const totalSalesToday = data?.today_stats?.sales?.total_revenue ?? 0;
  const totalItemsToday = data?.today_stats?.sales?.transaction_count ?? 0;
  const lowStockCount = data?.today_stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = data?.today_stats?.stock?.out_of_stock_count ?? 0;

  const productSales: DashboardProductSalesItem[] =
    data?.top_products?.map((p: any) => ({
      id: p?.product_id ?? p?.product__id ?? "",
      name: p?.product_name ?? p?.product__name ?? "Bakery Profile",
      qty: p?.total_qty ?? p?.qty ?? 0,
      revenue: p?.total_revenue ?? p?.revenue ?? 0,
    })) ?? [];

  return (
    <>
      <PageHeader
        title="Good morning, today's floor workspace"
        description="Real-time check tracking your specific active shift checkout performance parameters."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sales today" value={currency(totalSalesToday)} delta="+9% vs shift avg" trend="up" icon={TrendingUp} />
        <StatCard label="Transactions filed" value={totalItemsToday} icon={ShoppingCart} accent="amber" />
        <StatCard label="Items sold volume" value={totalItemsToday} icon={ShoppingBag} accent="sage" />
        <StatCard label="Pending restock flags" value={lowStockCount + outOfStockCount} delta={`${lowStockCount + outOfStockCount} categories low`} icon={Boxes} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Top products today" description="Units sold" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productSales.slice(0, 7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" fill="#f59e0b" name="Units Checkout" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="rounded-xl p-5 bg-white border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Cashier workspace shortcuts</h3>
          <div className="grid grid-cols-1 gap-2 text-xs font-bold">
            <a href="/app/sales" className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-slate-700">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-slate-400" /> Launch New POS Invoice
              </span>
              <Plus className="h-4 w-4 text-slate-400" />
            </a>
            <a href="/app/wastage" className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-slate-700">
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-slate-400" /> Record Fresh Material Loss
              </span>
              <Plus className="h-4 w-4 text-slate-400" />
            </a>
            <a href="/app/stock" className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-slate-700">
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-slate-400" /> Run Physical Stock Counting
              </span>
              <Plus className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl p-5 mt-4 bg-white border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Top product checkouts overview</h3>
        <div className="space-y-2">
          {productSales.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 border-b last:border-0 text-xs font-bold">
              <div>
                <div className="text-slate-800 font-extrabold">{p.name}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  {p.qty} units cleared · Revenue total: {currency(p.revenue)}
                </div>
              </div>
              <div className="text-slate-900 font-black">{currency(p.revenue)}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "#0f172a",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#ffffff",
  border: "0",
};