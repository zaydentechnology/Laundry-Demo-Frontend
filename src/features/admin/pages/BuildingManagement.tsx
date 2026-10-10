// src/features/admin/pages/BuildingManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { Building2, Plus, Edit3, X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const BuildingManagement = () => {
  const queryClient = useQueryClient();
  const [editingBuilding, setEditingBuilding] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: adminService.getBuildings,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => 
      editingBuilding 
        ? adminService.updateBuilding(editingBuilding.id, data)
        : adminService.createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success(`Building ${editingBuilding ? 'updated' : 'added'} successfully`);
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed")
  });

  const openModal = (building: any = null) => {
    if (building) {
      setEditingBuilding(building);
      setName(building.name);
    } else {
      setEditingBuilding(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setName('');
      setEditingBuilding(null);
    }, 200); 
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;

  return (
    <div className="space-y-8 pb-20 relative">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Locations</h1>
          <p className="text-slate-500 font-medium">Manage serviceable buildings and areas.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl hover:bg-brand-primary transition-all"
        >
          <Plus size={16} /> Add Building
        </button>
      </header>

      {/* Building Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((b: any) => (
          <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Building2 size={24} />
              </div>
              <button 
                onClick={() => openModal(b)}
                className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl text-slate-400 transition-all"
              >
                <Edit3 size={16} />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 mb-2 truncate">{b.name}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                Service Active
              </span>
              {!b.is_active && (
                <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">Inactive</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingBuilding ? 'Edit Building' : 'New Building'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zayden Tower"
                  className="w-full mt-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 focus:ring-2 focus:ring-brand-primary transition-all"
                />
              </div>

              {editingBuilding && (
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={editingBuilding.is_active}
                    onChange={(e) => setEditingBuilding({...editingBuilding, is_active: e.target.checked})}
                    className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Building is currently active</label>
                </div>
              )}

              <button 
                // We send flats: [] so the backend doesn't complain about a missing array
                onClick={() => mutation.mutate({ name, flats: [], is_active: editingBuilding?.is_active ?? true })}
                disabled={!name.trim() || mutation.isPending}
                className="w-full mt-4 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {mutation.isPending ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> {editingBuilding ? 'Save Changes' : 'Create Building'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// // src/features/admin/pages/BuildingManagement.tsx
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { Building2, Plus, Edit3, X, Loader2, Save } from 'lucide-react';
// import { toast } from 'sonner';

// export const BuildingManagement = () => {
//   const queryClient = useQueryClient();
//   const [editingBuilding, setEditingBuilding] = useState<any>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   // Form State
//   const [name, setName] = useState('');
//   const [flatInput, setFlatInput] = useState('');
//   const [flats, setFlats] = useState<string[]>([]);

//   const { data: buildings = [], isLoading } = useQuery({
//     queryKey: ['buildings'],
//     queryFn: adminService.getBuildings,
//   });

//   const mutation = useMutation({
//     mutationFn: (data: any) => 
//       editingBuilding 
//         ? adminService.updateBuilding(editingBuilding.id, data)
//         : adminService.createBuilding(data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['buildings'] });
//       toast.success(`Building ${editingBuilding ? 'updated' : 'added'} successfully`);
//       closeModal();
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed")
//   });

//   const openModal = (building: any = null) => {
//     if (building) {
//       setEditingBuilding(building);
//       setName(building.name);
//       setFlats(building.flats || []);
//     } else {
//       setEditingBuilding(null);
//       setName('');
//       setFlats([]);
//     }
//     setFlatInput('');
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setTimeout(() => {
//       setName('');
//       setFlats([]);
//       setFlatInput('');
//       setEditingBuilding(null);
//     }, 200); // Wait for modal animation
//   };

//   const addFlat = (e: React.KeyboardEvent | React.FocusEvent) => {
//     // If user presses Enter or leaves the input field
//     if ((e.type === 'keydown' && (e as React.KeyboardEvent).key === 'Enter') || e.type === 'blur') {
//       e.preventDefault();
//       const val = flatInput.trim();
//       if (val && !flats.includes(val)) {
//         setFlats([...flats, val]);
//       }
//       setFlatInput('');
//     }
//   };

//   const removeFlat = (flatToRemove: string) => {
//     setFlats(flats.filter(f => f !== flatToRemove));
//   };

//   if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-primary" /></div>;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex justify-between items-end">
//         <div>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Locations</h1>
//           <p className="text-slate-500 font-medium">Manage serviceable buildings and flats.</p>
//         </div>
//         <button 
//           onClick={() => openModal()}
//           className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-xl hover:bg-brand-primary transition-all"
//         >
//           <Plus size={16} /> Add Building
//         </button>
//       </header>

//       {/* Building Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         {buildings.map((b: any) => (
//           <div key={b.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
//             <div className="flex justify-between items-start mb-6">
//               <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
//                 <Building2 size={24} />
//               </div>
//               <button 
//                 onClick={() => openModal(b)}
//                 className="p-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl text-slate-400 transition-all"
//               >
//                 <Edit3 size={16} />
//               </button>
//             </div>
            
//             <h3 className="text-xl font-black text-slate-900 mb-2 truncate">{b.name}</h3>
//             <div className="flex flex-wrap gap-2">
//               <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
//                 {b.flats.length} Flats configured
//               </span>
//               {!b.is_active && (
//                 <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">Inactive</span>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Add/Edit Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl space-y-6">
//             <div className="flex justify-between items-center">
//               <h3 className="text-xl font-black text-slate-900">{editingBuilding ? 'Edit Building' : 'New Building'}</h3>
//               <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full"><X size={20} /></button>
//             </div>

//             <div className="space-y-4">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
//                 <input 
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   placeholder="e.g. Zayden Tower"
//                   className="w-full mt-1 p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 focus:ring-2 focus:ring-brand-primary transition-all"
//                 />
//               </div>

//               {/* Tag-based Flat Input Area */}
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat Numbers</label>
//                 <p className="text-[10px] text-slate-400 ml-1 mb-2">Type flat number and press Enter</p>
                
//                 <div className="min-h-[120px] p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-2 items-start focus-within:ring-2 focus-within:ring-brand-primary transition-all">
//                   {flats.map((f, i) => (
//                     <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
//                       {f}
//                       <button onClick={() => removeFlat(f)} className="text-slate-400 hover:text-red-500 ml-1">
//                         <X size={12} />
//                       </button>
//                     </span>
//                   ))}
//                   <input 
//                     value={flatInput}
//                     onChange={(e) => setFlatInput(e.target.value)}
//                     onKeyDown={addFlat}
//                     onBlur={addFlat}
//                     placeholder={flats.length === 0 ? "e.g. 101, A2..." : "Add more..."}
//                     className="flex-1 min-w-[100px] bg-transparent outline-none font-bold text-sm text-slate-900 py-1"
//                   />
//                 </div>
//               </div>

//               {editingBuilding && (
//                 <div className="flex items-center gap-2 pt-2">
//                   <input 
//                     type="checkbox" 
//                     id="isActive"
//                     checked={editingBuilding.is_active}
//                     onChange={(e) => setEditingBuilding({...editingBuilding, is_active: e.target.checked})}
//                     className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary"
//                   />
//                   <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">Building is currently active</label>
//                 </div>
//               )}

//               <button 
//                 onClick={() => mutation.mutate({ name, flats, is_active: editingBuilding?.is_active ?? true })}
//                 disabled={!name.trim() || mutation.isPending}
//                 className="w-full mt-4 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
//               >
//                 {mutation.isPending ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16}/> {editingBuilding ? 'Save Changes' : 'Create Building'}</>}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };