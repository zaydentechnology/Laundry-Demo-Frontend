// src/features/staff/pages/PickupQueue.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import { Plus, Minus, Calendar, AlertCircle, PlusCircle, Clock, MapPin, Loader2, Search, FilterX } from 'lucide-react';
import { getPickupStatus, formatTimeTo12h } from '@/utils/formatters';

export const PickupQueue = () => {
  const queryClient = useQueryClient();
  const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['pickups'],
    queryFn: async () => (await api.get('/operations/pickup-queue')).data,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const { data: masterItems } = useQuery({
    queryKey: ['laundry-items'],
    queryFn: async () => (await api.get('/items')).data,
    enabled: verifyingOrderId !== null
  });

  const matrixOptions = useMemo(() => {
    if (!masterItems) return [];
    const options: any[] = [];
    masterItems.forEach((item: any) => {
      item.services?.forEach((svc: any) => {
        options.push({
          compositeKey: `${item.id}_${svc.service_category_id}`,
          item_id: item.id,
          item_name: item.name,
          service_category_id: svc.service_category_id,
          service_name: svc.category?.name || "Service",
        });
      });
    });
    return options;
  }, [masterItems]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order: any) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' || 
        order.id.toString().includes(query) ||
        (order.customer?.full_name || '').toLowerCase().includes(query) ||
        (order.customer?.mobile || '').includes(query) ||
        (order.customer?.building_name || '').toLowerCase().includes(query);

      let matchesDate = true;
      if (dateFilter) {
        if (!order.pickup_date) {
          matchesDate = false;
        } else {
          const orderDate = new Date(order.pickup_date);
          const localYear = orderDate.getFullYear();
          const localMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
          const localDay = String(orderDate.getDate()).padStart(2, '0');
          
          const localDateStr = `${localYear}-${localMonth}-${localDay}`;
          matchesDate = localDateStr === dateFilter;
        }
      }
      return matchesSearch && matchesDate;
    });
  }, [orders, searchQuery, dateFilter]);

  const pickupMutation = useMutation({
    mutationFn: (payload: any) => api.post(`/operations/${payload.id}/pickup`, {
      items: payload.items,
      expected_delivery_date: deliveryDate,
      expected_delivery_time: deliveryTime
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      setVerifyingOrderId(null);
      setDeliveryDate('');
      setDeliveryTime('');
      toast.success("Pickup confirmed!");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to confirm pickup")
  });

  const startVerification = (order: any) => {
    const initial: Record<string, number> = {};
    order.items.forEach((i: any) => {
      const key = `${i.item_id}_${i.service_category_id}`;
      initial[key] = i.final_quantity || i.estimated_quantity || 0;
    });
    setQuantities(initial);
    setVerifyingOrderId(order.id);
  };

  const addItemToOrder = (compositeKey: string) => {
    setQuantities(prev => ({ ...prev, [compositeKey]: (prev[compositeKey] || 0) + 1 }));
    setShowItemPicker(false);
  };

  if (isLoading) return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg mb-4" />
      {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
    </div>
  );

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      <div className="flex items-end justify-between mb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          {filteredOrders.length} Pending
        </span>
      </div>

      {/* ENHANCED: Stacked Mobile Sticky Filter Bar */}
      <div className="sticky top-2 z-10 space-y-3 bg-white/90 backdrop-blur-xl p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search ID, Name, or Building..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-primary outline-none transition-all color-scheme-light"
            />
          </div>
          {(searchQuery || dateFilter) && (
            <button 
              onClick={() => { setSearchQuery(''); setDateFilter(''); }}
              className="px-4 py-3.5 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 shrink-0 border border-red-100"
              title="Clear Filters"
            >
              <FilterX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="pt-10">
          <EmptyState title="Queue Empty" message="No pickups assigned to you for these filters." />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order: any) => {
            const dateInfo = getPickupStatus(order.pickup_date);
            const isVerifying = verifyingOrderId === order.id;

            return (
              <div key={order.id} className={`bg-white rounded-[2.5rem] border ${isVerifying ? 'border-brand-primary shadow-xl ring-4 ring-brand-primary/5' : 'border-slate-100 shadow-sm'} transition-all duration-300 overflow-hidden`}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dateInfo.color}`}>
                      {dateInfo.label === "Overdue" ? <AlertCircle size={12}/> : <Calendar size={12}/>}
                      {dateInfo.label}
                    </span>
                    <p className="font-black text-slate-300 text-[10px] uppercase tracking-widest"># {order.id}</p>
                  </div>

                  <div className="flex gap-4 mb-6 px-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
                      <Calendar size={14} className="text-brand-primary" />
                      {new Date(order.pickup_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
                      <Clock size={14} className="text-brand-primary" />
                      {formatTimeTo12h(order.pickup_time)}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mb-6">
                    <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><MapPin size={20} /></div>
                    <div>
                      <p className="font-black text-slate-900 leading-none mb-1">{order.customer?.full_name}</p>
                      <p className="text-xs font-bold text-slate-500 italic">
                        {order.customer?.building_name}, {order.customer?.flat_number}
                      </p>
                    </div>
                  </div>

                  {isVerifying ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verify Items</p>
                      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                        {Object.entries(quantities).map(([compositeKey, qty]) => {
                          const opt = matrixOptions.find(o => o.compositeKey === compositeKey);
                          const itemName = opt?.item_name || "Unknown Item";
                          const catName = opt?.service_name || "Unknown Service";
                          
                          return (
                            <div key={compositeKey} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">{itemName}</span>
                                <span className="text-[9px] font-bold text-brand-primary uppercase">{catName}</span>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-xl border">
                                <button className="p-1 hover:text-brand-primary transition-colors" onClick={() => setQuantities(p => ({...p, [compositeKey]: Math.max(0, p[compositeKey] - 1)}))}>
                                  <Minus size={14}/>
                                </button>
                                <span className="w-4 text-center font-black text-xs">{qty}</span>
                                <button className="p-1 hover:text-brand-primary transition-colors" onClick={() => setQuantities(p => ({...p, [compositeKey]: p[compositeKey] + 1}))}>
                                  <Plus size={14}/>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {showItemPicker ? (
                          <select 
                            className="w-full p-3 rounded-xl border-2 border-brand-primary/20 bg-white text-xs font-bold outline-none"
                            onChange={(e) => addItemToOrder(e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Select service to add...</option>
                            {matrixOptions.map((opt: any) => (
                              <option key={opt.compositeKey} value={opt.compositeKey}>
                                {opt.item_name} - {opt.service_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button 
                            onClick={() => setShowItemPicker(true)}
                            className="w-full flex items-center justify-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest py-2 border-2 border-dashed border-brand-primary/10 rounded-xl hover:bg-brand-primary/5"
                          >
                            <PlusCircle size={14} /> Add missing item
                          </button>
                        )}
                      </div>

                      {order.hanger_needed && (
                        <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl flex items-center gap-2 mt-2 w-max">
                          <div className="h-6 w-6 bg-indigo-100 text-indigo-500 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11"/><path d="M12 4a3 3 0 0 1 3-3"/><path d="M12 4a3 3 0 0 0-3-3"/><path d="M5 15h14l-7 7-7-7Z"/></svg>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Provide Hangers</span>
                        </div>
                      )}

                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expected Delivery</p>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" required value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100" />
                          <input type="time" required value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100" />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (!deliveryDate || !deliveryTime) return toast.error("Please select expected delivery date and time");
                          const formattedItems = Object.entries(quantities).map(([k, v]) => {
                            const [itemId, catId] = k.split('_');
                            return { item_id: parseInt(itemId), service_category_id: parseInt(catId), final_quantity: v };
                          });
                          pickupMutation.mutate({ id: order.id, items: formattedItems });
                        }}
                        disabled={pickupMutation.isPending}
                        className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 mt-4"
                      >
                        {pickupMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Confirm Pickup & Lock Order"}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startVerification(order)}
                      className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
                    >
                      Arrived at Customer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { toast } from 'sonner';
// import { Plus, Minus, Calendar, AlertCircle, PlusCircle, Clock, MapPin, Loader2 } from 'lucide-react';
// import { getPickupStatus, formatTimeTo12h } from '@/utils/formatters';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  
//   // NEW: quantities now use composite key "itemId_categoryId"
//   const [quantities, setQuantities] = useState<Record<string, number>>({});
//   const [showItemPicker, setShowItemPicker] = useState(false);
  
//   const [deliveryDate, setDeliveryDate] = useState('');
//   const [deliveryTime, setDeliveryTime] = useState('');

//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 10000,
//     refetchOnWindowFocus: true,
//     staleTime: 5000,
//   });

//   const { data: masterItems } = useQuery({
//     queryKey: ['laundry-items'],
//     queryFn: async () => (await api.get('/items')).data,
//     enabled: verifyingOrderId !== null
//   });

//   // FLATTEN MASTER ITEMS FOR DROPDOWN
//   const matrixOptions = useMemo(() => {
//     if (!masterItems) return [];
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           compositeKey: `${item.id}_${svc.service_category_id}`,
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const pickupMutation = useMutation({
//     mutationFn: (payload: any) => api.post(`/operations/${payload.id}/pickup`, { 
//       items: payload.items,
//       expected_delivery_date: deliveryDate,
//       expected_delivery_time: deliveryTime
//     }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       setDeliveryDate('');
//       setDeliveryTime('');
//       toast.success("Pickup confirmed!");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to confirm pickup")
//   });

//   const startVerification = (order: any) => {
//     const initial: Record<string, number> = {};
//     order.items.forEach((i: any) => {
//       const key = `${i.item_id}_${i.service_category_id}`;
//       initial[key] = i.final_quantity || i.estimated_quantity || 0;
//     });
//     setQuantities(initial);
//     setVerifyingOrderId(order.id);
//   };

//   const addItemToOrder = (compositeKey: string) => {
//     setQuantities(prev => ({ ...prev, [compositeKey]: (prev[compositeKey] || 0) + 1 }));
//     setShowItemPicker(false);
//   };

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg mb-4" />
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   if (!orders || orders.length === 0) return (
//     <div className="max-w-md mx-auto pt-20">
//       <EmptyState title="Queue Empty" message="No pickups assigned to you." />
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
//       <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>

//       {orders?.map((order: any) => {
//         const dateInfo = getPickupStatus(order.pickup_date);
//         const isVerifying = verifyingOrderId === order.id;
        
//         return (
//           <div key={order.id} className={`bg-white rounded-[2.5rem] border ${isVerifying ? 'border-brand-primary shadow-xl ring-4 ring-brand-primary/5' : 'border-slate-100 shadow-sm'} transition-all duration-300 overflow-hidden`}>
//             <div className="p-6">
              
//               <div className="flex justify-between items-center mb-4">
//                 <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dateInfo.color}`}>
//                   {dateInfo.label === "Overdue" ? <AlertCircle size={12}/> : <Calendar size={12}/>}
//                   {dateInfo.label}
//                 </span>
//                 <p className="font-black text-slate-300 text-[10px] uppercase tracking-widest"># {order.id}</p>
//               </div>

//               <div className="flex gap-4 mb-6 px-1">
//                 <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
//                   <Calendar size={14} className="text-brand-primary" />
//                   {new Date(order.pickup_date).toLocaleDateString()}
//                 </div>
//                 <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
//                   <Clock size={14} className="text-brand-primary" />
//                   {formatTimeTo12h(order.pickup_time)}
//                 </div>
//               </div>

//               <div className="flex items-start gap-3 mb-6">
//                 <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><MapPin size={20} /></div>
//                 <div>
//                   <p className="font-black text-slate-900 leading-none mb-1">{order.customer?.full_name}</p>
//                   <p className="text-xs font-bold text-slate-500 italic">
//                     {order.customer?.building_name}, {order.customer?.flat_number}
//                   </p>
//                 </div>
//               </div>

//               {isVerifying ? (
//                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verify Items</p>
//                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
//                     {Object.entries(quantities).map(([compositeKey, qty]) => {
//                       const opt = matrixOptions.find(o => o.compositeKey === compositeKey);
//                       // Fallback just in case it was a legacy/deleted item
//                       const itemName = opt?.item_name || "Unknown Item";
//                       const catName = opt?.service_name || "Unknown Service";

//                       return (
//                         <div key={compositeKey} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-black text-slate-700">{itemName}</span>
//                             <span className="text-[9px] font-bold text-brand-primary uppercase">{catName}</span>
//                           </div>
//                           <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-xl border">
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [compositeKey]: Math.max(0, p[compositeKey] - 1)}))}
//                             >
//                               <Minus size={14}/>
//                             </button>
//                             <span className="w-4 text-center font-black text-xs">{qty}</span>
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [compositeKey]: p[compositeKey] + 1}))}
//                             >
//                               <Plus size={14}/>
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}

