/**
 * Keyboard-Optimized Cashier Sales Entry Terminal
 * Handles reactive batch isolation and inventory constraint validations.
 * file: src/routes/app.sales.tsx
 */

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
  productName: string; // Saved explicitly to preserve historical rows if selection switches items
  batchId: string;
  batchNumber: string; // Saved explicitly to preserve historical rows if selection switches items
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
  
  // Fetch active catalogs from the backend system database
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

  // Dynamic Batch Fetching tied strictly to selected catalog state mutations
  const { data: allBatches = [], isLoading: batchesLoading } = useQuery<ProductBatch[], Error>({
    queryKey: ["batches", productId],
    queryFn: () => api.listBatches({ product: productId }),
    enabled: Boolean(productId),
  });

  // Filter batches down strictly to active options with valid quantities
  const batches = productId
    ? allBatches.filter((batch) => String(batch.product) === productId && batch.is_active && batch.current_quantity > 0)
    : [];

  const grandTotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const tax = Math.round(grandTotal * 0.05);

  const addItem = () => {
    const currentBatch = batches.find((b) => String(b.id) === batchId);

    const parsed = lineSchema.safeParse({
      productId,
      batchId,
      qty,
      unitPrice: Number((product as any)?.price ?? 0),
    });

    if (!parsed.success || !product || !currentBatch) {
      toast.error("Select a product, batch and a valid quantity");
      return;
    }

    // Enforce strict inventory constraint limits
    if (qty > currentBatch.current_quantity) {
      toast.error(`Insufficient inventory. This batch only has ${currentBatch.current_quantity} available.`);
      return;
    }

    // Check if the item configuration combination already sits in the checkout matrix
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && item.batchId === batchId
    );

    if (existingIndex > -1) {
      const updatedItems = [...items];
      const testQty = updatedItems[existingIndex].qty + qty;

      if (testQty > currentBatch.current_quantity) {
        toast.error(`Cannot exceed stock limits. Combined cart total would be ${testQty}/${currentBatch.current_quantity}`);
        return;
      }

      updatedItems[existingIndex].qty = testQty;
      setItems(updatedItems);
      toast.success(`Updated ${product.name} quantity.`);
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          productId,
          productName: product.name,
          batchId,
          batchNumber: currentBatch.batch_number,
          qty,
          unitPrice: product.price,
        },
      ]);
      toast.success(`${product.name} added to transaction blueprints.`);
    }

    // Revert form state elements for subsequent inputs
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
      toast.success("Sale transaction finalized and recorded.");
      setItems([]);
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (e: Error) => {
      toast.error(e?.message || "Failed to save sale parameters.");
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
          <Card className="rounded-xl p-5 bg-white border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-3 md:items-end">
              
              {/* Product Select field */}
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
                        Loading inventory fields…
                      </SelectItem>
                    )}
                    {products
                      ?.filter((p) => p?.id && p.is_active)
                      .map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}{" "}
                          <span className="text-muted-foreground">· {currency(p.price)}</span>
                        </SelectItem>
                      ))}
                    {productsError && (
                      <SelectItem value="__error__" disabled>
                        Failed to retrieve metadata.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Batch Select field */}
              <div className="space-y-1.5">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={setBatchId} disabled={!productId || batchesLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {batchesLoading && (
                      <SelectItem value="__loading__" disabled>
                        Loading batches…
                      </SelectItem>
                    )}
                    {batches?.length === 0 && productId && !batchesLoading && (
                      <SelectItem value="__no_batches__" disabled>
                        No lots available
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

              {/* Quantity Counter input */}
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                />
              </div>

              {/* Unit Price Read-Only Input */}
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

          {/* Staged Checkout blueprint table block */}
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
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
                      colSpan={6}
                      className="text-center py-12 text-sm text-muted-foreground"
                    >
                      No items yet. Add products above to start a sale transaction link.
                    </TableCell>
                  </TableRow>
                )}
                {items.map((i) => (
                  <TableRow key={i.id}>
                    {/* 🌟 THE FIX: Normalized all column structures to use strict TableCell elements */}
                    <TableCell className="font-medium text-slate-800">{i.productName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs font-semibold">
                      {i.batchNumber}
                    </TableCell>
                    <TableCell className="text-right font-bold">{i.qty}</TableCell>
                    <TableCell className="text-right text-slate-500">{currency(i.unitPrice)}</TableCell>
                    <TableCell className="text-right font-black text-slate-900">
                      {currency(i.qty * i.unitPrice)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(i.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Dynamic Billing Balance Panel Layout */}
        <Card className="rounded-xl p-5 h-fit border border-slate-100 shadow-sm bg-white lg:sticky lg:top-20">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-4 w-4 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Sale summary</h3>
          </div>
          <dl className="space-y-2 text-sm font-semibold text-slate-600">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="text-slate-900">{items.reduce((s, i) => s + i.qty, 0)} units</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="text-slate-900 font-extrabold">{currency(grandTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax (5%)</dt>
              <dd className="text-slate-500 font-medium">{currency(tax)}</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-black text-slate-900 tracking-tight">
            <span>Grand total</span>
            <span className="text-amber-600">{currency(grandTotal + tax)}</span>
          </div>
          <Button
            className="w-full mt-5 h-11 text-white font-extrabold"
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