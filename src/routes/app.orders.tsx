import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import type { Product } from "@/lib/api-backend";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/app/orders")({
  component: () => (
    <ProtectedRoute roles={["admin", "manager", "salesperson"]}>
      <OrdersPage />
    </ProtectedRoute>
  ),
});

function OrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  type Outlet = { id: string; name: string };
  type OrderBrief = { id: string; order_number: string; customer_name?: string; total?: number };
  const { data: orders = [] } = useQuery<OrderBrief[]>({
    queryKey: ["orders"],
    queryFn: () => api.listOrders(),
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.listProducts(),
  });
  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: () => api.listOutlets(),
  });

  const [isCreating, setIsCreating] = useState(false);

  // form state
  const [customer, setCustomer] = useState(user?.id || null);
  const [outlet, setOutlet] = useState<string | null>(outlets[0]?.id || null);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  type OrderItem = {
    productId: string | null;
    batchId: string | null;
    quantity: number;
    unit_price: number;
    discount_amount: number;
  };

  const [items, setItems] = useState<OrderItem[]>([]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, it) =>
        s +
        (Number(it.unit_price || 0) * Number(it.quantity || 0) - Number(it.discount_amount || 0)),
      0,
    );
    const tax = Number(taxAmount || 0);
    const discount = Number(discountAmount || 0);
    const total = subtotal + tax - discount;
    return { subtotal, tax, discount, total };
  }, [items, taxAmount, discountAmount]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { productId: null, batchId: null, quantity: 1, unit_price: 0, discount_amount: 0 },
    ]);
  const updateItem = (idx: number, patch: Partial<OrderItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        customer: customer,
        outlet: outlet,
        pickup_date: pickupDate,
        payment_method: paymentMethod,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        notes,
        items: items.map((it) => ({
          product: it.productId,
          batch: it.batchId,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          discount_amount: Number(it.discount_amount || 0),
        })),
      };
      return api.createOrder(payload);
    },
    onSuccess: (data) => {
      toast.success("Order created");
      qc.invalidateQueries({ queryKey: ["orders"] });
      setIsCreating(false);
      // reset form
      setItems([]);
      setPickupDate(null);
      setNotes("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to create order");
      setIsCreating(false);
    },
  });

  const productsById = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach((p: Product) => (map[p.id] = p));
    return map;
  }, [products]);

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <PageHeader title="Orders" description="Customer orders and payments." />

        <div className="grid grid-cols-1 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Orders</Label>
                <div className="text-sm text-muted-foreground">List of recent orders</div>
              </div>
              <div>
                {(["admin", "manager", "salesperson"] as string[]).includes(user?.role || "") && (
                  <Button onClick={() => setIsCreating((v) => !v)}>
                    {isCreating ? "Close" : "New order"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {isCreating && (
            <Card className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <Input
                    value={customer || ""}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Customer ID (optional)"
                  />

                  <Label className="mt-2">Outlet</Label>
                  <Select value={outlet || ""} onValueChange={(v) => setOutlet(v)}>
                    <SelectTrigger>
                      <SelectValue>
                        {outlets.find((o) => o.id === outlet)?.name || "Select outlet"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label className="mt-2">Pickup date</Label>
                  <Input
                    type="date"
                    value={pickupDate || ""}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />

                  <Label className="mt-2">Payment method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                    <SelectTrigger>
                      <SelectValue>{paymentMethod}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label className="mt-2">Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Items</h3>
                    {user?.role !== "customer" && (
                      <Button size="sm" onClick={addItem}>
                        Add item
                      </Button>
                    )}
                  </div>

                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead className="text-right">Line</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="w-1/4">
                            <Select
                              value={it.productId || ""}
                              onValueChange={(v) => {
                                updateItem(idx, { productId: v });
                                const p = productsById[v];
                                if (p) updateItem(idx, { unit_price: p.price });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue>
                                  {productsById[it.productId]?.name || "Select product"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={it.batchId || ""}
                              onValueChange={(v) => updateItem(idx, { batchId: v })}
                            >
                              <SelectTrigger>
                                <SelectValue>{it.batchId || "Auto(FIFO)"}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {/* batches will be fetched by product in a more complete UI; leave empty for FIFO */}
                                <SelectItem value="">Auto(FIFO)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItem(idx, { quantity: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={it.unit_price}
                              onChange={(e) =>
                                updateItem(idx, { unit_price: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={it.discount_amount}
                              onChange={(e) =>
                                updateItem(idx, { discount_amount: Number(e.target.value) })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {(
                              Number(it.unit_price || 0) * Number(it.quantity || 0) -
                              Number(it.discount_amount || 0)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeItem(idx)}
                                  disabled={user?.role === "customer"}
                                >
                                  Remove
                                </Button>
                              </TooltipTrigger>
                              {user?.role === "customer" && (
                                <TooltipContent>Customers cannot remove items</TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-sm text-muted-foreground py-8"
                          >
                            No items added
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <div>Subtotal</div>
                      <div>{totals.subtotal.toFixed(2)}</div>
                    </div>
                    <div className="flex justify-between">
                      <div>Tax</div>
                      <div>
                        <Input
                          type="number"
                          value={String(taxAmount)}
                          onChange={(e) => setTaxAmount(Number(e.target.value))}
                          className="w-24"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div>Discount</div>
                      <div>
                        <Input
                          type="number"
                          value={String(discountAmount)}
                          onChange={(e) => setDiscountAmount(Number(e.target.value))}
                          className="w-24"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <div>Total</div>
                      <div>{totals.total.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => {
                        setIsCreating(false);
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setIsCreating(true);
                        create.mutate();
                      }}
                      disabled={
                        create.isPending ||
                        !(["admin", "manager", "salesperson"] as string[]).includes(
                          user?.role || "",
                        )
                      }
                    >
                      Create Order
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.order_number}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>{o.status}</TableCell>
                    <TableCell className="text-right">{o.total}</TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No orders yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </>
    </TooltipProvider>
  );
}
