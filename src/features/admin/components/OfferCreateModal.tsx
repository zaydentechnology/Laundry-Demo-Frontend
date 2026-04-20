import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { X, Tag, DollarSign, Info, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/utils/cn';

// 1. Validation Schema with Updated Business Logic
const offerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  min_order_amount: z.coerce.number().min(1, "Minimum amount is 1 AED"),
  discount_type: z.enum(["FIXED", "PERCENTAGE"]),
  discount_amount: z.coerce.number().min(1, "Discount must be at least 1"),
  start_date: z.string().refine((date) => new Date(date) >= new Date(new Date().setHours(0,0,0,0)), {
    message: "Start date cannot be in the past",
  }),
  end_date: z.string(),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date",
  path: ["end_date"],
}).refine((data) => {
  if (data.discount_type === 'FIXED') return data.discount_amount < data.min_order_amount;
  return true;
}, {
  message: "Discount cannot exceed minimum order amount",
  path: ["discount_amount"],
}).refine((data) => {
  if (data.discount_type === 'PERCENTAGE') return data.discount_amount <= 100;
  return true;
}, {
  message: "Percentage cannot exceed 100%",
  path: ["discount_amount"],
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OfferCreateModal = ({ isOpen, onClose }: Props) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema) as any,
    defaultValues: {
      discount_type: "FIXED",
      start_date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const currentType = watch("discount_type");

  const mutation = useMutation({
    mutationFn: adminService.createOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOffers'] });
      toast.success("New promotion is now live!");
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create offer");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Offer</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">New Promotion Campaign</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit((data) => mutation.mutate(data as any))} className="space-y-5">
            {/* Offer Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Name</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  {...register('name')}
                  placeholder="e.g., Summer Special 2026"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary transition-all"
                />
              </div>
              {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
            </div>

            {/* Type Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-2xl w-max">
              <button 
                type="button" 
                onClick={() => setValue('discount_type', 'FIXED')}
                className={cn("px-6 py-2 text-xs font-black rounded-xl transition-all", currentType === 'FIXED' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
              >
                AED OFF
              </button>
              <button 
                type="button" 
                onClick={() => setValue('discount_type', 'PERCENTAGE')}
                className={cn("px-6 py-2 text-xs font-black rounded-xl transition-all", currentType === 'PERCENTAGE' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
              >
                % OFF
              </button>
            </div>

            {/* Pricing Logic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Order (AED)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="number"
                    {...register('min_order_amount')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                {errors.min_order_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.min_order_amount.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Discount ({currentType === 'FIXED' ? 'AED' : '%'})
                </label>
                <div className="relative">
                  {currentType === 'FIXED' ? (
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  ) : (
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  )}
                  <input 
                    type="number"
                    {...register('discount_amount')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary text-brand-primary"
                  />
                </div>
                {errors.discount_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.discount_amount.message}</p>}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts On</label>
                <input 
                  type="date"
                  {...register('start_date')}
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
                />
                {errors.start_date && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.start_date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends On</label>
                <input 
                  type="date"
                  {...register('end_date')}
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
                />
                {errors.end_date && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.end_date.message}</p>}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 mt-4">
               <Info className="text-blue-500 shrink-0" size={20} />
               <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                 Offers are applied automatically at checkout. Ensure the end date is far enough in the future to cover multi-day order processing.
               </p>
            </div>

            <button 
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 mt-4"
            >
              {mutation.isPending ? "Configuring Campaign..." : "Launch Offer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { X, Tag, DollarSign, Info } from 'lucide-react';
// import { toast } from 'sonner';
// import { format } from 'date-fns';

// // 1. Validation Schema with Business Logic
// const offerSchema = z.object({
//   name: z.string().min(3, "Name must be at least 3 characters"),
//   min_order_amount: z.coerce.number().min(1, "Minimum amount is 1 AED"),
//   discount_amount: z.coerce.number().min(1, "Discount must be at least 1 AED"),
//   start_date: z.string().refine((date) => new Date(date) >= new Date(new Date().setHours(0,0,0,0)), {
//     message: "Start date cannot be in the past",
//   }),
//   end_date: z.string(),
// }).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
//   message: "End date must be after start date",
//   path: ["end_date"],
// }).refine((data) => data.discount_amount < data.min_order_amount, {
//   message: "Discount cannot exceed minimum order amount",
//   path: ["discount_amount"],
// });

// type OfferFormValues = z.infer<typeof offerSchema>;

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
// }

// export const OfferCreateModal = ({ isOpen, onClose }: Props) => {
//   const queryClient = useQueryClient();
//   const { register, handleSubmit, formState: { errors }, reset } = useForm<OfferFormValues>({
//     resolver: zodResolver(offerSchema) as any,
//     defaultValues: {
//       start_date: format(new Date(), 'yyyy-MM-dd'),
//     }
//   });

//   const mutation = useMutation({
//     mutationFn: adminService.createOffer,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminOffers'] });
//       toast.success("New promotion is now live!");
//       reset();
//       onClose();
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || "Failed to create offer");
//     }
//   });

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
//       {/* Modal */}
//       <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
//         <div className="p-8">
//           <div className="flex justify-between items-center mb-8">
//             <div>
//               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Offer</h2>
//               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">New Promotion Campaign</p>
//             </div>
//             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
//               <X size={20} className="text-slate-400" />
//             </button>
//           </div>

// <form onSubmit={handleSubmit((data) => mutation.mutate(data as any))} className="space-y-5">            {/* Offer Name */}
//             <div className="space-y-1.5">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Campaign Name</label>
//               <div className="relative">
//                 <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input 
//                   {...register('name')}
//                   placeholder="e.g., Summer Special 2026"
//                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary transition-all"
//                 />
//               </div>
//               {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
//             </div>

//             {/* Pricing Logic */}
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Order (AED)</label>
//                 <div className="relative">
//                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                   <input 
//                     type="number"
//                     {...register('min_order_amount')}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
//                   />
//                 </div>
//                 {errors.min_order_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.min_order_amount.message}</p>}
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount (AED)</label>
//                 <div className="relative">
//                   <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} fill="currentColor" />
//                   <input 
//                     type="number"
//                     {...register('discount_amount')}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary text-brand-primary"
//                   />
//                 </div>
//                 {errors.discount_amount && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.discount_amount.message}</p>}
//               </div>
//             </div>

//             {/* Dates */}
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts On</label>
//                 <input 
//                   type="date"
//                   {...register('start_date')}
//                   className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
//                 />
//                 {errors.start_date && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.start_date.message}</p>}
//               </div>

//               <div className="space-y-1.5">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends On</label>
//                 <input 
//                   type="date"
//                   {...register('end_date')}
//                   className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-primary"
//                 />
//                 {errors.end_date && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.end_date.message}</p>}
//               </div>
//             </div>

//             <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 mt-4">
//                <Info className="text-blue-500 shrink-0" size={20} />
//                <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
//                  Offers are applied automatically at checkout. Ensure the end date is far enough in the future to cover multi-day order processing.
//                </p>
//             </div>

//             <button 
//               type="submit"
//               disabled={mutation.isPending}
//               className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 mt-4"
//             >
//               {mutation.isPending ? "Configuring Campaign..." : "Launch Offer"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// // Internal icon for the zap
// const Zap = ({ size, className, fill }: any) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
//     <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
//   </svg>
// );