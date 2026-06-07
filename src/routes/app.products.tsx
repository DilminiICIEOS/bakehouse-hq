/**
 * Product and Batch Inventory Management CRUD Center
 * DESIGN: Cleaned user-friendly bakery terminology with active state morphing controls.
 * file: src/routes/app.products.tsx
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Layers, Package, Loader2, Calendar, AlertCircle, ShieldAlert, Edit3, XCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";



// Connect directly to your underlying network adapter layer functions
import { 
  listProducts, 
  listBatches, 
  createProduct, 
  createBatch, 
  updateProduct,
  updateBatch,
  getReplenishmentPlan,
  type  ReplenishmentPlan,
  type Product, 
  type ProductBatch 
} from "@/lib/api-backend";

export const Route = createFileRoute("/app/products")({
  component: ProductsManagementPage,
});

function ProductsManagementPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"products" | "batches">("products");
  const [replenishmentPlan, setReplenishmentPlan] = useState<ReplenishmentPlan[]>([]);
  
  // Local screen visibility text errors to completely bypass silent failures
  const [validationError, setValidationError] = useState<string | null>(null);

  // Tracks active row items selected for inline modification edits
  const [editingProductItem, setEditingProductItem] = useState<Product | null>(null);
  const [editingBatchItem, setEditingBatchItem] = useState<ProductBatch | null>(null);

  // RBAC Enforcement: Verifies if user account holds executive administration privileges
  const isStaffUser = user?.role === "admin" || user?.role === "manager";
  useEffect(() => {
    getReplenishmentPlan().then(setReplenishmentPlan).catch(() => console.warn("Plan unavailable"));
  }, []);

  // --- LIVE DATA STORAGE PIPELINES ---
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: () => listProducts(),
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<ProductBatch[], Error>({
    queryKey: ["batches-all"],
    queryFn: () => listBatches(),
  });

  // --- FORM STATES: NEW / EDIT BASE PRODUCT ---
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [shelfLife, setShelfLife] = useState("3");

  // --- FORM STATES: NEW / EDIT BAKING RUN BATCH ---
  const [selectedProdId, setSelectedProdId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [qtyProduced, setQtyProduced] = useState("");
  const [prodDate, setProdDate] = useState(new Date().toISOString().slice(0, 10));

  // --- BACKEND WRITERS: DATA TRANSACTIONS (SAVE & EDIT) ---
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      if (!prodName.trim() || !prodPrice) {
        throw new Error("Please enter both the product name and its retail price.");
      }
      
      const payload = {
        name: prodName.trim(),
        price: Number(prodPrice),
        category: editingProductItem ? editingProductItem.category : 1, // Retain existing or assign default fallback
        shelf_life_days: Number(shelfLife),
        stock: editingProductItem ? editingProductItem.stock : 100,
        min_stock: editingProductItem ? editingProductItem.min_stock : 10,
        is_active: true,
      };

      // DYNAMIC ROUTING: Switches endpoint destination based on context mode states
      if (editingProductItem) {
        return updateProduct(editingProductItem.id, payload);
      } else {
        return createProduct(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingProductItem ? "Product item updated successfully!" : "New product added to the catalog!");
      handleCancelProductEdit();
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      setValidationError(err.message);
      toast.error(err.message);
    },
  });

  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      setValidationError(null);
      
      if (!selectedProdId || selectedProdId === "") {
        throw new Error("Please select a product from the list first.");
      }
      if (!qtyProduced || Number(qtyProduced) <= 0) {
        throw new Error("The quantity baked must be greater than 0.");
      }

      const payload = {
        product: Number(selectedProdId),
        batch_number: batchNumber.trim(),
        production_date: prodDate,
        quantity_produced: Number(qtyProduced),
        current_quantity: editingBatchItem ? editingBatchItem.current_quantity : Number(qtyProduced),
        is_active: true,
      };

      // DYNAMIC ROUTING: Switches endpoint destination based on context mode states
      if (editingBatchItem) {
        return updateBatch(editingBatchItem.id, payload);
      } else {
        return createBatch(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingBatchItem ? "Baking batch details updated successfully!" : "New baking batch logged into inventory!");
      handleCancelBatchEdit();
      // Synchronize data grids instantly across views
      qc.invalidateQueries({ queryKey: ["batches-all"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: Error) => {
      console.error("Batch submittal failed:", err);
      setValidationError(err.message);
      toast.error(err.message);
    },
  });

  // --- FORM STATE LIFECYCLE CONTROLLERS ---
  const handleStartProductEdit = (p: Product) => {
    setEditingProductItem(p);
    setProdName(p.name);
    setProdPrice(String(p.price));
    setShelfLife(String(p.shelf_life_days ?? 3));
    setValidationError(null);
  };

  const handleCancelProductEdit = () => {
    setEditingProductItem(null);
    setProdName("");
    setProdPrice("");
    setShelfLife("3");
    setValidationError(null);
  };

  const handleStartBatchEdit = (b: ProductBatch) => {
    setEditingBatchItem(b);
    setSelectedProdId(String(b.product));
    setBatchNumber(b.batch_number);
    setQtyProduced(String(b.quantity_produced));
    if (b.production_date) setProdDate(b.production_date);
    setValidationError(null);
  };

  const handleCancelBatchEdit = () => {
    setEditingBatchItem(null);
    setSelectedProdId("");
    setBatchNumber("");
    setQtyProduced("");
    setProdDate(new Date().toISOString().slice(0, 10));
    setValidationError(null);
  };

  return (
    <>
      <PageHeader 
        title="Bakery Stock Control" 
        description="Manage your bakery products list and log daily fresh kitchen output." 
      />

      {/* Primary Configuration Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-slate-200 pb-px">
        <Button
          variant={activeTab === "products" ? "default" : "ghost"}
          onClick={() => { setActiveTab("products"); setValidationError(null); }}
          className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 font-bold"
        >
          <Package className="h-4 w-4 mr-2" /> Products List
        </Button>
        <Button
          variant={activeTab === "batches" ? "default" : "ghost"}
          onClick={() => { setActiveTab("batches"); setValidationError(null); }}
          className="rounded-t-lg rounded-b-none border-b-2 border-transparent px-4 font-bold"
        >
          <Layers className="h-4 w-4 mr-2" /> Baking Batches
        </Button>
      </div>

      {/* LOCAL ERROR FEEDBACK ALERT DESK BLOCK */}
      {validationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center text-sm font-semibold shadow-sm">
          <AlertCircle className="h-4 w-4 mr-2 shrink-0 text-red-500" />
          <span>{validationError}</span>
        </div>
      )}

      {activeTab === "products" ? (
        <div className={cn("grid gap-6", isStaffUser ? "grid-cols-1 xl:grid-cols-[380px_1fr]" : "grid-cols-1")}>
          
          {/* Form Side - Form elements only render if Admin/Manager is logged in */}
          {isStaffUser ? (
            <Card className="p-5 border-slate-100 shadow-sm bg-white h-fit">
              <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Plus className="h-4 w-4 mr-1 text-amber-600" /> 
                  {editingProductItem ? "Edit Product Details" : "Add New Product"}
                </span>
                {editingProductItem && (
                  <button onClick={handleCancelProductEdit} title="Cancel editing operation" className="text-xs text-slate-400 hover:text-slate-600 flex items-center font-bold">
                    <XCircle className="h-3 w-3 mr-0.5" /> Clear
                  </button>
                )}
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Product Name</Label>
                  <Input 
                    placeholder="e.g., Chocolate Cupcake, White Bread" 
                    value={prodName} 
                    onChange={(e) => setProdName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Selling Price (LKR)</Label>
                  <Input 
                    type="number" 
                    placeholder="450.00" 
                    value={prodPrice} 
                    onChange={(e) => setProdPrice(e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Shelf Life (Days)</Label>
                  <Input 
                    type="number" 
                    value={shelfLife} 
                    onChange={(e) => setShelfLife(e.target.value)} 
                  />
                </div>
                <Button 
                  type="button"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold mt-2"
                  onClick={() => saveProductMutation.mutate()}
                  disabled={saveProductMutation.isPending}
                >
                  {saveProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProductItem ? "Update Product" : "Save Product"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2 shadow-sm">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>View-Only Mode: You need manager permissions to edit or add new items.</span>
            </div>
          )}

          {/* Database Items Matrix Display Grid View Layout */}
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Product Name</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Selling Price</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Current Available Stock</TableHead>
                  {isStaffUser && <TableHead className="text-center font-bold text-slate-700 w-20">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading && (
                  <TableRow><TableCell colSpan={isStaffUser ? 4 : 3} className="text-center py-8 text-slate-400 font-medium">Loading items...</TableCell></TableRow>
                )}
                {!productsLoading && products.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400 font-medium">No products found in the catalog list.</TableCell></TableRow>
                )}
                {products.map((p: Product) => (
                  <TableRow key={p.id} className={cn("hover:bg-slate-50/40", editingProductItem?.id === p.id && "bg-amber-50/40 hover:bg-amber-50/50")}>
                    <TableCell className="font-bold text-slate-800">{p.name}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-600">LKR {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-amber-700">{p.stock} units</TableCell>
                    {isStaffUser && (
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title={`Edit product parameters for ${p.name}`}
                          onClick={() => handleStartProductEdit(p)}
                        >
                          <Edit3 className="h-4 w-4 text-slate-500 hover:text-slate-800" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      ) : (
        <div className={cn("grid gap-6", isStaffUser ? "grid-cols-1 xl:grid-cols-[380px_1fr]" : "grid-cols-1")}>
          
          {/* Baking run logging controls */}
          {isStaffUser ? (
            <Card className="p-5 border-slate-100 shadow-sm bg-white h-fit">
              <h3 className="font-bold text-base text-slate-800 mb-4 flex items-center justify-between">
                <span className="flex items-center">
                  <Plus className="h-4 w-4 mr-1 text-amber-600" /> 
                  {editingBatchItem ? "Edit Batch Details" : "Log Today's Baking Run"}
                </span>
                {editingBatchItem && (
                  <button onClick={handleCancelBatchEdit} title="Cancel batch editing operation" className="text-xs text-slate-400 hover:text-slate-600 flex items-center font-bold">
                    <XCircle className="h-3 w-3 mr-0.5" /> Clear
                  </button>
                )}
              </h3>
              <div className="space-y-4">
                
                {/* SELECT DROPDOWN ELEMENT CONTAINER */}
                <div className="space-y-1.5">
                  <Label htmlFor="product-select" className="text-xs font-bold text-slate-600">Select Bakery Product</Label>
                  
                  <select 
                  aria-label="Select Bakery Product"
                    className="w-full h-10 border rounded px-2 text-sm"
                    value={selectedProdId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedProdId(val);
                      setValidationError(null);
                      // This is the new logic
                      const plan = replenishmentPlan.find(p => p.product_id === Number(val));
                      if (plan) {
                        setQtyProduced(String(plan.needed_for_tomorrow));
                        toast.info(`Suggested production: ${plan.needed_for_tomorrow} units`);
                      } else {
                        setQtyProduced("");
                      }
                    }}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Batch Number (Leave blank to generate automatically)</Label>
                  <Input 
                    placeholder="e.g., cupcake-001" 
                    value={batchNumber} 
                    onChange={(e) => { setBatchNumber(e.target.value); setValidationError(null); }} 
                    disabled={!!editingBatchItem} // Lock identifier string on updates to shield tracking code configurations
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Total Amount Baked</Label>
                  <Input 
                    type="number" 
                    placeholder="50" 
                    value={qtyProduced} 
                    onChange={(e) => { setQtyProduced(e.target.value); setValidationError(null); }} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600">Baking Run Date</Label>
                  <Input 
                    type="date" 
                    value={prodDate} 
                    onChange={(e) => setProdDate(e.target.value)} 
                  />
                </div>

                <Button 
                  type="button"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold mt-2 shadow-sm"
                  onClick={() => saveBatchMutation.mutate()}
                  disabled={saveBatchMutation.isPending}
                >
                  {saveBatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editingBatchItem ? "Update Batch Details" : "Save Baking Batch"}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2 shadow-sm">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>View-Only Mode: Adding batches is restricted to supervisors and kitchen staff.</span>
            </div>
          )}

          {/* Active Production Batches Matrix Data Sheet Table Grid */}
          <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Batch Suffix Code</TableHead>
                  <TableHead className="font-bold text-slate-700">Product Name</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Available Stock Balance Quantity</TableHead>
                  <TableHead className="font-bold text-slate-700 flex items-center"><Calendar className="h-3 w-3 mr-1 text-slate-400" /> Expiration Date</TableHead>
                  {isStaffUser && <TableHead className="text-center font-bold text-slate-700 w-20">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {batchesLoading && (
                  <TableRow><TableCell colSpan={isStaffUser ? 5 : 4} className="text-center py-8 text-slate-400 font-medium">Loading batches...</TableCell></TableRow>
                )}
                {!batchesLoading && batches.length === 0 && (
                  <TableRow><TableCell colSpan={isStaffUser ? 5 : 4} className="text-center py-8 text-slate-400 font-medium">No live baking batches logged yet.</TableCell></TableRow>
                )}
                {batches.map((b: ProductBatch) => (
                  <TableRow key={b.id} className={cn("hover:bg-slate-50/40", editingBatchItem?.id === b.id && "bg-amber-50/40 hover:bg-amber-50/50")}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                        {b.batch_number}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">{b.product_name || `Product Assignment Reference ID #${b.product}`}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700">{b.current_quantity} / {b.quantity_produced} units</TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 w-fit">
                        Expires: {b.expiry_date || "3 Days"}
                      </span>
                    </TableCell>
                    {isStaffUser && (
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title={`Modify batch parameters for line code ${b.batch_number}`}
                          onClick={() => handleStartBatchEdit(b)}
                        >
                          <Edit3 className="h-4 w-4 text-slate-500 hover:text-slate-800" />
                        </Button>
                      </TableCell>
                    )}
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