// src/features/auth/pages/LoginPage.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '../api/auth.service';
import api from '@/api/axios';
import { toast } from 'sonner';
import { Phone, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const LoginPage = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', mobile);
      formData.append('password', password);

      // 1. Get the token
      const data = await authService.login(formData);
      const token = data.access_token;

      // 2. IMMEDIATE FETCH: Pass the token directly to the me call 
      const user = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.data);
      
      // 3. Save both to the store
      setAuth(user, token);
      
      // 4. Navigate home
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      navigate('/');
    } catch (err: any) {
      console.error("Login Error:", err);
      const errorMsg = err.response?.data?.detail || 'Invalid mobile number or password';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
      
      {/* 1. BACKGROUND LAYER */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg4.jpg')" }}
      />

      {/* 2. CONTENT LAYER */}
      <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm">
          
          {/* Logo Image */}
          <div className="inline-flex h-20 w-20 rounded-[1.5rem] bg-white border border-slate-100 items-center justify-center shadow-xl shadow-slate-200/50 mb-4 p-1.5 rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden shrink-0">
             <img src="/logo/logo.jpg" alt="Al Nejoum Logo" className="h-full w-full object-contain" />
          </div>

          {/* OFFICIAL BRAND NAME */}
          <div className="flex flex-col justify-center items-center mb-6">
            <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              Al Nejoum
            </span>
            <span className="text-brand-primary font-black text-[10px] uppercase tracking-[0.2em] mt-1">
              Al Arbaah Laundry
            </span>
          </div>

          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Welcome</h2>
          <p className="mt-2 text-slate-500 font-medium text-sm">Fresh clothes are just a few taps away.</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5 relative overflow-hidden">
            
            {/* Subtle glassmorphism decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

            <div className="space-y-4">
              {/* Mobile Input */}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="tel"
                  maxLength={10} // <-- ADDED THIS
                  placeholder="Mobile Number"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*" 
                  placeholder="Password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
                <p className="text-xs font-black uppercase tracking-widest">{error}</p>
              </div>
            )}

            <div className="flex justify-end px-1">
              <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-brand-primary transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white shadow-sm text-center space-y-3">
          <p className="text-slate-600 font-bold text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-primary hover:underline underline-offset-4">
              Create Account
            </Link>
          </p>
          
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            <Sparkles size={12} />
            <span>Premium Laundry Service</span>
          </div>
        </div>
      </div>
    </div>
  );
};
// // src/features/auth/pages/LoginPage.tsx
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '@/store/useAuthStore';
// import { authService } from '../api/auth.service';
// import api from '@/api/axios';
// import { toast } from 'sonner';
// import { Phone, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

// export const LoginPage = () => {
//   const [mobile, setMobile] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const setAuth = useAuthStore((state) => state.setAuth);
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       const formData = new FormData();
//       formData.append('username', mobile);
//       formData.append('password', password);

//       // 1. Get the token
//       const data = await authService.login(formData);
//       const token = data.access_token;

//       // 2. IMMEDIATE FETCH: Pass the token directly to the me call 
//       const user = await api.get('/users/me', {
//         headers: { Authorization: `Bearer ${token}` }
//       }).then(res => res.data);
      
//       // 3. Save both to the store
//       setAuth(user, token);
      
//       // 4. Navigate home
//       toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
//       navigate('/');
//     } catch (err: any) {
//       console.error("Login Error:", err);
//       const errorMsg = err.response?.data?.detail || 'Invalid mobile number or password';
//       setError(errorMsg);
//       toast.error(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
      
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg5.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
//         {/* Logo & Header */}
//         <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm">
          
//           {/* Logo Image */}
//           <div className="inline-flex h-20 w-20 rounded-[1.5rem] bg-white border border-slate-100 items-center justify-center shadow-xl shadow-slate-200/50 mb-4 p-1.5 rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden shrink-0">
//              <img src="/logo/logo.jpg" alt="Al Nejoum Logo" className="h-full w-full object-contain" />
//           </div>

//           {/* OFFICIAL BRAND NAME */}
//           <div className="flex flex-col justify-center items-center mb-6">
//             <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
//               Al Nejoum
//             </span>
//             <span className="text-brand-primary font-black text-[10px] uppercase tracking-[0.2em] mt-1">
//               Al Arbaah Laundry
//             </span>
//           </div>

//           <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Welcome Back.</h2>
//           <p className="mt-2 text-slate-500 font-medium text-sm">Fresh clothes are just a few taps away.</p>
//         </div>

//         {/* Login Card */}
//         <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
//           <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5 relative overflow-hidden">
            
//             {/* Subtle glassmorphism decoration */}
//             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

//             <div className="space-y-4">
//               {/* Mobile Input */}
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="tel"
//                   placeholder="Mobile Number"
//                   required
//                   value={mobile}
//                   onChange={e => setMobile(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
//                 />
//               </div>

//               {/* Password Input */}
//               <div className="relative">
//                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="password"
//                   inputMode="numeric" // <-- Added this
//                   pattern="[0-9]*"    // <-- Added this
//                   placeholder="Password"
//                   required
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
//                 />
//               </div>
//             </div>

//             {error && (
//               <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
//                 <p className="text-xs font-black uppercase tracking-widest">{error}</p>
//               </div>
//             )}

//             <div className="flex justify-end px-1">
//               <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-brand-primary transition-colors">
//                 Forgot password?
//               </Link>
//             </div>
//           </div>

//           <button 
//             type="submit"
//             disabled={loading}
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : (
//               <>Sign In <ArrowRight size={16} /></>
//             )}
//           </button>
//         </form>

//         {/* Footer */}
//         <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white shadow-sm text-center space-y-3">
//           <p className="text-slate-600 font-bold text-sm">
//             Don't have an account?{' '}
//             <Link to="/register" className="text-brand-primary hover:underline underline-offset-4">
//               Create Account
//             </Link>
//           </p>
          
//           <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
//             <Sparkles size={12} />
//             <span>Premium Laundry Service</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// // src/features/auth/pages/LoginPage.tsx
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '@/store/useAuthStore';
// import { authService } from '../api/auth.service';
// import api from '@/api/axios';
// import { toast } from 'sonner';
// import { Phone, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

// export const LoginPage = () => {
//   const [mobile, setMobile] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const setAuth = useAuthStore((state) => state.setAuth);
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       const formData = new FormData();
//       formData.append('username', mobile);
//       formData.append('password', password);

//       // 1. Get the token
//       const data = await authService.login(formData);
//       const token = data.access_token;

//       // 2. IMMEDIATE FETCH: Pass the token directly to the me call 
//       const user = await api.get('/users/me', {
//         headers: { Authorization: `Bearer ${token}` }
//       }).then(res => res.data);
      
//       // 3. Save both to the store
//       setAuth(user, token);
      
//       // 4. Navigate home
//       toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
//       navigate('/');
//     } catch (err: any) {
//       console.error("Login Error:", err);
//       const errorMsg = err.response?.data?.detail || 'Invalid mobile number or password';
//       setError(errorMsg);
//       toast.error(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen flex flex-col justify-center py-12 px-6">
      
//       {/* 1. BACKGROUND LAYER */}
//       <div 
//         className="fixed inset-0 z-0 bg-cover bg-center opacity-30 brightness-75 pointer-events-none"
//         style={{ backgroundImage: "url('/images/bg5.jpg')" }}
//       />

//       {/* 2. CONTENT LAYER */}
//       <div className="relative z-10 max-w-md w-full mx-auto space-y-8">
        
//         {/* Logo & Header */}
//         <div className="flex flex-col items-center text-center bg-white/60 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm">
          
//           {/* Logo Image */}
//           <div className="inline-flex h-20 w-20 rounded-[1.5rem] bg-white border border-slate-100 items-center justify-center shadow-xl shadow-slate-200/50 mb-4 p-1.5 rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden shrink-0">
//              <img src="/logo/logo.jpg" alt="Al Nejoum Logo" className="h-full w-full object-contain" />
//           </div>

//           {/* OFFICIAL BRAND NAME */}
//           <div className="flex flex-col justify-center items-center mb-6">
//             <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
//               Al Nejoum
//             </span>
//             <span className="text-brand-primary font-black text-[10px] uppercase tracking-[0.2em] mt-1">
//               Al Arbaah Laundry
//             </span>
//           </div>

//           <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Welcome Back.</h2>
//           <p className="mt-2 text-slate-500 font-medium text-sm">Fresh clothes are just a few taps away.</p>
//         </div>

//         {/* Login Card */}
//         <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
//           <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white space-y-5 relative overflow-hidden">
            
//             {/* Subtle glassmorphism decoration */}
//             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

//             <div className="space-y-4">
//               {/* Mobile Input */}
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="tel"
//                   placeholder="Mobile Number"
//                   required
//                   value={mobile}
//                   onChange={e => setMobile(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
//                 />
//               </div>

//               {/* Password Input */}
//               <div className="relative">
//                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="password"
//                   placeholder="Password"
//                   required
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-white/50 border border-slate-100/50 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-400 outline-none"
//                 />
//               </div>
//             </div>

//             {error && (
//               <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
//                 <p className="text-xs font-black uppercase tracking-widest">{error}</p>
//               </div>
//             )}

//             <div className="flex justify-end px-1">
//               <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-brand-primary transition-colors">
//                 Forgot password?
//               </Link>
//             </div>
//           </div>

//           <button 
//             type="submit"
//             disabled={loading}
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : (
//               <>Sign In <ArrowRight size={16} /></>
//             )}
//           </button>
//         </form>

//         {/* Footer */}
//         <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white shadow-sm text-center space-y-3">
//           <p className="text-slate-600 font-bold text-sm">
//             Don't have an account?{' '}
//             <Link to="/register" className="text-brand-primary hover:underline underline-offset-4">
//               Create Account
//             </Link>
//           </p>
          
//           <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
//             <Sparkles size={12} />
//             <span>Premium Laundry Service</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuthStore } from '@/store/useAuthStore';
// import { authService } from '../api/auth.service';
// import api from '@/api/axios';
// import { toast } from 'sonner';
// import { Phone, Lock, ArrowRight, Loader2, Sparkles } from 'lucide-react';

// export const LoginPage = () => {
//   const [mobile, setMobile] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const setAuth = useAuthStore((state) => state.setAuth);
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     try {
//       const formData = new FormData();
//       formData.append('username', mobile);
//       formData.append('password', password);

//       // 1. Get the token
//       const data = await authService.login(formData);
//       const token = data.access_token;

//       // 2. IMMEDIATE FETCH: Pass the token directly to the me call 
//       const user = await api.get('/users/me', {
//         headers: { Authorization: `Bearer ${token}` }
//       }).then(res => res.data);
      
//       // 3. Save both to the store
//       setAuth(user, token);
      
//       // 4. Navigate home
//       toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
//       navigate('/');
//     } catch (err: any) {
//       console.error("Login Error:", err);
//       const errorMsg = err.response?.data?.detail || 'Invalid mobile number or password';
//       setError(errorMsg);
//       toast.error(errorMsg);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
//       <div className="max-w-md w-full mx-auto space-y-10">
        
//         {/* Logo & Header */}
//         <div className="text-center">
//           <div className="inline-flex h-16 w-16 rounded-[1.5rem] bg-slate-900 items-center justify-center shadow-2xl shadow-slate-200 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
//              <span className="text-white font-black text-3xl italic">4</span>
//           </div>
//           <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Welcome Back.</h2>
//           <p className="mt-2 text-slate-500 font-medium">Fresh clothes are just a few taps away.</p>
//         </div>

//         {/* Login Card */}
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 space-y-5 relative overflow-hidden">
            
//             {/* Subtle glassmorphism decoration */}
//             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

//             <div className="space-y-4">
//               {/* Mobile Input */}
//               <div className="relative">
//                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="tel"
//                   placeholder="Mobile Number"
//                   required
//                   value={mobile}
//                   onChange={e => setMobile(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-300"
//                 />
//               </div>

//               {/* Password Input */}
//               <div className="relative">
//                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input 
//                   type="password"
//                   placeholder="Password"
//                   required
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary transition-all placeholder:text-slate-300"
//                 />
//               </div>
//             </div>

//             {error && (
//               <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
//                 <p className="text-xs font-black uppercase tracking-widest">{error}</p>
//               </div>
//             )}

//             <div className="flex justify-end px-1">
//              <Link to="/forgot-password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-brand-primary transition-colors">
//   Forgot password?
// </Link>
//             </div>
//           </div>

//           <button 
//             type="submit"
//             disabled={loading}
//             className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
//           >
//             {loading ? <Loader2 className="animate-spin" size={18} /> : (
//               <>Sign In <ArrowRight size={16} /></>
//             )}
//           </button>
//         </form>

//         {/* Footer */}
//         <div className="text-center space-y-4">
//           <p className="text-slate-500 font-bold text-sm">
//             Don't have an account?{' '}
//             <Link to="/register" className="text-brand-primary hover:underline underline-offset-4">
//               Create Account
//             </Link>
//           </p>
          
//           <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
//             <Sparkles size={12} />
//             <span>Premium Laundry Service</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { Input } from '@/components/ui/Input';
// import { Button } from '@/components/ui/Button';
// import { LogIn } from 'lucide-react';
// import { useAuthStore } from '@/store/useAuthStore';
// import { authService } from '../api/auth.service';
// import api from '@/api/axios';

// export const LoginPage = () => {
//   const [mobile, setMobile] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const setAuth = useAuthStore((state) => state.setAuth);
//   const navigate = useNavigate();

//   const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();
//   setLoading(true);
//   setError('');

//   try {
//     const formData = new FormData();
//     formData.append('username', mobile);
//     formData.append('password', password);

//     // 1. Get the token
//     const data = await authService.login(formData);
//     const token = data.access_token;

//     // 2. IMMEDIATE FETCH: Pass the token directly to the me call 
//     // to bypass the state-delay in the interceptor for this first call.
//     const user = await api.get('/users/me', {
//       headers: { Authorization: `Bearer ${token}` }
//     }).then(res => res.data);
    
//     // 3. Now save both to the store
//     setAuth(user, token);
    
//     // 4. Navigate home
//     navigate('/');
//   } catch (err: any) {
//     console.error("Login Error:", err);
//     setError(err.response?.data?.detail || 'Invalid mobile number or password');
//   } finally {
//     setLoading(false);
//   }
// };
// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     setLoading(true);
// //     setError('');

// //     try {
// //       const formData = new FormData();
// //       formData.append('username', mobile);
// //       formData.append('password', password);

// //       const data = await authService.login(formData);
// //       // After getting token, fetch user profile
// //       const user = await authService.getMe();
      
// //       setAuth(user, data.access_token);
// //       navigate('/');
// //     } catch (err: any) {
// //       setError(err.response?.data?.detail || 'Invalid mobile number or password');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

//   return (
//     <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
//       <div className="sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="flex justify-center">
//           <div className="h-12 w-12 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
//             <span className="text-white font-bold text-2xl">N</span>
//           </div>
//         </div>
//         <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
//           Welcome back
//         </h2>
//         <p className="mt-2 text-center text-sm text-slate-500">
//           Fresh clothes are just a few taps away.
//         </p>
//       </div>

//       <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
//         <div className="bg-white py-8 px-4 shadow-soft border border-slate-100 rounded-premium sm:px-10">
//           <form className="space-y-6" onSubmit={handleSubmit}>
//             <Input 
//               label="Mobile Number" 
//               type="tel" 
//               placeholder="050 XXX XXXX" 
//               required 
//               value={mobile} onChange={e => setMobile(e.target.value)}
//             />
//             <Input 
//               label="Password" 
//               type="password" 
//               placeholder="••••••••" 
//               required 
//              value={password} onChange={e => setPassword(e.target.value)}
//             />
// {error && <p className="text-red-500 text-sm text-center">{error}</p>}
//             <div className="flex items-center justify-end">
//               <Link to="/forgot-password" size="sm" className="text-sm font-medium text-brand-primary hover:text-blue-500">
//                 Forgot password?
//               </Link>
//             </div>

//             <Button type="submit" className="w-full" isLoading={loading} icon={LogIn}>
//               Sign In
//             </Button>
//           </form>

//           <div className="mt-6 text-center">
//             <p className="text-sm text-slate-500">
//               Don't have an account?{' '}
//               <Link to="/register" className="font-semibold text-brand-primary hover:text-blue-500">
//                 Create Account
//               </Link>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };