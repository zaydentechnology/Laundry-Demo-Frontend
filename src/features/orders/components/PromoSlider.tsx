// src/features/orders/components/PromoSlider.tsx
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import { Ticket, Sparkles } from 'lucide-react';

export const PromoSlider = () => {
  const { data: offers } = useQuery({
    queryKey: ['publicOffers'],
    queryFn: async () => (await api.get('/offers/')).data,
  });

  const activeOffers = offers?.filter((o: any) => o.is_active);

  if (!activeOffers || activeOffers.length === 0) return null;

  return (
    <div className="w-full mt-2 relative">
      {/* UPDATED ALIGNMENT: 
        If there's exactly 1 offer, 'justify-center' perfectly centers it on the phone. 
        If > 1, it allows normal swiping.
      */}
      <div className={`flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar snap-x snap-mandatory ${activeOffers.length === 1 ? 'justify-center' : 'px-2'}`}>
        {activeOffers.map((offer: any) => (
          <div 
            key={offer.id} 
            // Standardized width so it looks great centered or swiping
            className="w-[92%] max-w-[340px] bg-slate-900 p-1 rounded-[2rem] shadow-xl shadow-slate-200/60 shrink-0 snap-center relative group"
          >
            {/* Premium animated gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-blue-500 to-indigo-600 opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-[2rem]" />
            
            {/* Main Inner Card */}
            <div className="relative h-full bg-slate-900/90 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/10 flex flex-col justify-between overflow-hidden">
              
              {/* Decorative background glow */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none" />

              {/* Flex layout fixed to prevent icon collision */}
              <div className="flex items-start justify-between mb-4 gap-4">
                {/* flex-1 lets the text take up remaining space without pushing the icon out */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={12} className="text-amber-400 shrink-0" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 truncate">Exclusive Promo</p>
                  </div>
                  {/* Elegantly wraps to a second line if it's a long name */}
                  <h3 className="text-white text-lg font-black leading-snug tracking-tight">
                    {offer.name}
                  </h3>
                </div>
                
                {/* shrink-0 guarantees the icon box never gets squished */}
                <div className="bg-brand-primary/20 p-2.5 rounded-xl border border-brand-primary/30 text-brand-primary shrink-0 shadow-inner mt-1">
                  <Ticket size={22} />
                </div>
              </div>

              {/* Dashed Divider to look like a physical perforated coupon */}
              <div className="w-full border-t-2 border-dashed border-white/10 mb-4 relative">
                <div className="absolute -left-6 -top-[9px] w-4 h-4 bg-white rounded-full shadow-inner" />
                <div className="absolute -right-6 -top-[9px] w-4 h-4 bg-white rounded-full shadow-inner" />
              </div>

              {/* Offer Details Row */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">You Save</p>
                  
                  {/* UPDATED: Dynamic Percentage vs AED rendering */}
                  <p className="text-4xl font-black text-white tracking-tighter flex items-baseline">
                    {offer.discount_type === 'PERCENTAGE' ? (
                      <>
                        {offer.discount_amount}<span className="text-xl font-bold text-brand-primary ml-1">%</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-brand-primary mr-1">AED</span>
                        {offer.discount_amount}
                      </>
                    )}
                  </p>
                  
                </div>
                
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Condition</p>
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">
                      Min. AED {offer.min_order_amount}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
// // src/features/orders/components/PromoSlider.tsx
// import { useQuery } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { Ticket, Sparkles } from 'lucide-react';

// export const PromoSlider = () => {
//   const { data: offers } = useQuery({
//     queryKey: ['publicOffers'],
//     queryFn: async () => (await api.get('/offers/')).data,
//   });

//   const activeOffers = offers?.filter((o: any) => o.is_active);

//   if (!activeOffers || activeOffers.length === 0) return null;

//   return (
//     <div className="w-full mt-2 relative">
//       {/* UPDATED ALIGNMENT: 
//         If there's exactly 1 offer, 'justify-center' perfectly centers it on the phone. 
//         If > 1, it allows normal swiping.
//       */}
//       <div className={`flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar snap-x snap-mandatory ${activeOffers.length === 1 ? 'justify-center' : 'px-2'}`}>
//         {activeOffers.map((offer: any) => (
//           <div 
//             key={offer.id} 
//             // UPDATED: Standardized width so it looks great centered or swiping
//             className="w-[92%] max-w-[340px] bg-slate-900 p-1 rounded-[2rem] shadow-xl shadow-slate-200/60 shrink-0 snap-center relative group"
//           >
//             {/* Premium animated gradient border effect */}
//             <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-blue-500 to-indigo-600 opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-[2rem]" />
            
//             {/* Main Inner Card */}
//             <div className="relative h-full bg-slate-900/90 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/10 flex flex-col justify-between overflow-hidden">
              
//               {/* Decorative background glow */}
//               <div className="absolute -right-8 -top-8 w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none" />

//               {/* UPDATED: Flex layout fixed to prevent icon collision */}
//               <div className="flex items-start justify-between mb-4 gap-4">
//                 {/* flex-1 lets the text take up remaining space without pushing the icon out */}
//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-center gap-1.5 mb-1.5">
//                     <Sparkles size={12} className="text-amber-400 shrink-0" />
//                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400 truncate">Exclusive Promo</p>
//                   </div>
//                   {/* Removed truncate! Now it elegantly wraps to a second line if it's a long name */}
//                   <h3 className="text-white text-lg font-black leading-snug tracking-tight">
//                     {offer.name}
//                   </h3>
//                 </div>
                
//                 {/* shrink-0 guarantees the icon box never gets squished */}
//                 <div className="bg-brand-primary/20 p-2.5 rounded-xl border border-brand-primary/30 text-brand-primary shrink-0 shadow-inner mt-1">
//                   <Ticket size={22} />
//                 </div>
//               </div>

//               {/* Dashed Divider to look like a physical perforated coupon */}
//               <div className="w-full border-t-2 border-dashed border-white/10 mb-4 relative">
//                 <div className="absolute -left-6 -top-[9px] w-4 h-4 bg-white rounded-full shadow-inner" />
//                 <div className="absolute -right-6 -top-[9px] w-4 h-4 bg-white rounded-full shadow-inner" />
//               </div>

//               {/* Offer Details Row */}
//               <div className="flex items-end justify-between">
//                 <div>
//                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">You Save</p>
//                   <p className="text-2xl font-black text-white tracking-tighter">
//                     <span className="text-sm font-bold text-brand-primary mr-1">AED</span>
//                     {offer.discount_amount}
//                   </p>
//                 </div>
                
//                 <div className="text-right">
//                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Condition</p>
//                   <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">
//                     <p className="text-[10px] font-black text-white uppercase tracking-wider">
//                       Min. AED {offer.min_order_amount}
//                     </p>
//                   </div>
//                 </div>
//               </div>

//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
// // src/features/orders/components/PromoSlider.tsx
// import { useQuery } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { Gift, Ticket } from 'lucide-react';

// export const PromoSlider = () => {
//   const { data: offers } = useQuery({
//     queryKey: ['publicOffers'],
//     queryFn: async () => (await api.get('/offers/')).data,
//   });

//   const activeOffers = offers?.filter((o: any) => o.is_active);

//   if (!activeOffers || activeOffers.length === 0) return null;

//   return (
//     <div className="w-full max-w-7xl mx-auto overflow-hidden">
//       {/* Container centers items on desktop (lg:) but allows scrolling on mobile */}
//       <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar lg:justify-center -mx-4 px-4 snap-x">
//         {activeOffers.map((offer: any) => (
//           <div 
//             key={offer.id} 
//             className="min-w-[280px] md:min-w-[320px] bg-gradient-to-br from-brand-primary to-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 flex items-center justify-between relative overflow-hidden shrink-0 snap-center"
//           >
//             <div className="relative z-10">
//               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Exclusive</p>
//               <h3 className="text-lg font-black leading-tight mb-3">{offer.name}</h3>
//               <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md w-fit px-3 py-1.5 rounded-2xl border border-white/30">
//                 <Ticket size={12} className="text-white" />
//                 <span className="text-xs font-black italic">SAVE AED {offer.discount_amount}</span>
//               </div>
//             </div>
            
//             <div className="relative z-10 p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-sm border border-white/20">
//               <Gift size={24} />
//             </div>

//             {/* Background design */}
//             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
//             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
// // src/features/orders/components/PromoSlider.tsx
// import { useQuery } from '@tanstack/react-query';
// import api from '@/api/axios';
// import { Gift, Zap } from 'lucide-react';

// export const PromoSlider = () => {
//   const { data: offers } = useQuery({
//     queryKey: ['publicOffers'],
//     queryFn: async () => (await api.get('/offers/')).data,
//   });

//   const activeOffers = offers?.filter((o: any) => o.is_active);

//   if (!activeOffers || activeOffers.length === 0) return null;

//   return (
//     <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
//       {activeOffers.map((offer: any) => (
//         <div 
//           key={offer.id} 
//           className="min-w-[280px] bg-gradient-to-br from-brand-primary to-blue-600 p-5 rounded-[2rem] text-white shadow-xl shadow-blue-100 flex items-center justify-between relative overflow-hidden shrink-0"
//         >
//           <div className="relative z-10">
//             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Limited Offer</p>
//             <h3 className="text-lg font-black leading-tight mb-2">{offer.name}</h3>
//             <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-white/30">
//               <span className="text-xs font-black italic">SAVE AED {offer.discount_amount}</span>
//             </div>
//           </div>
//           <div className="relative z-10 p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/20">
//             <Gift size={24} />
//           </div>
//           {/* Decorative Circle */}
//           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
//         </div>
//       ))}
//     </div>
//   );
// };