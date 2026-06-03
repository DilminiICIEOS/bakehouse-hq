import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";

export const Route = createFileRoute("/app/outlets")({
  component: () => (
    <ProtectedRoute roles={["admin", "manager"]}>
      <OutletsPage />
    </ProtectedRoute>
  ),
});

function OutletsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  type Outlet = { id: string; name: string; contact_phone?: string; is_active?: boolean };
  type DispatchRequest = {
    id: string;
    outlet_name: string;
    product_name: string;
    quantity_requested: number;
    status: string;
  };

  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["outlets"],
    queryFn: () => api.listOutlets(),
  });
  const { data: requests = [] } = useQuery<DispatchRequest[]>({
    queryKey: ["dispatch_requests"],
    queryFn: () => api.listDispatchRequests(),
  });

  const approve = useMutation({
    mutationFn: async (id: string | number) => api.approveDispatchRequest(id),
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["dispatch_requests"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to approve");
    },
  });

  return (
    <>
      <PageHeader title="Outlets & Dispatch" description="Manage outlets and dispatch requests." />

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold">Outlets</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlets.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.contact_phone}</TableCell>
                  <TableCell>{String(o.is_active)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Dispatch requests</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outlet</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.outlet_name}</TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell>{r.quantity_requested}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>
                    {r.status === "pending" &&
                      (user?.role === "admin" || user?.role === "manager") && (
                        <Button size="sm" onClick={() => approve.mutate(r.id)}>
                          Approve
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    No dispatch requests
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
