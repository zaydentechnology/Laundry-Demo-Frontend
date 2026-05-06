import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminService, type LaundryItem } from '../api/admin.service';
import { X, Shirt, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// 1. Zod Schema
const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  services: z.array(
    z.object({
      service_category_id: z.coerce.number().min(1, "Select a category"),
      price: z.coerce.number().positive("Price must be > 0").min(0.5, "Min 0.50 AED"),
      is_discount_active: z.boolean().default(false),
      discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
      discount_value: z.coerce.number().min(0).default(0),
    })
  ).optional()
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: LaundryItem | null;
}

export const ServiceItemModal = ({ isOpen, onClose, initialData }: Props) => {
  const queryClient = useQueryClient();
  
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: adminService.getServiceCategories,
  });

  // FIX 1: Properly map the incoming data so existing items load their discounts!
  // FIX 2: Extract 'watch' from useForm to trigger UI re-renders
  const { register, control, handleSubmit, watch, formState: { errors }, reset } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema) as any,
    values: initialData ? { 
      name: initialData.name, 
      services: initialData.services?.map(s => ({
        service_category_id: s.service_category_id,
        price: s.price,
        is_discount_active: s.is_discount_active || false,
        discount_type: s.discount_type || "PERCENTAGE",
        discount_value: s.discount_value || 0
      })) || []
    } : { 
      name: '', 
      services: [{ service_category_id: 0, price: 0, is_discount_active: false, discount_type: "PERCENTAGE", discount_value: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "services"
  });

  // FIX 3: Actively watch the services array so the UI re-renders when a checkbox is clicked
  const watchServices = watch("services");

  const mutation = useMutation({
    mutationFn: (data: ServiceFormValues) => 
      initialData 
        ? adminService.updateItem(initialData.id, data as any) 
        : adminService.createItem(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceItems'] });
      toast.success(initialData ? "Item matrix updated successfully" : "New item added to catalog");
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Something went wrong");
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 pb-4 shrink-0 border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {initialData ? 'Update Matrix' : 'New Service Matrix'}
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                Base Item & Custom Pricing
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          <form id="item-matrix-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">            
            
            {/* BASE ITEM SECTION */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Item Name</label>
                <div className="relative">
                  <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    {...register('name')} 
                    placeholder="e.g. Suit (3-piece)" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
                  />
                </div>
                {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* DYNAMIC MATRIX SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Custom Service Pricing (Optional)</label>
                <button 
                  type="button" 
                  onClick={() => append({ service_category_id: 0, price: 0, is_discount_active: false, discount_type: "PERCENTAGE", discount_value: 0 })}
                  className="text-xs font-black text-slate-900 flex items-center gap-1 hover:text-brand-primary transition-colors bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={14} /> Add Service
                </button>
              </div>

              {fields.length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <p className="text-xs font-bold text-slate-400">No custom services added.<br/>It will default to Standard Wash only.</p>
                </div>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => {
                  // FIX 4: Securely check if the current row's discount is active based on real-time watch data
                  const isDiscountActive = watchServices?.[index]?.is_discount_active;

                  return (
                    <div key={field.id} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-200">
                      
                      <div className="flex gap-3 items-start">
                        {/* Category Dropdown */}
                        <div className="flex-1">
                          <select 
                            {...register(`services.${index}.service_category_id`)}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer"
                            disabled={isCategoriesLoading}
                          >
                            <option value={0}>Select Category...</option>
                            {categories?.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          {errors.services?.[index]?.service_category_id && (
                            <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">{errors.services[index].service_category_id?.message}</p>
                          )}
                        </div>

                        {/* Matrix Price Input */}
                        <div className="w-1/3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black">AED</span>
                            <input 
                              type="number" 
                              step="0.01"
                              {...register(`services.${index}.price`)} 
                              className="w-full pl-10 pr-3 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
                            />
                          </div>
                          {errors.services?.[index]?.price && (
                            <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">{errors.services[index].price?.message}</p>
                          )}
                        </div>

                        {/* Remove Button */}
                        <button 
                          type="button" 
                          onClick={() => remove(index)}
                          className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* DISCOUNT TOGGLE & INPUTS */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                          <input 
                            type="checkbox" 
                            {...register(`services.${index}.is_discount_active`)} 
                            className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary h-4 w-4" 
                          />
                          Enable Promo
                        </label>
                        
                        {isDiscountActive && (
                          <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
                            <select 
                              {...register(`services.${index}.discount_type`)} 
                              className="px-3 py-2 text-xs bg-slate-50 border-none rounded-lg font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                            >
                              <option value="PERCENTAGE">% Off</option>
                              <option value="FIXED">AED Off</option>
                            </select>
                            <input 
                              type="number" 
                              step="0.01" 
                              placeholder="Value" 
                              {...register(`services.${index}.discount_value`)} 
                              className="w-full sm:w-24 px-3 py-2 text-xs bg-slate-50 border-none rounded-lg font-bold outline-none focus:ring-2 focus:ring-brand-primary"
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* FOOTER BUTTON */}
        <div className="p-8 pt-4 shrink-0 border-t border-slate-100 bg-slate-50/50">
          <button 
            type="submit"
            form="item-matrix-form"
            disabled={mutation.isPending}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <><Loader2 className="animate-spin" size={16} /> Syncing Matrix...</>
            ) : (
              initialData ? 'Update Matrix' : 'Publish to Catalog'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
// import { useForm, useFieldArray } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';
// import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
// import { adminService, type LaundryItem } from '../api/admin.service';
// import { X, Shirt, DollarSign, Loader2, Plus, Trash2 } from 'lucide-react';
// import { toast } from 'sonner';

// // 1. Upgraded Zod Schema to handle the nested services array
// const serviceSchema = z.object({
//   name: z.string().min(2, "Name must be at least 2 characters"),
//   // base_price: z.coerce.number().positive("Price must be > 0").min(0.5, "Min 0.50 AED"),
//   services: z.array(
//     z.object({
//       service_category_id: z.coerce.number().min(1, "Select a category"),
//       price: z.coerce.number().positive("Price must be > 0").min(0.5, "Min 0.50 AED"),
//       is_discount_active: z.boolean().default(false),
//       discount_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
//       discount_value: z.coerce.number().min(0).default(0),
//     })
//   ).optional()
// });

// type ServiceFormValues = z.infer<typeof serviceSchema>;

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   initialData?: LaundryItem | null;
// }

// export const ServiceItemModal = ({ isOpen, onClose, initialData }: Props) => {
//   const queryClient = useQueryClient();
  
//   // 2. Fetch the available service categories (Dry Clean, Ironing, etc.)
//   const { data: categories, isLoading: isCategoriesLoading } = useQuery({
//     queryKey: ['serviceCategories'],
//     queryFn: adminService.getServiceCategories,
//   });

//   const { register, control, handleSubmit, formState: { errors }, reset } = useForm<ServiceFormValues>({
//     resolver: zodResolver(serviceSchema) as any,
//     values: initialData ? { 
//       name: initialData.name, 
//       services: initialData.services?.map(s => ({
//         service_category_id: s.service_category_id,
//         price: s.price
//       })) || []
//     } : { 
//       name: '', 
//       services: [{ service_category_id: 0, price: 0 }] // Start with one empty row automatically
//     }
//   });

//   // 3. Initialize dynamic field array
//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "services"
//   });

//   const mutation = useMutation({
//     mutationFn: (data: ServiceFormValues) => 
//       initialData 
//         ? adminService.updateItem(initialData.id, data as any) 
//         : adminService.createItem(data as any),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['serviceItems'] });
//       toast.success(initialData ? "Item matrix updated successfully" : "New item added to catalog");
//       reset();
//       onClose();
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || "Something went wrong");
//     }
//   });

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
//       <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
//       <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
//         {/* HEADER */}
//         <div className="p-8 pb-4 shrink-0 border-b border-slate-100">
//           <div className="flex justify-between items-center">
//             <div>
//               <h2 className="text-2xl font-black text-slate-900 tracking-tight">
//                 {initialData ? 'Update Matrix' : 'New Service Matrix'}
//               </h2>
//               <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
//                 Base Item & Custom Pricing
//               </p>
//             </div>
//             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
//               <X size={20} className="text-slate-400" />
//             </button>
//           </div>
//         </div>

//         {/* SCROLLABLE FORM BODY */}
//         <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
//           <form id="item-matrix-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-8">            
            
//             {/* BASE ITEM SECTION */}
//             <div className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Item Name</label>
//                 <div className="relative">
//                   <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                   <input 
//                     {...register('name')} 
//                     placeholder="e.g. Suit (3-piece)" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
//                   />
//                 </div>
//                 {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
//               </div>

//               {/* <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Standard Wash Price (AED)</label>
//                 <div className="relative">
//                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                   <input 
//                     type="number" 
//                     step="0.01" 
//                     {...register('base_price')} 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
//                   />
//                 </div>
//                 {errors.base_price && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.base_price.message}</p>}
//               </div> */}
//             </div>

//             <hr className="border-slate-100" />

//             {/* DYNAMIC MATRIX SECTION */}
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest ml-1">Custom Service Pricing (Optional)</label>
//                 <button 
//                   type="button" 
//                   onClick={() => append({ service_category_id: 0, price: 0 })}
//                   className="text-xs font-black text-slate-900 flex items-center gap-1 hover:text-brand-primary transition-colors bg-slate-100 px-3 py-1.5 rounded-lg"
//                 >
//                   <Plus size={14} /> Add Service
//                 </button>
//               </div>

//               {fields.length === 0 && (
//                 <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
//                   <p className="text-xs font-bold text-slate-400">No custom services added.<br/>It will default to Standard Wash only.</p>
//                 </div>
//               )}

//               <div className="space-y-3">
//                 {fields.map((field, index) => (
//                   <div key={field.id} className="flex gap-3 items-start animate-in slide-in-from-top-2 duration-200">
                    
//                     {/* Category Dropdown */}
//                     <div className="flex-1">
//                       <select 
//                         {...register(`services.${index}.service_category_id`)}
//                         className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary appearance-none cursor-pointer"
//                         disabled={isCategoriesLoading}
//                       >
//                         <option value={0}>Select Category...</option>
//                         {categories?.map((cat) => (
//                           <option key={cat.id} value={cat.id}>{cat.name}</option>
//                         ))}
//                       </select>
//                       {errors.services?.[index]?.service_category_id && (
//                         <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">{errors.services[index].service_category_id?.message}</p>
//                       )}
//                     </div>

//                     <div className="flex gap-3 items-center mt-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
//   <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
//     <input type="checkbox" {...register(`services.${index}.is_discount_active`)} className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary" />
//     Enable Discount
//   </label>
  
//   {/* Show inputs only if active */}
//   {control._formValues.services[index]?.is_discount_active && (
//     <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
//       <select {...register(`services.${index}.discount_type`)} className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold outline-none">
//         <option value="PERCENTAGE">% Off</option>
//         <option value="FIXED">AED Off</option>
//       </select>
//       <input 
//         type="number" step="0.01" placeholder="Val" 
//         {...register(`services.${index}.discount_value`)} 
//         className="w-20 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold outline-none focus:border-brand-primary"
//       />
//     </div>
//   )}
// </div>

//                     {/* Matrix Price Input */}
//                     <div className="w-1/3">
//                       <div className="relative">
//                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">AED</span>
//                         <input 
//                           type="number" 
//                           step="0.01"
//                           {...register(`services.${index}.price`)} 
//                           className="w-full pl-12 pr-3 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
//                         />
//                       </div>
//                       {errors.services?.[index]?.price && (
//                         <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">{errors.services[index].price?.message}</p>
//                       )}
//                     </div>

//                     {/* Remove Button */}
//                     <button 
//                       type="button" 
//                       onClick={() => remove(index)}
//                       className="p-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-colors shrink-0"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </form>
//         </div>

//         {/* FOOTER BUTTON */}
//         <div className="p-8 pt-4 shrink-0 border-t border-slate-100 bg-slate-50/50">
//           <button 
//             type="submit"
//             form="item-matrix-form"
//             disabled={mutation.isPending}
//             className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
//           >
//             {mutation.isPending ? (
//               <><Loader2 className="animate-spin" size={16} /> Syncing Matrix...</>
//             ) : (
//               initialData ? 'Update Matrix' : 'Publish to Catalog'
//             )}
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// };
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';
// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService, type LaundryItem } from '../api/admin.service';
// import { X, Shirt, DollarSign, Loader2 } from 'lucide-react';
// import { toast } from 'sonner';

// // Strict validation logic
// const serviceSchema = z.object({
//   name: z.string().min(2, "Name must be at least 2 characters"),
//   base_price: z.coerce.number().positive("Price must be greater than 0").min(0.5, "Minimum price is 0.50 AED"),
// });

// type ServiceFormValues = z.infer<typeof serviceSchema>;

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   initialData?: LaundryItem | null;
// }

// export const ServiceItemModal = ({ isOpen, onClose, initialData }: Props) => {
//   const queryClient = useQueryClient();
  
//   const { register, handleSubmit, formState: { errors }, reset } = useForm<ServiceFormValues>({
//     resolver: zodResolver(serviceSchema) as any,
//     // This ensures the form resets when the modal opens with new/existing data
//     values: initialData ? { name: initialData.name, base_price: initialData.base_price } : { name: '', base_price: 0 }
//   });

//   const mutation = useMutation({
//     mutationFn: (data: ServiceFormValues) => 
//       initialData 
//         ? adminService.updateItem(initialData.id, data) 
//         : adminService.createItem(data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['serviceItems'] });
//       toast.success(initialData ? "Item updated successfully" : "New service added to catalog");
//       reset();
//       onClose();
//     },
//     onError: (error: any) => {
//       toast.error(error.response?.data?.detail || "Something went wrong");
//     }
//   });

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6">
//       <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
//       <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
//         <div className="p-8">
//           <div className="flex justify-between items-center mb-8">
//             <h2 className="text-2xl font-black text-slate-900 tracking-tight">
//               {initialData ? 'Update Service' : 'New Service'}
//             </h2>
//             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
//               <X size={20} className="text-slate-400" />
//             </button>
//           </div>

// <form onSubmit={handleSubmit((data) => mutation.mutate(data as any))} className="space-y-6">            <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
//               <div className="relative">
//                 <Shirt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input 
//                   {...register('name')} 
//                   placeholder="e.g. Suit (3-piece)" 
//                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
//                 />
//               </div>
//               {errors.name && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.name.message}</p>}
//             </div>

//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (AED)</label>
//               <div className="relative">
//                 <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input 
//                   type="number" 
//                   step="0.01" 
//                   {...register('base_price')} 
//                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary" 
//                 />
//               </div>
//               {errors.base_price && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.base_price.message}</p>}
//             </div>

//             <button 
//               disabled={mutation.isPending}
//               className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
//             >
//               {mutation.isPending ? (
//                 <><Loader2 className="animate-spin" size={16} /> Syncing with Server...</>
//               ) : (
//                 initialData ? 'Update Catalog' : 'Add to Catalog'
//               )}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };