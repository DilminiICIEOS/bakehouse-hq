import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Legend,
} from "recharts";
import { Plus, Trash2, AlertOctagon, TrendingDown } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { currency, type WastageReason } from "@/lib/mock-data";
import { api, type Product, type ProductBatch, type Wastage } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/wastage")({ component: WastagePage });

const REASONS: WastageReason[] = ["Expired", "Damaged", "Returned", "Overproduction"];
const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

const schema = z.object({
  productId: z.string().min(1, "Select product"),
  qty: z.coerce.number().int().positive("Qty must be > 0"),
  reason: z.enum(["Expired", "Damaged", "Returned", "Overproduction"]),
  loss: z.coerce.number().nonnegative(),
  notes: z.string().max(300).optional(),
});
type FormVals = z.infer<typeof schema>;

function WastagePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: wastages = [] } = useQuery<Wastage[]>({
    queryKey: ["wastage"],
    queryFn: () => api.listWastage(),
  });
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const { data: allBatches = [], isLoading: batchesLoading } = useQuery<ProductBatch[]>({
    queryKey: ["batches"],
    queryFn: () => api.listBatches(),
  });

  const [batchId, setBatchId] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { qty: 1, reason: "Expired", loss: 0 },
  });

  const productId = watch("productId");
  const product = products.find((p: any) => p.id === productId);
  const batches = productId ? allBatches.filter((b) => b.product === productId) : [];

  const create = useMutation({
    mutationFn: async (v: FormVals) =>
      api.createWastage({
        date: new Date().toISOString().slice(0, 10),
        productId: v.productId,
        batchId: batchId || undefined,
        qty: v.qty,
        reason: v.reason.toLowerCase(),
        unitCost: v.loss / v.qty,
        notes: v.notes,
      }),
    onSuccess: () => {
      toast.success("Wastage recorded");
      reset();
      setBatchId("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["wastage"] });
    },
  });

  const totalLoss = wastages.reduce((s, w) => s + w.loss, 0);
  const todayLoss = wastages
    .filter((w) => w.date === new Date().toISOString().slice(0, 10))
    .reduce((s, w) => s + w.loss, 0);

  const byReason = useMemo(() => {
    const map = new Map<string, number>();
    wastages.forEach((w) => map.set(w.product, (map.get(w.product) ?? 0) + w.quantity));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [wastages]);

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    wastages.forEach((w) => map.set(w.product, (map.get(w.product) ?? 0) + w.quantity));
    return Array.from(map.entries())
      .map(([id, qty]) => {
        const prod = products.find((p: any) => p.id === id);
        return { name: prod?.name ?? `Product ${id}`, qty };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [wastages]);

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    wastages.forEach((w) => map.set(w.date, (map.get(w.date) ?? 0) + w.loss));
    return Array.from(map.entries())
      .sort()
      .map(([date, loss]) => ({ date: date.slice(5), loss }));
  }, [wastages]);

  return (
    <>
      <PageHeader
        title="Wastage management"
        description="Track expired, damaged, returned and over-produced items. Understand the real cost."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record wastage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record wastage</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Product</Label>
                  <Select
                    value={productId}
                    onValueChange={(v) => {
                      setValue("productId", v);
                      setBatchId("");
                      const p = products.find((pp: any) => pp.id === v);
                      if (p) setValue("loss", p.price);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product…" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsLoading && <SelectItem value="__loading__">Loading…</SelectItem>}
                      {products
                        ?.filter((p) => p?.id)
                        .map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.productId && (
                    <p className="text-xs text-destructive">{errors.productId.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Select value={batchId} onValueChange={(v) => setBatchId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a batch…" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchesLoading && <SelectItem value="__loading__">Loading…</SelectItem>}
                      {productId && batches.length === 0 && !batchesLoading && (
                        <SelectItem value="__none__" disabled>
                          No batches available
                        </SelectItem>
                      )}
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.batch_number} · {b.current_quantity} available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" min={1} {...register("qty")} />
                    {errors.qty && <p className="text-xs text-destructive">{errors.qty.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason</Label>
                    <Select
                      value={watch("reason")}
                      onValueChange={(v) => setValue("reason", v as WastageReason)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated loss (Rs.)</Label>
                  <Input type="number" min={0} {...register("loss")} />
                  {product && (
                    <p className="text-xs text-muted-foreground">
                      Unit price · {currency(product.price)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} {...register("notes")} placeholder="Optional context…" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || create.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Wastage today"
          value={currency(todayLoss)}
          delta="vs goal Rs.400"
          trend="down"
          icon={TrendingDown}
          accent="destructive"
        />
        <StatCard
          label="Total loss (week)"
          value={currency(totalLoss)}
          icon={AlertOctagon}
          accent="amber"
        />
        <StatCard
          label="Top reason"
          value={byReason.sort((a, b) => b.value - a.value)[0]?.name ?? "—"}
          icon={AlertOctagon}
          accent="primary"
        />
        <StatCard
          label="Items wasted"
          value={wastages.reduce((s, w) => s + w.quantity, 0)}
          icon={Trash2}
          accent="sage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Wastage trend" description="Daily loss" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
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

        <ChartCard title="By reason" description="Share of loss">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={byReason}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={85}
                paddingAngle={3}
              >
                {byReason.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <ChartCard title="Most wasted products" description="By units">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byProduct} layout="vertical" margin={{ left: 12 }}>
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
                width={120}
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="rounded-xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Recent wastage entries</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Loss</TableHead>
                <TableHead>Recorded by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wastages.slice(0, 8).map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="text-muted-foreground">{w.date}</TableCell>
                  <TableCell className="font-medium">
                    {products.find((p: any) => p.id === w.product)?.name ?? "Unknown product"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-muted">
                      {w.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{w.quantity}</TableCell>
                  <TableCell className="text-right text-destructive font-medium">
                    {currency(w.loss)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{w.recorded_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
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
