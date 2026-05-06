import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, UserRole } from '../api/admin.service';
import { Mail, Phone, Key, X, Loader2, Search, Filter, Users, Wallet, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // NEW: State for Credit Management
  const [creditUser, setCreditUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminService.getUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success("Update successful");
      setResetUser(null);
      setNewPassword('');
      setCreditUser(null);
      setCreditAmount('');
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed"),
  });

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,}$/.test(newPassword)) {
      return toast.error("PIN must be at least 4 digits (numbers only)");
    }
    updateMutation.mutate({ id: resetUser.id, data: { password: newPassword } });
  };

  // NEW: Add Credits Handler
  const handleAddCredits = (e: React.FormEvent) => {
    e.preventDefault();
    const amountToAdd = parseFloat(creditAmount);
    
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      return toast.error("Please enter a valid positive amount");
    }

    // Safely calculate the new total based on current DB state
    const currentBalance = creditUser.wallet_balance || 0;
    const newTotalBalance = currentBalance + amountToAdd;

    updateMutation.mutate({ 
      id: creditUser.id, 
      data: { wallet_balance: newTotalBalance } 
    });
  };

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = query === '' || 
        user.full_name.toLowerCase().includes(query) ||
        user.mobile.includes(query) ||
        (user.email && user.email.toLowerCase().includes(query));

      return matchesRole && matchesSearch;
    });
  }, [users, searchQuery, roleFilter]);

  if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading User Directory...</div>;

  return (
    <div className="space-y-6 relative pb-20">
      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Manage roles and account permissions.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Users size={16} className="text-brand-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            {filteredUsers.length} Users
          </span>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name, mobile, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm placeholder:font-medium placeholder:text-slate-400"
          />
        </div>
        
        <div className="relative w-full md:w-48 shrink-0">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-brand-primary outline-none appearance-none transition-all shadow-sm cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.CUSTOMER}>Customers</option>
            <option value={UserRole.EMPLOYEE}>Staff</option>
            <option value={UserRole.ADMIN}>Admins</option>
          </select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-16 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
              <Search size={28} />
            </div>
            <p className="font-bold text-slate-600">No users found.</p>
            <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto">
              We couldn't find anyone matching your current search or filter criteria.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
              className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: Table */}
          <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Profile</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Access Level</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-6 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate">{user.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Phone size={14} className="text-slate-300" /> {user.mobile}
                          </div>
                          {user.email && (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                              <Mail size={14} className="text-slate-300" /> <span className="truncate max-w-[150px]">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <select 
                          value={user.role}
                          onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none outline-none ring-1 ring-inset cursor-pointer transition-colors",
                            user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-200 hover:bg-purple-100" :
                            user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-200 hover:bg-blue-100" :
                            "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                          )}
                        >
                          <option value={UserRole.CUSTOMER}>Customer</option>
                          <option value={UserRole.EMPLOYEE}>Staff</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setCreditUser(user)}
                            className="p-2.5 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all shadow-sm border border-transparent hover:border-emerald-600 bg-emerald-50"
                            title="Add Wallet Credits"
                          >
                            <Wallet size={18} />
                          </button>
                          <button 
                            onClick={() => setResetUser(user)}
                            className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 bg-slate-50"
                            title="Reset Password"
                          >
                            <Key size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW: Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {user.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 truncate max-w-[150px]">{user.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => setCreditUser(user)}
                      className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all shadow-sm border border-transparent hover:border-emerald-600 bg-emerald-50"
                    >
                      <Wallet size={16} />
                    </button>
                    <button 
                      onClick={() => setResetUser(user)}
                      className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 bg-slate-50"
                    >
                      <Key size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <Phone size={14} className="text-slate-400" /> {user.mobile}
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Mail size={14} className="text-slate-400" /> <span className="truncate max-w-[220px]">{user.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <select 
                    value={user.role}
                    onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
                    className={cn(
                      "w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border-none outline-none ring-1 ring-inset cursor-pointer transition-colors text-center",
                      user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-200" :
                      user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-200" :
                      "bg-white text-slate-600 ring-slate-200"
                    )}
                  >
                    <option value={UserRole.CUSTOMER}>Customer</option>
                    <option value={UserRole.EMPLOYEE}>Staff</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Credit Deposit Modal (NEW) */}
      {creditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Deposit Credits</h3>
              <button onClick={() => { setCreditUser(null); setCreditAmount(''); }} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-2xl flex items-center justify-between border border-emerald-100">
               <div>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Current Balance</p>
                 <p className="text-sm font-bold text-emerald-900">{creditUser.full_name}</p>
               </div>
               <div className="bg-white px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm text-emerald-600 font-black tracking-tight">
                 {creditUser.wallet_balance || 0} pts
               </div>
            </div>

            <form onSubmit={handleAddCredits} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credits to Add </label>
                <div className="relative">
                  <PlusCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    autoFocus
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount..."
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={updateMutation.isPending || !creditAmount}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Confirm Deposit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal (UNCHANGED) */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
              <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
               <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-500">
                {resetUser.full_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">{resetUser.full_name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resetUser.mobile}</p>
              </div>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New 4-Digit PIN</label>
                <input 
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  placeholder="XXXX"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-lg text-center tracking-[0.5em] focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
                />
              </div>

              <button 
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-brand-primary active:scale-95 transition-all"
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
// // src/features/admin/pages/UserManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService, UserRole } from '../api/admin.service';
// import { Mail, Phone, Key, X, Loader2, Search, Filter, Users } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const UserManagement = () => {
//   const queryClient = useQueryClient();
//   const [resetUser, setResetUser] = useState<any>(null);
//   const [newPassword, setNewPassword] = useState('');
  
//   const [searchQuery, setSearchQuery] = useState('');
//   const [roleFilter, setRoleFilter] = useState<string>('ALL');

//   const { data: users, isLoading } = useQuery({
//     queryKey: ['adminUsers'],
//     queryFn: adminService.getUsers,
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number; data: any }) => adminService.updateUser(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
//       toast.success("Update successful");
//       setResetUser(null);
//       setNewPassword('');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed"),
//   });

//   const handlePasswordReset = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!/^\d{4,}$/.test(newPassword)) {
//       return toast.error("PIN must be at least 4 digits (numbers only)");
//     }
//     updateMutation.mutate({ id: resetUser.id, data: { password: newPassword } });
//   };

//   const filteredUsers = useMemo(() => {
//     if (!users) return [];
    
//     return users.filter(user => {
//       const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
//       const query = searchQuery.toLowerCase().trim();
//       const matchesSearch = query === '' || 
//         user.full_name.toLowerCase().includes(query) ||
//         user.mobile.includes(query) ||
//         (user.email && user.email.toLowerCase().includes(query));

//       return matchesRole && matchesSearch;
//     });
//   }, [users, searchQuery, roleFilter]);

//   if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading User Directory...</div>;

//   return (
//     <div className="space-y-6 relative pb-20">
      
//       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Directory</h1>
//           <p className="text-slate-500 font-medium mt-1">Manage roles and account permissions.</p>
//         </div>
//         <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
//           <Users size={16} className="text-brand-primary" />
//           <span className="text-xs font-black uppercase tracking-widest text-slate-600">
//             {filteredUsers.length} Users
//           </span>
//         </div>
//       </header>

//       <div className="flex flex-col md:flex-row gap-3">
//         <div className="relative flex-1">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input 
//             type="text"
//             placeholder="Search by name, mobile, or email..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm placeholder:font-medium placeholder:text-slate-400"
//           />
//         </div>
        
//         <div className="relative w-full md:w-48 shrink-0">
//           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//           <select
//             value={roleFilter}
//             onChange={(e) => setRoleFilter(e.target.value)}
//             className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-brand-primary outline-none appearance-none transition-all shadow-sm cursor-pointer"
//           >
//             <option value="ALL">All Roles</option>
//             <option value={UserRole.CUSTOMER}>Customers</option>
//             <option value={UserRole.EMPLOYEE}>Staff</option>
//             <option value={UserRole.ADMIN}>Admins</option>
//           </select>
//         </div>
//       </div>

//       {filteredUsers.length === 0 ? (
//         <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-16 text-center">
//           <div className="flex flex-col items-center justify-center space-y-3">
//             <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
//               <Search size={28} />
//             </div>
//             <p className="font-bold text-slate-600">No users found.</p>
//             <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto">
//               We couldn't find anyone matching your current search or filter criteria.
//             </p>
//             <button 
//               onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
//               className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
//             >
//               Clear Filters
//             </button>
//           </div>
//         </div>
//       ) : (
//         <>
//           {/* DESKTOP VIEW: Table */}
//           <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left border-collapse">
//                 <thead>
//                   <tr className="bg-slate-50/50 border-b border-slate-100">
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Profile</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Access Level</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filteredUsers.map((user) => (
//                     <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
//                       <td className="p-6 min-w-[200px]">
//                         <div className="flex items-center gap-3">
//                           <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
//                             {user.full_name.charAt(0)}
//                           </div>
//                           <div>
//                             <p className="font-bold text-slate-900 truncate">{user.full_name}</p>
//                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="p-6 min-w-[200px]">
//                         <div className="space-y-1.5">
//                           <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
//                             <Phone size={14} className="text-slate-300" /> {user.mobile}
//                           </div>
//                           {user.email && (
//                             <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
//                               <Mail size={14} className="text-slate-300" /> <span className="truncate max-w-[150px]">{user.email}</span>
//                             </div>
//                           )}
//                         </div>
//                       </td>
//                       <td className="p-6">
//                         <select 
//                           value={user.role}
//                           onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
//                           className={cn(
//                             "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none outline-none ring-1 ring-inset cursor-pointer transition-colors",
//                             user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-200 hover:bg-purple-100" :
//                             user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-200 hover:bg-blue-100" :
//                             "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
//                           )}
//                         >
//                           <option value={UserRole.CUSTOMER}>Customer</option>
//                           <option value={UserRole.EMPLOYEE}>Staff</option>
//                           <option value={UserRole.ADMIN}>Admin</option>
//                         </select>
//                       </td>
//                       <td className="p-6 text-right">
//                         <button 
//                           onClick={() => setResetUser(user)}
//                           className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
//                           title="Reset Password"
//                         >
//                           <Key size={18} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* MOBILE VIEW: Cards */}
//           <div className="grid grid-cols-1 gap-4 md:hidden">
//             {filteredUsers.map((user) => (
//               <div key={user.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
//                 <div className="flex justify-between items-start">
//                   <div className="flex items-center gap-3">
//                     <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
//                       {user.full_name.charAt(0)}
//                     </div>
//                     <div>
//                       <p className="font-bold text-slate-900 truncate max-w-[180px]">{user.full_name}</p>
//                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
//                     </div>
//                   </div>
//                   <button 
//                     onClick={() => setResetUser(user)}
//                     className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 bg-slate-50"
//                   >
//                     <Key size={18} />
//                   </button>
//                 </div>

//                 <div className="space-y-2 bg-slate-50 p-3 rounded-2xl">
//                   <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
//                     <Phone size={14} className="text-slate-400" /> {user.mobile}
//                   </div>
//                   {user.email && (
//                     <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
//                       <Mail size={14} className="text-slate-400" /> <span className="truncate max-w-[220px]">{user.email}</span>
//                     </div>
//                   )}
//                 </div>

//                 <div>
//                   <select 
//                     value={user.role}
//                     onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
//                     className={cn(
//                       "w-full text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl border-none outline-none ring-1 ring-inset cursor-pointer transition-colors text-center",
//                       user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-200" :
//                       user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-200" :
//                       "bg-white text-slate-600 ring-slate-200"
//                     )}
//                   >
//                     <option value={UserRole.CUSTOMER}>Customer</option>
//                     <option value={UserRole.EMPLOYEE}>Staff</option>
//                     <option value={UserRole.ADMIN}>Admin</option>
//                   </select>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </>
//       )}

//       {/* Password Reset Modal */}
//       {resetUser && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 space-y-6">
//             <div className="flex justify-between items-center">
//               <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
//               <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={16}/></button>
//             </div>
            
//             <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
//                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-500">
//                 {resetUser.full_name.charAt(0)}
//               </div>
//               <div>
//                 <p className="text-sm font-black text-slate-700">{resetUser.full_name}</p>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resetUser.mobile}</p>
//               </div>
//             </div>

//             <form onSubmit={handlePasswordReset} className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New 4-Digit PIN</label>
//                 <input 
//                   autoFocus
//                   type="password"
//                   inputMode="numeric"
//                   placeholder="XXXX"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-lg text-center tracking-[0.5em] focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
//                 />
//               </div>

//               <button 
//                 type="submit"
//                 disabled={updateMutation.isPending}
//                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-brand-primary active:scale-95 transition-all"
//               >
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Update Password"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // src/features/admin/pages/UserManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService, UserRole } from '../api/admin.service';
// import { Mail, Phone, Key, X, Loader2, Search, Filter, Users } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const UserManagement = () => {
//   const queryClient = useQueryClient();
//   const [resetUser, setResetUser] = useState<any>(null);
//   const [newPassword, setNewPassword] = useState('');
  
//   // Filtering State
//   const [searchQuery, setSearchQuery] = useState('');
//   const [roleFilter, setRoleFilter] = useState<string>('ALL');

//   const { data: users, isLoading } = useQuery({
//     queryKey: ['adminUsers'],
//     queryFn: adminService.getUsers,
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number; data: any }) => adminService.updateUser(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
//       toast.success("Update successful");
//       setResetUser(null);
//       setNewPassword('');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed"),
//   });

//   const handlePasswordReset = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!/^\d{4,}$/.test(newPassword)) {
//       return toast.error("PIN must be at least 4 digits (numbers only)");
//     }
//     updateMutation.mutate({ id: resetUser.id, data: { password: newPassword } });
//   };

//   // Highly Optimized Search & Filter Engine
//   const filteredUsers = useMemo(() => {
//     if (!users) return [];
    
//     return users.filter(user => {
//       // 1. Role Filter Match
//       const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      
//       // 2. Search Query Match (Checks Name, Mobile, and Email)
//       const query = searchQuery.toLowerCase().trim();
//       const matchesSearch = query === '' || 
//         user.full_name.toLowerCase().includes(query) ||
//         user.mobile.includes(query) ||
//         (user.email && user.email.toLowerCase().includes(query));

//       return matchesRole && matchesSearch;
//     });
//   }, [users, searchQuery, roleFilter]);

//   if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading User Directory...</div>;

//   return (
//     <div className="space-y-6 relative pb-20">
      
//       {/* Header */}
//       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Directory</h1>
//           <p className="text-slate-500 font-medium mt-1">Manage roles and account permissions.</p>
//         </div>
//         <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
//           <Users size={16} className="text-brand-primary" />
//           <span className="text-xs font-black uppercase tracking-widest text-slate-600">
//             {filteredUsers.length} Users
//           </span>
//         </div>
//       </header>

//       {/* NEW: Search & Filter Control Bar */}
//       <div className="flex flex-col md:flex-row gap-3">
//         {/* Search Bar */}
//         <div className="relative flex-1">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//           <input 
//             type="text"
//             placeholder="Search by name, mobile, or email..."
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm placeholder:font-medium placeholder:text-slate-400"
//           />
//         </div>
        
//         {/* Role Filter Dropdown */}
//         <div className="relative w-full md:w-48 shrink-0">
//           <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
//           <select
//             value={roleFilter}
//             onChange={(e) => setRoleFilter(e.target.value)}
//             className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-brand-primary outline-none appearance-none transition-all shadow-sm cursor-pointer"
//           >
//             <option value="ALL">All Roles</option>
//             <option value={UserRole.CUSTOMER}>Customers</option>
//             <option value={UserRole.EMPLOYEE}>Staff</option>
//             <option value={UserRole.ADMIN}>Admins</option>
//           </select>
//         </div>
//       </div>

//       {/* Main Table */}
//       <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50/50 border-b border-slate-100">
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Profile</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Contact</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Access Level</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
              
//               {/* Empty State Handler */}
//               {filteredUsers.length === 0 ? (
//                 <tr>
//                   <td colSpan={4} className="p-16 text-center">
//                     <div className="flex flex-col items-center justify-center space-y-3">
//                       <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
//                         <Search size={28} />
//                       </div>
//                       <p className="font-bold text-slate-600">No users found.</p>
//                       <p className="text-xs font-medium text-slate-400 max-w-xs mx-auto">
//                         We couldn't find anyone matching your current search or filter criteria.
//                       </p>
//                       <button 
//                         onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }}
//                         className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline"
//                       >
//                         Clear Filters
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ) : (
//                 /* Map over the FILTERED users, not all users */
//                 filteredUsers.map((user) => (
//                   <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
//                     <td className="p-6 min-w-[200px]">
//                       <div className="flex items-center gap-3">
//                         <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
//                           {user.full_name.charAt(0)}
//                         </div>
//                         <div>
//                           <p className="font-bold text-slate-900 truncate">{user.full_name}</p>
//                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="p-6 min-w-[200px]">
//                       <div className="space-y-1.5">
//                         <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
//                           <Phone size={14} className="text-slate-300" /> {user.mobile}
//                         </div>
//                         {user.email && (
//                           <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
//                             <Mail size={14} className="text-slate-300" /> <span className="truncate max-w-[150px]">{user.email}</span>
//                           </div>
//                         )}
//                       </div>
//                     </td>
//                     <td className="p-6">
//                       <select 
//                         value={user.role}
//                         onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
//                         className={cn(
//                           "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none outline-none ring-1 ring-inset cursor-pointer transition-colors",
//                           user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-200 hover:bg-purple-100" :
//                           user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-200 hover:bg-blue-100" :
//                           "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
//                         )}
//                       >
//                         <option value={UserRole.CUSTOMER}>Customer</option>
//                         <option value={UserRole.EMPLOYEE}>Staff</option>
//                         <option value={UserRole.ADMIN}>Admin</option>
//                       </select>
//                     </td>
//                     <td className="p-6 text-right">
//                       <button 
//                         onClick={() => setResetUser(user)}
//                         className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
//                         title="Reset Password"
//                       >
//                         <Key size={18} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Password Reset Modal */}
//       {resetUser && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 space-y-6">
//             <div className="flex justify-between items-center">
//               <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
//               <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={16}/></button>
//             </div>
            
//             <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100">
//                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-slate-500">
//                 {resetUser.full_name.charAt(0)}
//               </div>
//               <div>
//                 <p className="text-sm font-black text-slate-700">{resetUser.full_name}</p>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resetUser.mobile}</p>
//               </div>
//             </div>

//             <form onSubmit={handlePasswordReset} className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New 4-Digit PIN</label>
//                 <input 
//                   autoFocus
//                   type="password"
//                   inputMode="numeric"
//                   placeholder="XXXX"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-lg text-center tracking-[0.5em] focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-inner"
//                 />
//               </div>

//               <button 
//                 type="submit"
//                 disabled={updateMutation.isPending}
//                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-brand-primary active:scale-95 transition-all"
//               >
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Update Password"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
// // src/features/admin/pages/UserManagement.tsx
// import { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService, UserRole } from '../api/admin.service';
// import { Shield, Mail, Phone, UserCheck, UserMinus, Key, X, Loader2 } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const UserManagement = () => {
//   const queryClient = useQueryClient();
//   const [resetUser, setResetUser] = useState<any>(null);
//   const [newPassword, setNewPassword] = useState('');

//   const { data: users, isLoading } = useQuery({
//     queryKey: ['adminUsers'],
//     queryFn: adminService.getUsers,
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number; data: any }) => adminService.updateUser(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
//       toast.success("Update successful");
//       setResetUser(null);
//       setNewPassword('');
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed"),
//   });

//   const handlePasswordReset = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!/^\d{4,}$/.test(newPassword)) {
//       return toast.error("PIN must be at least 4 digits (numbers only)");
//     }
//     updateMutation.mutate({ id: resetUser.id, data: { password: newPassword } });
//   };

//   if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading User Directory...</div>;

//   return (
//     <div className="space-y-6 relative">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Directory</h1>
//         <p className="text-slate-500 font-medium">Manage roles and account permissions.</p>
//       </header>

//       <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-50/50 border-b border-slate-100">
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Level</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {users?.map((user) => (
//                 <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
//                   <td className="p-6">
//                     <div className="flex items-center gap-3">
//                       <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
//                         {user.full_name.charAt(0)}
//                       </div>
//                       <div>
//                         <p className="font-bold text-slate-900">{user.full_name}</p>
//                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: #{user.id}</p>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="p-6">
//                     <div className="space-y-1">
//                       <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
//                         <Phone size={12} className="text-slate-300" /> {user.mobile}
//                       </div>
//                       {user.email && (
//                         <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
//                           <Mail size={12} className="text-slate-300" /> {user.email}
//                         </div>
//                       )}
//                     </div>
//                   </td>
//                   <td className="p-6">
//                     <select 
//                       value={user.role}
//                       onChange={(e) => updateMutation.mutate({ id: user.id, data: { role: e.target.value } })}
//                       className={cn(
//                         "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-none outline-none ring-1 ring-inset cursor-pointer",
//                         user.role === UserRole.ADMIN ? "bg-purple-50 text-purple-600 ring-purple-100" :
//                         user.role === UserRole.EMPLOYEE ? "bg-blue-50 text-blue-600 ring-blue-100" :
//                         "bg-slate-50 text-slate-500 ring-slate-100"
//                       )}
//                     >
//                       <option value={UserRole.CUSTOMER}>Customer</option>
//                       <option value={UserRole.EMPLOYEE}>Staff</option>
//                       <option value={UserRole.ADMIN}>Admin</option>
//                     </select>
//                   </td>
//                   <td className="p-6 text-right space-x-2">
//                     <button 
//                       onClick={() => setResetUser(user)}
//                       className="p-2 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all"
//                       title="Reset Password"
//                     >
//                       <Key size={18} />
//                     </button>
//                     {/* <button 
//                       onClick={() => updateMutation.mutate({ id: user.id, data: { is_active: !user.is_active } })}
//                       className={cn(
//                         "p-2 rounded-xl transition-all",
//                         user.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-red-400 hover:bg-red-50"
//                       )}
//                     >
//                       {user.is_active ? <UserCheck size={18} /> : <UserMinus size={18} />}
//                     </button> */}
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Password Reset Modal */}
//       {resetUser && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl border border-slate-100 space-y-6">
//             <div className="flex justify-between items-center">
//               <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
//               <button onClick={() => setResetUser(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
//             </div>
            
//             <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
//                <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-500">
//                 {resetUser.full_name.charAt(0)}
//               </div>
//               <div>
//                 <p className="text-sm font-black text-slate-700">{resetUser.full_name}</p>
//                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{resetUser.mobile}</p>
//               </div>
//             </div>

//             <form onSubmit={handlePasswordReset} className="space-y-4">
//               <div className="space-y-2">
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New 4-Digit PIN</label>
//                 <input 
//                   autoFocus
//                   type="password"
//                   inputMode="numeric"
//                   placeholder="XXXX"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-lg text-center tracking-[0.5em] focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                 />
//               </div>

//               <button 
//                 type="submit"
//                 disabled={updateMutation.isPending}
//                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2"
//               >
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : "Update Password"}
//               </button>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };


