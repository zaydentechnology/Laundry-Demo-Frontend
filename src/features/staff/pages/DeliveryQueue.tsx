// src/features/staff/pages/DeliveryQueue.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import { MapPin, Banknote, CreditCard, Clock, Calendar, Search, Phone, ChevronRight, Loader2, ChevronDown, ChevronUp, PackageOpen, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export const DeliveryQueue = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['deliveryQueue'],
    queryFn: async () => (await api.get('/operations/delivery-queue')).data,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      // 1. Search Logic
      const term = searchTerm.toLowerCase();
      const matchesSearch = term === '' || 
        o.customer?.building_name?.toLowerCase().includes(term) ||
        o.customer?.flat_number?.toLowerCase().includes(term) ||
        o.customer?.full_name?.toLowerCase().includes(term) ||
        o.customer?.mobile?.includes(term) ||
        o.id.toString().includes(term);

      // 2. Date Filter Logic (Using Expected Delivery Date)
      let matchesDate = true;
      if (dateFilter) {
        if (!o.expected_delivery_date) {
          matchesDate = false;
        } else {
          // Extract Local Timezone date explicitly
          const orderDate = new Date(o.expected_delivery_date);
          const localYear = orderDate.getFullYear();
          const localMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
          const localDay = String(orderDate.getDate()).padStart(2, '0');
          
          const localDateStr = `${localYear}-${localMonth}-${localDay}`;
          matchesDate = localDateStr === dateFilter;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, searchTerm, dateFilter]);

  const deliverMutation = useMutation({
    mutationFn: (payload: { id: number, data: any }) => api.post(`/operations/${payload.id}/deliver`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryQueue'] });
      setActiveDeliveryId(null);
      setExpandedOrderId(null);
      toast.success("Order Delivered Successfully!");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Delivery failed.")
  });

  if (isLoading) return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl mb-6" />
      {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 space-y-4 pb-24 min-h-screen bg-slate-50/50">
      <header className="space-y-4 mb-2">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Deliveries</h1>
            <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Staff Terminal</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-slate-900 leading-none">{filteredOrders.length}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
          </div>
        </div>
      </header>

      {/* ENHANCED: Mobile-Optimized Sticky Search & Filter Bar */}
      <div className="sticky top-2 z-10 space-y-3 bg-white/90 backdrop-blur-xl p-4 rounded-3xl border border-slate-100 shadow-sm mb-8">
        
        {/* Search Bar - Full Width */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search Building, Flat, or Mobile..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
          />
        </div>

        {/* Date Filter & Clear Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-primary outline-none transition-all color-scheme-light"
            />
          </div>
          
          {(searchTerm || dateFilter) && (
            <button 
              onClick={() => { setSearchTerm(''); setDateFilter(''); }}
              className="px-4 py-3.5 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shrink-0 border border-red-100"
            >
              <FilterX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="pt-8">
          <EmptyState title="All Caught Up!" message="No matching deliveries found for these filters." />
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredOrders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group">
              <div className="bg-slate-900 p-6 text-white relative">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <MapPin size={80} />
                </div>
                <div className="relative z-10 space-y-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Drop-off Point</span>
                    <span className="text-[10px] font-black text-slate-400">#{order.id}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">
                    {order.customer?.building_name || "Self Pickup"}
                  </h2>
                  <div className="inline-block bg-brand-primary text-slate-900 px-3 py-1 rounded-lg font-black text-sm mt-1">
                    FLAT / VILLA: {order.customer?.flat_number || "N/A"}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calendar size={10} /> Picked Up
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {formatSafeDate(order.pickup_date, 'dd MMM')}
                    </p>
                  </div>
                  <div className={cn("p-3 rounded-2xl border transition-colors", order.expected_delivery_date ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100")}>
                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1", order.expected_delivery_date ? "text-emerald-600" : "text-amber-600")}>
                      <Clock size={10} /> Delivery Date
                    </p>
                    <p className={cn("text-xs font-black", order.expected_delivery_date ? "text-emerald-700" : "text-amber-700")}>
                      {order.expected_delivery_date ? `${formatSafeDate(order.expected_delivery_date, 'dd MMM')} @ ${formatTimeTo12h(order.expected_delivery_time)}` : "NA"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-brand-primary border border-slate-100">
                      {order.customer?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{order.customer?.full_name}</p>
                      <p className="text-xs font-bold text-slate-400">{order.customer?.mobile}</p>
                    </div>
                  </div>
                  <a href={`tel:${order.customer?.mobile}`} className="h-10 w-10 bg-white border border-slate-200 flex items-center justify-center rounded-xl text-emerald-500 shadow-sm hover:bg-emerald-50 transition-colors">
                    <Phone size={18} fill="currentColor" />
                  </a>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <PackageOpen size={16} className="text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">View Items ({order.items?.length || 0})</span>
                    </div>
                    {expandedOrderId === order.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {expandedOrderId === order.id && (
                    <div className="p-4 bg-white space-y-3 divide-y divide-slate-50 border-t border-slate-100">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center pt-2 first:pt-0">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{item.item?.name || "Item"}</span>
                            <span className="text-[9px] font-black text-brand-primary uppercase">{item.service_category?.name || "Service"}</span>
                          </div>
                          <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            x{item.final_quantity || item.estimated_quantity}
                          </span>
                        </div>
                      ))}
                      {order.hanger_needed && (
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3 mt-4 pt-3">
                          <div className="h-8 w-8 bg-indigo-100 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11"/><path d="M12 4a3 3 0 0 1 3-3"/><path d="M12 4a3 3 0 0 0-3-3"/><path d="M5 15h14l-7 7-7-7Z"/></svg>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 block mb-0.5">Provide Hangers</span>
                            <span className="text-xs font-bold text-indigo-500">Customer requested hung delivery</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount to Collect</span>
                  <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
                    AED {order.final_price || order.estimated_price}
                  </p>
                </div>

                {activeDeliveryId === order.id ? (
                  <div className="pt-2 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex gap-2">
                      <button onClick={() => setPaymentMethod('CASH')} className={cn("flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all", paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300')}>
                        <Banknote size={24} />
                        <span className="text-[10px] font-black">CASH</span>
                      </button>
                      <button onClick={() => setPaymentMethod('CARD')} className={cn("flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all", paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300')}>
                        <CreditCard size={24} />
                        <span className="text-[10px] font-black">CARD</span>
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setActiveDeliveryId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                      <button 
                        disabled={deliverMutation.isPending} 
                        onClick={() => deliverMutation.mutate({ 
                          id: order.id, 
                          data: { 
                            received_amount: order.final_price || order.estimated_price, 
                            payment_method: paymentMethod 
                          } 
                        })} 
                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                      >
                        {deliverMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Confirm Drop"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setActiveDeliveryId(order.id)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
                    Mark as Delivered <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { 
//   MapPin, Banknote, CreditCard, Clock, Calendar, 
//   Search, Phone, ChevronRight, Loader2, ChevronDown, ChevronUp, PackageOpen
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { cn } from '@/utils/cn';

// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';

// export const DeliveryQueue = () => {
//   const queryClient = useQueryClient();
//   const [searchTerm, setSearchTerm] = useState('');
//   const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
//   const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null); // <-- NEW ACCORDION STATE
//   const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['deliveryQueue'],
//     queryFn: async () => (await api.get('/operations/delivery-queue')).data,
//     refetchInterval: 10000,
//     refetchOnWindowFocus: true,
//     staleTime: 5000,
//   });

//   const filteredOrders = useMemo(() => {
//     const term = searchTerm.toLowerCase();
//     return orders.filter((o: any) => 
//       o.customer?.building_name?.toLowerCase().includes(term) ||
//       o.customer?.flat_number?.toLowerCase().includes(term) ||
//       o.customer?.full_name?.toLowerCase().includes(term) ||
//       o.customer?.mobile?.includes(term) ||
//       o.id.toString().includes(term)
//     );
//   }, [orders, searchTerm]);

//   const deliverMutation = useMutation({
//     mutationFn: (payload: { id: number, data: any }) => 
//       api.post(`/operations/${payload.id}/deliver`, payload.data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['deliveryQueue'] });
//       setActiveDeliveryId(null);
//       setExpandedOrderId(null);
//       toast.success("Order Delivered Successfully!");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Delivery failed.")
//   });

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl mb-6" />
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24 min-h-screen bg-slate-50/50">
      
//       <header className="space-y-4 mb-8">
//         <div className="flex justify-between items-end">
//            <div>
//               <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Deliveries</h1>
//               <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Staff Terminal</p>
//            </div>
//            <div className="flex flex-col items-end">
//              <span className="text-2xl font-black text-slate-900 leading-none">{filteredOrders.length}</span>
//              <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
//            </div>
//         </div>

//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
//           <input 
//             type="text"
//             placeholder="Search Building, Flat, or Mobile..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-300"
//           />
//         </div>
//       </header>

//       {filteredOrders.length === 0 ? (
//         <EmptyState title="All Caught Up!" message="No matching deliveries found." />
//       ) : (
//         <div className="grid gap-6">
//           {filteredOrders.map((order: any) => (
//             <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group">
              
//               <div className="bg-slate-900 p-6 text-white relative">
//                 <div className="absolute top-0 right-0 p-6 opacity-10">
//                   <MapPin size={80} />
//                 </div>
                
//                 <div className="relative z-10 space-y-1">
//                   <div className="flex justify-between items-center mb-2">
//                     <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Drop-off Point</span>
//                     <span className="text-[10px] font-black text-slate-400">#{order.id}</span>
//                   </div>
//                   <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">
//                     {order.customer?.building_name || "Self Pickup"}
//                   </h2>
//                   <div className="inline-block bg-brand-primary text-slate-900 px-3 py-1 rounded-lg font-black text-sm mt-1">
//                     FLAT / VILLA: {order.customer?.flat_number || "N/A"}
//                   </div>
//                 </div>
//               </div>

//               <div className="p-6 space-y-6">
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
//                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
//                       <Calendar size={10} /> Picked Up
//                     </p>
//                     <p className="text-xs font-bold text-slate-700">
//                       {formatSafeDate(order.pickup_date, 'dd MMM')}
//                     </p>
//                   </div>

//                   <div className={cn("p-3 rounded-2xl border transition-colors", order.expected_delivery_date ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100")}>
//                     <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1", order.expected_delivery_date ? "text-emerald-600" : "text-amber-600")}>
//                       <Clock size={10} /> Delivery Date
//                     </p>
//                     <p className={cn("text-xs font-black", order.expected_delivery_date ? "text-emerald-700" : "text-amber-700")}>
//                       {order.expected_delivery_date ? `${formatSafeDate(order.expected_delivery_date, 'dd MMM')} @ ${formatTimeTo12h(order.expected_delivery_time)}` : "NA"}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-brand-primary border border-slate-100">
//                       {order.customer?.full_name?.charAt(0)}
//                     </div>
//                     <div>
//                       <p className="text-sm font-black text-slate-900">{order.customer?.full_name}</p>
//                       <p className="text-xs font-bold text-slate-400">{order.customer?.mobile}</p>
//                     </div>
//                   </div>
//                   <a href={`tel:${order.customer?.mobile}`} className="h-10 w-10 bg-white border border-slate-200 flex items-center justify-center rounded-xl text-emerald-500 shadow-sm hover:bg-emerald-50 transition-colors">
//                     <Phone size={18} fill="currentColor" />
//                   </a>
//                 </div>

//                 {/* NEW: ITEM ACCORDION FOR DRIVERS */}
//                 <div className="border border-slate-100 rounded-2xl overflow-hidden">
//                   <button 
//                     onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
//                     className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100 transition-colors"
//                   >
//                     <div className="flex items-center gap-2">
//                       <PackageOpen size={16} className="text-slate-400" />
//                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">View Items ({order.items?.length || 0})</span>
//                     </div>
//                     {expandedOrderId === order.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
//                   </button>
                  
//                   {expandedOrderId === order.id && (
//                     <div className="p-4 bg-white space-y-3 divide-y divide-slate-50 border-t border-slate-100">
//                       {order.items?.map((item: any, idx: number) => (
//                         <div key={idx} className="flex justify-between items-center pt-2 first:pt-0">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700">{item.item?.name || "Item"}</span>
//                             <span className="text-[9px] font-black text-brand-primary uppercase">{item.service_category?.name || "Service"}</span>
//                           </div>
//                           <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
//                             x{item.final_quantity || item.estimated_quantity}
//                           </span>
//                         </div>
//                       ))}

//                       {order.hanger_needed && (
//                         <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3 mt-4 pt-3">
//                           <div className="h-8 w-8 bg-indigo-100 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
//                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11"/><path d="M12 4a3 3 0 0 1 3-3"/><path d="M12 4a3 3 0 0 0-3-3"/><path d="M5 15h14l-7 7-7-7Z"/></svg>
//                           </div>
//                           <div>
//                             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 block mb-0.5">Provide Hangers</span>
//                             <span className="text-xs font-bold text-indigo-500">Customer requested hung delivery</span>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   )}
                  



             
//                 </div>

//                 <div className="flex justify-between items-center px-2">
//                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount to Collect</span>
//                   <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
//                     AED {order.final_price || order.estimated_price}
//                   </p>
//                 </div>

//                 {activeDeliveryId === order.id ? (
//                   <div className="pt-2 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
//                     <div className="flex gap-2">
//                       <button onClick={() => setPaymentMethod('CASH')} className={cn("flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all", paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300')}>
//                         <Banknote size={24} />
//                         <span className="text-[10px] font-black">CASH</span>
//                       </button>
//                       <button onClick={() => setPaymentMethod('CARD')} className={cn("flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all", paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300')}>
//                         <CreditCard size={24} />
//                         <span className="text-[10px] font-black">CARD</span>
//                       </button>
//                     </div>
                    
//                     <div className="flex gap-2">
//                        <button onClick={() => setActiveDeliveryId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
//                        <button disabled={deliverMutation.isPending} onClick={() => deliverMutation.mutate({ id: order.id, data: { received_amount: order.final_price || order.estimated_price, payment_method: paymentMethod } })} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center justify-center gap-2">
//                          {deliverMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Confirm Drop"}
//                        </button>
//                     </div>
//                   </div>
//                 ) : (
//                   <button onClick={() => setActiveDeliveryId(order.id)} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200">
//                     Mark as Delivered <ChevronRight size={18} />
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { 
//   MapPin, Banknote, CreditCard, Clock, Calendar, 
//   Search, Phone, ChevronRight, Loader2, AlertCircle 
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { cn } from '@/utils/cn';

// // UI Components
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';

// export const DeliveryQueue = () => {
//   const queryClient = useQueryClient();
//   const [searchTerm, setSearchTerm] = useState('');
//   const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
//   const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

//   const { data: orders = [], isLoading, isError } = useQuery({
//     queryKey: ['deliveryQueue'],
//     queryFn: async () => (await api.get('/operations/delivery-queue')).data,
//     refetchInterval: 30000, 
//   });

//   // Advanced Search: Now includes Mobile Number too
//   const filteredOrders = useMemo(() => {
//     const term = searchTerm.toLowerCase();
//     return orders.filter((o: any) => 
//       o.customer?.building_name?.toLowerCase().includes(term) ||
//       o.customer?.flat_number?.toLowerCase().includes(term) ||
//       o.customer?.full_name?.toLowerCase().includes(term) ||
//       o.customer?.mobile?.includes(term) ||
//       o.id.toString().includes(term)
//     );
//   }, [orders, searchTerm]);

//   const deliverMutation = useMutation({
//     mutationFn: (payload: { id: number, data: any }) => 
//       api.post(`/operations/${payload.id}/deliver`, payload.data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['deliveryQueue'] });
//       setActiveDeliveryId(null);
//       toast.success("Order Delivered Successfully!");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Delivery failed.")
//   });

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <div className="h-10 w-48 bg-slate-200 animate-pulse rounded-xl mb-6" />
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24 min-h-screen bg-slate-50/50">
      
//       <header className="space-y-4 mb-8">
//         <div className="flex justify-between items-end">
//            <div>
//               <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Deliveries</h1>
//               <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Staff Terminal</p>
//            </div>
//            <div className="flex flex-col items-end">
//              <span className="text-2xl font-black text-slate-900 leading-none">{filteredOrders.length}</span>
//              <span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span>
//            </div>
//         </div>

//         {/* Search Bar */}
//         <div className="relative group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={20} />
//           <input 
//             type="text"
//             placeholder="Search Building, Flat, or Mobile..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-300"
//           />
//         </div>
//       </header>

//       {filteredOrders.length === 0 ? (
//         <EmptyState title="All Caught Up!" message="No matching deliveries found." />
//       ) : (
//         <div className="grid gap-6">
//           {filteredOrders.map((order: any) => (
//             <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative group">
              
//               {/* TOP SECTION: Destination Highlight (Swiggy Style) */}
//               <div className="bg-slate-900 p-6 text-white relative">
//                 <div className="absolute top-0 right-0 p-6 opacity-10">
//                   <MapPin size={80} />
//                 </div>
                
//                 <div className="relative z-10 space-y-1">
//                   <div className="flex justify-between items-center mb-2">
//                     <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Drop-off Point</span>
//                     <span className="text-[10px] font-black text-slate-400">#{order.id}</span>
//                   </div>
//                   <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">
//                     {order.customer?.building_name || "Self Pickup"}
//                   </h2>
//                   <div className="inline-block bg-brand-primary text-slate-900 px-3 py-1 rounded-lg font-black text-sm mt-1">
//                     FLAT / VILLA: {order.customer?.flat_number || "N/A"}
//                   </div>
//                 </div>
//               </div>

//               {/* MIDDLE SECTION: Timeline & Dates */}
//               <div className="p-6 space-y-6">
                
//                 {/* Visual Timeline (Pickup -> Delivery) */}
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
//                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
//                       <Calendar size={10} /> Picked Up
//                     </p>
//                     <p className="text-xs font-bold text-slate-700">
//                       {formatSafeDate(order.pickup_date, 'dd MMM')}
//                     </p>
//                   </div>

//                   <div className={cn(
//                     "p-3 rounded-2xl border transition-colors",
//                     order.expected_delivery_date ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
//                   )}>
//                     <p className={cn(
//                       "text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1",
//                       order.expected_delivery_date ? "text-emerald-600" : "text-amber-600"
//                     )}>
//                       <Clock size={10} /> Delivery Date
//                     </p>
//                     <p className={cn(
//                       "text-xs font-black",
//                       order.expected_delivery_date ? "text-emerald-700" : "text-amber-700"
//                     )}>
//                       {order.expected_delivery_date 
//                         ? `${formatSafeDate(order.expected_delivery_date, 'dd MMM')} @ ${formatTimeTo12h(order.expected_delivery_time)}`
//                         : "NA"}
//                     </p>
//                   </div>
//                 </div>

//                 {/* Customer Contact Card */}
//                 <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-brand-primary border border-slate-100">
//                       {order.customer?.full_name?.charAt(0)}
//                     </div>
//                     <div>
//                       <p className="text-sm font-black text-slate-900">{order.customer?.full_name}</p>
//                       <p className="text-xs font-bold text-slate-400">{order.customer?.mobile}</p>
//                     </div>
//                   </div>
//                   <a 
//                     href={`tel:${order.customer?.mobile}`} 
//                     className="h-10 w-10 bg-white border border-slate-200 flex items-center justify-center rounded-xl text-emerald-500 shadow-sm hover:bg-emerald-50 transition-colors"
//                   >
//                     <Phone size={18} fill="currentColor" />
//                   </a>
//                 </div>

//                 {/* Amount Due Card */}
//                 <div className="flex justify-between items-center px-2">
//                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount to Collect</span>
//                   <p className="text-2xl font-black text-slate-900 tracking-tighter italic">
//                     AED {order.final_price || order.estimated_price}
//                   </p>
//                 </div>

//                 {/* Action Area */}
//                 {activeDeliveryId === order.id ? (
//                   <div className="pt-2 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
//                     <div className="flex gap-2">
//                       <button 
//                         onClick={() => setPaymentMethod('CASH')}
//                         className={cn(
//                           "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all",
//                           paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300'
//                         )}
//                       >
//                         <Banknote size={24} />
//                         <span className="text-[10px] font-black">CASH</span>
//                       </button>
//                       <button 
//                         onClick={() => setPaymentMethod('CARD')}
//                         className={cn(
//                           "flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all",
//                           paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300'
//                         )}
//                       >
//                         <CreditCard size={24} />
//                         <span className="text-[10px] font-black">CARD</span>
//                       </button>
//                     </div>
                    
//                     <div className="flex gap-2">
//                        <button onClick={() => setActiveDeliveryId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">
//                          Cancel
//                        </button>
//                        <button 
//                          disabled={deliverMutation.isPending}
//                          onClick={() => deliverMutation.mutate({
//                            id: order.id,
//                            data: { received_amount: order.final_price || order.estimated_price, payment_method: paymentMethod }
//                          })}
//                          className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
//                        >
//                          {deliverMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Confirm Drop"}
//                        </button>
//                     </div>
//                   </div>
//                 ) : (
//                   <button 
//                     onClick={() => setActiveDeliveryId(order.id)}
//                     className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
//                   >
//                     Mark as Delivered <ChevronRight size={18} />
//                   </button>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { MapPin, Banknote, CreditCard, Clock, Calendar, CheckCircle2 } from 'lucide-react';
// import { toast } from 'sonner';
// import { formatSafeDate, formatTimeTo12h } from '@/utils/formatters';

// // UI Components
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { cn } from '@/utils/cn';

// export const DeliveryQueue = () => {
//   const queryClient = useQueryClient();
//   const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
//   const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

//   const { data: orders, isLoading, isError } = useQuery({
//     queryKey: ['deliveryQueue'],
//     queryFn: async () => (await api.get('/operations/delivery-queue')).data,
//     refetchInterval: 30000, 
//   });

//   const deliverMutation = useMutation({
//     mutationFn: (payload: { id: number, data: any }) => 
//       api.post(`/operations/${payload.id}/deliver`, payload.data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['deliveryQueue'] });
//       setActiveDeliveryId(null);
//       toast.success("Delivery completed successfully!");
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to complete delivery.");
//     }
//   });

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter">Delivery Queue</h1>
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   if (isError) return <EmptyState title="Connection Lost" message="Could not load deliveries." />;

//   if (!orders || orders.length === 0) return (
//     <div className="max-w-md mx-auto p-4">
//       <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter">Delivery Queue</h1>
//       <EmptyState title="Queue is Empty!" message="There are no orders ready for delivery right now." />
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
//       <header className="flex justify-between items-end mb-6">
//         <div>
//            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Delivery</h1>
//            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Operational Queue</p>
//         </div>
//         <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 uppercase tracking-tighter">
//           {orders.length} Ready
//         </span>
//       </header>

//       <div className="grid gap-4">
//         {orders.map((order: any) => (
//           <div key={order.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 relative overflow-hidden group">
            
//             {/* Header: Order ID & Amount */}
//             <div className="flex justify-between items-start mb-5">
//               <div>
//                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
//                   ORDER #{order.id.toString().padStart(5, '0')}
//                 </span>
//                 <div className="flex items-center gap-1.5">
//                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
//                    <span className="text-xs font-black text-slate-900 uppercase">Ready for Drop</span>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <p className="text-2xl font-black text-slate-900 tracking-tighter">
//                   <span className="text-[10px] text-slate-400 mr-1 italic">AED</span>
//                   {order.final_price || order.estimated_price}
//                 </p>
//               </div>
//             </div>

//             {/* TIMELINE SECTION: Pickup Date & Expected Delivery (Requested Update) */}
//             <div className="grid grid-cols-2 gap-2 mb-6">
//                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
//                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
//                     <Calendar size={10} /> Picked Up
//                   </p>
//                   <p className="text-[11px] font-bold text-slate-700">
//                     {formatSafeDate(order.pickup_date, 'dd MMM')}
//                   </p>
//                </div>
//                <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10">
//                   <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest mb-1 flex items-center gap-1">
//                     <Clock size={10} /> Expected
//                   </p>
//                   <p className="text-[11px] font-black text-brand-primary">
//                     {formatTimeTo12h(order.expected_delivery_time) || "Not Set"}
//                   </p>
//                </div>
//             </div>

//             {/* Customer Details */}
//             <div className="flex gap-4 mb-6 bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-50">
//               <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-primary shrink-0">
//                 <MapPin size={20} />
//               </div>
//               <div className="min-w-0">
//                 <p className="text-sm font-black text-slate-900 truncate">{order.customer?.full_name || "Customer"}</p>
//                 <p className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
//                   {order.customer?.building_name ? `${order.customer.building_name}, Flat ${order.customer.flat_number}` : "Address not provided"}
//                 </p>
//                 {order.customer?.mobile && (
//                   <a href={`tel:${order.customer.mobile}`} className="inline-block text-[10px] font-black text-brand-primary uppercase tracking-widest mt-2 hover:underline">
//                     📞 {order.customer.mobile}
//                   </a>
//                 )}
//               </div>
//             </div>

//             {/* Interaction Area */}
//             {activeDeliveryId === order.id ? (
//               <div className="space-y-4 border-t border-slate-100 pt-6 animate-in fade-in zoom-in-95 duration-300">
//                 <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-[0.2em]">
//                   Select Payment Method
//                 </p>
//                 <div className="grid grid-cols-2 gap-3">
//                   <button 
//                     onClick={() => setPaymentMethod('CASH')}
//                     className={cn(
//                       "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
//                       paymentMethod === 'CASH' 
//                         ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner' 
//                         : 'border-slate-100 bg-white text-slate-400'
//                     )}
//                   >
//                     <Banknote size={24} />
//                     <span className="text-[10px] font-black">CASH</span>
//                   </button>
//                   <button 
//                     onClick={() => setPaymentMethod('CARD')}
//                     className={cn(
//                       "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
//                       paymentMethod === 'CARD' 
//                         ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner' 
//                         : 'border-slate-100 bg-white text-slate-400'
//                     )}
//                   >
//                     <CreditCard size={24} />
//                     <span className="text-[10px] font-black">CARD / ONLINE</span>
//                   </button>
//                 </div>
                
//                 <div className="flex gap-3">
//                   <button 
//                     onClick={() => setActiveDeliveryId(null)}
//                     className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     disabled={deliverMutation.isPending}
//                     onClick={() => deliverMutation.mutate({
//                       id: order.id,
//                       data: { 
//                         received_amount: order.final_price || order.estimated_price, 
//                         payment_method: paymentMethod 
//                       }
//                     })}
//                     className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 flex justify-center items-center gap-2"
//                   >
//                     {deliverMutation.isPending ? (
//                        <Loader2 className="animate-spin" size={14} />
//                     ) : (
//                        <><CheckCircle2 size={16} /> Confirm Delivery</>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button 
//                 onClick={() => setActiveDeliveryId(order.id)}
//                 className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
//               >
//                 Mark as Delivered
//               </button>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// // Internal Loader Icon
// const Loader2 = ({ size, className }: any) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}>
//     <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//   </svg>
// );



// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { MapPin, Banknote, CreditCard } from 'lucide-react';
// import { toast } from 'sonner';

// // UI Components (Ensure these exist as created in the previous step)
// import { CardSkeleton } from'@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { StatusBadge } from '@/components/ui/StatusBadge';

// export const DeliveryQueue = () => {
//   const queryClient = useQueryClient();
//   const [activeDeliveryId, setActiveDeliveryId] = useState<number | null>(null);
//   const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

//   // 1. Auto-refresh every 30 seconds
//   const { data: orders, isLoading, isError } = useQuery({
//     queryKey: ['deliveryQueue'],
//     queryFn: async () => (await api.get('/operations/delivery-queue')).data,
//     refetchInterval: 30000, 
//   });

//   const deliverMutation = useMutation({
//     mutationFn: (payload: { id: number, data: any }) => 
//       api.post(`/operations/${payload.id}/deliver`, payload.data),
//     onSuccess: () => {
//       // 2. Instantly remove from UI
//       queryClient.invalidateQueries({ queryKey: ['deliveryQueue'] });
//       setActiveDeliveryId(null);
//       toast.success("Delivery completed successfully!");
//     },
//     onError: () => {
//       toast.error("Failed to complete delivery. Please try again.");
//     }
//   });

//   // 3. Robust Loading State
//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <h1 className="text-2xl font-black text-slate-900 mb-6">Delivery Queue</h1>
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   // 4. Robust Error State
//   if (isError) return <EmptyState title="Connection Lost" message="Could not load deliveries." />;

//   // 5. Beautiful Empty State
//   if (!orders || orders.length === 0) return (
//     <div className="max-w-md mx-auto p-4">
//       <h1 className="text-2xl font-black text-slate-900 mb-6">Delivery Queue</h1>
//       <EmptyState title="Queue is Empty!" message="There are no orders ready for delivery right now." />
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
//       <header className="flex justify-between items-end mb-6">
//         <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Queue</h1>
//         <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
//           {orders.length} Ready
//         </span>
//       </header>

//       <div className="grid gap-4">
//         {orders.map((order: any) => (
//           <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
            
//             {/* Header */}
//             <div className="flex justify-between items-start mb-4">
//               <div>
//                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
//                   ORDER #{order.id.toString().padStart(5, '0')}
//                 </span>
//               </div>
//               <span className="text-xl font-black text-slate-900">
//                 AED {order.final_price || order.estimated_price}
//               </span>
//             </div>

//             {/* Customer Details */}
//             <div className="flex gap-3 mb-6 bg-slate-50 p-3 rounded-2xl">
//               <MapPin size={20} className="text-brand-primary shrink-0 mt-0.5" />
//               <div>
//                 <p className="text-sm font-bold text-slate-800">{order.customer?.full_name || "Customer"}</p>
//                 <p className="text-xs text-slate-500 mt-0.5">
//                   {order.customer?.building_name ? `${order.customer.building_name}, Flat ${order.customer.flat_number}` : "Address not provided"}
//                 </p>
//                 {order.customer?.mobile && (
//                   <p className="text-xs font-medium text-slate-600 mt-1">📞 {order.customer.mobile}</p>
//                 )}
//               </div>
//             </div>

//             {/* Interaction Area */}
//             {activeDeliveryId === order.id ? (
//               <div className="space-y-4 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-2">
//                 <p className="text-xs font-bold text-slate-400 uppercase text-center tracking-wider">
//                   Select Payment Method
//                 </p>
//                 <div className="grid grid-cols-2 gap-3">
//                   <button 
//                     onClick={() => setPaymentMethod('CASH')}
//                     className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'}`}
//                   >
//                     <Banknote size={24} />
//                     <span className="text-[11px] font-bold">CASH</span>
//                   </button>
//                   <button 
//                     onClick={() => setPaymentMethod('CARD')}
//                     className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'}`}
//                   >
//                     <CreditCard size={24} />
//                     <span className="text-[11px] font-bold">CARD / ONLINE</span>
//                   </button>
//                 </div>
                
//                 <div className="flex gap-2">
//                   <button 
//                     onClick={() => setActiveDeliveryId(null)}
//                     className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-all"
//                   >
//                     Cancel
//                   </button>
//                   <button 
//                     disabled={deliverMutation.isPending}
//                     onClick={() => deliverMutation.mutate({
//                       id: order.id,
//                       data: { 
//                         received_amount: order.final_price || order.estimated_price, 
//                         payment_method: paymentMethod 
//                       }
//                     })}
//                     className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex justify-center items-center"
//                   >
//                     {deliverMutation.isPending ? "Processing..." : "Confirm & Complete"}
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <button 
//                 onClick={() => setActiveDeliveryId(order.id)}
//                 className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md"
//               >
//                 Start Delivery
//               </button>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
