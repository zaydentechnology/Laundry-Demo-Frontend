// src/features/admin/pages/OfferManagement.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { TicketPercent, Plus, Calendar, Target, Zap, Trash2, Loader2 } from 'lucide-react'; // Added Trash2, Loader2
import { toast } from 'sonner';
import { OfferCreateModal } from '../components/OfferCreateModal';
import { useState } from 'react';
import { cn } from '@/utils/cn';

export const OfferManagement = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: offers, isLoading } = useQuery({
    queryKey: ['adminOffers'],
    queryFn: adminService.getOffers,
  });

  // --- THE NEW MUTATION ---
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOffers'] });
      toast.success("Offer successfully deleted");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete offer");
    }
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the "${name}" offer? It will immediately stop applying to new orders.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Only show active offers in the UI, or dim the inactive ones
  const activeOffers = offers?.filter(o => o.is_active) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Promotions</h1>
          <p className="text-slate-500 font-medium">Automated discounts based on order volume.</p>
        </div>
       <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
        >
          <Plus size={18} /> Create New Offer
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
           {[1,2].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2.5rem]" />)}
        </div>
      ) : activeOffers.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-[2.5rem] border border-slate-100">
           <p className="text-slate-500 font-bold">No active promotional campaigns running.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOffers.map((offer) => (
            <div key={offer.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 text-slate-50 opacity-10 group-hover:text-brand-primary group-hover:opacity-5 transition-all duration-500">
                <TicketPercent size={150} strokeWidth={1} />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  
                  {/* DELETE BUTTON */}
                  <button 
                    onClick={() => handleDelete(offer.id, offer.name)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === offer.id}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
                    title="Delete Offer"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === offer.id 
                      ? <Loader2 size={18} className="animate-spin" /> 
                      : <Trash2 size={18} />
                    }
                  </button>
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{offer.name}</h3>

                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-3xl font-black text-brand-primary tracking-tighter">
                    {offer.discount_type === 'PERCENTAGE' 
                      ? `${offer.discount_amount}%` 
                      : `AED ${offer.discount_amount}`}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">OFF</span>
                </div>

                <div className="mt-auto space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400 flex items-center gap-1.5"><Target size={12}/> Min Order</span>
                    <span className="text-slate-900">AED {offer.min_order_amount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={12}/> Expires</span>
                    <span className="text-slate-900">{new Date(offer.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <OfferCreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { TicketPercent, Plus, Calendar, Target, Zap } from 'lucide-react';
// import { toast } from 'sonner';
// import { OfferCreateModal } from '../components/OfferCreateModal';
// import { useState } from 'react';
// import { cn } from '@/utils/cn';

// export const OfferManagement = () => {
//   const queryClient = useQueryClient();
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const { data: offers, isLoading } = useQuery({
//     queryKey: ['adminOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const toggleOfferMutation = useMutation({
//     // Note: Assuming a simple toggle endpoint or update endpoint exists
//     mutationFn: (offer: any) => adminService.createOffer({ ...offer, is_active: !offer.is_active }),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminOffers'] });
//       toast.success("Offer status updated");
//     }
//   });

//   return (
//     <div className="space-y-8">
//       <div className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Promotions</h1>
//           <p className="text-slate-500 font-medium">Automated discounts based on order volume.</p>
//         </div>
//        <button 
//           onClick={() => setIsModalOpen(true)}
//           className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//         >
//           <Plus size={18} /> Create New Offer
//         </button>
//       </div>

//       {isLoading ? (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
//            {[1,2].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2.5rem]" />)}
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {offers?.map((offer) => (
//             <div key={offer.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
//               {/* Abstract Icon Decoration */}
//               <div className="absolute -right-6 -top-6 text-slate-50 opacity-10 group-hover:text-brand-primary group-hover:opacity-5 transition-all duration-500">
//                 <TicketPercent size={150} strokeWidth={1} />
//               </div>

//               <div className="relative z-10 flex flex-col h-full">
//                 <div className="flex justify-between items-start mb-6">
//                   <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
//                     <Zap size={20} fill="currentColor" />
//                   </div>
//                   <span className={cn(
//                     "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full",
//                     offer.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
//                   )}>
//                     {offer.is_active ? 'Live' : 'Inactive'}
//                   </span>
//                 </div>

//                 <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight">{offer.name}</h3>
// {/*                 
//                 <div className="flex items-baseline gap-2 mb-6">
//                   <span className="text-3xl font-black text-brand-primary tracking-tighter">AED {offer.discount_amount}</span>
//                   <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">OFF</span>
//                 </div>
//                  */}


//                 <div className="flex items-baseline gap-2 mb-6">
//                   <span className="text-3xl font-black text-brand-primary tracking-tighter">
//                     {offer.discount_type === 'PERCENTAGE' 
//                       ? `${offer.discount_amount}%` 
//                       : `AED ${offer.discount_amount}`}
//                   </span>
//                   <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">OFF</span>
//                 </div>
//                 <div className="mt-auto space-y-3 pt-6 border-t border-slate-50">
//                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
//                     <span className="text-slate-400 flex items-center gap-1.5"><Target size={12}/> Min Order</span>
//                     <span className="text-slate-900">AED {offer.min_order_amount}</span>
//                   </div>
//                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
//                     <span className="text-slate-400 flex items-center gap-1.5"><Calendar size={12}/> Expires</span>
//                     <span className="text-slate-900">{new Date(offer.end_date).toLocaleDateString()}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       <OfferCreateModal 
//         isOpen={isModalOpen} 
//         onClose={() => setIsModalOpen(false)} 
//       />
//     </div>
//   );
// };