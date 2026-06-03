import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { currency } from "@/lib/mock-data";
import { api, type Product, type ProductBatch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/sales")({ component: SalesPage });

interface LineItem {
  id: string;
  productId: string;
  batchId: string;
  qty: number;
  unitPrice: number;
}

const lineSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

function SalesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery<Product[], Error>({ queryKey: ["products"], queryFn: () => api.listProducts() });

  const [items, setItems] = useState<LineItem[]>([]);
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState(1);
  const product = products.find((p: any) => String(p.id) === productId);
  const { data: allBatches = [], isLoading: batchesLoading } = useQuery<ProductBatch[], Error>({
    queryKey: ["batches", productId],
    queryFn: () => api.listBatches({ product: productId }),
    enabled: Boolean(productId),
  });
  const batches = productId
    ? allBatches.filter((batch) => String(batch.product) === productId)
    : [];
  const grandTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.round(grandTotal * 0.05);

  const addItem = () => {
    const parsed = lineSchema.safeParse({
      productId,
      batchId,
      qty,
      unitPrice: Number((product as any)?.price ?? 0),
    });
    if (!parsed.success) {
      toast.error("Select a product, batch and a valid quantity");
      return;
    }
    setItems((prev) => [...prev, { id: crypto.randomUUID(), ...parsed.data }]);
    setProductId("");
    setBatchId("");
    setQty(1);
  };

  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));

  const save = useMutation({
    mutationFn: async () => {
      if (items.length === 0) throw new Error("Add at least one item.");
      return api.createSale({
        date: new Date().toISOString().slice(0, 10),
        items: items.map((i) => ({
          productId: i.productId,
          batchId: i.batchId,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        payment_method: "cash",
        tax_amount: tax,
        discount_amount: 0,
      });
    },
    onSuccess: () => {
      toast.success("Sale recorded");
      setItems([]);
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => {
      toast.error(e?.message || "Failed to save sale");
    },
  });

  return (
    <>
      <PageHeader
        title="Sales entry"
        description="Record a new sale fast. Keyboard-friendly and optimized for the cashier."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Card className="rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-3 md:items-end">
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select
                  value={productId}
                  onValueChange={(value) => {
                    setProductId(value);
                    setBatchId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bakery item…" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsLoading && (
                      <SelectItem value="__loading__" disabled>
                        Loading…
                      </SelectItem>
                    )}
                    {products
                      ?.filter((p) => p?.id)
                      .map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}{" "}
                          <span className="text-muted-foreground">· {currency(p.price)}</span>
                        </SelectItem>
                      ))}
                    {productsError && (
                      <SelectItem value="__error__" disabled>
                        Failed to load
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchesLoading && (
                      <SelectItem value="__loading__" disabled>
                        Loading…
                      </SelectItem>
                    )}
                    {batches?.length === 0 && productId && !batchesLoading && (
                      <SelectItem value="__no_batches__" disabled>
                        No batches available
                      </SelectItem>
                    )}
                    {batches?.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batch_number} · {batch.current_quantity} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit price</Label>
                <Input value={product ? currency(product.price) : "—"} disabled />
              </div>
              <Button onClick={addItem} className="h-10">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </Card>

          <Card className="rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-sm text-muted-foreground"
                    >
                      No items yet. Add products above to start a sale.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((i) => {
                  const p = products.find((pp: any) => String(pp.id) === i.productId);
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{p?.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {allBatches.find((b) => String(b.id) === i.batchId)?.batch_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{i.qty}</TableCell>
                      <TableCell className="text-right">{currency(i.unitPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {currency(i.qty * i.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>

        <Card className="rounded-xl p-5 h-fit lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-4 w-4" />
            <h3 className="font-semibold">Sale summary</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd>{items.reduce((s, i) => s + i.qty, 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{currency(grandTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax (5%)</dt>
              <dd>{currency(tax)}</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-semibold">
            <span>Grand total</span>
            <span>{currency(grandTotal + tax)}</span>
          </div>
          <Button
            className="w-full mt-5 h-11"
            onClick={() => save.mutate()}
            disabled={save.isPending || items.length === 0}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save sale"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Ctrl + Enter to save quickly
          </p>
        </Card>
      </div>
    </>
  );
}
