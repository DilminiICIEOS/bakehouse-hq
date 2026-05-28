/**
 * Updated API Service Layer
 * 
 * Replace src/lib/api.ts with this implementation
 * that connects to the Django backend
 */

import axios from "axios";
import type { Sale, Wastage, Product } from "./mock-data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface ApiError {
  success: boolean;
  error: {
    message: string;
    code: string;
  };
}

// ============================================================
// SALES API
// ============================================================

export const listSales = async (
  filters?: {
    start_date?: string;
    end_date?: string;
    cashier?: string;
  }
): Promise<Sale[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append("date__gte", filters.start_date);
  if (filters?.end_date) params.append("date__lte", filters.end_date);
  if (filters?.cashier) params.append("cashier", filters.cashier);

  const response = await apiClient.get("/sales/", { params });
  return response.data.results || response.data.data || [];
};

export const createSale = async (data: {
  date: string;
  items: { productId: string; qty: number; unitPrice: number }[];
  payment_method?: string;
  tax_amount?: number;
  discount_amount?: number;
}): Promise<Sale> => {
  // Transform frontend format to backend format
  const payload = {
    date: data.date,
    items: data.items.map((item) => ({
      product: item.productId, // Convert to product ID
      quantity: item.qty,
      unit_price: item.unitPrice,
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

export const listWastage = async (
  filters?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<Wastage[]> => {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append("date__gte", filters.start_date);
  if (filters?.end_date) params.append("date__lte", filters.end_date);

  const response = await apiClient.get("/wastage/", { params });
  return response.data.results || response.data.data || [];
};

export const createWastage = async (data: {
  date: string;
  productId: string;
  qty: number;
  reason: string;
  loss: number;
  notes?: string;
}): Promise<Wastage> => {
  const payload = {
    date: data.date,
    product: data.productId,
    quantity: data.qty,
    reason: data.reason.toLowerCase(),
    unit_cost: data.loss / data.qty, // Calculate unit cost
    notes: data.notes,
  };

  const response = await apiClient.post("/wastage/", payload);
  return response.data.data;
};

// ============================================================
// PRODUCTS API
// ============================================================

export const listProducts = async (
  filters?: {
    category?: string;
  }
): Promise<Product[]> => {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);

  const response = await apiClient.get("/products/", { params });
  return response.data.results || response.data.data || [];
};

export const updateStock = async (
  id: string,
  newStock: number
): Promise<Product> => {
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

export const getSalesReport = async (
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await apiClient.get("/reports/sales/", { params });
  return response.data.data;
};

export const getWastageReport = async (
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await apiClient.get("/reports/wastage/", { params });
  return response.data.data;
};

export default {
  listSales,
  createSale,
  listWastage,
  createWastage,
  listProducts,
  updateStock,
  getDashboardData,
  getSalesReport,
  getWastageReport,
};
