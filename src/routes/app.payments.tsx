import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/payments")({
  component: () => (
    <ProtectedRoute roles={["admin", "manager", "salesperson"]}>
      <PaymentsPage />
    </ProtectedRoute>
  ),
});

function PaymentsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  type PaymentBrief = {
    id: string;
    order_number: string;
    amount: number;
    method: string;
    reference?: string;
    created_at: string;
  };
  type OrderBrief = { id: string; order_number: string; customer_name?: string };

  const { data: payments = [] } = useQuery<PaymentBrief[]>({
    queryKey: ["payments"],
    queryFn: () => api.listPayments(),
  });
  const { data: orders = [] } = useQuery<OrderBrief[]>({
    queryKey: ["orders_for_payments"],
    queryFn: () => api.listOrders({ status: "pending" }),
  });

  const [showForm, setShowForm] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(orders?.[0]?.id || null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      return api.createPayment({ order: orderId, amount, method, reference });
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["payments", "orders"] });
      setShowForm(false);
      setAmount(0);
      setReference("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to record payment");
    },
  });

  return (
    <>
      <PageHeader title="Payments" description="Record and view payments for orders." />

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Payments</Label>
              <div className="text-sm text-muted-foreground">List of recent payments</div>
            </div>
            <div>
              {(["admin", "manager", "salesperson"] as string[]).includes(user?.role || "") && (
                <Button onClick={() => setShowForm((s) => !s)}>
                  {showForm ? "Close" : "New payment"}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {showForm && (
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order</Label>
                <Select value={orderId || ""} onValueChange={(v) => setOrderId(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {orders.find((o) => o.id === orderId)?.order_number || "Select order"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.order_number} - {o.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Label className="mt-2">Amount</Label>
                <Input
                  type="number"
                  value={String(amount)}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />

                <Label className="mt-2">Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v)}>
                  <SelectTrigger>
                    <SelectValue>{method}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="mt-2">Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => create.mutate()} disabled={create.isPending}>
                    Record Payment
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
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.order_number}</TableCell>
                  <TableCell>{p.amount}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell>{p.reference}</TableCell>
                  <TableCell>{p.created_at}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No payments recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
