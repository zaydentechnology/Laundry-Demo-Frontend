// src/features/orders/components/EditOrderCartModal.tsx
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../api/orders.service';
import { adminService } from '@/features/admin/api/admin.service'; 
import { X, Plus, Minus, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const EditOrderCartModal = ({ isOpen, onClose, order, walletBalance }: any) => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [creditsToUse, setCreditsToUse] = useState<number>(0);
  const [useWallet, setUseWallet] = useState(false);

  const { data: items } = useQuery({ queryKey: ['laundryItems'], queryFn: ordersService.getItems, enabled: isOpen });
  const { data: offers } = useQuery({ queryKey: ['activeOffers'], queryFn: adminService.getOffers, enabled: isOpen });

  // Pre-load existing cart when modal opens
  useEffect(() => {
    if (isOpen && order?.items) {
      const initialCart: Record<string, number> = {};
      
      order.items.forEach((i: any) => {
        // Robust ID extraction
        const itemId = i.item_id || i.item?.id;
        const catId = i.service_category_id || i.service_category?.id;
        
        if (itemId && catId) {
          // BUG FIX 1: Smart fallback so new orders don't show 0
          const qty = i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0);
          initialCart[`${itemId}_${catId}`] = qty;
        }
      });
      
      setCart(initialCart);
      
      if (order.credits_used > 0) {
        setUseWallet(true);
        setCreditsToUse(order.credits_used);
      } else {
        setUseWallet(false);
        setCreditsToUse(0);
      }
    }
    // BUG FIX 2: We ONLY depend on 'isOpen' now. 
    // This stops the 5-second refetch interval from wiping out the user's edits!
  }, [isOpen]); 

  // Matrix math calculation
  const { subtotal, discount, total } = useMemo(() => {
    if (!items) return { subtotal: 0, discount: 0, total: 0 };
    
    let sub = 0;
    Object.entries(cart).forEach(([cartKey, qty]) => {
      if (qty <= 0) return;
      const [itemId, catId] = cartKey.split('_').map(Number);
      const item = items.find(i => i.id === itemId);
      const service = item?.services?.find(s => s.service_category_id === catId);
      if (service) sub += service.price * qty;
    });

    const bestOffer = offers
      ?.filter(o => o.is_active && sub >= o.min_order_amount)
      .map(o => {
        const calculatedDiscount = o.discount_type === 'PERCENTAGE' 
          ? sub * (o.discount_amount / 100) 
          : o.discount_amount;
        return { ...o, calculatedDiscount };
      })
      .sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];
      
    const disc = bestOffer ? bestOffer.calculatedDiscount : 0;
    
    return { subtotal: sub, discount: disc, total: Math.max(0, sub - disc) };
  }, [cart, items, offers]);

  const effectiveWalletBalance = walletBalance + (order?.credits_used || 0);
  const maxUsableCredits = Math.min(effectiveWalletBalance, total);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => ordersService.updateMyOrder(order.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order.id.toString()] });
      toast.success("Order items updated successfully!");
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update items")
  });

  const handleSave = () => {
    if (subtotal === 0) return toast.error('You cannot save an empty order. Use Cancel Order instead.');
    
    const payloadItems = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [itemId, catId] = key.split('_').map(Number);
        return { item_id: itemId, service_category_id: catId, estimated_quantity: qty };
      });

    updateMutation.mutate({ 
      items: payloadItems, 
      credits_to_use: useWallet ? creditsToUse : 0 
    });
  };

  const updateQuantity = (itemId: number, catId: number, delta: number) => {
    setCart(prev => {
      const key = `${itemId}_${catId}`;
      return { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) };
    });
  };

  if (!isOpen || !items) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
      <div className="relative bg-slate-50 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 pb-4 shrink-0 bg-white border-b border-slate-100 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Order Items</h2>
            <p className="text-xs font-bold text-amber-500 flex items-center gap-1 mt-0.5 bg-amber-50 px-2 py-0.5 rounded w-max">
              <AlertCircle size={12}/> Changes affect final price
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Catalog */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          {items.map((item) => {
            const isExpanded = expandedItem === item.id;
            const totalQty = Object.entries(cart).reduce((sum, [k, q]) => k.startsWith(`${item.id}_`) ? sum + q : sum, 0);

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50">
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalQty > 0 && <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">{totalQty} Added</span>}
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && item.services && (
                  <div className="px-4 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-2">
                    {item.services.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{svc.category?.name || "Service"}</p>
                          <p className="text-[10px] font-black text-brand-primary">AED {svc.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, -1); }} className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center active:scale-90"><Minus size={12}/></button>
                          <span className="w-4 text-center font-black text-xs">{cart[`${item.id}_${svc.service_category_id}`] || 0}</span>
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, 1); }} className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90"><Plus size={12}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4">
          <div className="flex justify-between items-center">
             <span className="text-xs font-black uppercase tracking-widest text-slate-400">New Estimated Total</span>
             <span className="text-xl font-black text-slate-900 tracking-tighter">AED {total.toFixed(2)}</span>
          </div>

          <button 
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Save New Items"}
          </button>
        </div>

      </div>
    </div>
  );
};
// import { useState, useMemo, useEffect } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { ordersService } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service'; 
// import { X, Plus, Minus, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
// import { toast } from 'sonner';

// export const EditOrderCartModal = ({ isOpen, onClose, order, walletBalance }: any) => {
//   const queryClient = useQueryClient();
//   const [cart, setCart] = useState<Record<string, number>>({});
//   const [expandedItem, setExpandedItem] = useState<number | null>(null);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);
//   const [useWallet, setUseWallet] = useState(false);

//   const { data: items } = useQuery({ queryKey: ['laundryItems'], queryFn: ordersService.getItems, enabled: isOpen });
//   const { data: offers } = useQuery({ queryKey: ['activeOffers'], queryFn: adminService.getOffers, enabled: isOpen });

//   // Pre-load existing cart when modal opens
//   useEffect(() => {
//     if (isOpen && order?.items) {
//       const initialCart: Record<string, number> = {};
      
//       order.items.forEach((i: any) => {
//         // FIX: Safely extract the ID from either the raw property or the nested object
//         const itemId = i.item_id || i.item?.id;
//         const catId = i.service_category_id || i.service_category?.id;
        
//         // Only add to cart if we successfully extracted valid IDs
//         if (itemId && catId) {
//           initialCart[`${itemId}_${catId}`] = i.estimated_quantity;
//         }
//       });
      
//       setCart(initialCart);
      
//       if (order.credits_used > 0) {
//         setUseWallet(true);
//         setCreditsToUse(order.credits_used);
//       } else {
//         setUseWallet(false);
//         setCreditsToUse(0);
//       }
//     }
//   }, [isOpen, order]);

//   // Matrix math calculation
//   const { subtotal, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, discount: 0, total: 0 };
//     let sub = 0;
//     Object.entries(cart).forEach(([cartKey, qty]) => {
//       if (qty <= 0) return;
//       const [itemId, catId] = cartKey.split('_').map(Number);
//       const item = items.find(i => i.id === itemId);
//       const service = item?.services?.find(s => s.service_category_id === catId);
//       if (service) sub += service.price * qty;
//     });

//     const bestOffer = offers?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;
    
//     return { subtotal: sub, discount: disc, total: Math.max(0, sub - disc) };
//   }, [cart, items, offers]);

//   // The true available balance includes the refund they are about to get from editing this order
//   const effectiveWalletBalance = walletBalance + (order?.credits_used || 0);
//   const maxUsableCredits = Math.min(effectiveWalletBalance, total);

//   const updateMutation = useMutation({
//     mutationFn: (payload: any) => ordersService.updateMyOrder(order.id, payload),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['order', order.id.toString()] });
//       toast.success("Order items updated successfully!");
//       onClose();
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update items")
//   });

//   const handleSave = () => {
//     if (subtotal === 0) return toast.error('You cannot save an empty order. Use Cancel Order instead.');
    
//     const payloadItems = Object.entries(cart)
//       .filter(([_, qty]) => qty > 0)
//       .map(([key, qty]) => {
//         const [itemId, catId] = key.split('_').map(Number);
//         return { item_id: itemId, service_category_id: catId, estimated_quantity: qty };
//       });

//     updateMutation.mutate({ 
//       items: payloadItems, 
//       credits_to_use: useWallet ? creditsToUse : 0 
//     });
//   };

//   const updateQuantity = (itemId: number, catId: number, delta: number) => {
//     setCart(prev => {
//       const key = `${itemId}_${catId}`;
//       return { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) };
//     });
//   };

//   if (!isOpen || !items) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
//       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
//       <div className="relative bg-slate-50 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
//         {/* Header */}
//         <div className="p-6 pb-4 shrink-0 bg-white border-b border-slate-100 flex justify-between items-center z-10">
//           <div>
//             <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Order Items</h2>
//             <p className="text-xs font-bold text-amber-500 flex items-center gap-1 mt-0.5 bg-amber-50 px-2 py-0.5 rounded w-max">
//               <AlertCircle size={12}/> Changes affect final price
//             </p>
//           </div>
//           <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
//             <X size={20} className="text-slate-500" />
//           </button>
//         </div>

//         {/* Scrollable Catalog */}
//         <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
//           {items.map((item) => {
//             const isExpanded = expandedItem === item.id;
//             const totalQty = Object.entries(cart).reduce((sum, [k, q]) => k.startsWith(`${item.id}_`) ? sum + q : sum, 0);

//             return (
//               <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
//                 <div onClick={() => setExpandedItem(isExpanded ? null : item.id)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50">
//                   <div>
//                     <p className="font-bold text-slate-800">{item.name}</p>
//                   </div>
//                   <div className="flex items-center gap-3">
//                     {totalQty > 0 && <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">{totalQty} Added</span>}
//                     {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
//                   </div>
//                 </div>

//                 {isExpanded && item.services && (
//                   <div className="px-4 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-2">
//                     {item.services.map((svc) => (
//                       <div key={svc.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
//                         <div>
//                           <p className="text-xs font-bold text-slate-700">{svc.category?.name || "Service"}</p>
//                           <p className="text-[10px] font-black text-brand-primary">AED {svc.price}</p>
//                         </div>
//                         <div className="flex items-center gap-3">
//                           <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, -1); }} className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center active:scale-90"><Minus size={12}/></button>
//                           <span className="w-4 text-center font-black text-xs">{cart[`${item.id}_${svc.service_category_id}`] || 0}</span>
//                           <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, 1); }} className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90"><Plus size={12}/></button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         {/* Footer & Wallet */}
//         <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4">
//           <div className="flex justify-between items-center">
//              <span className="text-xs font-black uppercase tracking-widest text-slate-400">New Estimated Total</span>
//              <span className="text-xl font-black text-slate-900 tracking-tighter">AED {total.toFixed(2)}</span>
//           </div>

//           <button 
//             onClick={handleSave}
//             disabled={updateMutation.isPending}
//             className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
//           >
//             {updateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Save New Items"}
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// };