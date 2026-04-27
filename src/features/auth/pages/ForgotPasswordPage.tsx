// src/features/auth/pages/ForgotPasswordPage.tsx
import { MessageCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ForgotPasswordPage = () => {
  const adminPhone = "971502220792"; 
  const message = encodeURIComponent("I forgot my password. Please help me reset it.");
  const whatsappUrl = `https://wa.me/${adminPhone}?text=${message}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-6">
      <div className="max-w-md w-full mx-auto space-y-10">
        
        <div className="text-center space-y-3">
          <div className="inline-flex h-20 w-20 rounded-full bg-[#25D366]/10 items-center justify-center mb-2">
            <MessageCircle size={36} className="text-[#25D366]" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Lost your PIN?</h2>
          <p className="text-slate-500 font-medium px-4">
            For security reasons, PIN resets are handled directly by our support team via WhatsApp.
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#25D366]/5 rounded-full -ml-16 -mt-16 blur-3xl pointer-events-none" />
          
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white p-5 rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#25D366]/30"
          >
            <MessageCircle size={20} fill="currentColor" />
            Message Admin
          </a>
          
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
            Average response time: &lt; 1-8 Hours
          </p>
        </div>

        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
// import { MessageCircle } from 'lucide-react';

// export const ForgotPasswordPage = () => {
//   const adminPhone = "918123075313"; // Replace with actual Admin WhatsApp number
//   const message = encodeURIComponent("I forgot my password. Please help me reset it.");
//   const whatsappUrl = `https://wa.me/${adminPhone}?text=${message}`;

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
//       <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center space-y-6 max-w-md w-full">
//         <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
//           <MessageCircle size={40} className="text-brand-primary" />
//         </div>
        
//         <div className="space-y-2">
//           <h1 className="text-2xl font-black text-slate-900">Forgot Password?</h1>
//           <p className="text-slate-500 font-medium">
//             No worries! Reach out to our team via WhatsApp to reset your password.
//           </p>
//         </div>

//         <a 
//           href={whatsappUrl}
//           target="_blank"
//           rel="noopener noreferrer"
//           className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-200"
//         >
//           <MessageCircle size={20} />
//           Contact on WhatsApp
//         </a>
//       </div>
//     </div>
//   );
// };


// // src/features/auth/pages/ForgotPasswordPage.tsx
// import { useState } from 'react';
// import { useMutation } from '@tanstack/react-query';
// import { authService } from '../api/auth.service';
// import { toast } from 'sonner';
// import { Phone, ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
// import { Link } from 'react-router-dom';

// export const ForgotPasswordPage = () => {
//   const [mobile, setMobile] = useState('');
//   const [sent, setSent] = useState(false);

//   const mutation = useMutation({
//     mutationFn: () => authService.forgotPassword(mobile),
//     onSuccess: (data) => {
//       setSent(true);
//       // NOTE: In development, we might show the token directly if SMS isn't connected
//       if(data.reset_token) console.log("Dev Reset Token:", data.reset_token);
//       toast.success("Reset link generated!");
//     }
//   });

//   return (
//     <div className="min-h-screen bg-white flex flex-col justify-center px-8">
//       <div className="max-w-sm mx-auto w-full space-y-10">
//         <Link to="/login" className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
//           <ArrowLeft size={14} /> Back to Login
//         </Link>

//         <div>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Password Help.</h1>
//           <p className="text-slate-500 font-medium">Enter your mobile number to receive a reset link.</p>
//         </div>

//         {!sent ? (
//           <div className="space-y-6">
//             <div className="relative">
//               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
//               <input 
//                 value={mobile}
//                 onChange={(e) => setMobile(e.target.value)}
//                 placeholder="Mobile Number"
//                 className="w-full pl-12 pr-4 py-5 bg-slate-50 border-none rounded-[1.5rem] font-bold text-lg"
//               />
//             </div>
//             <button 
//               onClick={() => mutation.mutate()}
//               disabled={!mobile || mutation.isPending}
//               className="w-full bg-brand-primary text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
//             >
//               {mutation.isPending ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
//             </button>
//           </div>
//         ) : (
//           <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 text-center space-y-4">
//             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm text-emerald-500">
//               <KeyRound size={32} />
//             </div>
//             <p className="text-emerald-900 font-bold">Check your messages!</p>
//             <p className="text-emerald-700/70 text-sm">If an account exists for {mobile}, you will receive a secure link shortly.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };