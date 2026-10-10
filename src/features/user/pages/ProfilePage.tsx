// src/features/user/pages/ProfilePage.tsx
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService, type UserUpdatePayload } from "../api/user.service";
import { adminService } from "@/features/admin/api/admin.service";
import { getPublicBuildings } from "@/features/auth/api/auth.service";
import { useAuthStore } from "@/store/useAuthStore";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Save,
  Loader2,
  BadgeCheck,
  ShieldCheck,
  HardHat,
  Lock,
  Info,
  Building2,
  AlertCircle,
  ChevronRight 
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/utils/cn";
import { useNavigate } from "react-router-dom";

type ProfileFormPayload = UserUpdatePayload & { 
  confirm_password?: string;
  other_building?: string;
};

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const { user: authUser, setUser } = useAuthStore();
   const navigate = useNavigate();

  const isCustomer = authUser?.role === "CUSTOMER";
  const isAdmin = authUser?.role === "ADMIN";

  const { data: config } = useQuery({
    queryKey: ["systemConfig"],
    queryFn: adminService.getSystemConfig,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: userService.getMe,
    initialData: authUser,
  });

  const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
    queryKey: ["publicBuildings"],
    queryFn: getPublicBuildings,
  });

  // Smart initialization: If user has a building not in the public list, map to "Other"
  const initialBuilding = profile?.building_name || "";
  const isUnknownBuilding = buildings.length > 0 && initialBuilding !== "" && !buildings.some((b: any) => b.name === initialBuilding);

  const {
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { isDirty, errors, isValid },
  } = useForm<ProfileFormPayload>({
    mode: "onChange",
    values: {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      flat_number: profile?.flat_number || "",
      building_name: isUnknownBuilding ? "Other" : initialBuilding,
      other_building: isUnknownBuilding ? initialBuilding : "",
    },
  });

  const newPassword = watch("password");
  const confirmPassword = watch("confirm_password");
  const selectedBuildingName = watch("building_name");

  const mutation = useMutation({
    mutationFn: (data: ProfileFormPayload) => {
      if (data.password && data.password !== data.confirm_password) {
        throw new Error("Passwords do not match");
      }
      
      const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
      const cleanedData: any = {};
      
      Object.entries(data).forEach(([key, value]) => {
        if (key === "confirm_password" || key === "other_building") return;
        if (key === "password" && !value) return;
        
        if (key === "building_name") {
          cleanedData[key] = finalBuilding === "" ? null : finalBuilding;
        } else {
          cleanedData[key] = value === "" ? null : value;
        }
      });
      return userService.updateMe(cleanedData);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["userProfile"], updatedUser);
      setUser(updatedUser);
      resetField("password");
      resetField("confirm_password");
      toast.success("Settings updated successfully!");
    },
    onError: (err: any) => toast.error(err.message || "Update failed"),
  });

  if (isLoading || isBuildingsLoading)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-black uppercase tracking-widest text-[10px]">
          Syncing Profile...
        </p>
      </div>
    );

  return (
    <div className="relative min-h-screen">
       <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg3.jpg')" }}
      />
      <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">

        <header className="space-y-8">
          <div className="flex justify-between items-start bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Settings
              </h1>
              <p className="text-slate-500 font-medium">
                Manage your personal preferences.
              </p>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm bg-white",
                isAdmin
                  ? "text-red-600 border-red-100"
                  : isCustomer
                    ? "text-emerald-600 border-emerald-100"
                    : "text-blue-600 border-blue-100",
              )}
            >
              {isAdmin ? (
                <ShieldCheck size={14} />
              ) : isCustomer ? (
                <BadgeCheck size={14} />
              ) : (
                <HardHat size={14} />
              )}
              {profile?.role}
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-6"
        >
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <User size={18} />
              </div>
              <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
                Personal Info
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <input
                  {...register("full_name")}
                  className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Mobile
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    disabled
                    value={profile?.mobile}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                  size={18}
                />
                <input
                  {...register("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Please enter a valid email address"
                    }
                  })}
                  type="email"
                  className={cn(
                    "w-full pl-12 pr-5 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
                    errors.email ? "border-red-500 ring-1 ring-red-500" : "border-slate-100"
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 mt-1 uppercase tracking-widest">
                  <AlertCircle size={10} /> {errors.email.message}
                </p>
              )}
            </div>
          </div>

          {isCustomer && (
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-primary text-white rounded-xl">
                  <MapPin size={18} />
                </div>
                <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
                  Delivery Address
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Flat / Villa No.
                  </label>
                  <input
                    {...register("flat_number")}
                    className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Building Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                      {...register('building_name', { required: "Please select a building" })} 
                      disabled={isBuildingsLoading}
                      className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
                    >
                      <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
                      {buildings.map((b: any) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                      <option value="Other">Other Building...</option>
                    </select>
                  </div>
                </div>

                {selectedBuildingName === 'Other' && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Specify Building Name
                    </label>
                    <input 
                      {...register('other_building', {
                         required: selectedBuildingName === 'Other' ? "Please enter your building name" : false
                      })} 
                      placeholder="Enter Custom Building Name" 
                      className={cn(
                        "w-full px-5 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 outline-none transition-all",
                        errors.other_building ? "border-red-500 focus:ring-red-500" : "border-slate-100 focus:ring-brand-primary"
                      )}
                    />
                    {errors.other_building && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
                        <AlertCircle size={10} /> {errors.other_building.message as string}
                      </p>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
                <Lock size={18} />
              </div>
              <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
                Security & PIN
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  New PIN
                </label>
                <input
                  {...register("password", {
                    pattern: { value: /^\d*$/, message: "Digits only" },
                    minLength: { value: 4, message: "Min 4 digits" },
                  })}
                  type="password"
                  placeholder="••••"
                  maxLength={8}
                  className={cn(
                    "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
                    errors.password && "ring-2 ring-red-500",
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Confirm PIN
                </label>
                <input
                  {...register("confirm_password")}
                  type="password"
                  placeholder="••••"
                  maxLength={8}
                  className={cn(
                    "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
                    newPassword !== confirmPassword &&
                      confirmPassword &&
                      "ring-2 ring-red-500",
                  )}
                />
              </div>
            </div>
          </div>

          <button
            disabled={
              (!isDirty && !newPassword) || !isValid || mutation.isPending
            }
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Syncing...
              </>
            ) : (
              <>
                <Save size={18} /> Update Profile
              </>
            )}
          </button>
        </form>


        {/* OFFICIAL CONTACT & ADDRESS CARD */}
        {/* {isCustomer && (
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white mt-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2 bg-brand-primary rounded-xl text-white">
                <Info size={20} />
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">
                  Zayden Laundry
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                  Official Support & Contact
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm font-medium text-slate-300">
              <div className="flex items-start gap-4">
                <MapPin className="shrink-0 mt-1 text-slate-500" size={18} />
                <p className="leading-relaxed">
                  Industrial Area-13, Behind National Paint
                  <br />
                  Near to Dubai Dates Factory
                  <br />
                  Post Box No. 26697, Sharjah
                </p>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="shrink-0 mt-0.5 text-slate-500" size={18} />
                <div className="space-y-1">
                  <p>06-5343558 (Tel & Fax)</p>
                  <p>054-3077291 / 054-3059449</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Mail className="shrink-0 text-slate-500" size={18} />
                <a
                  href="mailto:alnejoumlaundry@yahoo.com"
                  className="hover:text-brand-primary transition-colors"
                >
                  alnejoumlaundry@yahoo.com
                </a>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};
// // src/features/user/pages/ProfilePage.tsx
// import { useForm } from "react-hook-form";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { userService, type UserUpdatePayload } from "../api/user.service";
// import { adminService } from "@/features/admin/api/admin.service";
// import { getPublicBuildings } from "@/features/auth/api/auth.service";
// import { useAuthStore } from "@/store/useAuthStore";
// import {
//   User,
//   MapPin,
//   Mail,
//   Phone,
//   Save,
//   Loader2,
//   BadgeCheck,
//   ShieldCheck,
//   HardHat,
//   Lock,
//   Wallet,
//   Info,
//   Building2,
//   AlertCircle,
//   Share2 // <-- Added Share icon
// } from "lucide-react";
// import { toast } from "sonner";
// import { cn } from "@/utils/cn";

// type ProfileFormPayload = UserUpdatePayload & { 
//   confirm_password?: string;
//   other_building?: string;
// };

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();

//   const isCustomer = authUser?.role === "CUSTOMER";
//   const isAdmin = authUser?.role === "ADMIN";

//   const { data: config } = useQuery({
//     queryKey: ["systemConfig"],
//     queryFn: adminService.getSystemConfig,
//   });

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ["userProfile"],
//     queryFn: userService.getMe,
//     initialData: authUser,
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ["publicBuildings"],
//     queryFn: getPublicBuildings,
//   });

//   // Smart initialization: If user has a building not in the public list, map to "Other"
//   const initialBuilding = profile?.building_name || "";
//   const isUnknownBuilding = buildings.length > 0 && initialBuilding !== "" && !buildings.some((b: any) => b.name === initialBuilding);

//   const {
//     register,
//     handleSubmit,
//     watch,
//     resetField,
//     formState: { isDirty, errors, isValid },
//   } = useForm<ProfileFormPayload>({
//     mode: "onChange",
//     values: {
//       full_name: profile?.full_name || "",
//       email: profile?.email || "",
//       flat_number: profile?.flat_number || "",
//       building_name: isUnknownBuilding ? "Other" : initialBuilding,
//       other_building: isUnknownBuilding ? initialBuilding : "",
//     },
//   });

//   const newPassword = watch("password");
//   const confirmPassword = watch("confirm_password");
//   const selectedBuildingName = watch("building_name");

//   const mutation = useMutation({
//     mutationFn: (data: ProfileFormPayload) => {
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }
      
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       const cleanedData: any = {};
      
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === "confirm_password" || key === "other_building") return;
//         if (key === "password" && !value) return;
        
//         if (key === "building_name") {
//           cleanedData[key] = finalBuilding === "" ? null : finalBuilding;
//         } else {
//           cleanedData[key] = value === "" ? null : value;
//         }
//       });
//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(["userProfile"], updatedUser);
//       setUser(updatedUser);
//       resetField("password");
//       resetField("confirm_password");
//       toast.success("Settings updated successfully!");
//     },
//     onError: (err: any) => toast.error(err.message || "Update failed"),
//   });

//   if (isLoading)
//     return (
//       <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//         <Loader2 className="animate-spin mb-4" size={40} />
//         <p className="font-black uppercase tracking-widest text-[10px]">
//           Syncing Profile...
//         </p>
//       </div>
//     );

//   return (
//     <div className="relative min-h-screen">
//        <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg3.jpg')" }}
//       />
//       <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">

//         <header className="space-y-8">
//           {isCustomer && config?.referral_system_enabled && (
//             <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 text-white overflow-hidden relative animate-in zoom-in-95 duration-500">
//               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

//               <div className="flex items-center gap-6 z-10 w-full md:w-auto">
//                 <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
//                   <Wallet className="text-brand-primary" size={28} />
//                 </div>
//                 <div>
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
//                     Available Credits
//                   </p>
//                   <div className="flex items-baseline gap-1">
//                     <span className="text-4xl font-black tracking-tighter">
//                       {profile?.wallet_balance?.toFixed(2) || "0.00"}
//                     </span>
//                     <span className="text-sm font-bold text-brand-primary">
//                       pts
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {profile?.referral_code && (
//                 <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto z-10 backdrop-blur-md">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
//                     Your Referral Code
//                   </p>
//                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
//                     <span className="text-2xl font-black tracking-widest font-mono text-white select-all">
//                       {profile.referral_code}
//                     </span>
//                     <div className="flex items-center gap-2">
//                       <button
//                         type="button"
//                         onClick={() => {
//                           navigator.clipboard.writeText(
//                             profile.referral_code || "",
//                           );
//                           toast.success("Code copied!");
//                         }}
//                         className="px-4 py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all shadow-lg active:scale-95"
//                       >
//                         Copy
//                       </button>
//                       <button
//                         type="button"
//                       onClick={() => {
//   const message = `Hey! Make your laundry experience easier with Zayden Laundry. 

// Sign up at www.alnejoumalarbaahlaundry.com and use my referral code: ${profile.referral_code}`;
  
//   const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
//   window.open(whatsappUrl, '_blank');
// }}
//                         className="px-4 py-2 flex items-center gap-1.5 bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#20b858] transition-all shadow-lg active:scale-95"
//                       >
//                         <Share2 size={12} /> Share
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="flex justify-between items-start bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white">
//             <div>
//               <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//                 Settings
//               </h1>
//               <p className="text-slate-500 font-medium">
//                 Manage your personal preferences.
//               </p>
//             </div>

//             <div
//               className={cn(
//                 "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm bg-white",
//                 isAdmin
//                   ? "text-red-600 border-red-100"
//                   : isCustomer
//                     ? "text-emerald-600 border-emerald-100"
//                     : "text-blue-600 border-blue-100",
//               )}
//             >
//               {isAdmin ? (
//                 <ShieldCheck size={14} />
//               ) : isCustomer ? (
//                 <BadgeCheck size={14} />
//               ) : (
//                 <HardHat size={14} />
//               )}
//               {profile?.role}
//             </div>
//           </div>
//         </header>

//         <form
//           onSubmit={handleSubmit((data) => mutation.mutate(data))}
//           className="space-y-6"
//         >
//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-slate-900 text-white rounded-xl">
//                 <User size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Personal Info
//               </h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Full Name
//                 </label>
//                 <input
//                   {...register("full_name")}
//                   className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Mobile
//                 </label>
//                 <div className="relative">
//                   <Phone
//                     className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                     size={18}
//                   />
//                   <input
//                     disabled
//                     value={profile?.mobile}
//                     className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <Mail
//                   className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                   size={18}
//                 />
//                 <input
//                   {...register("email")}
//                   type="email"
//                   className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//             </div>
//           </div>

//           {isCustomer && (
//             <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//               <div className="flex items-center gap-3 mb-2">
//                 <div className="p-2 bg-brand-primary text-white rounded-xl">
//                   <MapPin size={18} />
//                 </div>
//                 <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                   Delivery Address
//                 </h2>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Flat / Villa No.
//                   </label>
//                   <input
//                     {...register("flat_number")}
//                     className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Building Name
//                   </label>
//                   <div className="relative">
//                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                     <select 
//                       {...register('building_name', { required: "Please select a building" })} 
//                       disabled={isBuildingsLoading}
//                       className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
//                     >
//                       <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                       {buildings.map((b: any) => (
//                         <option key={b.id} value={b.name}>{b.name}</option>
//                       ))}
//                       <option value="Other">Other Building...</option>
//                     </select>
//                   </div>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Specify Building Name
//                     </label>
//                     <input 
//                       {...register('other_building', {
//                          required: selectedBuildingName === 'Other' ? "Please enter your building name" : false
//                       })} 
//                       placeholder="Enter Custom Building Name" 
//                       className={cn(
//                         "w-full px-5 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 outline-none transition-all",
//                         errors.other_building ? "border-red-500 focus:ring-red-500" : "border-slate-100 focus:ring-brand-primary"
//                       )}
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message as string}
//                       </p>
//                     )}
//                   </div>
//                 )}

//               </div>
//             </div>
//           )}

//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
//                 <Lock size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Security & PIN
//               </h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   New PIN
//                 </label>
//                 <input
//                   {...register("password", {
//                     pattern: { value: /^\d*$/, message: "Digits only" },
//                     minLength: { value: 4, message: "Min 4 digits" },
//                   })}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     errors.password && "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Confirm PIN
//                 </label>
//                 <input
//                   {...register("confirm_password")}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     newPassword !== confirmPassword &&
//                       confirmPassword &&
//                       "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//             </div>
//           </div>

//           <button
//             disabled={
//               (!isDirty && !newPassword) || !isValid || mutation.isPending
//             }
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
//           >
//             {mutation.isPending ? (
//               <>
//                 <Loader2 className="animate-spin" size={18} /> Syncing...
//               </>
//             ) : (
//               <>
//                 <Save size={18} /> Update Profile
//               </>
//             )}
//           </button>
//         </form>

//         {/* OFFICIAL CONTACT & ADDRESS CARD */}
//         {isCustomer && (
//           <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white mt-8 space-y-6">
//             <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
//               <div className="p-2 bg-brand-primary rounded-xl text-white">
//                 <Info size={20} />
//               </div>
//               <div>
//                 <h2 className="font-black text-lg tracking-tight">
//                   Zayden Laundry
//                 </h2>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
//                   Official Support & Contact
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-5 text-sm font-medium text-slate-300">
//               <div className="flex items-start gap-4">
//                 <MapPin className="shrink-0 mt-1 text-slate-500" size={18} />
//                 <p className="leading-relaxed">
//                   Industrial Area-13, Behind National Paint
//                   <br />
//                   Near to Dubai Dates Factory
//                   <br />
//                   Post Box No. 26697, Sharjah
//                 </p>
//               </div>

//               <div className="flex items-start gap-4">
//                 <Phone className="shrink-0 mt-0.5 text-slate-500" size={18} />
//                 <div className="space-y-1">
//                   <p>06-5343558 (Tel & Fax)</p>
//                   <p>054-3077291 / 054-3059449</p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-4">
//                 <Mail className="shrink-0 text-slate-500" size={18} />
//                 <a
//                   href="mailto:alnejoumlaundry@yahoo.com"
//                   className="hover:text-brand-primary transition-colors"
//                 >
//                   alnejoumlaundry@yahoo.com
//                 </a>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/user/pages/ProfilePage.tsx
// import { useForm } from "react-hook-form";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { userService, type UserUpdatePayload } from "../api/user.service";
// import { adminService } from "@/features/admin/api/admin.service";
// import { getPublicBuildings } from "@/features/auth/api/auth.service";
// import { useAuthStore } from "@/store/useAuthStore";
// import {
//   User,
//   MapPin,
//   Mail,
//   Phone,
//   Save,
//   Loader2,
//   BadgeCheck,
//   ShieldCheck,
//   HardHat,
//   Lock,
//   Wallet,
//   Info,
//   Building2,
//   AlertCircle
// } from "lucide-react";
// import { toast } from "sonner";
// import { cn } from "@/utils/cn";

// type ProfileFormPayload = UserUpdatePayload & { 
//   confirm_password?: string;
//   other_building?: string;
// };

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();

//   const isCustomer = authUser?.role === "CUSTOMER";
//   const isAdmin = authUser?.role === "ADMIN";

//   const { data: config } = useQuery({
//     queryKey: ["systemConfig"],
//     queryFn: adminService.getSystemConfig,
//   });

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ["userProfile"],
//     queryFn: userService.getMe,
//     initialData: authUser,
//   });

//   const { data: buildings = [], isLoading: isBuildingsLoading } = useQuery({
//     queryKey: ["publicBuildings"],
//     queryFn: getPublicBuildings,
//   });

//   // Smart initialization: If user has a building not in the public list, map to "Other"
//   const initialBuilding = profile?.building_name || "";
//   const isUnknownBuilding = buildings.length > 0 && initialBuilding !== "" && !buildings.some((b: any) => b.name === initialBuilding);

//   const {
//     register,
//     handleSubmit,
//     watch,
//     resetField,
//     formState: { isDirty, errors, isValid },
//   } = useForm<ProfileFormPayload>({
//     mode: "onChange",
//     values: {
//       full_name: profile?.full_name || "",
//       email: profile?.email || "",
//       flat_number: profile?.flat_number || "",
//       building_name: isUnknownBuilding ? "Other" : initialBuilding,
//       other_building: isUnknownBuilding ? initialBuilding : "",
//     },
//   });

//   const newPassword = watch("password");
//   const confirmPassword = watch("confirm_password");
//   const selectedBuildingName = watch("building_name");

//   const mutation = useMutation({
//     mutationFn: (data: ProfileFormPayload) => {
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }
      
//       const finalBuilding = data.building_name === 'Other' ? data.other_building : data.building_name;
//       const cleanedData: any = {};
      
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === "confirm_password" || key === "other_building") return;
//         if (key === "password" && !value) return;
        
//         if (key === "building_name") {
//           cleanedData[key] = finalBuilding === "" ? null : finalBuilding;
//         } else {
//           cleanedData[key] = value === "" ? null : value;
//         }
//       });
//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(["userProfile"], updatedUser);
//       setUser(updatedUser);
//       resetField("password");
//       resetField("confirm_password");
//       toast.success("Settings updated successfully!");
//     },
//     onError: (err: any) => toast.error(err.message || "Update failed"),
//   });

//   if (isLoading)
//     return (
//       <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//         <Loader2 className="animate-spin mb-4" size={40} />
//         <p className="font-black uppercase tracking-widest text-[10px]">
//           Syncing Profile...
//         </p>
//       </div>
//     );

//   return (
//     <div className="relative min-h-screen">
//        <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg3.jpg')" }}
//       />
//       <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">

//         <header className="space-y-8">
//           {isCustomer && config?.referral_system_enabled && (
//             <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 text-white overflow-hidden relative animate-in zoom-in-95 duration-500">
//               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

//               <div className="flex items-center gap-6 z-10 w-full md:w-auto">
//                 <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
//                   <Wallet className="text-brand-primary" size={28} />
//                 </div>
//                 <div>
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
//                     Available Credits
//                   </p>
//                   <div className="flex items-baseline gap-1">
//                     <span className="text-4xl font-black tracking-tighter">
//                       {profile?.wallet_balance?.toFixed(2) || "0.00"}
//                     </span>
//                     <span className="text-sm font-bold text-brand-primary">
//                       pts
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {profile?.referral_code && (
//                 <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto z-10 backdrop-blur-md">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
//                     Your Referral Code
//                   </p>
//                   <div className="flex items-center gap-3">
//                     <span className="text-2xl font-black tracking-widest font-mono text-white select-all">
//                       {profile.referral_code}
//                     </span>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         navigator.clipboard.writeText(
//                           profile.referral_code || "",
//                         );
//                         toast.success("Code copied!");
//                       }}
//                       className="px-4 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg active:scale-95"
//                     >
//                       Copy
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="flex justify-between items-start bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white">
//             <div>
//               <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//                 Settings
//               </h1>
//               <p className="text-slate-500 font-medium">
//                 Manage your personal preferences.
//               </p>
//             </div>

//             <div
//               className={cn(
//                 "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm bg-white",
//                 isAdmin
//                   ? "text-red-600 border-red-100"
//                   : isCustomer
//                     ? "text-emerald-600 border-emerald-100"
//                     : "text-blue-600 border-blue-100",
//               )}
//             >
//               {isAdmin ? (
//                 <ShieldCheck size={14} />
//               ) : isCustomer ? (
//                 <BadgeCheck size={14} />
//               ) : (
//                 <HardHat size={14} />
//               )}
//               {profile?.role}
//             </div>
//           </div>
//         </header>

//         <form
//           onSubmit={handleSubmit((data) => mutation.mutate(data))}
//           className="space-y-6"
//         >
//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-slate-900 text-white rounded-xl">
//                 <User size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Personal Info
//               </h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Full Name
//                 </label>
//                 <input
//                   {...register("full_name")}
//                   className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Mobile
//                 </label>
//                 <div className="relative">
//                   <Phone
//                     className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                     size={18}
//                   />
//                   <input
//                     disabled
//                     value={profile?.mobile}
//                     className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <Mail
//                   className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                   size={18}
//                 />
//                 <input
//                   {...register("email")}
//                   type="email"
//                   className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//             </div>
//           </div>

//           {isCustomer && (
//             <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//               <div className="flex items-center gap-3 mb-2">
//                 <div className="p-2 bg-brand-primary text-white rounded-xl">
//                   <MapPin size={18} />
//                 </div>
//                 <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                   Delivery Address
//                 </h2>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Flat / Villa No.
//                   </label>
//                   <input
//                     {...register("flat_number")}
//                     className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Building Name
//                   </label>
//                   <div className="relative">
//                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//                     <select 
//                       {...register('building_name', { required: "Please select a building" })} 
//                       disabled={isBuildingsLoading}
//                       className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none appearance-none disabled:opacity-50 transition-all"
//                     >
//                       <option value="">{isBuildingsLoading ? "Loading buildings..." : "Select Building"}</option>
//                       {buildings.map((b: any) => (
//                         <option key={b.id} value={b.name}>{b.name}</option>
//                       ))}
//                       <option value="Other">Other Building...</option>
//                     </select>
//                   </div>
//                 </div>

//                 {selectedBuildingName === 'Other' && (
//                   <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
//                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                       Specify Building Name
//                     </label>
//                     <input 
//                       {...register('other_building', {
//                          required: selectedBuildingName === 'Other' ? "Please enter your building name" : false
//                       })} 
//                       placeholder="Enter Custom Building Name" 
//                       className={cn(
//                         "w-full px-5 py-4 bg-white/50 border rounded-2xl font-bold text-slate-900 outline-none transition-all",
//                         errors.other_building ? "border-red-500 focus:ring-red-500" : "border-slate-100 focus:ring-brand-primary"
//                       )}
//                     />
//                     {errors.other_building && (
//                       <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase tracking-widest">
//                         <AlertCircle size={10} /> {errors.other_building.message as string}
//                       </p>
//                     )}
//                   </div>
//                 )}

//               </div>
//             </div>
//           )}

//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
//                 <Lock size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Security & PIN
//               </h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   New PIN
//                 </label>
//                 <input
//                   {...register("password", {
//                     pattern: { value: /^\d*$/, message: "Digits only" },
//                     minLength: { value: 4, message: "Min 4 digits" },
//                   })}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     errors.password && "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Confirm PIN
//                 </label>
//                 <input
//                   {...register("confirm_password")}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     newPassword !== confirmPassword &&
//                       confirmPassword &&
//                       "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//             </div>
//           </div>

//           <button
//             disabled={
//               (!isDirty && !newPassword) || !isValid || mutation.isPending
//             }
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
//           >
//             {mutation.isPending ? (
//               <>
//                 <Loader2 className="animate-spin" size={18} /> Syncing...
//               </>
//             ) : (
//               <>
//                 <Save size={18} /> Update Profile
//               </>
//             )}
//           </button>
//         </form>

//         {/* OFFICIAL CONTACT & ADDRESS CARD */}
//         {isCustomer && (
//           <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white mt-8 space-y-6">
//             <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
//               <div className="p-2 bg-brand-primary rounded-xl text-white">
//                 <Info size={20} />
//               </div>
//               <div>
//                 <h2 className="font-black text-lg tracking-tight">
//                   Zayden Laundry
//                 </h2>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
//                   Official Support & Contact
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-5 text-sm font-medium text-slate-300">
//               <div className="flex items-start gap-4">
//                 <MapPin className="shrink-0 mt-1 text-slate-500" size={18} />
//                 <p className="leading-relaxed">
//                   Industrial Area-13, Behind National Paint
//                   <br />
//                   Near to Dubai Dates Factory
//                   <br />
//                   Post Box No. 26697, Sharjah
//                 </p>
//               </div>

//               <div className="flex items-start gap-4">
//                 <Phone className="shrink-0 mt-0.5 text-slate-500" size={18} />
//                 <div className="space-y-1">
//                   <p>06-5343558 (Tel & Fax)</p>
//                   <p>054-3077291 / 054-3059449</p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-4">
//                 <Mail className="shrink-0 text-slate-500" size={18} />
//                 <a
//                   href="mailto:alnejoumlaundry@yahoo.com"
//                   className="hover:text-brand-primary transition-colors"
//                 >
//                   alnejoumlaundry@yahoo.com
//                 </a>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// // src/features/user/pages/ProfilePage.tsx
// import { useForm } from "react-hook-form";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { userService, type UserUpdatePayload } from "../api/user.service";
// import { adminService } from "@/features/admin/api/admin.service";
// import { useAuthStore } from "@/store/useAuthStore";
// import {
//   User,
//   MapPin,
//   Mail,
//   Phone,
//   Save,
//   Loader2,
//   BadgeCheck,
//   ShieldCheck,
//   HardHat,
//   Lock,
//   Wallet,
//   Info,
// } from "lucide-react";
// import { toast } from "sonner";
// import { cn } from "@/utils/cn";

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();

//   const isCustomer = authUser?.role === "CUSTOMER";
//   const isAdmin = authUser?.role === "ADMIN";

//   const { data: config } = useQuery({
//     queryKey: ["systemConfig"],
//     queryFn: adminService.getSystemConfig,
//   });

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ["userProfile"],
//     queryFn: userService.getMe,
//     initialData: authUser,
//   });

//   const {
//     register,
//     handleSubmit,
//     watch,
//     resetField,
//     formState: { isDirty, errors, isValid },
//   } = useForm<UserUpdatePayload & { confirm_password?: string }>({
//     mode: "onChange",
//     values: {
//       full_name: profile?.full_name || "",
//       email: profile?.email || "",
//       flat_number: profile?.flat_number || "",
//       building_name: profile?.building_name || "",
//     },
//   });

//   const newPassword = watch("password");
//   const confirmPassword = watch("confirm_password");

//   const mutation = useMutation({
//     mutationFn: (data: UserUpdatePayload & { confirm_password?: string }) => {
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }
//       const cleanedData: any = {};
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === "confirm_password") return;
//         if (key === "password" && !value) return;
//         cleanedData[key] = value === "" ? null : value;
//       });
//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(["userProfile"], updatedUser);
//       setUser(updatedUser);
//       resetField("password");
//       resetField("confirm_password");
//       toast.success("Settings updated successfully!");
//     },
//     onError: (err: any) => toast.error(err.message || "Update failed"),
//   });

//   if (isLoading)
//     return (
//       <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//         <Loader2 className="animate-spin mb-4" size={40} />
//         <p className="font-black uppercase tracking-widest text-[10px]">
//           Syncing Profile...
//         </p>
//       </div>
//     );

//   return (
//     <div className="relative min-h-screen">
//       {/* LAUNDRY THEME BACKGROUND OVERLAY */}
//       {/* <div className="fixed inset-0 z-[-1] bg-[url('https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04] pointer-events-none mix-blend-multiply"></div> */}
//       {/* NEW CODE */}
//       {/* <div className="fixed inset-0 z-[-1] bg-[url('/images/bg1.jpg')] bg-cover bg-center opacity-[0.08] pointer-events-none"></div> */}
//        <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-50 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg3.jpg')" }}
//       />
//       {/* <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4 md:px-0 pt-4"> */}
//             <div className="relative z-10 space-y-8 pb-24 md:pb-8 max-w-2xl mx-auto pt-4 px-4 md:px-0">

//         <header className="space-y-8">
//           {isCustomer && config?.referral_system_enabled && (
//             <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 text-white overflow-hidden relative animate-in zoom-in-95 duration-500">
//               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

//               <div className="flex items-center gap-6 z-10 w-full md:w-auto">
//                 <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
//                   <Wallet className="text-brand-primary" size={28} />
//                 </div>
//                 <div>
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
//                     Available Credits
//                   </p>
//                   <div className="flex items-baseline gap-1">
//                     <span className="text-4xl font-black tracking-tighter">
//                       {profile?.wallet_balance?.toFixed(2) || "0.00"}
//                     </span>
//                     <span className="text-sm font-bold text-brand-primary">
//                       pts
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {profile?.referral_code && (
//                 <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto z-10 backdrop-blur-md">
//                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
//                     Your Referral Code
//                   </p>
//                   <div className="flex items-center gap-3">
//                     <span className="text-2xl font-black tracking-widest font-mono text-white select-all">
//                       {profile.referral_code}
//                     </span>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         navigator.clipboard.writeText(
//                           profile.referral_code || "",
//                         );
//                         toast.success("Code copied!");
//                       }}
//                       className="px-4 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg active:scale-95"
//                     >
//                       Copy
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           <div className="flex justify-between items-start bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white">
//             <div>
//               <h1 className="text-3xl font-black text-slate-900 tracking-tight">
//                 Settings
//               </h1>
//               <p className="text-slate-500 font-medium">
//                 Manage your personal preferences.
//               </p>
//             </div>

//             <div
//               className={cn(
//                 "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm bg-white",
//                 isAdmin
//                   ? "text-red-600 border-red-100"
//                   : isCustomer
//                     ? "text-emerald-600 border-emerald-100"
//                     : "text-blue-600 border-blue-100",
//               )}
//             >
//               {isAdmin ? (
//                 <ShieldCheck size={14} />
//               ) : isCustomer ? (
//                 <BadgeCheck size={14} />
//               ) : (
//                 <HardHat size={14} />
//               )}
//               {profile?.role}
//             </div>
//           </div>
//         </header>

//         <form
//           onSubmit={handleSubmit((data) => mutation.mutate(data))}
//           className="space-y-6"
//         >
//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-slate-900 text-white rounded-xl">
//                 <User size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Personal Info
//               </h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Full Name
//                 </label>
//                 <input
//                   {...register("full_name")}
//                   className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Mobile
//                 </label>
//                 <div className="relative">
//                   <Phone
//                     className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                     size={18}
//                   />
//                   <input
//                     disabled
//                     value={profile?.mobile}
//                     className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                 Email Address
//               </label>
//               <div className="relative">
//                 <Mail
//                   className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
//                   size={18}
//                 />
//                 <input
//                   {...register("email")}
//                   type="email"
//                   className="w-full pl-12 pr-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//             </div>
//           </div>

//           {isCustomer && (
//             <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//               <div className="flex items-center gap-3 mb-2">
//                 <div className="p-2 bg-brand-primary text-white rounded-xl">
//                   <MapPin size={18} />
//                 </div>
//                 <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                   Delivery Address
//                 </h2>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Flat / Villa No.
//                   </label>
//                   <input
//                     {...register("flat_number")}
//                     className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 <div className="space-y-2">
//                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                     Building Name
//                   </label>
//                   <input
//                     {...register("building_name")}
//                     className="w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
//                 <Lock size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">
//                 Security & PIN
//               </h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   New PIN
//                 </label>
//                 <input
//                   {...register("password", {
//                     pattern: { value: /^\d*$/, message: "Digits only" },
//                     minLength: { value: 4, message: "Min 4 digits" },
//                   })}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     errors.password && "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
//                   Confirm PIN
//                 </label>
//                 <input
//                   {...register("confirm_password")}
//                   type="password"
//                   placeholder="••••"
//                   maxLength={8}
//                   className={cn(
//                     "w-full px-5 py-4 bg-white/50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                     newPassword !== confirmPassword &&
//                       confirmPassword &&
//                       "ring-2 ring-red-500",
//                   )}
//                 />
//               </div>
//             </div>
//           </div>

//           <button
//             disabled={
//               (!isDirty && !newPassword) || !isValid || mutation.isPending
//             }
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
//           >
//             {mutation.isPending ? (
//               <>
//                 <Loader2 className="animate-spin" size={18} /> Syncing...
//               </>
//             ) : (
//               <>
//                 <Save size={18} /> Update Profile
//               </>
//             )}
//           </button>
//         </form>

//         {/* OFFICIAL CONTACT & ADDRESS CARD */}
//         {isCustomer && (
//           <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white mt-8 space-y-6">
//             <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
//               <div className="p-2 bg-brand-primary rounded-xl text-white">
//                 <Info size={20} />
//               </div>
//               <div>
//                 <h2 className="font-black text-lg tracking-tight">
//                   Zayden Laundry
//                 </h2>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
//                   Official Support & Contact
//                 </p>
//               </div>
//             </div>

//             <div className="space-y-5 text-sm font-medium text-slate-300">
//               <div className="flex items-start gap-4">
//                 <MapPin className="shrink-0 mt-1 text-slate-500" size={18} />
//                 <p className="leading-relaxed">
//                   Industrial Area-13, Behind National Paint
//                   <br />
//                   Near to Dubai Dates Factory
//                   <br />
//                   Post Box No. 26697, Sharjah
//                 </p>
//               </div>

//               <div className="flex items-start gap-4">
//                 <Phone className="shrink-0 mt-0.5 text-slate-500" size={18} />
//                 <div className="space-y-1">
//                   <p>06-5530600 (Tel & Fax)</p>
//                   <p>054-3077291 / 054-3059449</p>
//                   <p>055-3459500 / 052-9251218</p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-4">
//                 <Mail className="shrink-0 text-slate-500" size={18} />
//                 <a
//                   href="mailto:alnejoumlaundry@yahoo.com"
//                   className="hover:text-brand-primary transition-colors"
//                 >
//                   alnejoumlaundry@yahoo.com
//                 </a>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { userService, type UserUpdatePayload } from '../api/user.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { useAuthStore } from '@/store/useAuthStore';
// import {
//   User, MapPin, Mail, Phone, Save, Loader2,
//   BadgeCheck, ShieldCheck, HardHat, Lock, AlertCircle,
//   Wallet
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();

//   const isCustomer = authUser?.role === 'CUSTOMER';
//   const isAdmin = authUser?.role === 'ADMIN';

//   // Fetch System Config for the Referral Toggle
//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   const { register, handleSubmit, watch, resetField, formState: { isDirty, errors, isValid } } = useForm<UserUpdatePayload & { confirm_password?: string }>({
//     mode: 'onChange',
//     values: {
//       full_name: profile?.full_name || '',
//       email: profile?.email || '',
//       flat_number: profile?.flat_number || '',
//       building_name: profile?.building_name || '',
//     }
//   });

//   const newPassword = watch('password');
//   const confirmPassword = watch('confirm_password');

//   const mutation = useMutation({
//     mutationFn: (data: UserUpdatePayload & { confirm_password?: string }) => {
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }
//       const cleanedData: any = {};
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === 'confirm_password') return;
//         if (key === 'password' && !value) return;
//         cleanedData[key] = value === "" ? null : value;
//       });
//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(['userProfile'], updatedUser);
//       setUser(updatedUser);
//       resetField('password');
//       resetField('confirm_password');
//       toast.success("Settings updated successfully!");
//     },
//     onError: (err: any) => toast.error(err.message || "Update failed")
//   });

//   if (isLoading) return (
//     <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//       <Loader2 className="animate-spin mb-4" size={40} />
//       <p className="font-black uppercase tracking-widest text-[10px]">Syncing Profile...</p>
//     </div>
//   );

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4 md:px-0">
//       <header className="space-y-8">
//         {/* WALLET & REFERRAL SECTION: Wrapped with Config Check */}
//         {isCustomer && config?.referral_system_enabled && (
//           <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 text-white overflow-hidden relative animate-in zoom-in-95 duration-500">
//             <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

//             <div className="flex items-center gap-6 z-10 w-full md:w-auto">
//               <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
//                 <Wallet className="text-brand-primary" size={28} />
//               </div>
//               <div>
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Credits</p>
//                 <div className="flex items-baseline gap-1">
//                   <span className="text-4xl font-black tracking-tighter">{profile?.wallet_balance?.toFixed(2) || '0.00'}</span>
//                   <span className="text-sm font-bold text-brand-primary">pts</span>
//                 </div>
//               </div>
//             </div>

//             {profile?.referral_code && (
//               <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto z-10 backdrop-blur-md">
//                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Referral Code</p>
//                 <div className="flex items-center gap-3">
//                   <span className="text-2xl font-black tracking-widest font-mono text-white select-all">{profile.referral_code}</span>
//                   <button
//                     type="button"
//                     onClick={() => {
//                       navigator.clipboard.writeText(profile.referral_code || '');
//                       toast.success("Code copied!");
//                     }}
//                     className="px-4 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg active:scale-95"
//                   >
//                     Copy
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         <div className="flex justify-between items-start">
//           <div>
//             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
//             <p className="text-slate-500 font-medium">Manage your personal and security preferences.</p>
//           </div>

//           <div className={cn(
//             "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm",
//             isAdmin ? "bg-red-50 text-red-600 border-red-100" :
//             isCustomer ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
//             "bg-blue-50 text-blue-600 border-blue-100"
//           )}>
//             {isAdmin ? <ShieldCheck size={14} /> : isCustomer ? <BadgeCheck size={14} /> : <HardHat size={14} />}
//             {profile?.role}
//           </div>
//         </div>
//       </header>

//       <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-slate-900 text-white rounded-xl"><User size={18} /></div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Personal Info</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
//               <input {...register('full_name')} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input disabled value={profile?.mobile} className="w-full pl-12 pr-5 py-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed" />
//               </div>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
//             <div className="relative">
//               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//               <input {...register('email')} type="email" className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//             </div>
//           </div>
//         </div>

//         {isCustomer && (
//           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-brand-primary text-white rounded-xl"><MapPin size={18} /></div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Delivery Address</h2>
//             </div>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat / Villa No.</label>
//                 <input {...register('flat_number')} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
//                 <input {...register('building_name')} className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100"><Lock size={18} /></div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Security & PIN</h2>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New PIN</label>
//               <input {...register('password', { pattern: { value: /^\d*$/, message: "Digits only" }, minLength: { value: 4, message: "Min 4 digits" } })} type="password" placeholder="••••" maxLength={8} className={cn("w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all", errors.password && "ring-2 ring-red-500")} />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm PIN</label>
//               <input {...register('confirm_password')} type="password" placeholder="••••" maxLength={8} className={cn("w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all", newPassword !== confirmPassword && confirmPassword && "ring-2 ring-red-500")} />
//             </div>
//           </div>
//         </div>

//         <button disabled={(!isDirty && !newPassword) || !isValid || mutation.isPending} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]">
//           {mutation.isPending ? <><Loader2 className="animate-spin" size={18} /> Syncing...</> : <><Save size={18} /> Update Profile</>}
//         </button>
//       </form>
//     </div>
//   );
// };
// // src/features/user/pages/ProfilePage.tsx
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { userService, type UserUpdatePayload } from '../api/user.service';
// import { useAuthStore } from '@/store/useAuthStore';
// import {
//   User, MapPin, Mail, Phone, Save, Loader2,
//   BadgeCheck, ShieldCheck, HardHat, Lock, AlertCircle,
//   Wallet
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();

//   const isCustomer = authUser?.role === 'CUSTOMER';
//   const isAdmin = authUser?.role === 'ADMIN';

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   // 1. Destructure 'errors' and 'isValid' from formState
//   const { register, handleSubmit, watch, resetField, formState: { isDirty, errors, isValid } } = useForm<UserUpdatePayload & { confirm_password?: string }>({
//     mode: 'onChange', // Validate as the user types
//     values: {
//       full_name: profile?.full_name || '',
//       email: profile?.email || '',
//       flat_number: profile?.flat_number || '',
//       building_name: profile?.building_name || '',
//     }
//   });

//   const newPassword = watch('password');
//   const confirmPassword = watch('confirm_password');

//   const mutation = useMutation({
//     mutationFn: (data: UserUpdatePayload & { confirm_password?: string }) => {
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }

//       const cleanedData: any = {};
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === 'confirm_password') return;
//         if (key === 'password' && !value) return;
//         cleanedData[key] = value === "" ? null : value;
//       });

//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(['userProfile'], updatedUser);
//       setUser(updatedUser);
//       resetField('password');
//       resetField('confirm_password');
//       toast.success("Settings updated successfully!");
//     },
//     onError: (err: any) => {
//       toast.error(err.message || err.response?.data?.detail || "Update failed");
//     }
//   });

//   if (isLoading) return (
//     <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//       <Loader2 className="animate-spin mb-4" size={40} />
//       <p className="font-black uppercase tracking-widest text-[10px]">Syncing Profile...</p>
//     </div>
//   );

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4 md:px-0">
//       <header className="flex justify-between items-start">

//         {/* NEW: WALLET & REFERRAL SECTION */}
//         <div>
//       {isCustomer && (
//         <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 text-white overflow-hidden relative">

//           {/* Background decorations */}
//           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary rounded-full blur-[80px] opacity-20 -mr-20 -mt-20 pointer-events-none"></div>

//           <div className="flex items-center gap-6 z-10 w-full md:w-auto">
//             <div className="h-16 w-16 bg-white/10 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
//               <Wallet className="text-brand-primary" size={28} />
//             </div>
//             <div>
//               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Credits</p>
//               <div className="flex items-baseline gap-1">
//                 <span className="text-4xl font-black tracking-tighter">{profile?.wallet_balance?.toFixed(2) || '0.00'}</span>
//                 <span className="text-sm font-bold text-brand-primary">pts</span>
//               </div>
//             </div>
//           </div>

//           {profile?.referral_code && (
//             <div className="bg-white/5 border border-white/10 p-5 rounded-2xl w-full md:w-auto z-10 backdrop-blur-md">
//               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Referral Code</p>
//               <div className="flex items-center gap-3">
//                 <span className="text-2xl font-black tracking-widest font-mono text-white select-all">
//                   {profile.referral_code}
//                 </span>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     navigator.clipboard.writeText(profile.referral_code || '');
//                     toast.success("Code copied to clipboard!");
//                   }}
//                   className="px-4 py-2 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-primary/90 transition-all shadow-lg active:scale-95"
//                 >
//                   Copy
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       </div>

//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
//           <p className="text-slate-500 font-medium">Manage your personal and security preferences.</p>
//         </div>

//         <div className={cn(
//           "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm",
//           isAdmin ? "bg-red-50 text-red-600 border-red-100" :
//           isCustomer ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
//           "bg-blue-50 text-blue-600 border-blue-100"
//         )}>
//           {isAdmin ? <ShieldCheck size={14} /> : isCustomer ? <BadgeCheck size={14} /> : <HardHat size={14} />}
//           {profile?.role}
//         </div>
//       </header>

//       <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">

//         {/* PERSONAL DETAILS SECTION */}
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <User size={18} />
//             </div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Personal Info</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
//               <input
//                 {...register('full_name')}
//                 className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input
//                   disabled
//                   value={profile?.mobile}
//                   className="w-full pl-12 pr-5 py-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
//             <div className="relative">
//               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//               <input
//                 {...register('email')}
//                 type="email"
//                 className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//           </div>
//         </div>

//         {/* ADDRESS SECTION */}
//         {isCustomer && (
//           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-brand-primary text-white rounded-xl">
//                 <MapPin size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Delivery Address</h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat / Villa No.</label>
//                 <input
//                   {...register('flat_number')}
//                   placeholder="e.g. 101"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
//                 <input
//                   {...register('building_name')}
//                   placeholder="e.g. Zayden Tower"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* SECTION 3: SECURITY (PIN UPDATE) */}
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
//               <Lock size={18} />
//             </div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Security & PIN</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             {/* New PIN Input */}
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New PIN</label>
//               <input
//                 {...register('password', {
//                   pattern: {
//                     value: /^\d*$/,
//                     message: "Digits only please"
//                   },
//                   minLength: {
//                     value: 4,
//                     message: "Minimum 4 digits required"
//                   }
//                 })}
//                 type="password"
//                 placeholder="••••"
//                 maxLength={8}
//                 className={cn(
//                   "w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                   errors.password && "ring-2 ring-red-500 bg-red-50"
//                 )}
//               />
//               {errors.password && (
//                 <p className="text-[9px] font-bold text-red-500 flex items-center gap-1 ml-1 uppercase">
//                   <AlertCircle size={10} /> {errors.password.message}
//                 </p>
//               )}
//             </div>

//             {/* Confirm PIN Input */}
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm PIN</label>
//               <input
//                 {...register('confirm_password')}
//                 type="password"
//                 placeholder="••••"
//                 maxLength={8}
//                 className={cn(
//                   "w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                   newPassword && confirmPassword && newPassword !== confirmPassword && "ring-2 ring-red-500 bg-red-50"
//                 )}
//               />
//             </div>
//           </div>

//           {newPassword && confirmPassword && newPassword !== confirmPassword && (
//             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">PINs do not match</p>
//           )}
//         </div>

//         <button
//           type="submit"
//           // Button is disabled if:
//           // 1. Form is not dirty AND no password is being entered
//           // 2. Form is currently invalid (wrong pattern or minLength)
//           // 3. Mutation is pending
//           disabled={(!isDirty && !newPassword) || !isValid || mutation.isPending}
//           className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-[0.98]"
//         >
//           {mutation.isPending ? (
//             <><Loader2 className="animate-spin" size={18} /> Syncing...</>
//           ) : (
//             <><Save size={18} /> Update Profile</>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// };
// // src/features/user/pages/ProfilePage.tsx
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { userService, type UserUpdatePayload } from '../api/user.service';
// import { useAuthStore } from '@/store/useAuthStore';
// import {
//   User, MapPin, Mail, Phone, Save, Loader2,
//   BadgeCheck, ShieldCheck, HardHat, Lock
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();
//   const [showPassword, setShowPassword] = useState(false);

//   const isCustomer = authUser?.role === 'CUSTOMER';
//   const isAdmin = authUser?.role === 'ADMIN';

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   // Added 'password' and 'confirm_password' to the form
//   const { register, handleSubmit, watch, resetField, formState: { isDirty } } = useForm<UserUpdatePayload & { confirm_password?: string }>({
//     values: {
//       full_name: profile?.full_name || '',
//       email: profile?.email || '',
//       flat_number: profile?.flat_number || '',
//       building_name: profile?.building_name || '',
//     }
//   });

//   const newPassword = watch('password');
//   const confirmPassword = watch('confirm_password');

//   const mutation = useMutation({
//     mutationFn: (data: UserUpdatePayload & { confirm_password?: string }) => {
//       // 1. Logic: If passwords don't match, stop here.
//       if (data.password && data.password !== data.confirm_password) {
//         throw new Error("Passwords do not match");
//       }

//       // 2. Clean data: Convert empty strings to null, and remove confirm_password
//       const cleanedData: any = {};
//       Object.entries(data).forEach(([key, value]) => {
//         if (key === 'confirm_password') return;
//         // Only include password if it has a value
//         if (key === 'password' && !value) return;
//         cleanedData[key] = value === "" ? null : value;
//       });

//       return userService.updateMe(cleanedData);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(['userProfile'], updatedUser);
//       setUser(updatedUser);
//       // Clear password fields after success
//       resetField('password');
//       resetField('confirm_password');
//       toast.success("Profile and Security updated!");
//     },
//     onError: (err: any) => {
//       toast.error(err.message || err.response?.data?.detail || "Update failed");
//     }
//   });

//   if (isLoading) return (
//     <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//       <Loader2 className="animate-spin mb-4" size={40} />
//       <p className="font-black uppercase tracking-widest text-[10px]">Syncing Profile...</p>
//     </div>
//   );

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-24 px-4 md:px-0">
//       <header className="flex justify-between items-start">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
//           <p className="text-slate-500 font-medium">Manage your personal and security preferences.</p>
//         </div>

//         <div className={cn(
//           "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm",
//           isAdmin ? "bg-red-50 text-red-600 border-red-100" :
//           isCustomer ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
//           "bg-blue-50 text-blue-600 border-blue-100"
//         )}>
//           {isAdmin ? <ShieldCheck size={14} /> : isCustomer ? <BadgeCheck size={14} /> : <HardHat size={14} />}
//           {profile?.role}
//         </div>
//       </header>

//       <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">

//         {/* SECTION 1: PERSONAL DETAILS */}
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <User size={18} />
//             </div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Personal Info</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
//               <input
//                 {...register('full_name')}
//                 className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input
//                   disabled
//                   value={profile?.mobile}
//                   className="w-full pl-12 pr-5 py-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
//             <div className="relative">
//               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//               <input
//                 {...register('email')}
//                 type="email"
//                 className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//           </div>
//         </div>

//         {/* SECTION 2: ADDRESS */}
//         {isCustomer && (
//           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-brand-primary text-white rounded-xl">
//                 <MapPin size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Delivery Address</h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat / Villa No.</label>
//                 <input
//                   {...register('flat_number')}
//                   placeholder="e.g. 101"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
//                 <input
//                   {...register('building_name')}
//                   placeholder="e.g. Zayden Tower"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* SECTION 3: SECURITY (PASSWORD UPDATE) */}
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-100">
//               <Lock size={18} />
//             </div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Security & PIN</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
//               <input
//                 {...register('password')}
//                 type="password"
//                 placeholder="••••••••"
//                 className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
//               <input
//                 {...register('confirm_password')}
//                 type="password"
//                 placeholder="••••••••"
//                 className={cn(
//                   "w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all",
//                   newPassword && confirmPassword && newPassword !== confirmPassword && "ring-2 ring-red-500 bg-red-50"
//                 )}
//               />
//             </div>
//           </div>

//           {newPassword && confirmPassword && newPassword !== confirmPassword && (
//             <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">Passwords do not match</p>
//           )}
//         </div>

//         <button
//           type="submit"
//           disabled={(!isDirty && !newPassword) || mutation.isPending}
//           className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-[0.98]"
//         >
//           {mutation.isPending ? (
//             <><Loader2 className="animate-spin" size={18} /> Updating...</>
//           ) : (
//             <><Save size={18} /> Save All Changes</>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// };
// import { useForm } from 'react-hook-form';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import { userService,type UserUpdatePayload } from '../api/user.service';
// import { useAuthStore } from '@/store/useAuthStore';
// import { User, MapPin, Mail, Phone, Save, Loader2, BadgeCheck, ShieldCheck, HardHat } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const ProfilePage = () => {
//   const queryClient = useQueryClient();
//   const { user: authUser, setUser } = useAuthStore();
//   const isCustomer = authUser?.role === 'CUSTOMER';
//   const isAdmin = authUser?.role === 'ADMIN';

//   const { data: profile, isLoading } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   const { register, handleSubmit, formState: { isDirty } } = useForm<UserUpdatePayload>({
//     values: {
//       full_name: profile?.full_name || '',
//       email: profile?.email || '',
//       flat_number: profile?.flat_number || '',
//       building_name: profile?.building_name || '',
//     }
//   });

//   const mutation = useMutation({
//     mutationFn: (data: UserUpdatePayload) => {
//       // FIX: Clean the data to convert empty strings to null.
//       // This prevents the backend from throwing a 400 validation error on empty email/address strings.
//       const cleanedData = Object.fromEntries(
//         Object.entries(data).map(([key, value]) => [
//           key,
//           value === "" ? null : value
//         ])
//       );
//       return userService.updateMe(cleanedData as UserUpdatePayload);
//     },
//     onSuccess: (updatedUser) => {
//       queryClient.setQueryData(['userProfile'], updatedUser);
//       setUser(updatedUser);
//       toast.success("Profile updated successfully!");
//     },
//     onError: (err: any) => {
//       console.error("Update Error:", err);
//       toast.error(err.response?.data?.detail || "Update failed. Please try again.");
//     }
//   });

// //   const mutation = useMutation({
// //     mutationFn: userService.updateMe,
// //     onSuccess: (updatedUser) => {
// //       queryClient.setQueryData(['userProfile'], updatedUser);
// //       setUser(updatedUser);
// //       toast.success("Profile updated successfully!");
// //     },
// //     onError: () => toast.error("Update failed. Please try again.")
// //   });

//   if (isLoading) return (
//     <div className="flex flex-col items-center justify-center py-20 text-slate-400">
//       <Loader2 className="animate-spin mb-4" size={40} />
//       <p className="font-black uppercase tracking-widest text-[10px]">Syncing Profile...</p>
//     </div>
//   );

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 md:px-0">
//       <header className="flex justify-between items-start">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
//           <p className="text-slate-500 font-medium">Manage your personal and security preferences.</p>
//         </div>

//         {/* Role Badge */}
//         <div className={cn(
//           "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm",
//           isAdmin ? "bg-red-50 text-red-600 border-red-100" :
//           isCustomer ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
//           "bg-blue-50 text-blue-600 border-blue-100"
//         )}>
//           {isAdmin ? <ShieldCheck size={14} /> : isCustomer ? <BadgeCheck size={14} /> : <HardHat size={14} />}
//           {profile?.role}
//         </div>
//       </header>

//       <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">

//         {/* SECTION 1: PERSONAL DETAILS */}
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
//           <div className="flex items-center gap-3 mb-2">
//             <div className="p-2 bg-slate-900 text-white rounded-xl">
//               <User size={18} />
//             </div>
//             <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Personal Info</h2>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
//               <input
//                 {...register('full_name')}
//                 className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary"
//               />
//             </div>
//             <div className="space-y-2">
//               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile</label>
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//                 <input
//                   disabled
//                   value={profile?.mobile}
//                   className="w-full pl-12 pr-5 py-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-400 cursor-not-allowed"
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
//             <div className="relative">
//               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//               <input
//                 {...register('email')}
//                 type="email"
//                 className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary"
//               />
//             </div>
//           </div>
//         </div>

//         {/* SECTION 2: ADDRESS (Only shown/emphasized for Customers) */}
//         {isCustomer && (
//           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//             <div className="flex items-center gap-3 mb-2">
//               <div className="p-2 bg-brand-primary text-white rounded-xl">
//                 <MapPin size={18} />
//               </div>
//               <h2 className="font-black uppercase text-xs tracking-widest text-slate-900">Pickup & Delivery Address</h2>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flat / Villa No.</label>
//                 <input
//                   {...register('flat_number')}
//                   placeholder="e.g. 101"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Building Name</label>
//                 <input
//                   {...register('building_name')}
//                   placeholder="e.g. Zayden Tower"
//                   className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary"
//                 />
//               </div>
//             </div>
//           </div>
//         )}

//         <button
//           type="submit"
//           disabled={!isDirty || mutation.isPending}
//           className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-[0.98]"
//         >
//           {mutation.isPending ? (
//             <><Loader2 className="animate-spin" size={18} /> Updating...</>
//           ) : (
//             <><Save size={18} /> Save Settings</>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// };
