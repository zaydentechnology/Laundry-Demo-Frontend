// src/features/orders/pages/CustomerHome.tsx
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Package,
  Wallet,
  Share2,
  Gift,Info
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios";
import { PromoSlider } from "../components/PromoSlider";
import { ordersService } from "../api/orders.service";
import { adminService } from "@/features/admin/api/admin.service";
import { userService } from "@/features/user/api/user.service";
import { toast } from "sonner";

export const CustomerHome = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["customerStats"],
    queryFn: ordersService.getMyStats,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["recentOrders"],
    queryFn: async () => (await api.get("/orders/")).data,
    select: (data) => data.slice(0, 3),
  });

  // Fetch config for referral amount
  const { data: config } = useQuery({
    queryKey: ["systemConfig"],
    queryFn: adminService.getSystemConfig,
  });

  // Fetch live profile for accurate wallet balance & referral code
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: userService.getMe,
    initialData: user,
  });

  return (
    <div className="relative min-h-screen">
      
     <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg4.jpg')" }}
      />
      <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">
        
        {/* Header */}
        <div className="flex flex-col gap-1 px-1 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Hey, {profile?.full_name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-slate-500 font-medium italic mb-4">
            Ready for some fresh clothes?
          </p>
          <PromoSlider />
        </div>

         {/* NEW: Referral & Wallet Card */}
        {config?.referral_system_enabled && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col text-white overflow-hidden relative animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 z-10">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                  <Wallet className="text-brand-primary" size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Available Credits
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter">
                     {Math.round(profile?.wallet_balance || 0)}
                    </span>
                    <span className="text-sm font-bold text-brand-primary">
                      pts
                    </span>
                  </div>
                </div>
              </div>

              {profile?.referral_code && (
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    Your Referral Code
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="text-2xl font-black tracking-widest font-mono text-white select-all">
                      {profile.referral_code}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(profile.referral_code || "");
                          toast.success("Code copied!");
                        }}
                        className="px-4 py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all shadow-lg active:scale-95"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const message = `Hey! Make your laundry experience easier with Al Nejoum Al Arbaah Laundry. \n\nSign up at www.alnejoumalarbaahlaundry.com and use my referral code: ${profile.referral_code}`;
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="px-4 py-2 flex items-center gap-1.5 bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#20b858] transition-all shadow-lg active:scale-95"
                      >
                        <Share2 size={12} /> Share
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Benefit Tag */}
            <div className="mt-6 bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-2xl flex items-start gap-3 z-10">
              <Gift className="text-brand-primary shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-300 leading-snug">
                  Get <span className="font-black text-white">{config?.reward_credits_per_referral || 0} credits</span> when a friend signs up and completes their first order!
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                  1 Credit = {config?.credit_conversion_rate} AED
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Primary CTA Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl group-hover:bg-brand-primary/30 transition-all duration-700" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase">
                Quick Service
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Book a Pickup</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-[220px] leading-relaxed">
              Your personal laundry assistant is just one click away.
            </p>
            <Link to="/orders/new">
              <button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-brand-primary/20">
                <Plus size={20} />
                  BOOK NOW
              </button>
            </Link>
          </div>
        </div>

       

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Total Orders",
              value: stats?.total_orders,
              icon: TrendingUp,
              color: "blue",
            },
            {
              label: "Savings",
              value: `AED ${stats?.discounts_received || 0}`,
              icon: Sparkles,
              color: "emerald",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col items-start gap-3"
            >
              <div
                className={`p-2 bg-${item.color}-50 text-${item.color}-500 rounded-xl`}
              >
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">
                  {statsLoading ? "..." : item.value}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {item.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">
              Recent Activity
            </h3>
            <Link
              to="/orders"
              className="text-[11px] font-black text-brand-primary uppercase tracking-tighter"
            >
              View History
            </Link>
          </div>

          <div className="space-y-3">
            {ordersLoading ? (
              <div className="animate-pulse bg-white/50 h-32 rounded-3xl" />
            ) : recentOrders?.length > 0 ? (
              recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="group bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex items-center justify-between hover:border-brand-primary/30 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        # {order.id.toString().padStart(5, "0")}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">
                          {order.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-slate-300 group-hover:text-brand-primary"
                  />
                </Link>
              ))
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 text-center border-2 border-dashed border-white shadow-sm">
                <Clock className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">
                  No active orders yet.
                </p>
              </div>
            )}
          </div>
        </div>



        
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-sm mt-8 space-y-4">
  <h2 className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 ml-2">
    More Information
  </h2>
  
  <button 
    onClick={() => navigate('/about-us')}
    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white rounded-2xl transition-all group border border-slate-50"
  >
    <div className="flex items-center gap-4">
      <div className="p-2.5 bg-brand-primary/10 text-brand-primary rounded-xl group-hover:scale-110 transition-transform">
        <Info size={20} />
      </div>
      <div className="text-left">
        <p className="font-bold text-slate-900">About Al Nejoum</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Our 20-Year Legacy & Facilities</p>
      </div>
    </div>
    <ChevronRight className="text-slate-300 group-hover:text-brand-primary transition-colors" size={20} />
  </button>

  </div>
      </div>
    </div>
  );
};
// // src/features/orders/pages/CustomerHome.tsx
// import { Link } from "react-router-dom";
// import { useAuthStore } from "@/store/useAuthStore";
// import {
//   Plus,
//   Clock,
//   TrendingUp,
//   Sparkles,
//   ChevronRight,
//   Package,
// } from "lucide-react";
// import { useQuery } from "@tanstack/react-query";
// import api from "@/api/axios";
// import { PromoSlider } from "../components/PromoSlider";
// import { ordersService } from "../api/orders.service";

