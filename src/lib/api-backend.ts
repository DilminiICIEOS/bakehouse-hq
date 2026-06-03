/**
 * Updated API Service Layer
 *
 * Replace src/lib/api.ts with this implementation
 * that connects to the Django backend
 */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ApiError {
  success: boolean;
  error: {
    message: string;
    code?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  category_name?: string;
  cost_price?: number;
  price: number;
  unit?: string;
  stock: number;
  min_stock: number;
  max_stock_limit?: number;
  sku?: string;
  barcode?: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

export interface ProductBatch {
  id: string;
  product: string;
  batch_number: string;
  production_date?: string;
  expiry_date?: string;
  quantity_produced: number;
  current_quantity: number;
  outlet_assignment?: string | null;
  is_active: boolean;
}

export interface SaleItemPayload {
  productId: string;
  batchId: string;
  qty: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface Sale {
  id: string;
  date: string;
  reference_number: string;
  cashier: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  items: Array<{
    id: string;
    product: string;
    product_name: string;
    batch: string | null;
    batch_number?: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    line_total: number;
  }>;
  notes?: string;
}

export interface WastagePayload {
  date: string;
  productId: string;
  batchId?: string;
  qty: number;
  reason: string;
  unitCost: number;
  notes?: string;
}

export interface Wastage {
  id: string;
  date: string;
  reference_number: string;
  product: string;
  product_name: string;
  batch?: string | null;
  batch_number?: string;
  quantity: number;
  reason: string;
  unit_cost: number;
  loss: number;
  recorded_by: string;
  notes?: string;
  is_approved: boolean;
  created_at: string;
}

// ============================================================
// SALES API
// ============================================================

export const listSales = async (filters?: {
  start_date?: string;
  end_date?: string;
  cashier?: string;
}): Promise<Sale[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append("date__gte", filters.start_date);
  if (filters?.end_date) params.append("date__lte", filters.end_date);
  if (filters?.cashier) params.append("cashier", filters.cashier);

  const response = await apiClient.get("/sales/", { params });
  return response.data.results || response.data.data || [];
};

export const createSale = async (data: {
  date: string;
  items: SaleItemPayload[];
  payment_method?: string;
  tax_amount?: number;
  discount_amount?: number;
}): Promise<Sale> => {
  const payload = {
    date: data.date,
    items: data.items.map((item) => ({
      product: item.productId,
      batch: item.batchId,
      quantity: item.qty,
      unit_price: item.unitPrice,
      discount_amount: item.discountAmount || 0,
    })),
    payment_method: data.payment_method || "cash",
    tax_amount: data.tax_amount || 0,
    discount_amount: data.discount_amount || 0,
  };

  const response = await apiClient.post("/sales/", payload);
  return response.data.data;
};

// ============================================================
// WASTAGE API
// ============================================================

export const listWastage = async (filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<Wastage[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append("date__gte", filters.start_date);
  if (filters?.end_date) params.append("date__lte", filters.end_date);

  const response = await apiClient.get("/wastage/", { params });
  return response.data.results || response.data.data || [];
};

export const createWastage = async (data: WastagePayload): Promise<Wastage> => {
  const payload = {
    date: data.date,
    product: data.productId,
    batch: data.batchId,
    quantity: data.qty,
    reason: data.reason,
    unit_cost: data.unitCost,
    notes: data.notes,
  };

  const response = await apiClient.post("/wastage/", payload);
  return response.data.data;
};

// ============================================================
// PRODUCTS API
// ============================================================

export const listProducts = async (filters?: { category?: string }): Promise<Product[]> => {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);

  const response = await apiClient.get("/products/", { params });
  return response.data.results || response.data.data || [];
};

export const listBatches = async (filters?: { product?: string }): Promise<ProductBatch[]> => {
  const params = new URLSearchParams();
  if (filters?.product) params.append("product", filters.product);

  const response = await apiClient.get("/products/batches/", { params });
  return response.data.results || response.data.data || [];
};

export const updateStock = async (id: string, newStock: number): Promise<Product> => {
  const response = await apiClient.put(`/products/${id}/update_stock/`, {
    stock: newStock,
    reason: "manual_adjustment",
  });
  return response.data.data;
};

// ============================================================
// DASHBOARD API
// ============================================================

export const getDashboardData = async () => {
  const response = await apiClient.get("/reports/dashboard/");
  return response.data.data;
};

// ============================================================
// REPORTS API
// ============================================================

export const getSalesReport = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await apiClient.get("/reports/sales/", { params });
  return response.data.data;
};

export const getSalesReportPdf = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await apiClient.get("/reports/sales/pdf/", {
    params,
    responseType: "blob",
  });

  return response.data;
};

export const getWastageReport = async (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await apiClient.get("/reports/wastage/", { params });
  return response.data.data;
};

// ============================================================
// USERS API
// ============================================================

export const listUsers = async (filters?: { role?: string; status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.role) params.append("role", filters.role);
  if (filters?.status) params.append("status", filters.status);

  const response = await apiClient.get("/users/", { params });
  return response.data.results || response.data.data || [];
};

export const createUser = async (payload: {
  name: string;
  email: string;
  role: string;
  password?: string;
}) => {
  const response = await apiClient.post("/users/", payload);
  return response.data.data;
};

export const registerCustomer = async (payload: {
  name: string;
  email: string;
  password: string;
  password_confirm: string;
  phone?: string;
}) => {
  const response = await apiClient.post("/auth/register/", payload);
  return response.data.data;
};

export const updateUser = async (id: string | number, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/users/${id}/`, payload);
  return response.data.data;
};

export const toggleUserStatus = async (id: string | number) => {
  const response = await apiClient.post(`/users/${id}/toggle_status/`);
  return response.data.data;
};

export const resetUserPassword = async (id: string | number) => {
  const response = await apiClient.post(`/users/${id}/reset_password/`);
  return response.data;
};

export const saveOutletSettings = async (settings: { outlet: string; currency: string }) => {
  // Store settings locally since backend doesn't have settings API yet
  // This persists through refresh via localStorage
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("bakery_outlet", settings.outlet);
      localStorage.setItem("bakery_currency", settings.currency);
    }
  } catch (e) {
    // ignore
  }
  return { success: true };
};

// default export will be defined after all functions are declared

// ============================================================
// ORDERS / PAYMENTS / OUTLETS / DISPATCH API
// ============================================================

export const listOrders = async (filters?: { status?: string; customer?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.customer) params.append("customer", filters.customer);
  const response = await apiClient.get("/sales/orders/", { params });
  return response.data.results || response.data.data || [];
};

export const createOrder = async (payload: unknown) => {
  const response = await apiClient.post("/sales/orders/", payload);
  return response.data.data;
};

export const getOrder = async (id: string | number) => {
  const response = await apiClient.get(`/sales/orders/${id}/`);
  return response.data.data;
};

export const listPayments = async (filters?: { order?: string }) => {
  const params = new URLSearchParams();
  if (filters?.order) params.append("order", filters.order);
  const response = await apiClient.get("/sales/payments/", { params });
  return response.data.results || response.data.data || [];
};

export const createPayment = async (payload: unknown) => {
  const response = await apiClient.post("/sales/payments/", payload);
  return response.data.data;
};

export const listOutlets = async () => {
  const response = await apiClient.get("/products/outlets/");
  return response.data.results || response.data.data || [];
};

export const listDispatchRequests = async (filters?: { status?: string }) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  const response = await apiClient.get("/products/dispatch_requests/", { params });
  return response.data.results || response.data.data || [];
};

export const createDispatchRequest = async (payload: unknown) => {
  const response = await apiClient.post("/products/dispatch_requests/", payload);
  return response.data.data;
};

export const approveDispatchRequest = async (id: string | number) => {
  const response = await apiClient.post(`/products/dispatch_requests/${id}/approve/`);
  return response.data.data;
};

export const createDispatch = async (payload: unknown) => {
  const response = await apiClient.post("/products/dispatches/", payload);
  return response.data.data;
};

// Provide a single ESM default export that aggregates all helpers for backward compatibility
export default {
  listSales,
  createSale,
  listWastage,
  createWastage,
  listProducts,
  listBatches,
  updateStock,
  getDashboardData,
  getSalesReport,
  getSalesReportPdf,
  getWastageReport,
  saveOutletSettings,
  resetUserPassword,
  registerCustomer,
  listOrders,
  createOrder,
  getOrder,
  listPayments,
  createPayment,
  listOutlets,
  listDispatchRequests,
  createDispatchRequest,
  approveDispatchRequest,
  createDispatch,
};
