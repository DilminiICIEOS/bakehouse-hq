/**
 * Product and Batch Inventory Management CRUD Center
 * DESIGN: Native fail-safe input tracking to eliminate component execution blocks.
 * file: src/routes/app.products.tsx
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Layers, Package, Loader2, Calendar, AlertCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// Connect directly to your underlying network adapter layer functions
import { 
  listProducts, 
  listBatches, 
  createProduct, 
  createBatch, 
  type Product, 
  type ProductBatch 
} from "@/lib/api-backend";

export const Route = createFileRoute("/app/products")({
  component: ProductsManagementPage,
});

function ProductsManagementPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "batches">("products");
  
  // Local screen visibility text errors to completely bypass silent failures
  const [validationError, setValidationError] = useState<string | null>(null);

  // --- LIVE DATA STORAGE PIPELINES ---
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<ProductBatch[], Error>({
    queryKey: ["batches-all"],
    queryFn: () => listBatches(),
  });

  // --- FORM MEMORY STATES: NEW BASE PRODUCT ---
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [shelfLife, setShelfLife] = useState("3");

  // --- FORM MEMORY STATES: NEW BAKING RUN BATCH ---
  const [selectedProdId, setSelectedProdId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [qtyProduced, setQtyProduced] = useState("");
  const [prodDate, setProdDate] = useState(new Date().toISOString().slice(0, 10));

  // --- BACKEND WRITERS: DATA TRANSACTIONS ---
  const addProductMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      if (!prodName.trim() || !prodPrice) {
        throw new Error("Form incomplete: Please fill out the item name and selling price.");
      }
      
      return createProduct({
        name: prodName,
        price: Number(prodPrice),
        category: 1, // Fallback database category key assignment
        shelf_life_days: Number(shelfLife),
        stock: 0,
        min_stock: 10,
        is_active: true,
      });
    },
    onSuccess: () => {
      toast.success("New master item configuration cataloged!");
      setProdName("");
      setProdPrice("");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      setValidationError(err.message);
      toast.error(err.message);
    },
  });

  const addBatchMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      
      // Explicit manual check validation rules
      if (!selectedProdId || selectedProdId === "") {
        throw new Error("Please select a target bakery product from the dropdown list menu first.");
      }
      if (!batchNumber.trim()) {
        throw new Error("Missing Batch Number! Please assign a tracking code identifier.");
      }
      if (!qtyProduced || Number(qtyProduced) <= 0) {
        throw new Error("Invalid quantity: Baking yield total volume parameters must be greater than 0.");
      }

      const payload = {
        product: Number(selectedProdId),
        batch_number: batchNumber.trim(),
        production_date: prodDate,
        quantity_produced: Number(qtyProduced),
        current_quantity: Number(qtyProduced),
        is_active: true,
      };

      console.log("DIRECT INJECTION: Dispatching API network request with payload:", payload);
      return createBatch(payload);
    },
    onSuccess: () => {
      toast.success("Baking run batch logged and inventory records updated!");
      setBatchNumber("");
      setQtyProduced("");
      setValidationError(null);
      // Synchronize data grids instantly across views
      qc.invalidateQueries({ queryKey: ["batches-all"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      console.error("Batch submission pipeline failed:", err);
      setValidationError(err.message);
      toast.error(err.message);
    },
  });

  return (
    <>
      <PageHeader 
        title="Inventory management center" 
        description="Configure baseline bakery inventory items and track live production run batch numbers." 
      />

      {/* Primary Configuration Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-px">
        <Button
          variant={activeTab === "products" ? "default" : "ghost"}
          onClick={() => { setActiveTab("products"); setValidationError(null); }}
          className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 font-bold"
        >
          <Package className="h-4 w-4 mr-2" /> Master Products Catalog
        </Button>
        <Button
          variant={activeTab === "batches" ? "default" : "ghost"}
          onClick={() => { setActiveTab("batches"); setValidationError(null); }}
          className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 font-bold"
        >
          <Layers className="h-4 w-4 mr-2" /> Daily Baking Batches
        </Button>
      </div>

      {/* LOCAL ERROR FEEDBACK ALERT DESK BLOCK (Guarantees visible feedback if things break) */}
      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center text-sm font-semibold shadow-sm animate-pulse">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 text-red-500" />
          <span>{validationError}</span>
        </div>
      )}

      {activeTab === "products" ? (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          {/* Master Item Configuration Panel Form card block */}
          <Card className="p-5 border-slate-100 shadow-sm bg-white h-fit">
            <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-amber-600" /> Add New Product Profile
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Product Name</Label>
                <Input 
                  placeholder="e.g., Chocolate Roll, White Sandwich Bread" 
                  value={prodName} 
                  onChange={(e) => setProdName(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Retail Unit Selling Price (LKR)</Label>
                <Input 
                  type="number" 
                  placeholder="650.00" 
                  value={prodPrice} 
                  onChange={(e) => setProdPrice(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Shelf Life Span Rule (Days)</Label>
                <Input 
                  type="number" 
                  value={shelfLife} 
                  onChange={(e) => setShelfLife(e.target.value)} 
                />
              </div>
              <Button 
                type="button"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold mt-2"
                onClick={() => { setValidationError(null); addProductMutation.mutate(); }}
                disabled={addProductMutation.isPending}
              >
                {addProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Product Variant Definition"}
              </Button>
            </div>
          </Card>

          {/* Database Items Matrix Display Grid View Layout */}
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Product Blueprint Name</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Retail Value Price</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Live Consolidated Stock</TableHead>
                  <TableHead className="font-bold text-slate-700">State Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">Fetching active database registries...</TableCell></TableRow>
                )}
                {!productsLoading && products.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">No product rows populated inside PostgreSQL database lines yet.</TableCell></TableRow>
                )}
                {products.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/40">
                    <TableCell className="font-bold text-slate-800">{p.name}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-600">Rs. {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-amber-700">{p.stock} units</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">Live Core App</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          {/* Baking Run Data Registration Input Board Form Card */}
          <Card className="p-5 border-slate-100 shadow-sm bg-white h-fit">
            <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center">
              <Plus className="h-4 w-4 mr-1 text-amber-600" /> Log Daily Production Run
            </h3>
            <div className="space-y-4">
              
              {/* 🌟 UNBREAKABLE NATIVE SELECT DROPDOWN ELEMENT CONTAINER */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Target Product Line</Label>
                <select 
                  className="w-full h-10 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  value={selectedProdId}
                  onChange={(e) => {
                    console.log("NATIVE DROPDOWN SELECT CHOICE TOGGLED:", e.target.value);
                    setSelectedProdId(e.target.value);
                    setValidationError(null);
                  }}
                >
                  <option value="">-- Choose a Product Variant --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Batch Control String Reference Number</Label>
                <Input 
                  placeholder="e.g., BATCH-2026-001" 
                  value={batchNumber} 
                  onChange={(e) => { setBatchNumber(e.target.value); setValidationError(null); }} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Baking Output Quantity Yield Volume</Label>
                <Input 
                  type="number" 
                  placeholder="50" 
                  value={qtyProduced} 
                  onChange={(e) => { setQtyProduced(e.target.value); setValidationError(null); }} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Kitchen Manufacturing Date</Label>
                <Input 
                  type="date" 
                  value={prodDate} 
                  onChange={(e) => setProdDate(e.target.value)} 
                />
              </div>

              {/* 🌟 DIRECT LINK ACTION TRIGGER EXECUTION TRIGGER BUTTON */}
              <Button 
                type="button"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold mt-2 shadow-sm transition-colors"
                onClick={() => {
                  console.log("PUBLISH ACTIVE BATCH BUTTON PRIMARY TAP INTERCEPTED.");
                  setValidationError(null);
                  addBatchMutation.mutate();
                }}
                disabled={addBatchMutation.isPending}
              >
                {addBatchMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Saving data records...</span>
                  </div>
                ) : (
                  "Publish Active Batch"
                )}
              </Button>
            </div>
          </Card>

          {/* Active Production Batches Monitoring Matrix Data Sheet Table Grid */}
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Batch Identifier Code</TableHead>
                  <TableHead className="font-bold text-slate-700">Associated Bakery Product</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Available In-Stock Balance Quantity</TableHead>
                  <TableHead className="font-bold text-slate-700 flex items-center"><Calendar className="h-3 w-3 mr-1 text-slate-400" /> Shelf Life Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchesLoading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">Extracting batch timeline data...</TableCell></TableRow>
                )}
                {!batchesLoading && batches.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">No live manufacturing baking batches logged in PostgreSQL database lines yet.</TableCell></TableRow>
                )}
                {batches.map((b: any) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/40">
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                        {b.batch_number}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">{b.product_name || `Product Assignment Reference ID #${b.product}`}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700">{b.current_quantity} / {b.quantity_produced} units</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 w-fit">
                        {b.expiry_date || "Automated at compile save"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </>
  );
}