// export const CustomerHome = () => {
//   const { user } = useAuthStore();

//   const { data: stats, isLoading: statsLoading } = useQuery({
//     queryKey: ["customerStats"],
//     queryFn: ordersService.getMyStats,
//   });

//   const { data: recentOrders, isLoading: ordersLoading } = useQuery({
//     queryKey: ["recentOrders"],
//     queryFn: async () => (await api.get("/orders/")).data,
//     select: (data) => data.slice(0, 3),
//   });

//   return (
//     <div className="relative min-h-screen">
     
//      <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg5.jpg')" }}
//       />
//       <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">
//         {/* Header */}
//         <div className="flex flex-col gap-1 px-1 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//             Hey, {user?.full_name?.split(" ")[0]}! 👋
//           </h1>
//           <p className="text-slate-500 font-medium italic mb-4">
//             Ready for some fresh clothes?
//           </p>
//           <PromoSlider />
//         </div>

//         {/* Primary CTA Card */}
//         <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
//           <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl group-hover:bg-brand-primary/30 transition-all duration-700" />

//           <div className="relative z-10">
//             <div className="flex items-center gap-2 mb-4">
//               <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase">
//                 Quick Service
//               </span>
//             </div>
//             <h2 className="text-2xl font-bold mb-2">Book a Pickup</h2>
//             <p className="text-slate-400 text-sm mb-8 max-w-[220px] leading-relaxed">
//               Your personal laundry assistant is just one click away.
//             </p>
//             <Link to="/orders/new">
//               <button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-brand-primary/20">
//                 <Plus size={20} />
//                   BOOK NOW
//               </button>
//             </Link>
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div className="grid grid-cols-2 gap-4">
//           {[
//             {
//               label: "Total Orders",
//               value: stats?.total_orders,
//               icon: TrendingUp,
//               color: "blue",
//             },
//             {
//               label: "Savings",
//               value: `AED ${stats?.discounts_received || 0}`,
//               icon: Sparkles,
//               color: "emerald",
//             },
//           ].map((item, i) => (
//             <div
//               key={i}
//               className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-sm flex flex-col items-start gap-3"
//             >
//               <div
//                 className={`p-2 bg-${item.color}-50 text-${item.color}-500 rounded-xl`}
//               >
//                 <item.icon size={20} />
//               </div>
//               <div>
//                 <p className="text-2xl font-black text-slate-900 tracking-tighter">
//                   {statsLoading ? "..." : item.value}
//                 </p>
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
//                   {item.label}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Recent Activity */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between px-1">
//             <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">
//               Recent Activity
//             </h3>
//             <Link
//               to="/orders"
//               className="text-[11px] font-black text-brand-primary uppercase tracking-tighter"
//             >
//               View History
//             </Link>
//           </div>

