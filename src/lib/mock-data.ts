export type Role = "admin" | "manager" | "salesperson" | "factory_distributor" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "disabled";
  lastLogin: string;
  avatar?: string;
}

export const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Rajith Perera",
    email: "admin@bakery.com",
    role: "admin",
    status: "active",
    lastLogin: "2026-05-26 08:12",
  },
  {
    id: "u2",
    name: "Lakshmi de Silva",
    email: "manager@bakery.com",
    role: "manager",
    status: "active",
    lastLogin: "2026-05-26 07:48",
  },
  {
    id: "u3",
    name: "Arjun Kumar",
    email: "sales@bakery.com",
    role: "salesperson",
    status: "active",
    lastLogin: "2026-05-26 06:15",
  },
  {
    id: "u4",
    name: "Nimesh Fernando",
    email: "factory@bakery.com",
    role: "factory_distributor",
    status: "active",
    lastLogin: "2026-05-25 19:02",
  },
  {
    id: "u5",
    name: "Chitra Perera",
    email: "customer@bakery.com",
    role: "customer",
    status: "active",
    lastLogin: "2026-05-24 15:10",
  },
  {
    id: "u6",
    name: "Sanjay Mendis",
    email: "manager2@bakery.com",
    role: "manager",
    status: "disabled",
    lastLogin: "2026-05-20 09:33",
  },
];

// Password for every demo account: "demo1234"
export const DEMO_PASSWORD = "demo1234";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
}

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Fish Bun", category: "Bun", price: 45, stock: 24, minStock: 10 },
  { id: "p2", name: "Seeni Sambol Bun", category: "Bun", price: 50, stock: 38, minStock: 15 },
  { id: "p3", name: "Roast Paan", category: "Pastry", price: 55, stock: 6, minStock: 12 },
  { id: "p4", name: "Chocolate Cupcake", category: "Cake", price: 75, stock: 4, minStock: 5 },
  { id: "p5", name: "Butter Cake", category: "Cake", price: 200, stock: 18, minStock: 10 },
  { id: "p6", name: "Lamington", category: "Pastry", price: 35, stock: 22, minStock: 12 },
  { id: "p7", name: "Jaggery Cake", category: "Cake", price: 180, stock: 9, minStock: 6 },
  { id: "p8", name: "Coconut Roll", category: "Pastry", price: 40, stock: 60, minStock: 25 },
  { id: "p9", name: "Egg Roll", category: "Pastry", price: 60, stock: 14, minStock: 10 },
  { id: "p10", name: "Puttu Kudam", category: "Cake", price: 120, stock: 2, minStock: 8 },
  { id: "p11", name: "Hopper", category: "Pastry", price: 65, stock: 30, minStock: 12 },
  { id: "p12", name: "Dodol", category: "Dessert", price: 85, stock: 0, minStock: 10 },
];

export interface SaleItem {
  productId: string;
  qty: number;
  unitPrice: number;
}
export interface Sale {
  id: string;
  date: string;
  cashier: string;
  items: SaleItem[];
  total: number;
}

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const SALES: Sale[] = Array.from({ length: 28 }).map((_, i) => {
  const id = `s${i + 1}`;
  const date = daysAgo(Math.floor(i / 6));
  const pick = PRODUCTS[i % PRODUCTS.length];
  const pick2 = PRODUCTS[(i + 3) % PRODUCTS.length];
  const items: SaleItem[] = [
    { productId: pick.id, qty: 1 + (i % 4), unitPrice: pick.price },
    { productId: pick2.id, qty: 1 + (i % 3), unitPrice: pick2.price },
  ];
  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  return { id, date, cashier: i % 2 ? "Arjun Kumar" : "Amisha Fernando", items, total };
});

export type WastageReason = "Expired" | "Damaged" | "Returned" | "Overproduction";

export interface Wastage {
  id: string;
  date: string;
  productId: string;
  qty: number;
  reason: WastageReason;
  loss: number;
  notes?: string;
  recordedBy: string;
}

export const WASTAGES: Wastage[] = [
  {
    id: "w1",
    date: daysAgo(0),
    productId: "p3",
    qty: 4,
    reason: "Expired",
    loss: 220,
    recordedBy: "Arjun Kumar",
  },
  {
    id: "w2",
    date: daysAgo(0),
    productId: "p4",
    qty: 1,
    reason: "Damaged",
    loss: 75,
    recordedBy: "Amisha Fernando",
  },
  {
    id: "w3",
    date: daysAgo(1),
    productId: "p10",
    qty: 3,
    reason: "Overproduction",
    loss: 360,
    recordedBy: "Arjun Kumar",
  },
  {
    id: "w4",
    date: daysAgo(2),
    productId: "p2",
    qty: 5,
    reason: "Expired",
    loss: 250,
    recordedBy: "Amisha Fernando",
  },
  {
    id: "w5",
    date: daysAgo(3),
    productId: "p9",
    qty: 2,
    reason: "Returned",
    loss: 120,
    recordedBy: "Arjun Kumar",
  },
  {
    id: "w6",
    date: daysAgo(4),
    productId: "p6",
    qty: 3,
    reason: "Damaged",
    loss: 105,
    recordedBy: "Amisha Fernando",
  },
  {
    id: "w7",
    date: daysAgo(5),
    productId: "p3",
    qty: 6,
    reason: "Expired",
    loss: 330,
    recordedBy: "Arjun Kumar",
  },
];

export const SALES_BY_HOUR = [
  { hour: "8 AM", sales: 1200 },
  { hour: "9 AM", sales: 2400 },
  { hour: "10 AM", sales: 3600 },
  { hour: "11 AM", sales: 4200 },
  { hour: "12 PM", sales: 5800 },
  { hour: "1 PM", sales: 5200 },
  { hour: "2 PM", sales: 3800 },
  { hour: "3 PM", sales: 3200 },
  { hour: "4 PM", sales: 4100 },
  { hour: "5 PM", sales: 5500 },
  { hour: "6 PM", sales: 6400 },
  { hour: "7 PM", sales: 7100 },
  { hour: "8 PM", sales: 5400 },
];

export const DAILY_SALES_TREND = Array.from({ length: 14 }).map((_, i) => ({
  date: daysAgo(13 - i).slice(5),
  revenue: 18000 + Math.round(Math.sin(i / 2) * 5000 + Math.random() * 3000),
  orders: 60 + Math.round(Math.cos(i / 2) * 18 + Math.random() * 12),
}));

export const CATEGORY_BREAKDOWN = [
  { name: "Bun", value: 32 },
  { name: "Pastry", value: 41 },
  { name: "Cake", value: 18 },
  { name: "Dessert", value: 9 },
];

export const productName = (id: string) => PRODUCTS.find((p) => p.id === id)?.name ?? "Unknown";

const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> = {
  LKR: { symbol: "Rs. ", locale: "en-LK" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "en-IE" },
};

export const getSelectedCurrency = () => {
  try {
    if (typeof window !== "undefined") return localStorage.getItem("bakery_currency") || "LKR";
  } catch (e) {
    /* ignore */
  }
  return "LKR";
};

export const currency = (n: number, code?: string) => {
  const cur = code || getSelectedCurrency();
  const cfg = CURRENCY_MAP[cur] || CURRENCY_MAP.LKR;
  try {
    return `${cfg.symbol}${n.toLocaleString(cfg.locale)}`;
  } catch (e) {
    return `${cfg.symbol}${n.toLocaleString()}`;
  }
};
