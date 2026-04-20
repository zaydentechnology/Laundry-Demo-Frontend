// src/features/admin/api/admin.service.ts
import api from "@/api/axios";

export const UserRole = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface UserResponse {
  id: number;
  full_name: string;
  email?: string;
  mobile: string;
  role: UserRole;
  is_active: boolean;
  flat_number?: string;
  building_name?: string;
}

export interface OfferResponse {
  id: number;
  name: string;
  min_order_amount: number;
  discount_type: "FIXED" | "PERCENTAGE";
  discount_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface AdminDashboardStats {
  total_customers: number;
  new_orders: number;
  picked_up_orders: number;
  delivered_orders: number;
  total_revenue: number;
  active_offers: number;
  total_expenses: number;
  net_profit: number;
}

// --- NEW/UPDATED SERVICE INTERFACES ---
export interface ServiceCategory {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface ItemServicePrice {
  id?: number;
  service_category_id: number;
  price: number;
  category?: ServiceCategory;
}

export interface LaundryItem {
  id: number;
  name: string;
  base_price: number;
  is_active: boolean;
  services?: ItemServicePrice[]; // <-- NEW: Array of matrix prices
}

export interface CreateItemPayload {
  name: string;
  base_price: number;
  services: { service_category_id: number; price: number }[]; // <-- NEW: Nested payload
}

export interface ExpenseCategory {
  id: number; 
  name: string;
  is_active: boolean;
}

export interface Expense {
  id: number; 
  amount: number;
  expense_date: string;
  remarks?: string;
  category: ExpenseCategory;
}

export const adminService = {
  // Reports
  getDashboardStats: async (days?: number): Promise<AdminDashboardStats> => {
    const url = days
      ? `/reports/admin/dashboard?days=${days}`
      : "/reports/admin/dashboard";
    return (await api.get(url)).data;
  },

  // User Management
  getUsers: async (): Promise<UserResponse[]> =>
    (await api.get("/users/")).data,

  updateUser: async (
    id: number,
    data: { role?: string; is_active?: boolean },
  ) => (await api.patch(`/users/${id}`, data)).data,

  // Offer Management
  getOffers: async (): Promise<OfferResponse[]> =>
    (await api.get("/offers/")).data,

  createOffer: async (data: Omit<OfferResponse, "id">) =>
    (await api.post("/offers/", data)).data,

  // --- SERVICE & ITEMS MANAGEMENT ---
  /** Fetch overarching categories like "Dry Clean", "Ironing" */
  getServiceCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get("/services/categories"); // Ensure this matches your backend route
    return response.data;
  },

  createServiceCategory: async (data: { name: string }): Promise<ServiceCategory> => {
    const response = await api.post("/services/categories", data);
    return response.data;
  },
  deleteServiceCategory: async (id: number): Promise<void> => {
    await api.delete(`/services/categories/${id}`);
  },
  /** Fetch all laundry service items with nested pricing */
  getItems: async (): Promise<LaundryItem[]> => {
    const response = await api.get("/items/");
    return response.data;
  },

  createItem: async (data: CreateItemPayload): Promise<LaundryItem> => {
    const response = await api.post("/items/", data);
    return response.data;
  },

