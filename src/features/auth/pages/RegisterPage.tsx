// src/features/auth/pages/RegisterPage.tsx
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { authService, getPublicBuildings } from '../api/auth.service';
import { toast } from 'sonner';
import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift, Mail, PartyPopper } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from "zod";

const registerSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal('')),
  building_name: z.string().min(1, "Please select a building"),
  other_building: z.string().optional(),
  flat_number: z.string().min(1, "Please enter your flat number"),
  password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
  referral_code: z.string().optional(),
}).refine((data) => {
  if (data.building_name === 'Other') {
    return !!data.other_building && data.other_building.trim().length > 0;
  }
  return true;
}, {
  message: "Please specify your building name",
  path: ["other_building"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const LaundryLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
    <div className="relative w-32 h-32 bg-white/90 backdrop-blur-xl rounded-[2rem] border-[6px] border-white shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
      <div className="absolute top-0 w-full h-8 border-b-[6px] border-white flex items-center justify-end px-3 gap-1.5 bg-slate-50/50">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
      </div>
      <div className="w-16 h-16 rounded-full border-[6px] border-white relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
        <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
        <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
      </div>
    </div>
    <div className="text-center space-y-2 relative z-10">
      <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
      <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto leading-relaxed">
        We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
      </p>
    </div>
  </div>
);

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
    queryKey: ['publicBuildings'],
    queryFn: getPublicBuildings,
  });

  const selectedBuildingName = watch('building_name');
  const passwordValue = watch('password') || '';

  const mutation = useMutation({
    mutationFn: (data: RegisterForm) => {
      const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
      return authService.register({
        ...data,
        building_name: finalBuilding,
        email: data.email === "" ? null : data.email,
        referral_code: data.referral_code?.trim() || null,
      });
    },
    onSuccess: () => {
      // THE FIX: Massive, highly visible custom toast
      toast.custom((t) => (
        <div className="w-[90vw] max-w-sm mx-auto bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl shadow-emerald-500/30 flex flex-col items-center text-center space-y-3 animate-in slide-in-from-top-10 zoom-in duration-300">
           <div className="bg-white/20 p-4 rounded-full">
              <PartyPopper size={32} className="text-white" />
           </div>
           <div>
             <h3 className="text-xl font-black tracking-tight mb-1">Account Created!</h3>
             <p className="text-sm font-bold text-emerald-50 opacity-90 leading-relaxed">
               Welcome to Al Nejoum! Your profile is ready. Please log in with your new PIN.
             </p>
           </div>
           <button 
             onClick={() => toast.dismiss(t)} 
             className="mt-2 px-6 py-2 bg-white text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
           >
             Got it
           </button>
        </div>
      ), { 
        duration: 5000, // Stay on screen for 5 seconds
        position: 'top-center' // Force to top center for maximum visibility
      });
      
      navigate('/login');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
  });

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
      {/* 1. BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none" style={{ backgroundImage: "url('/images/bg6.jpg')" }} />

      {/* 2. CONTENT LAYER */}
      <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        <div className="text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
          <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
        </div>

        {mutation.isPending ? (
          <LaundryLoader />
        ) : (
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5">
              
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input {...register('mobile')} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={10} placeholder="Mobile Number" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                </div>

                {/* EMAIL FIELD */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      {...register('email')} 
                      type="email" 
                      placeholder="Email Address (Optional)" 
                      className={`w-full pl-12 pr-4 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100/50 focus:ring-2 focus:ring-brand-primary'}`} 
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
                      <AlertCircle size={10} /> {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <hr className="border-slate-100/50" />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address Details</p>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <select 
                    {...register('building_name')} 
                    disabled={isBuildingsLoading}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
                  >
                    <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
                    {buildings.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                    <option value="Other">Other Building...</option>
                  </select>
                </div>

                {selectedBuildingName === 'Other' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
                    <input {...register('other_building')} placeholder="Enter Building Name" className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} />
                    {errors.other_building && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
                        <AlertCircle size={10} /> {errors.other_building.message}
                      </p>
                    )}
                  </div>
                )}

                {selectedBuildingName && (
                  <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input {...register('flat_number')} placeholder="Enter Flat / Villa Number" className={`w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} />
                    {errors.flat_number && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
                        <AlertCircle size={10} /> {errors.flat_number.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-slate-100/50" />

              <div className="space-y-3">
                <div className="relative group">
                  <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
                  <input {...register('referral_code')} placeholder="Referral Code (Optional)" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                </div>
              </div>

              <hr className="border-slate-100/50" />

              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input {...register('password')} type="password" inputMode="numeric" pattern="[0-9]*" placeholder="Set 4-Digit PIN" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
                </div>

                <div className="flex gap-4 px-2">
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                    4+ Digits
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>}
                    Numbers Only
                  </div>
                </div>
              </div>

            </div>

            <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
              Create Account <ArrowRight size={16} />
            </button>
          </form>
        )}

        {!mutation.isPending && (
          <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
            <p className="text-center text-slate-600 font-bold text-sm animate-in fade-in">
              Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift, Mail } from 'lucide-react'; // <-- ADDED Mail Icon
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email("Please enter a valid email address").optional().or(z.literal('')), // <-- ADDED Validation Message
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please enter your flat number"), 
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white/90 backdrop-blur-xl rounded-[2rem] border-[6px] border-white shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-white flex items-center justify-end px-3 gap-1.5 bg-slate-50/50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-white relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2 relative z-10">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg6.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
//         <div className="text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5">
              
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('mobile')} 
//                     type="tel"               
//                     inputMode="numeric"      
//                     pattern="[0-9]*"
//                     maxLength={10} 
//                     placeholder="Mobile Number" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
                
//                 {/* NEW OPTIONAL EMAIL FIELD WITH VALIDATION WARNING */}
//                 <div>
//                   <div className="relative">
//                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                     <input 
//                       {...register('email')} 
//                       type="email"               
//                       placeholder="Email Address (Optional)" 
//                       className={`w-full pl-12 pr-4 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100/50 focus:ring-2 focus:ring-brand-primary'}`} 
//                     />
//                   </div>
//                   {errors.email && (
//                     <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                       <AlertCircle size={10} /> {errors.email.message}
//                     </p>
//                   )}
//                 </div>

//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     <input 
//                       {...register('flat_number')} 
//                       placeholder="Enter Flat / Villa Number" 
//                       className={`w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} 
//                     />

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     pattern="[0-9]*"     
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
//             <p className="text-center text-slate-600 font-bold text-sm animate-in fade-in">
//               Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift } from 'lucide-react'; 
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please enter your flat number"), 
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white/90 backdrop-blur-xl rounded-[2rem] border-[6px] border-white shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-white flex items-center justify-end px-3 gap-1.5 bg-slate-50/50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-white relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2 relative z-10">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg6.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
//         <div className="text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5">
              
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('mobile')} 
//                     type="tel"               
//                     inputMode="numeric"      
//                     pattern="[0-9]*"
//                     maxLength={10} // <-- ADDED THIS         
//                     placeholder="Mobile Number" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     <input 
//                       {...register('flat_number')} 
//                       placeholder="Enter Flat / Villa Number" 
//                       className={`w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} 
//                     />

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     pattern="[0-9]*"     
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
//             <p className="text-center text-slate-600 font-bold text-sm animate-in fade-in">
//               Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift } from 'lucide-react'; 
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please enter your flat number"), 
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white/90 backdrop-blur-xl rounded-[2rem] border-[6px] border-white shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-white flex items-center justify-end px-3 gap-1.5 bg-slate-50/50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-white relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2 relative z-10">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg6.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
//         <div className="text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5">
              
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('mobile')} 
//                     type="tel"               
//                     inputMode="numeric"      
//                     pattern="[0-9]*"         
//                     placeholder="Mobile Number" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     <input 
//                       {...register('flat_number')} 
//                       placeholder="Enter Flat / Villa Number" 
//                       className={`w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} 
//                     />

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-100/50" />

//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     pattern="[0-9]*"     
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-400'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <div className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
//             <p className="text-center text-slate-600 font-bold text-sm animate-in fade-in">
//               Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift } from 'lucide-react'; 
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please enter your flat number"), 
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white rounded-[2rem] border-[6px] border-slate-100 shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-slate-100 flex items-center justify-end px-3 gap-1.5 bg-slate-50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-400 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
//       <div className="max-w-md w-full mx-auto space-y-8">
//         <div className="text-center">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5">
              
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('mobile')} 
//                     type="tel"               // <-- Added to force mobile numpad
//                     inputMode="numeric"      // <-- Added to force mobile numpad
//                     pattern="[0-9]*"         // <-- Added to force mobile numpad
//                     placeholder="Mobile Number" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     <input 
//                       {...register('flat_number')} 
//                       placeholder="Enter Flat / Villa Number" 
//                       className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} 
//                     />

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     pattern="[0-9]*"     // <-- Added to trigger mobile numeric keypad securely
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <p className="text-center text-slate-500 font-bold text-sm animate-in fade-in">
//             Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift } from 'lucide-react'; 
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please enter your flat number"), // Updated message
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white rounded-[2rem] border-[6px] border-slate-100 shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-slate-100 flex items-center justify-end px-3 gap-1.5 bg-slate-50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-400 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   // REMOVED: flat parsing logic

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
//       <div className="max-w-md w-full mx-auto space-y-8">
//         <div className="text-center">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5">
              
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('mobile')} placeholder="Mobile Number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* UPDATED: FLAT NUMBER IS NOW ALWAYS AN INPUT */}
//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     <input 
//                       {...register('flat_number')} 
//                       placeholder="Enter Flat / Villa Number" 
//                       className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} 
//                     />

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <p className="text-center text-slate-500 font-bold text-sm animate-in fade-in">
//             Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle, Gift } from 'lucide-react'; // <-- Added Gift icon
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please select or enter a flat number"),
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
//   referral_code: z.string().optional(), // <-- NEW
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// // ... (Keep your LaundryLoader component exactly the same) ...
// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white rounded-[2rem] border-[6px] border-slate-100 shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-slate-100 flex items-center justify-end px-3 gap-1.5 bg-slate-50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-400 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const selectedBuildingObj = buildings.find((b: any) => b.name === selectedBuildingName);
//   const availableFlats = selectedBuildingObj ? selectedBuildingObj.flats : [];

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//         referral_code: data.referral_code?.trim() || null, // <-- Pass safely to backend
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
//       <div className="max-w-md w-full mx-auto space-y-8">
//         <div className="text-center">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5">
              
//               {/* Standard Inputs */}
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('mobile')} placeholder="Mobile Number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               {/* Dynamic Building/Flat Logic */}
//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* FLAT NUMBER INPUT */}
//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     {selectedBuildingName !== 'Other' && availableFlats.length > 0 ? (
//                       <select {...register('flat_number')} className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none appearance-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`}>
//                         <option value="">Select Flat Number</option>
//                         {availableFlats.map((f: string) => <option key={f} value={f}>{f}</option>)}
//                       </select>
//                     ) : (
//                       <input {...register('flat_number')} placeholder="Flat / Villa Number" className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} />
//                     )}

//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-50" />

//               {/* NEW: Optional Referral Section */}
//               <div className="space-y-3">
//                 <div className="relative group">
//                   <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//                   <input 
//                     {...register('referral_code')} 
//                     placeholder="Referral Code (Optional)" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 uppercase focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
//                   />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               {/* Password */}
//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <p className="text-center text-slate-500 font-bold text-sm animate-in fade-in">
//             Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/RegisterPage.tsx
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery } from '@tanstack/react-query';
// import { Link, useNavigate } from 'react-router-dom';
// import { authService, getPublicBuildings } from '../api/auth.service';
// import { toast } from 'sonner';
// import { User, Phone, Lock, ArrowRight, Building2, Home, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from "zod";

// const registerSchema = z.object({
//   full_name: z.string().min(2, "Name is required"),
//   mobile: z.string().min(10, "Valid phone number required"),
//   email: z.string().email().optional().or(z.literal('')),
//   building_name: z.string().min(1, "Please select a building"),
//   other_building: z.string().optional(),
//   flat_number: z.string().min(1, "Please select or enter a flat number"), // Custom error message
//   password: z.string().regex(/^\d{4,}$/, "Must be at least 4 digits (numbers only)"),
// }).refine((data) => {
//   if (data.building_name === 'Other') {
//     return !!data.other_building && data.other_building.trim().length > 0;
//   }
//   return true;
// }, {
//   message: "Please specify your building name",
//   path: ["other_building"], 
// });

// type RegisterForm = z.infer<typeof registerSchema>;

// // Custom CSS Washing Machine Loader
// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-12 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-32 h-32 bg-white rounded-[2rem] border-[6px] border-slate-100 shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
//       {/* Top panel */}
//       <div className="absolute top-0 w-full h-8 border-b-[6px] border-slate-100 flex items-center justify-end px-3 gap-1.5 bg-slate-50">
//          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//          <div className="w-2 h-2 rounded-full bg-slate-200"></div>
//       </div>
//       {/* Drum */}
//       <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
//         {/* Water/Clothes spinning */}
//         <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
//         <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
//         <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
//       </div>
//     </div>
//     <div className="text-center space-y-2">
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Waking up the servers...</h3>
//       <p className="text-xs font-bold text-slate-400 max-w-[250px] mx-auto leading-relaxed">
//         We are spinning up the servers. This usually takes about <span className="text-brand-primary">30-40 seconds</span> on the first run.
//       </p>
//     </div>
//   </div>
// );

// export const RegisterPage = () => {
//   const navigate = useNavigate();
//   const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
//     resolver: zodResolver(registerSchema)
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ['publicBuildings'],
//     queryFn: getPublicBuildings,
//   });

//   const selectedBuildingName = watch('building_name');
//   const passwordValue = watch('password') || '';

//   const selectedBuildingObj = buildings.find((b: any) => b.name === selectedBuildingName);
//   const availableFlats = selectedBuildingObj ? selectedBuildingObj.flats : [];

//   const mutation = useMutation({
//     mutationFn: (data: RegisterForm) => {
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       return authService.register({
//         ...data,
//         building_name: finalBuilding,
//         email: data.email === "" ? null : data.email,
//       });
//     },
//     onSuccess: () => {
//       toast.success("Account created! Please login.");
//       navigate('/login');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed")
//   });

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
//       <div className="max-w-md w-full mx-auto space-y-8">
//         <div className="text-center">
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join Us.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Professional care for your favorites.</p>
//         </div>

//         {/* Show Loader if pending, otherwise show Form */}
//         {mutation.isPending ? (
//           <LaundryLoader />
//         ) : (
//           <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 animate-in fade-in duration-300">
//             <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5">
              
//               {/* Standard Inputs */}
//               <div className="space-y-4">
//                  <div className="relative">
//                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('full_name')} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//                 <div className="relative">
//                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input {...register('mobile')} placeholder="Mobile Number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" />
//                 </div>
//               </div>

//               <hr className="border-slate-50" />

//               {/* Dynamic Building/Flat Logic */}
//               <div className="space-y-3">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address Details</p>
                
//                 <div className="relative">
//                   <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                   <select 
//                     {...register('building_name')} 
//                     disabled={isBuildingsLoading}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50"
//                   >
//                     <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                     {buildings.map((b: any) => (
//                       <option key={b.id} value={b.name}>{b.name}</option>
//                     ))}
//                     <option value="Other">Other Building...</option>
//                   </select>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1">
//                     <input 
//                       {...register('other_building')} 
//                       placeholder="Enter Building Name" 
//                       className={`w-full px-5 py-4 bg-white border-2 rounded-2xl font-bold text-slate-900 outline-none transition-all ${errors.other_building ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 focus:ring-brand-primary'}`} 
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message}
//                       </p>
//                     )}
//                   </div>
//                 )}

//                 {/* FLAT NUMBER INPUT WITH ERROR DISPLAY */}
//                 {selectedBuildingName && (
//                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-300">
//                     <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    
//                     {selectedBuildingName !== 'Other' && availableFlats.length > 0 ? (
//                       <select {...register('flat_number')} className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none appearance-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`}>
//                         <option value="">Select Flat Number</option>
//                         {availableFlats.map((f: string) => <option key={f} value={f}>{f}</option>)}
//                       </select>
//                     ) : (
//                       <input {...register('flat_number')} placeholder="Flat / Villa Number" className={`w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 outline-none ${errors.flat_number ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-brand-primary'}`} />
//                     )}

//                     {/* NEW: Displays the Flat Number error so the user knows why it won't submit */}
//                     {errors.flat_number && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1.5 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.flat_number.message}
//                       </p>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <hr className="border-slate-50" />

//               {/* Password with Visual Requirements */}
//               <div className="space-y-3">
//                 <div className="relative">
//                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('password')} 
//                     type="password" 
//                     inputMode="numeric"
//                     placeholder="Set 4-Digit PIN" 
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none" 
//                   />
//                 </div>
//                 <div className="flex gap-4 px-2">
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${passwordValue.length >= 4 ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {passwordValue.length >= 4 ? <CheckCircle2 size={12}/> : <Circle size={12}/>} 4+ Digits
//                   </div>
//                   <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight transition-colors ${/^\d+$/.test(passwordValue) && passwordValue !== '' ? 'text-emerald-500' : 'text-slate-300'}`}>
//                     {/^\d+$/.test(passwordValue) && passwordValue !== '' ? <CheckCircle2 size={12}/> : <Circle size={12}/>} Numbers Only
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <button disabled={mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95">
//               Create Account <ArrowRight size={16} />
//             </button>
//           </form>
//         )}
        
//         {!mutation.isPending && (
//           <p className="text-center text-slate-500 font-bold text-sm animate-in fade-in">
//             Already have an account? <Link to="/login" className="text-brand-primary underline">Login here</Link>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// };