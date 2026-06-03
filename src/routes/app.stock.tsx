import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Boxes, AlertTriangle, PackageCheck, Save } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/stock")({ component: StockPage });

function statusOf(stock: number, min: number) {
  if (stock === 0)
    return { label: "Out of stock", className: "bg-destructive/10 text-destructive" };
  if (stock <= min) return { label: "Critical", className: "bg-destructive/10 text-destructive" };
  if (stock <= min * 1.5) return { label: "Low", className: "bg-accent/40 text-foreground" };
  return { label: "Healthy", className: "bg-chart-4/15 text-chart-4" };
}

function StockPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  const filtered = products.filter(
    (p) =>
      (cat === "all" || p.category === cat) && p.name.toLowerCase().includes(query.toLowerCase()),
  );

  const updateStock = useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => api.updateStock(id, stock),
    onSuccess: () => {
      toast.success("Stock updated");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Failed to update stock");
    },
  });

  const lowCount = products.filter((p) => p.stock <= p.min_stock).length;
  const healthy = products.filter((p) => p.stock > p.min_stock * 1.5).length;

  return (
    <>
      <PageHeader
        title="Stock counting"
        description="Reconcile physical counts with system inventory."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="SKUs tracked" value={products.length} icon={Boxes} />
        <StatCard label="Healthy stock" value={healthy} icon={PackageCheck} accent="sage" />
        <StatCard
          label="Low / Critical"
          value={lowCount}
          icon={AlertTriangle}
          accent="destructive"
        />
        <StatCard label="Last updated" value="Just now" icon={Save} accent="amber" />
      </div>

      <Card className="rounded-xl mt-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="pl-9"
            />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories
                ?.filter((c) => c && typeof c === "string")
                .map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "All categories" : c}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">System stock</TableHead>
              <TableHead className="text-right">Physical count</TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const c = counts[p.id];
              const diff = c == null ? null : c - p.stock;
              const s = statusOf(p.stock, p.min_stock);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell className="text-right w-28">
                    <Input
                      type="number"
                      min={0}
                      value={c ?? ""}
                      placeholder="—"
                      className="h-9 text-right"
                      onChange={(e) =>
                        setCounts((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                      }
                    />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      diff == null
                        ? "text-muted-foreground"
                        : diff < 0
                          ? "text-destructive"
                          : diff > 0
                            ? "text-chart-4"
                            : "text-muted-foreground",
                    )}
                  >
                    {diff == null ? "—" : diff > 0 ? `+${diff}` : diff}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${s.className} border-0`}>
                      {s.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={c === null || c === undefined}
                      onClick={() => {
                        if (c !== null && c !== undefined) {
                          updateStock.mutate({ id: p.id, stock: c });
                        }
                      }}
                    >
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
