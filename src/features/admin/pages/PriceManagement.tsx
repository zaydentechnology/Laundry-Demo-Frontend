import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { Edit2, PlusCircle, Loader2, Tags,Trash2 } from 'lucide-react'; // Removed Shirt logo
import { useState } from 'react';
import { ServiceItemModal } from '../components/ServiceItemModal';
import { CategoryManagementModal } from '../components/CategoryManagementModal'; 
import { toast } from 'sonner';

export const PriceManagement = () => {
  // 1. Manage Modal Visibility
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false); 
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const queryClient = useQueryClient();
const deleteItemMutation = useMutation({
  mutationFn: adminService.deleteItem,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['serviceItems'] });
    toast.success("Item deleted successfully");
  },
  onError: () => toast.error("Failed to delete item")
});

  // 2. Fetch Laundry Items
  const { data: items, isLoading } = useQuery({
    queryKey: ['serviceItems'],
    queryFn: adminService.getItems,
  });

  const handleEdit = (item: any) => {
    setSelectedItem(item); 
    setIsItemModalOpen(true);
  };

  const handleAddNewItem = () => {
    setSelectedItem(null); 
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Services & Pricing</h1>
          <p className="text-slate-500 font-medium">Manage your laundry catalog and base rates.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* MANAGE SERVICE TYPES BUTTON */}
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 md:flex-none bg-white text-slate-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Tags size={16} /> Service Types
          </button>

          {/* ADD NEW ITEM BUTTON */}
          <button 
            onClick={handleAddNewItem}
            className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
          >
            <PlusCircle size={18} /> Add Item
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase tracking-widest text-[10px]">Updating Catalog...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {items?.map((item: any) => (
  <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-brand-primary/20 transition-all group flex flex-col h-full">
    
    <div className="flex justify-between items-start mb-6">
      <h3 className="text-xl font-black text-slate-900 pr-4">{item.name}</h3>
      <div className="flex gap-2">
        <button
          onClick={() => handleEdit(item)}
          className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm shrink-0"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to permanently delete ${item.name}?`)) {
              deleteItemMutation.mutate(item.id);
            }
          }}
          className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>

    <div className="mt-auto pt-4 border-t border-slate-100/50">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Configured Services</p>
      
      <div className="space-y-1.5">
        {item.services && item.services.length > 0 ? (
          item.services.map((svc: any, idx: number) => {
            const isDiscounted = svc.is_discount_active && svc.discount_value > 0;
            const finalPrice = isDiscounted 
              ? (svc.discount_type === 'PERCENTAGE' ? svc.price * (1 - svc.discount_value / 100) : Math.max(0, svc.price - svc.discount_value))
              : svc.price;

            return (
              <div key={idx} className={`flex justify-between items-center p-2.5 rounded-xl border ${isDiscounted ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-50'}`}>
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  {isDiscounted && <Tags size={10} className="text-amber-500" />}
                  {svc.category?.name || "Standard Service"}
                </span>
                <div className="flex items-center gap-2">
                  {isDiscounted && (
                    <span className="text-[10px] font-bold text-slate-400 line-through decoration-red-400/50">AED {svc.price?.toFixed(2)}</span>
                  )}
                  <span className={`text-sm font-black tracking-tight ${isDiscounted ? 'text-amber-600' : 'text-slate-900'}`}>
                    AED {finalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-50 p-4 rounded-xl text-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pricing configured</span>
          </div>
        )}
      </div>
    </div>
    
  </div>
))}
        </div>
      )}

      {/* MODALS */}
      <ServiceItemModal 
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedItem(null);
        }}
        initialData={selectedItem}
      />

      <CategoryManagementModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};
// import { useQuery } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { Shirt, Edit2, PlusCircle, Loader2, Tags } from 'lucide-react'; // Added Tags icon
// import { useState } from 'react';
// import { ServiceItemModal } from '../components/ServiceItemModal';
// import { CategoryManagementModal } from '../components/CategoryManagementModal'; // <-- IMPORT NEW MODAL

// export const PriceManagement = () => {
//   // 1. Manage Modal Visibility
//   const [isItemModalOpen, setIsItemModalOpen] = useState(false);
//   const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false); // <-- NEW STATE
//   const [selectedItem, setSelectedItem] = useState<any>(null);

//   // 2. Fetch Laundry Items
//   const { data: items, isLoading } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//   });

//   const handleEdit = (item: any) => {
//     setSelectedItem(item); 
//     setIsItemModalOpen(true);
//   };

//   const handleAddNewItem = () => {
//     setSelectedItem(null); 
//     setIsItemModalOpen(true);
//   };

//   return (
//     <div className="space-y-8">
//       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Services & Pricing</h1>
//           <p className="text-slate-500 font-medium">Manage your laundry catalog and base rates.</p>
//         </div>
        
//         <div className="flex items-center gap-3 w-full md:w-auto">
//           {/* MANAGE SERVICE TYPES BUTTON */}
//           <button 
//             onClick={() => setIsCategoryModalOpen(true)}
//             className="flex-1 md:flex-none bg-white text-slate-700 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
//           >
//             <Tags size={16} /> Service Types
//           </button>