//                     {showItemPicker ? (
//                       <select 
//                         className="w-full p-3 rounded-xl border-2 border-brand-primary/20 bg-white text-xs font-bold outline-none"
//                         onChange={(e) => addItemToOrder(e.target.value)}
//                         defaultValue=""
//                       >
//                         <option value="" disabled>Select service to add...</option>
//                         {matrixOptions.map((opt: any) => (
//                           <option key={opt.compositeKey} value={opt.compositeKey}>
//                             {opt.item_name} - {opt.service_name}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       <button 
//                         onClick={() => setShowItemPicker(true)}
//                         className="w-full flex items-center justify-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest py-2 border-2 border-dashed border-brand-primary/10 rounded-xl hover:bg-brand-primary/5"
//                       >
//                         <PlusCircle size={14} /> Add missing item
//                       </button>
//                     )}
//                   </div>

//                   {order.hanger_needed && (
//                  <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl flex items-center gap-2 mt-2 w-max">
//                    <div className="h-6 w-6 bg-indigo-100 text-indigo-500 rounded-lg flex items-center justify-center">
//                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11"/><path d="M12 4a3 3 0 0 1 3-3"/><path d="M12 4a3 3 0 0 0-3-3"/><path d="M5 15h14l-7 7-7-7Z"/></svg>
//                    </div>
//                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Provide Hangers</span>
//                  </div>
//               )}