  updateItem: async (
    id: number,
    data: Partial<CreateItemPayload>,
  ): Promise<LaundryItem> => {
    const response = await api.patch(`/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: number): Promise<void> => {
    await api.delete(`/items/${id}`);
  },

  // Orders
  getAllOrders: async (): Promise<any[]> => (await api.get("/orders/all")).data, 

  adminUpdateOrder: async (id: number, data: any) =>
    (await api.patch(`/orders/${id}/admin`, data)).data,

  // Analytics & Buildings
  getAnalytics: async () => (await api.get("/reports/admin/analytics")).data,
  
  getBuildings: async () => (await api.get("/buildings")).data,
  createBuilding: async (data: any) =>
    (await api.post("/buildings", data)).data,
  updateBuilding: async (id: number, data: any) =>
    await api.put(`/buildings/${id}`, data),

  // Expenses
  getExpenseCategories: async (): Promise<ExpenseCategory[]> =>
    (await api.get("/expenses/categories")).data,

  createExpenseCategory: async (data: { name: string }) =>
    (await api.post("/expenses/categories", data)).data,

  getExpenses: async (): Promise<Expense[]> =>
    (await api.get("/expenses/")).data,

  createExpense: async (data: any) => (await api.post("/expenses/", data)).data,

  updateExpense: async (id: number, data: any) =>
    (await api.put(`/expenses/${id}`, data)).data,

  // System Configurations
  getSystemConfig: async () => (await api.get("/config/")).data,
  updateSystemConfig: async (data: any) =>
    (await api.put("/config/", data)).data,
};
// import api from "@/api/axios";

// export const UserRole = {
//   ADMIN: "ADMIN",
//   CUSTOMER: "CUSTOMER",
//   EMPLOYEE: "EMPLOYEE",
// } as const;

// export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// export interface UserResponse {
//   id: number;
//   full_name: string;
//   email?: string;
//   mobile: string;
//   role: UserRole;
//   is_active: boolean;
//   flat_number?: string;
//   building_name?: string;
// }

// export interface OfferResponse {
//   id: number;
//   name: string;
//   min_order_amount: number;
//   discount_amount: number;
//   start_date: string;
//   end_date: string;
//   is_active: boolean;
// }

// export interface AdminDashboardStats {
//   total_customers: number;
//   new_orders: number;
//   picked_up_orders: number;
//   delivered_orders: number;
//   total_revenue: number;
//   active_offers: number;
//   total_expenses: number;
//   net_profit: number;
// }

// export interface LaundryItem {
//   id: number;
//   name: string;
//   base_price: number;
//   is_active: boolean; // Useful if you want to "hide" items instead of deleting
// }

// export interface CreateItemPayload {
//   name: string;
//   base_price: number;
// }

// export interface ExpenseCategory {
//   id: number; // <-- FIXED
//   name: string;
//   is_active: boolean;
// }

// export interface Expense {
//   id: number; // <-- FIXED
//   amount: number;
//   expense_date: string;
//   remarks?: string;
//   category: ExpenseCategory;
// }

// export const adminService = {
//   // Reports
//   // getDashboardStats: async (): Promise<AdminDashboardStats> =>
//   //   (await api.get('/reports/admin/dashboard')).data,
//   getDashboardStats: async (days?: number): Promise<AdminDashboardStats> => {
//     const url = days
//       ? `/reports/admin/dashboard?days=${days}`
//       : "/reports/admin/dashboard";
//     return (await api.get(url)).data;
//   },

//   // User Management
//   getUsers: async (): Promise<UserResponse[]> =>
//     (await api.get("/users/")).data,

//   updateUser: async (
//     id: number,
//     data: { role?: string; is_active?: boolean },
//   ) => (await api.patch(`/users/${id}`, data)).data,

//   // Offer Management
//   getOffers: async (): Promise<OfferResponse[]> =>
//     (await api.get("/offers/")).data,

//   createOffer: async (data: Omit<OfferResponse, "id">) =>
//     (await api.post("/offers/", data)).data,

//   /** Fetch all laundry service categories */
//   getItems: async (): Promise<LaundryItem[]> => {
//     const response = await api.get("/items/");
//     return response.data;
//   },

//   /** Create a brand new laundry service item */
//   createItem: async (data: CreateItemPayload): Promise<LaundryItem> => {
//     const response = await api.post("/items/", data);
//     return response.data;
//   },

//   /** Update an existing item's price or name */
//   updateItem: async (
//     id: number,
//     data: Partial<CreateItemPayload>,
//   ): Promise<LaundryItem> => {
//     const response = await api.patch(`/items/${id}`, data);
//     return response.data;
//   },

//   deleteItem: async (id: number): Promise<void> => {
//     await api.delete(`/items/${id}`);
//   },

//   /** Admin-only: Fetch ALL orders across the system */
//   getAllOrders: async (): Promise<any[]> => (await api.get("/orders/all")).data, // <-- FIXED: Now points to /orders/all

//   /** God-Mode: Override any order detail */
//   adminUpdateOrder: async (id: number, data: any) =>
//     (await api.patch(`/orders/${id}/admin`, data)).data,

//   /** New Analytics Endpoint */
//   getAnalytics: async () => (await api.get("/reports/admin/analytics")).data,
//   getBuildings: async () => (await api.get("/buildings")).data,
//   createBuilding: async (data: any) =>
//     (await api.post("/buildings", data)).data,
//   updateBuilding: async (id: number, data: any) =>
//     await api.put(`/buildings/${id}`, data),

//   getExpenseCategories: async (): Promise<ExpenseCategory[]> =>
//     (await api.get("/expenses/categories")).data,

//   createExpenseCategory: async (data: { name: string }) =>
//     (await api.post("/expenses/categories", data)).data,

//   getExpenses: async (): Promise<Expense[]> =>
//     (await api.get("/expenses/")).data,

//   createExpense: async (data: any) => (await api.post("/expenses/", data)).data,

//   updateExpense: async (id: number, data: any) =>
//     (await api.put(`/expenses/${id}`, data)).data,

//   // System Configurations
//   getSystemConfig: async () => (await api.get("/config/")).data,
//   updateSystemConfig: async (data: any) =>
//     (await api.put("/config/", data)).data,
// };