//           <div className="space-y-3">
//             {ordersLoading ? (
//               <div className="animate-pulse bg-white/50 h-32 rounded-3xl" />
//             ) : recentOrders?.length > 0 ? (
//               recentOrders.map((order: any) => (
//                 <Link
//                   key={order.id}
//                   to={`/orders/${order.id}`}
//                   className="group bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex items-center justify-between hover:border-brand-primary/30 transition-all active:scale-[0.98]"
//                 >
//                   <div className="flex items-center gap-4">
//                     <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                       <Package size={20} />
//                     </div>
//                     <div>
//                       <p className="font-bold text-slate-900 text-sm">
//                         # {order.id.toString().padStart(5, "0")}
//                       </p>
//                       <div className="flex items-center gap-2">
//                         <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">
//                           {order.status.replace("_", " ")}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                   <ChevronRight
//                     size={18}
//                     className="text-slate-300 group-hover:text-brand-primary"
//                   />
//                 </Link>
//               ))
//             ) : (
//               <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 text-center border-2 border-dashed border-white shadow-sm">
//                 <Clock className="mx-auto text-slate-300 mb-2" />
//                 <p className="text-xs font-bold text-slate-400">
//                   No active orders yet.
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// import { Link } from 'react-router-dom';
// import { useAuthStore } from '@/store/useAuthStore';
// // import { Button } from '@/components/ui/Button';
// import { Plus, Clock, TrendingUp, Sparkles, ChevronRight, Package } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { PromoSlider } from '../components/PromoSlider';
// import { ordersService } from '../api/orders.service';

// export const CustomerHome = () => {
//   const { user } = useAuthStore();

//   const { data: stats, isLoading: statsLoading } = useQuery({
//     queryKey: ['customerStats'],
//     queryFn: ordersService.getMyStats, // No more 422 error!
//   });

//   // 2. Fetch Recent Orders (Limited to 3)
//   const { data: recentOrders, isLoading: ordersLoading } = useQuery({
//     queryKey: ['recentOrders'],
//     queryFn: async () => (await api.get('/orders/')).data,
//     select: (data) => data.slice(0, 3), // Just get the latest 3
//   });

//   return (
//     <div className="space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto">
//       {/* Header */}
//       <div className="flex flex-col gap-1 px-1">
//         <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//           Hey, {user?.full_name?.split(' ')[0]}! 👋
//         </h1>
//         <PromoSlider />
//         <p className="text-slate-400 font-medium italic">Ready for some fresh clothes?</p>
//       </div>

//       {/* Primary CTA Card */}
//       <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
//         <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl group-hover:bg-brand-primary/30 transition-all duration-700" />

//         <div className="relative z-10">
//           <div className="flex items-center gap-2 mb-4">
//              <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-[10px] font-black tracking-widest uppercase">Quick Service</span>
//           </div>
//           <h2 className="text-2xl font-bold mb-2">Book a Pickup</h2>
//           <p className="text-slate-400 text-sm mb-8 max-w-[220px] leading-relaxed">
//             Your personal laundry assistant is just one click away.
//           </p>
//           <Link to="/orders/new">
//             <button className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-brand-primary/20">
//               <Plus size={20} />
//               SCHEDULE NOW
//             </button>
//           </Link>
//         </div>
//       </div>

//       {/* Stats Grid */}
//       <div className="grid grid-cols-2 gap-4">
//         {[
//           { label: 'Total Orders', value: stats?.total_orders, icon: TrendingUp, color: 'blue' },
//           { label: 'Savings', value: `AED ${stats?.discounts_received || 0}`, icon: Sparkles, color: 'emerald' }
//         ].map((item, i) => (
//           <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-start gap-3">
//              <div className={`p-2 bg-${item.color}-50 text-${item.color}-500 rounded-xl`}>
//                 <item.icon size={20} />
//              </div>
//              <div>
//                 <p className="text-2xl font-black text-slate-900 tracking-tighter">{statsLoading ? '...' : item.value}</p>
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
//              </div>
//           </div>
//         ))}
//       </div>

//       {/* Recent Activity */}
//       <div className="space-y-4">
//         <div className="flex items-center justify-between px-1">
//           <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Recent Activity</h3>
//           <Link to="/orders" className="text-[11px] font-black text-brand-primary uppercase tracking-tighter">View History</Link>
//         </div>

//         <div className="space-y-3">
//           {ordersLoading ? (
//             <div className="animate-pulse bg-slate-50 h-32 rounded-3xl" />
//           ) : recentOrders?.length > 0 ? (
//             recentOrders.map((order: any) => (
//               <Link
//                 key={order.id}
//                 to={`/orders/${order.id}`}
//                 className="group bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between hover:border-brand-primary/30 transition-all active:scale-[0.98]"
//               >
//                 <div className="flex items-center gap-4">
//                   <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
//                     <Package size={20} />
//                   </div>
//                   <div>
//                     <p className="font-bold text-slate-900 text-sm"># {order.id.toString().padStart(5, '0')}</p>
//                     <div className="flex items-center gap-2">
//                       <span className="text-[10px] font-black text-brand-primary uppercase tracking-tighter">
//                         {order.status.replace('_', ' ')}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <ChevronRight size={18} className="text-slate-300 group-hover:text-brand-primary" />
//               </Link>
//             ))
//           ) : (
//             <div className="bg-slate-50 rounded-3xl p-8 text-center border-2 border-dashed border-slate-100">
//                <Clock className="mx-auto text-slate-300 mb-2" />
//                <p className="text-xs font-bold text-slate-400">No active orders yet.</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
// import { Link } from 'react-router-dom';
// import { useAuthStore } from '@/store/useAuthStore';
// import { Button } from '@/components/ui/Button';
// import { Plus, Clock, TrendingUp, Sparkles } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import { ordersService } from '../api/orders.service';

// export const CustomerHome = () => {
//   const { user } = useAuthStore();

//   // Fetch quick stats using React Query
//   const { data: stats, isLoading } = useQuery({
//     queryKey: ['customerStats'],
//     queryFn: ordersService.getMyStats,
//   });

//   return (
//     <div className="space-y-6 pb-20 md:pb-0">
//       {/* Header */}
//       <div className="flex flex-col gap-1">
//         <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
//           Hello, {user?.full_name?.split(' ')[0]} 👋
//         </h1>
//         <p className="text-slate-500 text-sm">Let's get your laundry sorted today.</p>
//       </div>

//       {/* Primary CTA - Massive Touch Target for Mobile */}
//       <div className="bg-brand-primary rounded-premium p-6 sm:p-8 text-white shadow-soft relative overflow-hidden">
//         {/* Decorative background shape */}
//         <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>

//         <div className="relative z-10">
//           <h2 className="text-xl font-bold mb-2">Need a pickup?</h2>
//           <p className="text-primary-50 text-sm mb-6 max-w-[250px]">
//             Schedule your laundry pickup right now. We'll handle the rest.
//           </p>
//           <Link to="/orders/new">
//             <Button variant="secondary" className="w-full sm:w-auto bg-white text-brand-primary hover:bg-slate-50 border-none shadow-sm" icon={Plus}>
//               Book Laundry Now
//             </Button>
//           </Link>
//         </div>
//       </div>

//       {/* Quick Stats Grid */}
//       <div className="grid grid-cols-2 gap-4">
//         <div className="bg-white p-4 rounded-premium shadow-soft border border-slate-100 flex flex-col justify-center">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="p-2 bg-blue-50 text-brand-primary rounded-lg">
//               <TrendingUp size={18} />
//             </div>
//             <span className="text-sm font-medium text-slate-600">Total Orders</span>
//           </div>
//           <p className="text-2xl font-bold text-slate-900">
//             {isLoading ? '-' : stats?.total_orders || 0}
//           </p>
//         </div>

//         <div className="bg-white p-4 rounded-premium shadow-soft border border-slate-100 flex flex-col justify-center">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="p-2 bg-emerald-50 text-brand-success rounded-lg">
//               <Sparkles size={18} />
//             </div>
//             <span className="text-sm font-medium text-slate-600">Discounts</span>
//           </div>
//           <p className="text-2xl font-bold text-slate-900">
//             {isLoading ? '-' : `${stats?.discounts_received || 0} AED`}
//           </p>
//         </div>
//       </div>

//       {/* Recent Activity placeholder (we will link this to the actual orders list later) */}
//       <div>
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="font-bold text-slate-800">Recent Activity</h3>
//           <Link to="/orders" className="text-sm font-medium text-brand-primary">View All</Link>
//         </div>
//         <div className="bg-white rounded-premium shadow-soft border border-slate-100 p-6 text-center">
//           <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
//           <p className="text-sm text-slate-500">Your recent orders will appear here.</p>
//         </div>
//       </div>
//     </div>
//   );
// };