//                   <div className="space-y-3 pt-2">
//                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expected Delivery</p>
//                     <div className="grid grid-cols-2 gap-3">
//                       <input 
//                         type="date"
//                         required
//                         value={deliveryDate}
//                         onChange={(e) => setDeliveryDate(e.target.value)}
//                         className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100"
//                       />
//                       <input 
//                         type="time"
//                         required
//                         value={deliveryTime}
//                         onChange={(e) => setDeliveryTime(e.target.value)}
//                         className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100"
//                       />
//                     </div>
//                   </div>

//                   <button 
//                     onClick={() => {
//                       if (!deliveryDate || !deliveryTime) return toast.error("Please select expected delivery date and time");
                      
//                       // Format payload to split composite keys back into IDs
//                       const formattedItems = Object.entries(quantities).map(([k, v]) => {
//                         const [itemId, catId] = k.split('_');
//                         return { 
//                           item_id: parseInt(itemId), 
//                           service_category_id: parseInt(catId), 
//                           final_quantity: v 
//                         };
//                       });

//                       pickupMutation.mutate({ id: order.id, items: formattedItems });
//                     }}
//                     disabled={pickupMutation.isPending}
//                     className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 mt-4"
//                   >
//                     {pickupMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Confirm Pickup & Lock Order"}
//                   </button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => startVerification(order)} 
//                   className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//                 >
//                   Arrived at Customer
//                 </button>
//               )}
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };
// // src/features/operations/pages/PickupQueue.tsx
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { toast } from 'sonner';
// import { Plus, Minus, Calendar, AlertCircle, PlusCircle, Clock, MapPin, Loader2 } from 'lucide-react';
// import { getPickupStatus,formatTimeTo12h } from '@/utils/formatters';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
//   const [quantities, setQuantities] = useState<Record<number, number>>({});
//   const [showItemPicker, setShowItemPicker] = useState(false);
  
//   // NEW STATES for Delivery Info
//   const [deliveryDate, setDeliveryDate] = useState('');
//   const [deliveryTime, setDeliveryTime] = useState('');

//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems } = useQuery({
//     queryKey: ['laundry-items'],
//     queryFn: async () => (await api.get('/items')).data,
//     enabled: verifyingOrderId !== null
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (payload: any) => api.post(`/operations/${payload.id}/pickup`, { 
//       items: payload.items,
//       expected_delivery_date: deliveryDate, // Sending new fields
//       expected_delivery_time: deliveryTime
//     }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       setDeliveryDate('');
//       setDeliveryTime('');
//       toast.success("Pickup confirmed!");
//     }
//   });

//   const startVerification = (order: any) => {
//     const initial: Record<number, number> = {};
//     order.items.forEach((i: any) => initial[i.item_id] = i.estimated_quantity);
//     setQuantities(initial);
//     setVerifyingOrderId(order.id);
//   };

//   const addItemToOrder = (itemId: number) => {
//     setQuantities(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
//     setShowItemPicker(false);
//   };

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg mb-4" />
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   if (!orders || orders.length === 0) return (
//     <div className="max-w-md mx-auto pt-20">
//       <EmptyState title="Queue Empty" message="No pickups assigned to you." />
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
//       <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>

//       {orders?.map((order: any) => {
//         const dateInfo = getPickupStatus(order.pickup_date);
//         const isVerifying = verifyingOrderId === order.id;
        
//         return (
//           <div key={order.id} className={`bg-white rounded-[2.5rem] border ${isVerifying ? 'border-brand-primary shadow-xl ring-4 ring-brand-primary/5' : 'border-slate-100 shadow-sm'} transition-all duration-300 overflow-hidden`}>
//             <div className="p-6">
//               {/* Header: Status + ID */}
//               <div className="flex justify-between items-center mb-4">
//                 <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dateInfo.color}`}>
//                   {dateInfo.label === "Overdue" ? <AlertCircle size={12}/> : <Calendar size={12}/>}
//                   {dateInfo.label}
//                 </span>
//                 <p className="font-black text-slate-300 text-[10px] uppercase tracking-widest"># {order.id}</p>
//               </div>

//               {/* NEW: Date & Time Display */}
//               <div className="flex gap-4 mb-6 px-1">
//                 <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
//                   <Calendar size={14} className="text-brand-primary" />
//                   {new Date(order.pickup_date).toLocaleDateString()}
//                 </div>
//               <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wide">
//                   <Clock size={14} className="text-brand-primary" />
//                   {/* WRAP THE TIME HERE */}
//                   {formatTimeTo12h(order.pickup_time)}
//                 </div>
//               </div>

//               <div className="flex items-start gap-3 mb-6">
//                 <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><MapPin size={20} /></div>
//                 <div>
//                   <p className="font-black text-slate-900 leading-none mb-1">{order.customer?.full_name}</p>
//                   <p className="text-xs font-bold text-slate-500 italic">
//                     {order.customer?.building_name}, {order.customer?.flat_number}
//                   </p>
//                 </div>
//               </div>

//               {isVerifying ? (
//                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Verify Items</p>
//                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
//                     {Object.entries(quantities).map(([id, qty]) => {
//                       const itemInfo = masterItems?.find((mi: any) => mi.id === parseInt(id));
//                       return (
//                         <div key={id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
//                           <span className="text-xs font-black text-slate-700">{itemInfo?.name || "Item"}</span>
//                           <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-xl border">
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [parseInt(id)]: Math.max(0, p[parseInt(id)] - 1)}))}
//                             >
//                               <Minus size={14}/>
//                             </button>
//                             <span className="w-4 text-center font-black text-xs">{qty}</span>
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [parseInt(id)]: p[parseInt(id)] + 1}))}
//                             >
//                               <Plus size={14}/>
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}

//                     {showItemPicker ? (
//                       <select 
//                         className="w-full p-3 rounded-xl border-2 border-brand-primary/20 bg-white text-xs font-bold outline-none"
//                         onChange={(e) => addItemToOrder(parseInt(e.target.value))}
//                         defaultValue=""
//                       >
//                         <option value="" disabled>Select item to add...</option>
//                         {masterItems?.map((mi: any) => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
//                       </select>
//                     ) : (
//                       <button 
//                         onClick={() => setShowItemPicker(true)}
//                         className="w-full flex items-center justify-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest py-2 border-2 border-dashed border-brand-primary/10 rounded-xl hover:bg-brand-primary/5"
//                       >
//                         <PlusCircle size={14} /> Add missing item
//                       </button>
//                     )}
//                   </div>

//                   {/* NEW: Expected Delivery Selection */}
//                   <div className="space-y-3 pt-2">
//                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expected Delivery</p>
//                     <div className="grid grid-cols-2 gap-3">
//                       <input 
//                         type="date"
//                         required
//                         value={deliveryDate}
//                         onChange={(e) => setDeliveryDate(e.target.value)}
//                         className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100"
//                       />
//                       <input 
//                         type="time"
//                         required
//                         value={deliveryTime}
//                         onChange={(e) => setDeliveryTime(e.target.value)}
//                         className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-slate-100"
//                       />
//                     </div>
//                   </div>

//                   <button 
//                     onClick={() => {
//                       if (!deliveryDate || !deliveryTime) {
//                         toast.error("Please select expected delivery date and time");
//                         return;
//                       }
//                       pickupMutation.mutate({ 
//                         id: order.id, 
//                         items: Object.entries(quantities).map(([k, v]) => ({ item_id: parseInt(k), final_quantity: v }))
//                       });
//                     }}
//                     disabled={pickupMutation.isPending}
//                     className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 mt-4"
//                   >
//                     {pickupMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Confirm Pickup & Lock Order"}
//                   </button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => startVerification(order)} 
//                   className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//                 >
//                   Arrived at Customer
//                 </button>
//               )}
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { toast } from 'sonner';
// import { Plus, Minus, Calendar, AlertCircle, PlusCircle, PackageCheck, MapPin, Loader2 } from 'lucide-react';
// import { getPickupStatus } from '@/utils/formatters';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
//   const [quantities, setQuantities] = useState<Record<number, number>>({});
//   const [showItemPicker, setShowItemPicker] = useState(false);

//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems } = useQuery({
//     queryKey: ['laundry-items'],
//     queryFn: async () => (await api.get('/items')).data,
//     enabled: verifyingOrderId !== null
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (payload: any) => api.post(`/operations/${payload.id}/pickup`, { items: payload.items }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       toast.success("Pickup confirmed!");
//     }
//   });

//   const startVerification = (order: any) => {
//     const initial: Record<number, number> = {};
//     order.items.forEach((i: any) => initial[i.item_id] = i.estimated_quantity);
//     setQuantities(initial);
//     setVerifyingOrderId(order.id);
//   };

//   const addItemToOrder = (itemId: number) => {
//     setQuantities(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
//     setShowItemPicker(false);
//   };

//   if (isLoading) return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <div className="h-8 w-32 bg-slate-100 animate-pulse rounded-lg mb-4" />
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   if (!orders || orders.length === 0) return (
//     <div className="max-w-md mx-auto pt-20">
//       {/* <EmptyState icon={PackageCheck} title="Queue Empty" message="No pickups assigned to you." /> */}
//     <EmptyState title="Queue Empty" message="No pickups assigned to you." />
//     </div>
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
//       <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>

//       {orders?.map((order: any) => {
//         const dateInfo = getPickupStatus(order.pickup_date);
//         const isVerifying = verifyingOrderId === order.id;
        
//         return (
//           <div key={order.id} className={`bg-white rounded-[2.5rem] border ${isVerifying ? 'border-brand-primary shadow-xl ring-4 ring-brand-primary/5' : 'border-slate-100 shadow-sm'} transition-all duration-300 overflow-hidden`}>
//             <div className="p-6">
//               <div className="flex justify-between items-center mb-6">
//                 <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${dateInfo.color}`}>
//                   {dateInfo.label === "Overdue" ? <AlertCircle size={12}/> : <Calendar size={12}/>}
//                   {dateInfo.label}
//                 </span>
//                 <p className="font-black text-slate-300 text-[10px] uppercase tracking-widest"># {order.id}</p>
//               </div>

//               <div className="flex items-start gap-3 mb-6">
//                 <div className="p-3 bg-slate-50 rounded-2xl text-slate-400"><MapPin size={20} /></div>
//                 <div>
//                   <p className="font-black text-slate-900 leading-none mb-1">{order.customer?.full_name}</p>
//                   <p className="text-xs font-bold text-slate-500 italic">
//                     {order.customer?.building_name}, {order.customer?.flat_number}
//                   </p>
//                 </div>
//               </div>

//               {isVerifying ? (
//                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
//                   <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
//                     {Object.entries(quantities).map(([id, qty]) => {
//                       const itemInfo = masterItems?.find((mi: any) => mi.id === parseInt(id));
//                       return (
//                         <div key={id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
//                           <span className="text-xs font-black text-slate-700">{itemInfo?.name || "Item"}</span>
//                           <div className="flex items-center gap-3 bg-slate-50 px-2 py-1 rounded-xl border">
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [parseInt(id)]: Math.max(0, p[parseInt(id)] - 1)}))}
//                             >
//                               <Minus size={14}/>
//                             </button>
//                             <span className="w-4 text-center font-black text-xs">{qty}</span>
//                             <button 
//                               className="p-1 hover:text-brand-primary transition-colors"
//                               onClick={() => setQuantities(p => ({...p, [parseInt(id)]: p[parseInt(id)] + 1}))}
//                             >
//                               <Plus size={14}/>
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })}

//                     {showItemPicker ? (
//                       <select 
//                         className="w-full p-3 rounded-xl border-2 border-brand-primary/20 bg-white text-xs font-bold outline-none"
//                         onChange={(e) => addItemToOrder(parseInt(e.target.value))}
//                         defaultValue=""
//                       >
//                         <option value="" disabled>Select item to add...</option>
//                         {masterItems?.map((mi: any) => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
//                       </select>
//                     ) : (
//                       <button 
//                         onClick={() => setShowItemPicker(true)}
//                         className="w-full flex items-center justify-center gap-2 text-brand-primary font-black text-[10px] uppercase tracking-widest py-2 border-2 border-dashed border-brand-primary/10 rounded-xl hover:bg-brand-primary/5"
//                       >
//                         <PlusCircle size={14} /> Add missing item
//                       </button>
//                     )}
//                   </div>

//                   <button 
//                     onClick={() => pickupMutation.mutate({ 
//                       id: order.id, 
//                       items: Object.entries(quantities).map(([k, v]) => ({ item_id: parseInt(k), final_quantity: v }))
//                     })}
//                     disabled={pickupMutation.isPending}
//                     className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2"
//                   >
//                     {pickupMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Confirm Pickup"}
//                   </button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => startVerification(order)} 
//                   className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//                 >
//                   Arrived at Customer
//                 </button>
//               )}
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { StatusBadge } from '@/components/ui/StatusBadge';
// import { toast } from 'sonner';
// import { Plus, Minus, Calendar, AlertCircle, PlusCircle } from 'lucide-react';
// import { getPickupStatus } from '@/utils/formatters'; // Use the helper above

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
//   const [quantities, setQuantities] = useState<Record<number, number>>({});
//   const [showItemPicker, setShowItemPicker] = useState(false);

//   // 1. Fetch Queue
//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 15000, 
//   });

//   // 2. Fetch Master Item List (For adding new items)
//   const { data: masterItems } = useQuery({
//     queryKey: ['laundry-items'],
//     queryFn: async () => (await api.get('/items')).data, // Ensure you have this endpoint
//     enabled: verifyingOrderId !== null
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (payload: any) => api.post(`/operations/${payload.id}/pickup`, { items: payload.items }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       toast.success("Pickup confirmed!");
//     }
//   });

//   const startVerification = (order: any) => {
//     const initial: Record<number, number> = {};
//     order.items.forEach((i: any) => initial[i.item_id] = i.estimated_quantity);
//     setQuantities(initial);
//     setVerifyingOrderId(order.id);
//   };

//   const addItemToOrder = (itemId: number) => {
//     setQuantities(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
//     setShowItemPicker(false);
//   };

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
//       <h1 className="text-2xl font-black text-slate-900">Pickup Queue</h1>

//       {orders?.map((order: any) => {
//         const dateInfo = getPickupStatus(order.pickup_date);
        
//         return (
//           <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
//             <div className="flex justify-between items-center mb-4">
//               <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${dateInfo.color}`}>
//                 {dateInfo.label === "Overdue" ? <AlertCircle size={12}/> : <Calendar size={12}/>}
//                 {dateInfo.label}
//               </span>
//               <p className="font-bold text-slate-400 text-xs"># {order.id}</p>
//             </div>

//             <div className="mb-4">
//               <p className="font-bold text-slate-900">{order.customer?.full_name}</p>
//               <p className="text-xs text-slate-500">{order.customer?.building_name}, {order.customer?.flat_number}</p>
//             </div>

//             {verifyingOrderId === order.id ? (
//               <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
//                 {Object.entries(quantities).map(([id, qty]) => {
//                   const itemInfo = masterItems?.find((mi: any) => mi.id === parseInt(id));
//                   return (
//                     <div key={id} className="flex justify-between items-center">
//                       <span className="text-sm font-bold text-slate-700">{itemInfo?.name || "Item"}</span>
//                       <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border">
//                         <button onClick={() => setQuantities(p => ({...p, [parseInt(id)]: Math.max(0, p[parseInt(id)] - 1)}))}><Minus size={14}/></button>
//                         <span className="w-4 text-center font-bold text-xs">{qty}</span>
//                         <button onClick={() => setQuantities(p => ({...p, [parseInt(id)]: p[parseInt(id)] + 1}))}><Plus size={14}/></button>
//                       </div>
//                     </div>
//                   );
//                 })}

//                 {/* ADD NEW ITEM BUTTON */}
//                 {showItemPicker ? (
//                   <select 
//                     className="w-full p-2 rounded-lg border text-sm"
//                     onChange={(e) => addItemToOrder(parseInt(e.target.value))}
//                     defaultValue=""
//                   >
//                     <option value="" disabled>Select item to add...</option>
//                     {masterItems?.map((mi: any) => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
//                   </select>
//                 ) : (
//                   <button 
//                     onClick={() => setShowItemPicker(true)}
//                     className="flex items-center gap-2 text-brand-primary font-bold text-xs py-2"
//                   >
//                     <PlusCircle size={14} /> Add item customer forgot to list
//                   </button>
//                 )}

//                 <button 
//                   onClick={() => pickupMutation.mutate({ 
//                     id: order.id, 
//                     items: Object.entries(quantities).map(([k, v]) => ({ item_id: parseInt(k), final_quantity: v }))
//                   })}
//                   className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold"
//                 >
//                   Confirm Items
//                 </button>
//               </div>
//             ) : (
//               <button onClick={() => startVerification(order)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
//                 Arrived at Customer
//               </button>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// };
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { StatusBadge } from '@/components/ui/StatusBadge';
// import { toast } from 'sonner';
// import { Plus, Minus } from 'lucide-react';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  
//   // Local state to track actual quantities driver collects
//   const [quantities, setQuantities] = useState<Record<number, number>>({});

//   const { data: orders, isLoading, isError } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 30000, 
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (payload: { id: number, items: { item_id: number, final_quantity: number }[] }) => 
//       api.post(`/operations/${payload.id}/pickup`, { items: payload.items }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       toast.success("Pickup verified and confirmed!");
//     },
//     onError: () => toast.error("Update failed. Please try again.")
//   });

//   const startVerification = (order: any) => {
//     // Pre-fill the form with the customer's estimated quantities
//     const initialQuantities: Record<number, number> = {};
//     order.items.forEach((item: any) => {
//       initialQuantities[item.item_id] = item.estimated_quantity;
//     });
//     setQuantities(initialQuantities);
//     setVerifyingOrderId(order.id);
//   };

//   const updateQuantity = (itemId: number, delta: number) => {
//     setQuantities(prev => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta) // Prevent negative clothes
//     }));
//   };

//   const submitPickup = (orderId: number) => {
//     // Convert our quantities dictionary back into the array the API expects
//     const finalItems = Object.entries(quantities).map(([item_id, qty]) => ({
//       item_id: parseInt(item_id),
//       final_quantity: qty
//     }));
    
//     pickupMutation.mutate({ id: orderId, items: finalItems });
//   };

//   if (isLoading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>;
//   if (isError) return <EmptyState title="Connection Error" message="Check your internet and try again." />;
//   if (!orders || orders.length === 0) return <EmptyState title="All Caught Up!" message="No new pickups." />;

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
//       <header className="flex justify-between items-end mb-6">
//         <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>
//         <span className="text-sm font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
//           {orders.length} Orders
//         </span>
//       </header>

//       {orders.map((order: any) => (
//         <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
//           <div className="flex justify-between items-start mb-4">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Order ID</p>
//               <p className="font-bold text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
//             </div>
//             <StatusBadge status={order.status} />
//           </div>

//           {/* VERIFICATION UI */}
//           {verifyingOrderId === order.id ? (
//             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
//               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
//                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verify Actual Items</p>
//                 {order.items?.map((item: any) => (
//                   <div key={item.item_id} className="flex justify-between items-center">
//                     <span className="text-sm font-bold text-slate-700">
//                       {item.item?.name || "Unknown Item"}
//                     </span>
//                     <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
//                       <button onClick={() => updateQuantity(item.item_id, -1)} className="p-1 text-slate-400 hover:text-red-500">
//                         <Minus size={16} />
//                       </button>
//                       <span className="w-6 text-center font-bold text-slate-900">
//                         {quantities[item.item_id] || 0}
//                       </span>
//                       <button onClick={() => updateQuantity(item.item_id, 1)} className="p-1 text-slate-400 hover:text-emerald-500">
//                         <Plus size={16} />
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex gap-2">
//                 <button 
//                   onClick={() => setVerifyingOrderId(null)}
//                   className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-all"
//                 >
//                   Cancel
//                 </button>
//                 <button 
//                   disabled={pickupMutation.isPending}
//                   onClick={() => submitPickup(order.id)}
//                   className="flex-[2] py-3.5 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md disabled:opacity-50"
//                 >
//                   {pickupMutation.isPending ? "Saving..." : "Confirm Pickup"}
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <>
//               {/* Read-Only Summary before clicking Arrived */}
//               <div className="space-y-2 mb-6">
//                 {order.items?.map((item: any, idx: number) => (
//                   <div key={idx} className="flex justify-between text-sm">
//                     <span className="text-slate-600 font-medium">
//                       {item.item?.name || "Standard Wash"} x {item.estimated_quantity}
//                     </span>
//                     <span className="text-slate-400 italic">AED {item.unit_price}</span>
//                   </div>
//                 ))}
//               </div>

//               <button
//                 onClick={() => startVerification(order)}
//                 className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
//               >
//                 Arrived at Customer
//               </button>
//             </>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { StatusBadge } from '@/components/ui/StatusBadge';
// import { toast } from 'sonner';
// import { Plus, Minus } from 'lucide-react';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();
//   const [verifyingOrderId, setVerifyingOrderId] = useState<number | null>(null);
  
//   // Local state to track actual quantities driver collects
//   const [quantities, setQuantities] = useState<Record<number, number>>({});

//   const { data: orders, isLoading, isError } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 30000, 
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (payload: { id: number, items: { item_id: number, final_quantity: number }[] }) => 
//       api.post(`/operations/${payload.id}/pickup`, { items: payload.items }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       setVerifyingOrderId(null);
//       toast.success("Pickup verified and confirmed!");
//     },
//     onError: () => toast.error("Update failed. Please try again.")
//   });

//   const startVerification = (order: any) => {
//     // Pre-fill the form with the customer's estimated quantities
//     const initialQuantities: Record<number, number> = {};
//     order.items.forEach((item: any) => {
//       initialQuantities[item.item_id] = item.estimated_quantity;
//     });
//     setQuantities(initialQuantities);
//     setVerifyingOrderId(order.id);
//   };

//   const updateQuantity = (itemId: number, delta: number) => {
//     setQuantities(prev => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta) // Prevent negative clothes
//     }));
//   };

//   const submitPickup = (orderId: number) => {
//     // Convert our quantities dictionary back into the array the API expects
//     const finalItems = Object.entries(quantities).map(([item_id, qty]) => ({
//       item_id: parseInt(item_id),
//       final_quantity: qty
//     }));
    
//     pickupMutation.mutate({ id: orderId, items: finalItems });
//   };

//   if (isLoading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>;
//   if (isError) return <EmptyState title="Connection Error" message="Check your internet and try again." />;
//   if (!orders || orders.length === 0) return <EmptyState title="All Caught Up!" message="No new pickups." />;

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4 pb-24">
//       <header className="flex justify-between items-end mb-6">
//         <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>
//         <span className="text-sm font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
//           {orders.length} Orders
//         </span>
//       </header>

//       {orders.map((order: any) => (
//         <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
//           <div className="flex justify-between items-start mb-4">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Order ID</p>
//               <p className="font-bold text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
//             </div>
//             <StatusBadge status={order.status} />
//           </div>

//           {/* VERIFICATION UI */}
//           {verifyingOrderId === order.id ? (
//             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
//               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
//                 <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verify Actual Items</p>
//                 {order.items?.map((item: any) => (
//                   <div key={item.item_id} className="flex justify-between items-center">
//                     <span className="text-sm font-bold text-slate-700">
//                       {item.item?.name || "Unknown Item"}
//                     </span>
//                     <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
//                       <button onClick={() => updateQuantity(item.item_id, -1)} className="p-1 text-slate-400 hover:text-red-500">
//                         <Minus size={16} />
//                       </button>
//                       <span className="w-6 text-center font-bold text-slate-900">
//                         {quantities[item.item_id] || 0}
//                       </span>
//                       <button onClick={() => updateQuantity(item.item_id, 1)} className="p-1 text-slate-400 hover:text-emerald-500">
//                         <Plus size={16} />
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex gap-2">
//                 <button 
//                   onClick={() => setVerifyingOrderId(null)}
//                   className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold active:scale-95 transition-all"
//                 >
//                   Cancel
//                 </button>
//                 <button 
//                   disabled={pickupMutation.isPending}
//                   onClick={() => submitPickup(order.id)}
//                   className="flex-[2] py-3.5 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition-all shadow-md disabled:opacity-50"
//                 >
//                   {pickupMutation.isPending ? "Saving..." : "Confirm Pickup"}
//                 </button>
//               </div>
//             </div>
//           ) : (
//             <>
//               {/* Read-Only Summary before clicking Arrived */}
//               <div className="space-y-2 mb-6">
//                 {order.items?.map((item: any, idx: number) => (
//                   <div key={idx} className="flex justify-between text-sm">
//                     <span className="text-slate-600 font-medium">
//                       {item.item?.name || "Standard Wash"} x {item.estimated_quantity}
//                     </span>
//                     <span className="text-slate-400 italic">AED {item.unit_price}</span>
//                   </div>
//                 ))}
//               </div>

//               <button
//                 onClick={() => startVerification(order)}
//                 className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
//               >
//                 Arrived at Customer
//               </button>
//             </>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { CardSkeleton } from '@/components/ui/Skeleton';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { StatusBadge } from '@/components/ui/StatusBadge';
// import { toast } from 'sonner';

// export const PickupQueue = () => {
//   const queryClient = useQueryClient();

//   // 1. Automatic Refetch every 30s as a fallback for WebSockets
//   const { data: orders, isLoading, isError } = useQuery({
//     queryKey: ['pickups'],
//     queryFn: async () => (await api.get('/operations/pickup-queue')).data,
//     refetchInterval: 30000, 
//   });

//   const pickupMutation = useMutation({
//     mutationFn: (id: number) => api.post(`/operations/${id}/pickup`, { items: [] }),
//     onSuccess: () => {
//       // 2. Immediate cache invalidation triggers "instantly disappear" behavior
//       queryClient.invalidateQueries({ queryKey: ['pickups'] });
//       toast.success("Order removed from queue");
//     },
//     onError: () => toast.error("Update failed. Please try again.")
//   });

//   if (isLoading) return (
//     <div className="p-4 space-y-4">
//       {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
//     </div>
//   );

//   if (isError) return <EmptyState title="Connection Error" message="Check your internet and try again." />;

//   if (!orders || orders.length === 0) return (
//     <EmptyState title="All Caught Up!" message="No new pickups are currently scheduled." />
//   );

//   return (
//     <div className="max-w-md mx-auto p-4 space-y-4">
//       <header className="flex justify-between items-end mb-6">
//         <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pickup Queue</h1>
//         <span className="text-sm font-bold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
//           {orders.length} Orders
//         </span>
//       </header>

//       {orders.map((order: any) => (
//         <div key={order.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
//           <div className="flex justify-between items-start mb-4">
//             <div>
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Order ID</p>
//               <p className="font-bold text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
//             </div>
//             <StatusBadge status={order.status} />
//           </div>

//           <div className="space-y-2 mb-6">
//             {/* FIX 5: Human Readable Names instead of Item ID */}
//             {order.items?.map((item: any, idx: number) => (
//               <div key={idx} className="flex justify-between text-sm">
//                 <span className="text-slate-600 font-medium">
//                   {item.laundry_item?.name || "Standard Wash"} x {item.estimated_quantity}
//                 </span>
//                 <span className="text-slate-400 italic">AED {item.unit_price}</span>
//               </div>
//             ))}
//           </div>

//           <button
//             onClick={() => pickupMutation.mutate(order.id)}
//             disabled={pickupMutation.isPending}
//             className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-50"
//           >
//             {pickupMutation.isPending ? "Updating Queue..." : "Arrived at Customer"}
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// };

