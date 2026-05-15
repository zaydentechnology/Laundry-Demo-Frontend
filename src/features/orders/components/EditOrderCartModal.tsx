// src/features/orders/components/EditOrderCartModal.tsx
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../api/orders.service';
import { X, Plus, Minus, Loader2, ChevronDown, ChevronUp, AlertCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export const EditOrderCartModal = ({ isOpen, onClose, order, walletBalance }: any) => {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [useWallet, setUseWallet] = useState(false);

  // 1. EXACT HISTORICAL EXTRACTION (The Senior Fix)
  const historicalCredits = Number(order?.credits_used || 0);
  const historicalTotalDiscount = Number(order?.discount_applied || 0);
  
  // The Backend combines Promo + Wallet into `discount_applied`. 
  // To get the pure Promo discount the backend authorized, we subtract the credits used.
  const historicalPromoDiscount = Math.max(0, historicalTotalDiscount - historicalCredits);
  const availableWallet = Number(walletBalance || 0);

  const { data: items } = useQuery({ queryKey: ['laundryItems'], queryFn: ordersService.getItems, enabled: isOpen });

  useEffect(() => {
    if (isOpen && order?.items) {
      const initialCart: Record<string, number> = {};
      order.items.forEach((i: any) => {
        const itemId = i.item_id || i.item?.id;
        const catId = i.service_category_id || i.service_category?.id;
        if (itemId && catId) {
          const qty = i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0);
          initialCart[`${itemId}_${catId}`] = qty;
        }
      });
      setCart(initialCart);
      
      // Default the toggle to ON if they previously applied credits
      setUseWallet(historicalCredits > 0);
    }
  }, [isOpen, order, historicalCredits]);

  // 2. PRICING ENGINE (Matches Backend Base Subtotal Perfectly)
  const { priceAfterOffers, subtotal } = useMemo(() => {
    if (!items) return { priceAfterOffers: 0, subtotal: 0 };
    
    let sub = 0;
    Object.entries(cart).forEach(([cartKey, qty]) => {
      if (qty <= 0) return;
      const [itemId, catId] = cartKey.split('_').map(Number);
      const item = items.find(i => i.id === itemId);
      const service = item?.services?.find(s => s.service_category_id === catId);
      
      if (service) {
        let finalPrice = Number(service.price || 0);
        const discountVal = Number(service.discount_value || 0);
        
        // Item-level discounts match the backend logic perfectly
        if (service.is_discount_active && discountVal > 0) {
          if (service.discount_type === 'PERCENTAGE') {
            finalPrice = finalPrice * (1 - discountVal / 100);
          } else {
            finalPrice = Math.max(0, finalPrice - discountVal);
          }
        }
        sub += finalPrice * qty;
      }
    });

    // THE FIX: Apply the EXACT historical global promo instead of hallucinating live offers
    return { 
      subtotal: sub,
      priceAfterOffers: Math.max(0, sub - historicalPromoDiscount) 
    };
  }, [cart, items, historicalPromoDiscount]);

  // 3. WALLET LOGIC (Locks the 2.00 deduction)
  const creditsToApply = useMemo(() => {
    if (!useWallet) return 0;
    
    // If they already used credits on this order, lock the deduction to EXACTLY what they chose (e.g., 2.00).
    // This stops the modal from suddenly draining their active wallet balance.
    const maxAllowed = historicalCredits > 0 ? historicalCredits : availableWallet;
    
    return Math.min(maxAllowed, priceAfterOffers);
  }, [useWallet, historicalCredits, availableWallet, priceAfterOffers]);

  // 4. FINAL CALCULATION (Will output 3.50 and 10.50 exactly as expected)
  const finalPayableTotal = Math.max(0, priceAfterOffers - creditsToApply);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => ordersService.updateMyOrder(order.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order.id.toString()] });
      toast.success("Order updated successfully!");
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed")
  });

  const handleSave = () => {
    const payloadItems = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [itemId, catId] = key.split('_').map(Number);
        return { item_id: itemId, service_category_id: catId, estimated_quantity: qty };
      });

    updateMutation.mutate({ 
      items: payloadItems, 
      credits_to_use: useWallet ? creditsToApply : 0 
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {svc.is_discount_active && (svc.discount_value || 0) > 0 ? (
                              <>
                                <span className="text-[9px] font-bold text-slate-400 line-through">AED {svc.price}</span>
                                <span className="text-[10px] font-black text-amber-500">
                                  AED {svc.discount_type === 'PERCENTAGE' 
                                    ? (svc.price * (1 - (svc.discount_value || 0) / 100)).toFixed(2) 
                                    : Math.max(0, svc.price - (svc.discount_value || 0)).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-black text-brand-primary">AED {svc.price}</span>
                            )}
                          </div>
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

        <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4">
          
          {(historicalCredits > 0 || availableWallet > 0) && (
            <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-800">Apply Wallet Balance</span>
                <span className="text-[10px] font-medium text-emerald-600">
                  {historicalCredits > 0 ? `Original Credits Locked: AED ${historicalCredits.toFixed(2)}` : `Available: AED ${availableWallet.toFixed(2)}`}
                </span>
              </div>
              <input 
                type="checkbox" 
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
              />
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            {useWallet && creditsToApply > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Total after offers</span>
                <span>AED {priceAfterOffers.toFixed(2)}</span>
              </div>
            )}
            {useWallet && creditsToApply > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-500">
                <span>Wallet Credits Applied</span>
                <span>- AED {creditsToApply.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-50">
               <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                 Final Payable Amount
               </span>
               <span className="text-xl font-black text-slate-900 tracking-tighter">
                 AED {finalPayableTotal.toFixed(2)}
               </span>
            </div>
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
// // src/features/orders/components/EditOrderCartModal.tsx
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
//         // Robust ID extraction
//         const itemId = i.item_id || i.item?.id;
//         const catId = i.service_category_id || i.service_category?.id;
        
//         if (itemId && catId) {
//           // BUG FIX 1: Smart fallback so new orders don't show 0
//           const qty = i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0);
//           initialCart[`${itemId}_${catId}`] = qty;
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
//     // BUG FIX 2: We ONLY depend on 'isOpen' now. 
//     // This stops the 5-second refetch interval from wiping out the user's edits!
//   }, [isOpen]); 

//   // // Matrix math calculation
//   // const { subtotal, discount, total } = useMemo(() => {
//   //   if (!items) return { subtotal: 0, discount: 0, total: 0 };
    
//   //   let sub = 0;
//   //   Object.entries(cart).forEach(([cartKey, qty]) => {
//   //     if (qty <= 0) return;
//   //     const [itemId, catId] = cartKey.split('_').map(Number);
//   //     const item = items.find(i => i.id === itemId);
//   //     const service = item?.services?.find(s => s.service_category_id === catId);
//   //     if (service) sub += service.price * qty;
//   //   });

//   //   const bestOffer = offers
//   //     ?.filter(o => o.is_active && sub >= o.min_order_amount)
//   //     .map(o => {
//   //       const calculatedDiscount = o.discount_type === 'PERCENTAGE' 
//   //         ? sub * (o.discount_amount / 100) 
//   //         : o.discount_amount;
//   //       return { ...o, calculatedDiscount };
//   //     })
//   //     .sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];
      
//   //   const disc = bestOffer ? bestOffer.calculatedDiscount : 0;
    
//   //   return { subtotal: sub, discount: disc, total: Math.max(0, sub - disc) };
//   // }, [cart, items, offers]);
//   // Matrix math calculation (NOW WITH ITEM DISCOUNTS)
//   const { subtotal, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, discount: 0, total: 0 };
    
//     let sub = 0;
//     Object.entries(cart).forEach(([cartKey, qty]) => {
//       if (qty <= 0) return;
//       const [itemId, catId] = cartKey.split('_').map(Number);
//       const item = items.find(i => i.id === itemId);
//       const service = item?.services?.find(s => s.service_category_id === catId);
      
//       if (service) {
//         // Apply Item-Level Discount mathematically
//         let finalPrice = service.price;
//         const discountVal = service.discount_value || 0;
        
//         if (service.is_discount_active && discountVal > 0) {
//           if (service.discount_type === 'PERCENTAGE') {
//             finalPrice = service.price * (1 - discountVal / 100);
//           } else {
//             finalPrice = Math.max(0, service.price - discountVal);
//           }
//         }
//         sub += finalPrice * qty;
//       }
//     });

//     // Global cart discount applies to the newly reduced subtotal
//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .map(o => {
//         const calculatedDiscount = o.discount_type === 'PERCENTAGE' 
//           ? sub * (o.discount_amount / 100) 
//           : o.discount_amount;
//         return { ...o, calculatedDiscount };
//       })
//       .sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];
      
//     const disc = bestOffer ? bestOffer.calculatedDiscount : 0;
    
//     return { subtotal: sub, discount: disc, total: Math.max(0, sub - disc) };
//   }, [cart, items, offers]);

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



//   // --- COPY THIS DEBUG BLOCK ---
//   console.log("=== DEBUG MODAL STATE ===");
//   console.log("1. Order Object from Parent:", order);
//   console.log("2. Wallet Balance Prop:", walletBalance);
//   console.log("3. Current Cart State:", cart);
//   console.log("4. Calculated Subtotal:", subtotal);
//   console.log("5. Calculated Total (Before Wallet):", total);
//   console.log("=========================");
//   // -----------------------------

//   // if (!isOpen || !items) return null;
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
//                        <div>
//   <p className="text-xs font-bold text-slate-700">{svc.category?.name || "Service"}</p>
// <div className="flex items-center gap-2 mt-0.5">
//     {svc.is_discount_active && (svc.discount_value || 0) > 0 ? (
//       <>
//         <span className="text-[9px] font-bold text-slate-400 line-through">AED {svc.price}</span>
//         <span className="text-[10px] font-black text-amber-500">
//           AED {svc.discount_type === 'PERCENTAGE' 
//             ? (svc.price * (1 - (svc.discount_value || 0) / 100)).toFixed(2) 
//             : Math.max(0, svc.price - (svc.discount_value || 0)).toFixed(2)}
//         </span>
//       </>
//     ) : (
//       <span className="text-[10px] font-black text-brand-primary">AED {svc.price}</span>
//     )}
//   </div>
// </div>
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

//         {/* Footer */}
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