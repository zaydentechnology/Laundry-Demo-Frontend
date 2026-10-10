// src/components/layout/Navbar.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { getNavItems } from '@/utils/navigation';
import { cn } from '@/utils/cn';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = getNavItems(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* UPDATED: BRAND LOGO SECTION */}
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-100 shadow-sm bg-white p-0.5">
            {/* Points to public/logo/logo.png */}
            <img src="/logo/logo.jpg" alt="Zayden Logo" className="h-full w-full object-contain" />
          </div>
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
              Zayden
            </span>
            <span className="text-brand-primary font-black text-[9px] uppercase tracking-[0.2em] mt-0.5">
              Laundry
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            if (item.path === '/profile') return null; 

            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-brand-primary",
                  isActive ? "text-brand-primary" : "text-slate-600"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          
          <div className="h-4 w-px bg-slate-200 mx-2" /> 
          
          <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary">
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
               <User size={16} />
            </div>
            {user?.full_name?.split(' ')[0] || 'Profile'}
          </Link>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="px-3 py-2 text-sm text-slate-600 hover:text-red-500 hover:bg-red-50"
            icon={LogOut}
          >
            Logout
          </Button>
        </div>

        {/* Mobile Profile & Logout Icon */}
        <div className="md:hidden flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="px-2 py-2 text-slate-500 hover:text-red-500"
          >
            <LogOut size={20} />
          </Button>
          <Link to="/profile">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
               <User className="text-slate-600" size={20} />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/Button';
// import { User, LogOut } from 'lucide-react';
// import { useAuthStore } from '@/store/useAuthStore';
// import { getNavItems } from '@/utils/navigation';
// import { cn } from '@/utils/cn';

// export const Navbar = () => {
//   const { user, logout } = useAuthStore();
//   const location = useLocation();
//   const navigate = useNavigate();
  
//   // Fetch links dynamically based on the logged-in user's role
//   const navItems = getNavItems(user?.role);

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
//       <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
//         {/* Logo Section */}
//         <Link to="/" className="flex items-center gap-2">
//           <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-sm">
//             <span className="text-white font-bold text-xl">N</span>
//           </div>
//           <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
//             Alnejoum<span className="text-brand-primary font-medium text-sm ml-1">Laundry</span>
//           </span>
//         </Link>

//         {/* Desktop Navigation */}
//         <div className="hidden md:flex items-center gap-6">
//           {navItems.map((item) => {
//             // Don't show 'Profile' as a text link on desktop, we use the button for that
//             if (item.path === '/profile') return null; 

//             const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            
//             return (
//               <Link
//                 key={item.path}
//                 to={item.path}
//                 className={cn(
//                   "text-sm font-medium transition-colors hover:text-brand-primary",
//                   isActive ? "text-brand-primary" : "text-slate-600"
//                 )}
//               >
//                 {item.label}
//               </Link>
//             );
//           })}
          
//           <div className="h-4 w-px bg-slate-200 mx-2" /> {/* Divider */}
          
//           <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary">
//             <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
//                <User size={16} />
//             </div>
//             {user?.full_name?.split(' ')[0] || 'Profile'}
//           </Link>

//           <Button 
//             variant="ghost" 
//             onClick={handleLogout}
//             className="px-3 py-2 text-sm text-slate-600 hover:text-brand-error hover:bg-red-50"
//             icon={LogOut}
//           >
//             Logout
//           </Button>
//         </div>

//         {/* Mobile Profile & Logout Icon */}
//         <div className="md:hidden flex items-center gap-3">
//           <Button 
//             variant="ghost" 
//             onClick={handleLogout}
//             className="px-2 py-2 text-slate-500 hover:text-brand-error"
//           >
//             <LogOut size={20} />
//           </Button>
//           <Link to="/profile">
//             <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
//                <User className="text-slate-600" size={20} />
//             </div>
//           </Link>
//         </div>
//       </div>
//     </header>
//   );
// };