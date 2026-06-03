import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "salesperson" ? <SalespersonDashboard /> : <ExecutiveDashboard />;
}

function ExecutiveDashboard() {
  const router = useRouter();
  const { data: response } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboardData });

  // Safely extract data from the API response wrapper
  const data = response?.data;

  // Extract KPI metrics from today_stats with optional chaining
  const totalSalesToday = data?.today_stats?.sales?.total_revenue ?? 0;
  const totalItemsToday = data?.today_stats?.sales?.transaction_count ?? 0;
  const wastageCost = data?.today_stats?.wastage?.total_loss ?? 0;
  const lowStockCount = data?.today_stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = data?.today_stats?.stock?.out_of_stock_count ?? 0;

  // Map list data from API response with proper property extraction
  const lowStock: DashboardLowStockItem[] =
    data?.low_stock_alerts?.map((item: Record<string, unknown>) => ({
      id: (item?.["id"] ?? "") as string | number,
      name: (item?.["name"] ?? "") as string,
      stock: Number((item?.["stock"] as number) ?? 0),
      minStock: Number((item?.["min_stock"] as number) ?? 0),
      category: (item?.["category__name"] ?? null) as string | null,
    })) ?? [];

  const productSales: DashboardProductSalesItem[] =
    data?.top_products?.map((p: Record<string, unknown>) => ({
      id: (p?.["product__id"] ?? "") as string | number,
      name: (p?.["product__name"] ?? "") as string,
      qty: Number((p?.["total_qty"] as number) ?? 0),
      revenue: Number((p?.["total_revenue"] as number) ?? 0),
    })) ?? [];

  const best = productSales?.[0];

  // Map wastage breakdown with proper property extraction
  const wastageTrend =
    data?.wastage_breakdown?.map((w: Record<string, unknown>) => ({
      reason: (w?.["reason"] ?? "") as string,
      count: Number((w?.["count"] as number) ?? 0),
      loss: Number((w?.["total_loss"] as number) ?? 0),
    })) ?? [];

  return (
    <>
      <PageHeader
        title="Executive dashboard"
        description="Real-time view of outlet performance, inventory and losses."
        actions={
          <>
            <Tabs defaultValue="today">
              <TabsList className="rounded-lg">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try {
                  // Build CSV from top products
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
                } catch (e) {
                  /* ignore */
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Sales today"
          value={currency(totalSalesToday)}
          delta="+12.4% vs yesterday"
          trend="up"
          icon={ShoppingBag}
        />
        <StatCard
          label="Items sold"
          value={totalItemsToday}
          delta="+8.1%"
          trend="up"
          icon={ShoppingBag}
          accent="amber"
        />
        <StatCard
          label="Wastage cost"
          value={currency(wastageCost)}
          delta="-4.2% vs avg"
          trend="up"
          icon={Trash2}
          accent="destructive"
        />
        <StatCard
          label="Net revenue"
          value={currency(totalSalesToday - wastageCost)}
          delta="+11.6%"
          trend="up"
          icon={TrendingUp}
          accent="sage"
        />
        <StatCard
          label="Low stock alerts"
          value={lowStockCount + outOfStockCount}
          delta={`${lowStockCount + outOfStockCount} need restock`}
          trend="down"
          icon={AlertTriangle}
          accent="destructive"
        />
        <StatCard
          label="Top product"
          value={best?.name ?? "—"}
          delta={`${best?.qty ?? 0} sold`}
          icon={Star}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Daily sales trend" description="Last 14 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.period_comparison?.current_period?.dates ?? []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-1)"
                fill="url(#g1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category mix" description="Share of revenue">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data?.period_comparison?.current_period?.categories ?? []}
                dataKey="total"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {(data?.period_comparison?.current_period?.categories ?? []).map(
                  (_: unknown, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ),
                )}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Sales by hour" description="Today's hourly volume">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.period_comparison?.current_period?.hourly ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="sales" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Wastage trend" description="Daily loss">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={wastageTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="reason"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="var(--destructive)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top selling products" description="By quantity sold">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={productSales.slice(0, 5)} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top selling products</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.navigate({ to: "/app/reports" })}
            >
              View all
            </Button>
          </div>
          <div className="space-y-2">
            {productSales.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.qty} units · {currency(p.revenue)}
                  </div>
                </div>
                <div className="text-sm font-semibold">{currency(p.revenue)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Stock alerts</h3>
            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">
              {lowStockCount + outOfStockCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Min {p.minStock} · {p.category}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    p.stock === 0
                      ? "bg-destructive/10 text-destructive border-0"
                      : "bg-accent/40 text-foreground border-0"
                  }
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

function SalespersonDashboard() {
  const { data: response } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboardData });

  const data = response?.data;
  const totalSalesToday = data?.today_stats?.sales?.total_revenue ?? 0;
  const totalItemsToday = data?.today_stats?.sales?.transaction_count ?? 0;
  const lowStockCount = data?.today_stats?.stock?.low_stock_count ?? 0;
  const outOfStockCount = data?.today_stats?.stock?.out_of_stock_count ?? 0;

  const productSales: DashboardProductSalesItem[] =
    data?.top_products?.map((p: any) => ({
      id: p?.product__id,
      name: p?.product__name,
      qty: p?.total_qty ?? 0,
      revenue: p?.total_revenue ?? 0,
    })) ?? [];

  return (
    <>
      <PageHeader
        title="Good morning, today's floor"
        description="A quick view of your shift performance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sales today"
          value={currency(totalSalesToday)}
          delta="+9% vs avg"
          trend="up"
          icon={TrendingUp}
        />
        <StatCard label="Transactions" value={totalItemsToday} icon={ShoppingCart} accent="amber" />
        <StatCard label="Items sold" value={totalItemsToday} icon={ShoppingBag} accent="sage" />
        <StatCard
          label="Pending counts"
          value={lowStockCount + outOfStockCount}
          delta={`${lowStockCount + outOfStockCount} categories low`}
          icon={Boxes}
          accent="destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Top products today" description="Units sold" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productSales.slice(0, 7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="rounded-xl p-5">
          <h3 className="font-semibold mb-4">Quick actions</h3>
          <div className="grid grid-cols-1 gap-2">
            <a
              href="/app/sales"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                New sale
              </span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="/app/wastage"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Record wastage
              </span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="/app/stock"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition"
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <Boxes className="h-4 w-4" />
                Update stock
              </span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl p-5 mt-4">
        <h3 className="font-semibold mb-4">Top products</h3>
        <div className="space-y-2">
          {productSales.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.qty} units · {currency(p.revenue)}
                </div>
              </div>
              <div className="text-sm font-semibold">{currency(p.revenue)}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
};
