import api from '@/api/axios';

// --- UPGRADED INTERFACES ---
export interface ServiceCategory {
  id: number;
  name: string;
}

export interface ItemServicePrice {
  id?: number;
  service_category_id: number;
  price: number;
  category?: ServiceCategory;
  is_discount_active?: boolean;
  discount_type?: "PERCENTAGE" | "FIXED";
  discount_value?: number;
}

export interface LaundryItem {
  id: number;
  name: string;
  base_price: number;
  services?: ItemServicePrice[]; // <-- NEW: Array of matrix prices
}

export interface OrderPayload {
  pickup_date: string;    
  pickup_time: string;    
  // NEW: Added service_category_id to the payload items
  items: Array<{ item_id: number; service_category_id: number | null; estimated_quantity: number }>;
  notes?: string;         
  credits_to_use?: number;
  hanger_needed?: boolean;
}

export const ordersService = {
  // ... Keep all your existing functions exactly as they are ...
  getItems: async (): Promise<LaundryItem[]> => {
    const response = await api.get('/items/');
    return response.data;
  },
  createOrder: async (data: OrderPayload) => {
    const response = await api.post('/orders/', data);
    return response.data;
  },
  getMyStats: async () => {
    const response = await api.get('/reports/customer/my-stats');
    return response.data;
  },
  getOrderDetails: async (id: string | number | undefined) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error("Invalid Order ID provided");
    }
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  // NEW: Fetch available categories (useful for the Admin config modal)
  getServiceCategories: async (): Promise<ServiceCategory[]> => {
    const response = await api.get('/services/categories'); // Assuming you add this simple GET endpoint
    return response.data;
  },
  updateMyOrder: async (id: number, data: any) => {
    const response = await api.patch(`/orders/${id}/customer`, data);
    return response.data;
  }
};
// import api from '@/api/axios';

// export interface LaundryItem {
//   id: number;
//   name: string;
//   base_price: number;
// }

// export interface OrderPayload {
//   pickup_date: string;    // Backend: DateTime column
//   pickup_time: string;    // Backend: String column
//   items: Array<{ item_id: number; estimated_quantity: number }>;
//   notes?: string;         // Added since it's in your model
//   credits_to_use?: number;
// }
// export const ordersService = {
//   // Get all items to display in the booking form
//   getItems: async (): Promise<LaundryItem[]> => {
//     const response = await api.get('/items/');
//     return response.data;
//   },

//   // Submit the customer order (Stage 1)
//   createOrder: async (data: OrderPayload) => {
//     const response = await api.post('/orders/', data);
//     return response.data;
//   },

//   // Get stats for the customer dashboard
//   getMyStats: async () => {
//     const response = await api.get('/reports/customer/my-stats');
//     return response.data;
//   }

//  ,

// getOrderDetails: async (id: string | number | undefined) => {
//  if (!id || id === 'undefined' || id === 'null') {
//     throw new Error("Invalid Order ID provided");
//   }
  
//   const response = await api.get(`/orders/${id}`);
//   return response.data;
// },


// };