//           {/* ADD NEW ITEM BUTTON */}
//           <button 
//             onClick={handleAddNewItem}
//             className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//           >
//             <PlusCircle size={18} /> Add Item
//           </button>
//         </div>
//       </header>

//       {/* ... KEEP YOUR EXISTING LOADING AND GRID RENDER CODE EXACTLY THE SAME ... */}
//       {isLoading ? (
//         <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//           <Loader2 className="animate-spin mb-4" size={40} />
//           <p className="font-bold uppercase tracking-widest text-[10px]">Updating Catalog...</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {items?.map((item: any) => (
//             <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-brand-primary/20 transition-all group relative overflow-hidden">
//               <div className="flex justify-between items-start mb-6">
//                 <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                   <Shirt size={28} />
//                 </div>
                
//                 <button
//                   onClick={() => handleEdit(item)}
//                   className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm z-10 relative"
//                 >
//                   <Edit2 size={16} />
//                 </button>
//               </div>

//               <div className="relative z-10">
//                 <h3 className="text-lg font-black text-slate-900 mb-1">{item.name}</h3>
//                 <div className="flex items-baseline gap-2 mb-2">
//                   <span className="text-2xl font-black text-slate-900 tracking-tighter">AED {item.base_price}</span>
//                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ per item</span>
//                 </div>
                
//                 {/* Optional: Show a quick badge if it has custom services */}
//                 {item.services && item.services.length > 0 && (
//                   <span className="inline-block bg-brand-primary/10 text-brand-primary text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">
//                     +{item.services.length} Custom Services
//                   </span>
//                 )}
//               </div>
              
//               <Shirt className="absolute -right-4 -bottom-4 text-slate-50 opacity-40 group-hover:text-brand-primary/5 transition-colors" size={100} />
//             </div>
//           ))}
//         </div>
//       )}

//       {/* MODALS */}
//       <ServiceItemModal 
//         isOpen={isItemModalOpen}
//         onClose={() => {
//           setIsItemModalOpen(false);
//           setSelectedItem(null);
//         }}
//         initialData={selectedItem}
//       />

//       {/* NEW: Mount the Category Manager Modal */}
//       <CategoryManagementModal 
//         isOpen={isCategoryModalOpen}
//         onClose={() => setIsCategoryModalOpen(false)}
//       />
//     </div>
//   );
// };
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { Shirt, Edit2, PlusCircle, Loader2 } from 'lucide-react';
// import { useState } from 'react';
// import { ServiceItemModal } from '../components/ServiceItemModal';

// export const PriceManagement = () => {
//   const queryClient = useQueryClient();
  
//   // 1. Manage Modal Visibility and Selection
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedItem, setSelectedItem] = useState<any>(null);

//   // 2. Fetch Laundry Items
//   const { data: items, isLoading } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//   });

//   const handleEdit = (item: any) => {
//     setSelectedItem(item); // Load existing item data into state
//     setIsModalOpen(true);
//   };

//   const handleAddNew = () => {
//     setSelectedItem(null); // Clear selection so modal knows it's a NEW item
//     setIsModalOpen(true);
//   };

//   return (
//     <div className="space-y-8">
//       <header className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Services & Pricing</h1>
//           <p className="text-slate-500 font-medium">Manage your laundry catalog and base rates.</p>
//         </div>
        
//         {/* ADD NEW CATEGORY BUTTON */}
//         <button 
//           onClick={handleAddNew}
//           className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary transition-all shadow-xl shadow-slate-200"
//         >
//           <PlusCircle size={18} /> Add Category
//         </button>
//       </header>

//       {isLoading ? (
//         <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//           <Loader2 className="animate-spin mb-4" size={40} />
//           <p className="font-bold uppercase tracking-widest text-[10px]">Updating Catalog...</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {items?.map((item: any) => (
//             <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-brand-primary/20 transition-all group relative overflow-hidden">
//               <div className="flex justify-between items-start mb-6">
//                 <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                   <Shirt size={28} />
//                 </div>
                
//                 {/* EDIT BUTTON (Triggers Modal) */}
//                 <button
//                   onClick={() => handleEdit(item)}
//                   className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
//                 >
//                   <Edit2 size={16} />
//                 </button>
//               </div>

//               <div>
//                 <h3 className="text-lg font-black text-slate-900 mb-1">{item.name}</h3>
//                 <div className="flex items-baseline gap-2">
//                   <span className="text-2xl font-black text-slate-900 tracking-tighter">AED {item.base_price}</span>
//                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ per item</span>
//                 </div>
//               </div>
              
//               {/* Decorative background shirt icon */}
//               <Shirt className="absolute -right-4 -bottom-4 text-slate-50 opacity-40 group-hover:text-brand-primary/5 transition-colors" size={100} />
//             </div>
//           ))}
//         </div>
//       )}

//       {/* MODAL COMPONENT */}
//       <ServiceItemModal 
//         isOpen={isModalOpen}
//         onClose={() => {
//           setIsModalOpen(false);
//           setSelectedItem(null);
//         }}
//         initialData={selectedItem}
//       />
//     </div>
//   );
// };
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { Shirt, Edit2, Check, X, PlusCircle } from 'lucide-react';
// import { useState } from 'react';
// import { toast } from 'sonner';

// export const PriceManagement = () => {
//   const queryClient = useQueryClient();
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [tempPrice, setTempPrice] = useState<number>(0);

//   const { data: items, isLoading } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems, // Fetching directly from backend
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, price }: { id: number, price: number }) => adminService.updateItemPrice(id, price),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['serviceItems'] });
//       setEditingId(null);
//       toast.success("Price updated successfully");
//     }
//   });

//   return (
//     <div className="space-y-8">
//       <header className="flex justify-between items-end">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Services & Pricing</h1>
//           <p className="text-slate-500 font-medium">Set the base rates for all laundry categories.</p>
//         </div>
//         <button className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-brand-primary transition-all">
//           <PlusCircle size={18} /> Add Category
//         </button>
//       </header>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {items?.map((item: any) => (
//           <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-brand-primary/20 transition-all group">
//             <div className="flex justify-between items-start mb-6">
//               <div className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                 <Shirt size={28} />
//               </div>
              
//               {editingId === item.id ? (
//                 <div className="flex gap-1">
//                   <button onClick={() => updateMutation.mutate({ id: item.id, price: tempPrice })} className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-100">
//                     <Check size={16} />
//                   </button>
//                   <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl">
//                     <X size={16} />
//                   </button>
//                 </div>
//               ) : (
//                 <button 
//                   onClick={() => { setEditingId(item.id); setTempPrice(item.base_price); }}
//                   className="p-2 bg-slate-50 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
//                 >
//                   <Edit2 size={16} />
//                 </button>
//               )}
//             </div>

//             <div>
//               <h3 className="text-lg font-black text-slate-900 mb-1">{item.name}</h3>
//               <div className="flex items-baseline gap-2">
//                 {editingId === item.id ? (
//                   <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1 mt-2 ring-2 ring-brand-primary">
//                     <span className="text-xs font-black text-slate-400">AED</span>
//                     <input 
//                       autoFocus
//                       type="number" 
//                       value={tempPrice}
//                       onChange={(e) => setTempPrice(Number(e.target.value))}
//                       className="w-20 bg-transparent border-none p-0 focus:ring-0 font-black text-xl text-slate-900"
//                     />
//                   </div>
//                 ) : (
//                   <>
//                     <span className="text-2xl font-black text-slate-900 tracking-tighter">AED {item.base_price}</span>
//                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ per item</span>
//                   </>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
// // src/features/admin/pages/PriceManagement.tsx
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { Edit3, Plus, Save, Shirt } from 'lucide-react';
// import { useState } from 'react';
// import { adminService } from '../api/admin.service';

// export const PriceManagement = () => {
//   const queryClient = useQueryClient();
//   const [editingId, setEditingId] = useState<number | null>(null);
//   const [tempPrice, setTempPrice] = useState<string>("");

//   const { data: items, isLoading } = useQuery({
//     queryKey: ['adminItems'],
//     queryFn: adminService.getItems
//   });

//   const updatePriceMutation = useMutation({
//     mutationFn: ({ id, price }: { id: number; price: number }) => adminService.updateItemPrice(id, price),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminItems'] });
//       setEditingId(null);
//     }
//   });

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Price List</h1>
//         <button className="bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform">
//           <Plus size={18} /> Add New Item
//         </button>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {items?.map((item: any) => (
//           <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-primary/40 transition-all">
//             <div className="flex items-center gap-4">
//               <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                 <Shirt size={22} />
//               </div>
//               <div>
//                 <p className="font-bold text-slate-900">{item.name}</p>
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Rate</p>
//               </div>
//             </div>

//             <div className="text-right">
//               {editingId === item.id ? (
//                 <div className="flex items-center gap-2">
//                   <input 
//                     type="number" 
//                     className="w-20 bg-slate-50 border-none rounded-lg p-2 text-right font-black text-brand-primary focus:ring-2 focus:ring-brand-primary"
//                     value={tempPrice}
//                     onChange={(e) => setTempPrice(e.target.value)}
//                   />
//                   <button onClick={() => updatePriceMutation.mutate({ id: item.id, price: parseFloat(tempPrice) })} className="p-2 bg-emerald-500 text-white rounded-lg">
//                     <Save size={16} />
//                   </button>
//                 </div>
//               ) : (
//                 <div className="flex flex-col items-end">
//                   <span className="text-lg font-black text-slate-900 tracking-tighter">AED {item.base_price}</span>
//                   <button 
//                     onClick={() => { setEditingId(item.id); setTempPrice(item.base_price.toString()); }}
//                     className="text-[10px] font-bold text-brand-primary uppercase hover:underline flex items-center gap-1"
//                   >
//                     <Edit3 size={10} /> Edit
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };