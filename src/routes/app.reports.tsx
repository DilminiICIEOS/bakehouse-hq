import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Download, FileText, FileSpreadsheet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/components/protected-route";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { currency } from "@/lib/mock-data";

export const Route = createFileRoute("/app/reports")({
  component: () => (
    <ProtectedRoute roles={["admin", "manager"]}>
      <ReportsPage />
    </ProtectedRoute>
  ),
});

function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [product, setProduct] = useState("all");
  const [cat, setCat] = useState("all");

  const { data: dashboard } = useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboardData });
  const { data: salesReport } = useQuery({
    queryKey: ["reports", "sales", from, to],
    queryFn: () => api.getSalesReport(from || undefined, to || undefined),
  });
  const { data: wastageReport } = useQuery({
    queryKey: ["reports", "wastage", from, to],
    queryFn: () => api.getWastageReport(from || undefined, to || undefined),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const { data: recentSales = [] } = useQuery({
    queryKey: ["sales", "recent"],
    queryFn: () => api.listSales(),
  });

  const topProducts = (dashboard?.top_products || []).map((p: any) => ({
    id: p.product__id || p.product_id || p.id,
    name: p.product__name || p.product_name || p.name,
    sold: p.total_qty || p.total_revenue || 0,
  }));

  const wastageByProduct: Record<string, number> = {};
  (wastageReport?.by_product || []).forEach((w: any) => {
    const id = w.product__id || w.product_id || w.id;
    wastageByProduct[id] = w.total_qty || w.total_loss || 0;
  });

  const productRanking = topProducts
    .map((p: any) => ({ name: p.name, sold: p.sold, wasted: wastageByProduct[p.id] || 0 }))
    .slice(0, 8);

  const download = async (kind: string) => {
    try {
      if (kind === "CSV") {
        const rows = (salesReport?.by_date || []).map((d: any) => ({
          date: d.date,
          revenue: d.total_revenue || d.total || 0,
          orders: d.transaction_count || d.transaction_count || 0,
        }));
        const header = ["date", "revenue", "orders"];
        const csv = [header.join(",")]
          .concat(rows.map((r: any) => [r.date, r.revenue, r.orders].join(",")))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-report-${from || "all"}-${to || "all"}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("CSV download ready");
        return;
      }

      const pdfBlob = await api.getSalesReportPdf(from || undefined, to || undefined);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${from || "all"}-${to || "all"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF download ready");
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare download");
    }
  };

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        description="Cross-cut your operations with date, product and category filters."
        actions={
          <>
            <Button size="sm" onClick={() => download("Report")}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report PDF
            </Button>
          </>
        }
      />

      <Card className="rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Array.from(new Set(products.map((p: any) => p.category))).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Revenue trend" description="Last 14 days">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={(salesReport?.by_date || []).map((d: any) => ({
                date: d.date,
                revenue: d.total_revenue || d.total || 0,
                orders: d.transaction_count || d.transaction_count,
              }))}
            >
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Product ranking" description="Sold vs wasted units">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productRanking}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sold" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="wasted" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="rounded-xl p-5 mt-4">
        <h3 className="font-semibold mb-4">Sales report preview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2">Date</th>
                <th>Sale #</th>
                <th>Cashier</th>
                <th>Items</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.slice(0, 10).map((s: any) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-2 text-muted-foreground">{s.date}</td>
                  <td className="font-medium">#{String(s.id).toUpperCase()}</td>
                  <td>{s.cashier || s.recordedBy || "—"}</td>
                  <td>
                    {(s.items || [])
                      .map(
                        (i: any) =>
                          `${products.find((p: any) => p.id === i.product || i.productId)?.name || i.product || i.productId}×${i.quantity || i.qty}`,
                      )
                      .join(", ")}
                  </td>
                  <td className="text-right font-semibold">
                    {currency(s.total || s.grand_total || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
