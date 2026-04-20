// src/features/orders/pages/OrderHistory.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '@/api/axios';
import { Package, ChevronRight, Clock, Box, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export const OrderHistory = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => (await api.get('/orders/')).data,
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Fetching your history...</div>;

  // UPDATED LOGIC: Only show truly active orders in the top section
  // Cancelled and Delivered move to the bottom history part
  const activeOrders = orders?.filter((o: any) => 
    o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  ) || [];

  const historyOrders = orders?.filter((o: any) => 
    o.status === 'DELIVERED' || o.status === 'CANCELLED'
  ) || [];

  const OrderCard = ({ order, isMini }: { order: any, isMini?: boolean }) => (
    <Link 
      to={`/orders/${order.id}`}
      className={cn(
        "flex items-center justify-between transition-all active:scale-[0.99]",
        isMini 
          ? "bg-white/50 backdrop-blur-md border border-white p-4 rounded-2xl opacity-80 hover:opacity-100" 
          : "bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-white shadow-sm hover:shadow-md hover:border-brand-primary/40"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center",
          isMini 
            ? order.status === 'CANCELLED' ? "bg-red-50 text-red-400" : "bg-slate-100/80 text-slate-400" 
            : "bg-brand-primary/10 text-brand-primary"
        )}>
          {order.status === 'CANCELLED' ? <XCircle size={22} /> : <Box size={22} />}
        </div>
        <div>
          <p className="font-black text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Clock size={12} />
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span className="text-brand-primary">AED {order.final_price || order.estimated_price}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg",
          order.status === 'DELIVERED' && "bg-slate-200/50 text-slate-600",
          order.status === 'CANCELLED' && "bg-red-100/50 text-red-500",
          (order.status !== 'DELIVERED' && order.status !== 'CANCELLED') && "bg-brand-primary text-white shadow-sm"
        )}>
          {order.status.replace('_', ' ')}
        </span>
        <ChevronRight className="text-slate-300" size={18} />
      </div>
    </Link>
  );

  return (
    <div className="relative min-h-screen">
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg4.jpg')" }}
      />

      <div className="relative z-10 space-y-8 max-w-2xl mx-auto pb-24 px-4 md:px-1 pt-4">
        <header className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm mt-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders</h1>
          <p className="text-slate-500 font-medium">Keep track of your laundry cycle.</p>
        </header>

        {/* ACTIVE ORDERS SECTION */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
            Currently in Progress
          </h3>
          <div className="grid gap-4">
            {activeOrders.length > 0 ? (
              activeOrders.map(order => <OrderCard key={order.id} order={order} />)
            ) : (
              <div className="p-10 text-center bg-white/90 backdrop-blur-xl rounded-3xl border border-white shadow-sm">
                <Package className="mx-auto text-slate-300 mb-3" size={40} />
                <p className="text-xs font-bold text-slate-500">No active laundry. Need a clean?</p>
                <Link to="/orders/new" className="text-xs font-black text-brand-primary uppercase mt-4 block">New Order</Link>
              </div>
            )}
          </div>
        </div>

        {/* ORDER HISTORY SECTION (DELIVERED & CANCELLED) */}
        {historyOrders.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 opacity-80 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white/50">
              Order History
            </h3>
            <div className="grid gap-3">
              {historyOrders.map(order => <OrderCard key={order.id} order={order} isMini={true} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
// // src/features/orders/pages/OrderHistory.tsx
// import { useQuery } from '@tanstack/react-query';
// import { Link } from 'react-router-dom';
// import api from '@/api/axios';
// import { Package, ChevronRight, Clock, Box } from 'lucide-react';
// import { cn } from '@/utils/cn';

// export const OrderHistory = () => {
//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['myOrders'],
//     queryFn: async () => (await api.get('/orders/')).data,
//   });

//   if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Fetching your history...</div>;

//   // Logic: Split orders into Active and Completed
//   const activeOrders = orders?.filter((o: any) => o.status !== 'DELIVERED') || [];
//   const completedOrders = orders?.filter((o: any) => o.status === 'DELIVERED') || [];

//   const OrderCard = ({ order, isMini }: { order: any, isMini?: boolean }) => (
//     <Link 
//       to={`/orders/${order.id}`}
//       className={cn(
//         "flex items-center justify-between transition-all active:scale-[0.99]",
//         isMini 
//           ? "bg-white/50 backdrop-blur-md border border-white p-4 rounded-2xl opacity-70 grayscale hover:grayscale-0 hover:opacity-100" 
//           : "bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-white shadow-sm hover:shadow-md hover:border-brand-primary/40"
//       )}
//     >
//       <div className="flex items-center gap-4">
//         <div className={cn(
//           "h-12 w-12 rounded-2xl flex items-center justify-center",
//           isMini ? "bg-slate-100/80 text-slate-400" : "bg-brand-primary/10 text-brand-primary"
//         )}>
//           <Box size={22} />
//         </div>
//         <div>
//           <p className="font-black text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
//           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
//             <Clock size={12} />
//             <span>{new Date(order.created_at).toLocaleDateString()}</span>
//             <span>•</span>
//             <span className="text-brand-primary">AED {order.final_price || order.estimated_price}</span>
//           </div>
//         </div>
//       </div>
      
//       {/* Mobile-Friendly Status Badge */}
//       <div className="flex items-center gap-3">
//         <span className={cn(
//           "text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg",
//           order.status === 'DELIVERED' 
//             ? "bg-slate-200/50 text-slate-600" 
//             : "bg-brand-primary text-white shadow-sm"
//         )}>
//           {order.status.replace('_', ' ')}
//         </span>
//         <ChevronRight className="text-slate-300" size={18} />
//       </div>
//     </Link>
//   );

//   return (
//     <div className="relative min-h-screen">
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg5.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 space-y-8 max-w-2xl mx-auto pb-24 px-4 md:px-1 pt-4">
//         <header className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm mt-2">
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders</h1>
//           <p className="text-slate-500 font-medium">Keep track of your laundry cycle.</p>
//         </header>

//         {/* ACTIVE ORDERS SECTION */}
//         <div className="space-y-4">
//           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
//             Currently in Progress
//           </h3>
//           <div className="grid gap-4">
//             {activeOrders.length > 0 ? (
//               activeOrders.map(order => <OrderCard key={order.id} order={order} />)
//             ) : (
//               <div className="p-10 text-center bg-white/90 backdrop-blur-xl rounded-3xl border border-white shadow-sm">
//                 <Package className="mx-auto text-slate-300 mb-3" size={40} />
//                 <p className="text-xs font-bold text-slate-500">No active laundry. Need a clean?</p>
//                 <Link to="/orders/new" className="text-xs font-black text-brand-primary uppercase mt-4 block">New Order</Link>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* COMPLETED ORDERS SECTION */}
//         {completedOrders.length > 0 && (
//           <div className="space-y-4 pt-4">
//             <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 opacity-80 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white/50">
//               Order History
//             </h3>
//             <div className="grid gap-3">
//               {completedOrders.map(order => <OrderCard key={order.id} order={order} isMini={true} />)}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// import { useQuery } from '@tanstack/react-query';
// import { Link } from 'react-router-dom';
// import api from '@/api/axios';
// import { Package, ChevronRight, Clock, Box } from 'lucide-react';
// import { cn } from '@/utils/cn';

// export const OrderHistory = () => {
//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['myOrders'],
//     queryFn: async () => (await api.get('/orders/')).data,
//   });

//   if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Fetching your history...</div>;

//   // Logic: Split orders into Active and Completed
//   const activeOrders = orders?.filter((o: any) => o.status !== 'DELIVERED') || [];
//   const completedOrders = orders?.filter((o: any) => o.status === 'DELIVERED') || [];

//   const OrderCard = ({ order, isMini }: { order: any, isMini?: boolean }) => (
//     <Link 
//       to={`/orders/${order.id}`}
//       className={cn(
//         "flex items-center justify-between transition-all active:scale-[0.99]",
//         isMini 
//           ? "bg-slate-50/50 p-4 rounded-2xl opacity-70 grayscale hover:grayscale-0 hover:opacity-100" 
//           : "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-primary/20"
//       )}
//     >
//       <div className="flex items-center gap-4">
//         <div className={cn(
//           "h-12 w-12 rounded-2xl flex items-center justify-center",
//           isMini ? "bg-slate-100 text-slate-400" : "bg-brand-primary/10 text-brand-primary"
//         )}>
//           <Box size={22} />
//         </div>
//         <div>
//           <p className="font-black text-slate-900"># {order.id.toString().padStart(5, '0')}</p>
//           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
//             <Clock size={12} />
//             <span>{new Date(order.created_at).toLocaleDateString()}</span>
//             <span>•</span>
//             <span className="text-brand-primary">AED {order.final_price || order.estimated_price}</span>
//           </div>
//         </div>
//       </div>
      
//       {/* Mobile-Friendly Status Badge */}
//       <div className="flex items-center gap-3">
//         <span className={cn(
//           "text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg",
//           order.status === 'DELIVERED' 
//             ? "bg-slate-100 text-slate-500" 
//             : "bg-brand-primary text-white shadow-sm"
//         )}>
//           {order.status.replace('_', ' ')}
//         </span>
//         <ChevronRight className="text-slate-300" size={18} />
//       </div>
//     </Link>
//   );

//   return (
//     <div className="space-y-8 max-w-2xl mx-auto pb-24 px-1">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders</h1>
//         <p className="text-slate-400 font-medium">Keep track of your laundry cycle.</p>
//       </header>

//       {/* ACTIVE ORDERS SECTION */}
//       <div className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currently in Progress</h3>
//         <div className="grid gap-4">
//           {activeOrders.length > 0 ? (
//             activeOrders.map(order => <OrderCard key={order.id} order={order} />)
//           ) : (
//             <div className="p-10 text-center bg-white rounded-3xl border border-slate-100">
//               <Package className="mx-auto text-slate-100 mb-3" size={40} />
//               <p className="text-xs font-bold text-slate-400">No active laundry. Need a clean?</p>
//               <Link to="/orders/new" className="text-xs font-black text-brand-primary uppercase mt-4 block">New Order</Link>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* COMPLETED ORDERS SECTION */}
//       {completedOrders.length > 0 && (
//         <div className="space-y-4 pt-4">
//           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 opacity-60">Order History</h3>
//           <div className="grid gap-3">
//             {completedOrders.map(order => <OrderCard key={order.id} order={order} isMini={true} />)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
// import { useQuery } from '@tanstack/react-query';
// import { Link } from 'react-router-dom';
// import api from '@/api/axios';
// import { Package, ChevronRight, Clock } from 'lucide-react';
// import { cn } from '@/utils/cn';

// export const OrderHistory = () => {
//   const { data: orders, isLoading } = useQuery({
//     queryKey: ['myOrders'],
//     queryFn: async () => {
//       const res = await api.get('/orders/'); // Assuming this returns user-specific orders
//       return res.data;
//     }
//   });

//   if (isLoading) return <div className="p-8 text-center text-slate-500">Loading your history...</div>;

//   return (
//     <div className="space-y-6">
//       <header>
//         <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
//         <p className="text-slate-500 text-sm">Track and manage your laundry requests.</p>
//       </header>

//       <div className="grid gap-4">
//         {orders?.map((order: any) => (
//           <Link 
//             key={order.id} 
//             to={`/orders/${order.id}`}
//             className="bg-white p-4 rounded-premium border border-slate-100 shadow-soft flex items-center justify-between hover:border-brand-primary/30 transition-colors"
//           >
//             <div className="flex items-center gap-4">
//               <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-brand-primary">
//                 <Package size={24} />
//               </div>
//               <div>
//                 <p className="font-bold text-slate-900">Order #{order.id}</p>
//                 <div className="flex items-center gap-2 text-xs text-slate-500">
//                   <Clock size={12} />
//                   <span>{new Date(order.created_at).toLocaleDateString()}</span>
//                   <span>•</span>
//                   <span className="font-semibold text-brand-primary">{order.total_price || order.estimated_price} AED</span>
//                 </div>
//               </div>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <span className={cn(
//                 "hidden sm:block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md",
//                 order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-brand-primary"
//               )}>
//                 {order.status.replace('_', ' ')}
//               </span>
//               <ChevronRight className="text-slate-300" size={20} />
//             </div>
//           </Link>
//         ))}

//         {orders?.length === 0 && (
//           <div className="text-center py-20 bg-white rounded-premium border border-slate-100">
//             <Package className="mx-auto text-slate-200 mb-4" size={48} />
//             <p className="text-slate-500">You haven't placed any orders yet.</p>
//             <Link to="/orders/new" className="text-brand-primary font-bold mt-2 inline-block">Start your first order</Link>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };