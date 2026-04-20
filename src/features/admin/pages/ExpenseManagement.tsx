// src/features/admin/pages/ExpenseManagement.tsx
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Receipt, Plus, Tag, Calendar, Banknote, 
  AlignLeft, Loader2, ArrowRight, Wallet, Edit3, X,
  BarChart2, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const expenseSchema = z.object({
  amount: z.number().min(0.1, "Amount must be greater than 0"),
  category_id: z.number().min(1, "Please select a category"),
  expense_date: z.string().min(1, "Date is required"),
  remarks: z.string().optional().nullable(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const LaundryLoader = () => (
  <div className="flex flex-col items-center justify-center space-y-8 py-32 animate-in fade-in zoom-in-95 duration-500 w-full">
    <div className="relative w-32 h-32 bg-white rounded-[2rem] border-[6px] border-slate-100 shadow-2xl flex flex-col items-center justify-end pb-4 overflow-hidden">
      <div className="absolute top-0 w-full h-8 border-b-[6px] border-slate-100 flex items-center justify-end px-3 gap-1.5 bg-slate-50">
         <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
         <div className="w-2 h-2 rounded-full bg-slate-200"></div>
      </div>
      <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 relative flex items-center justify-center overflow-hidden mt-6 bg-slate-50">
        <div className="absolute w-20 h-20 bg-brand-primary/10 rounded-full animate-spin"></div>
        <div className="absolute w-12 h-12 bg-blue-400/40 rounded-[40%] animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute w-14 h-14 bg-cyan-300/40 rounded-[35%] animate-[spin_2s_linear_infinite_reverse]"></div>
      </div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-xl font-black text-slate-900 tracking-tight">Syncing Financials...</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Securely loading your ledger</p>
    </div>
  </div>
);

export const ExpenseManagement = () => {
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  // NEW: State for reporting and filtering
  const [isReportMode, setIsReportMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const today = new Date().toISOString().split('T')[0]; 
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { 
      expense_date: today,
      amount: 0,
      category_id: 0,
      remarks: ''
    }
  });

  const { data: categories = [], isLoading: isLoadingCats } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: adminService.getExpenseCategories,
  });

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: adminService.getExpenses,
  });

  // NEW: Filter expenses based on selected date range
  const filteredExpenses = useMemo(() => {
    if (!isReportMode || (!dateRange.from && !dateRange.to)) return expenses;
    
    return expenses.filter((e: any) => {
      const expDate = new Date(e.expense_date);
      expDate.setHours(0, 0, 0, 0);
      let isValid = true;
      
      if (dateRange.from) {
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (expDate < from) isValid = false;
      }
      if (dateRange.to) {
        const to = new Date(dateRange.to);
        to.setHours(0, 0, 0, 0);
        if (expDate > to) isValid = false;
      }
      return isValid;
    });
  }, [expenses, isReportMode, dateRange]);

  // NEW: Export to Excel Logic
  const handleExportExcel = () => {
    if (filteredExpenses.length === 0) return toast.error("No data to export in this range.");
    
    const exportData = filteredExpenses.map((e: any) => ({
      "Date": new Date(e.expense_date).toLocaleDateString(undefined, { timeZone: 'UTC' }),
      "Category": e.category?.name || "Uncategorized",
      "Amount (AED)": e.amount.toFixed(2),
      "Remarks": e.remarks || ""
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), "Expense Summary");
    XLSX.writeFile(wb, `Al_Nejoum_Expenses_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const createCategoryMutation = useMutation({
    mutationFn: adminService.createExpenseCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
      setNewCategoryName('');
      toast.success("Category added successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create category")
  });

  const saveExpenseMutation = useMutation({
    mutationFn: (data: ExpenseForm) => editingExpenseId 
      ? adminService.updateExpense(editingExpenseId, data) 
      : adminService.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); 
      
      handleCancelEdit(); 
      toast.success(editingExpenseId ? "Expense updated successfully" : "Expense logged successfully");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed")
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({ name: newCategoryName });
  };

  const handleEditClick = (expense: any) => {
    setEditingExpenseId(expense.id);
    
    const formattedDate = new Date(expense.expense_date).toISOString().split('T')[0];
    
    setValue('amount', expense.amount);
    setValue('category_id', expense.category.id);
    setValue('expense_date', formattedDate);
    setValue('remarks', expense.remarks || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    reset({ 
      expense_date: today, 
      amount: 0, 
      category_id: 0, 
      remarks: '' 
    });
  };

  if (isLoadingCats || isLoadingExpenses) return <LaundryLoader />;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* UPDATED HEADER: Includes Report Toggle Button */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Expenses</h1>
          <p className="text-slate-500 font-medium mt-1">Track outgoing cash flow and operational costs.</p>
        </div>
        <button 
          onClick={() => setIsReportMode(!isReportMode)} 
          className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border ${isReportMode ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}
        >
          <BarChart2 size={18} /> {isReportMode ? "Close Report Mode" : "Analytics & Export"}
        </button>
      </header>

      {/* NEW: Reporting & Export Panel */}
      {isReportMode && (
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">From</label>
              <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">To</label>
              <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none outline-none focus:ring-2 focus:ring-brand-primary" />
            </div>
          </div>
          <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm transition-colors">
            <Download size={16} /> Export to Excel
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Tag size={16} className="text-brand-primary" /> Manage Categories
            </h3>
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Electricity, Fuel..."
                className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none"
              />
              <button 
                type="submit"
                disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                className="bg-slate-900 text-white px-4 rounded-xl hover:bg-brand-primary transition-colors disabled:opacity-50"
              >
                {createCategoryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
              {categories.map((c: any) => (
                <span key={c.id} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          {/* DYNAMIC FORM */}
          <div className={`bg-white p-8 rounded-[2.5rem] border shadow-xl transition-colors duration-300 ${editingExpenseId ? 'border-brand-primary shadow-brand-primary/10' : 'border-slate-100 shadow-slate-200/40'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                {editingExpenseId ? <><Edit3 className="text-brand-primary" /> Edit Expense</> : <><Receipt className="text-brand-primary" /> Log New Expense</>}
              </h3>
              {editingExpenseId && (
                <button onClick={handleCancelEdit} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1">
                  <X size={14}/> Cancel
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit((data) => saveExpenseMutation.mutate(data))} className="space-y-5">
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    {...register('expense_date')}
                    type="date"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>
                {errors.expense_date && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.expense_date.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (AED)</label>
                <div className="relative mt-1">
                  <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    {...register('amount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  />
                </div>
                {errors.amount && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                <select 
                  {...register('category_id', { valueAsNumber: true })}
                  className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none appearance-none"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category_id.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
                <div className="relative mt-1">
                  <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea 
                    {...register('remarks')}
                    placeholder="What was this for?"
                    rows={2}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-sm focus:ring-2 focus:ring-brand-primary outline-none resize-none"
                  />
                </div>
              </div>

              <button 
                disabled={saveExpenseMutation.isPending}
                className={`w-full text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98] flex justify-center items-center gap-2 ${editingExpenseId ? 'bg-brand-primary hover:bg-brand-primary/90' : 'bg-slate-900 hover:bg-brand-primary'}`}
              >
                {saveExpenseMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <>{editingExpenseId ? 'Update Expense' : 'Save Expense'} <ArrowRight size={16}/></>}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: The Ledger */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] max-h-[800px]">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {isReportMode ? 'Filtered Ledger' : 'Expense Ledger'}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {isReportMode ? `${filteredExpenses.length} Records Found` : 'Recent Transactions'}
                </p>
              </div>
              <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
                <Wallet size={20} />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-32 text-slate-400">
                  <Receipt size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-sm">
                    {isReportMode ? "No expenses found for this date range." : "No expenses logged yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* UPDATED: Map over filteredExpenses instead of all expenses */}
                  {filteredExpenses.map((expense: any) => (
                    <div 
                      key={expense.id} 
                      className={`bg-white p-5 rounded-2xl border transition-all flex justify-between items-center group ${editingExpenseId === expense.id ? 'border-brand-primary shadow-md' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                          <Receipt size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{expense.category?.name || "Uncategorized"}</p>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} /> 
                              {new Date(expense.expense_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                            </span>
                            {expense.remarks && <span className="truncate max-w-[150px] md:max-w-[200px] hidden sm:inline-block">- {expense.remarks}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <p className="text-lg font-black text-slate-900 tracking-tight">
                          AED {expense.amount.toFixed(2)}
                        </p>
                        <button 
                          onClick={() => handleEditClick(expense)}
                          className="p-2 bg-slate-50 hover:bg-brand-primary hover:text-white rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Edit Expense"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
// // src/features/admin/pages/ExpenseManagement.tsx
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { toast } from 'sonner';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { 
//   Receipt, Plus, Tag, Calendar, Banknote, 
//   AlignLeft, Loader2, ArrowRight, Wallet, Edit3, X
// } from 'lucide-react';

// // FIX: Removed the custom invalid_type_error object to satisfy Zod's strict TS bindings
// const expenseSchema = z.object({
//   amount: z.number().min(0.1, "Amount must be greater than 0"),
//   category_id: z.number().min(1, "Please select a category"),
//   expense_date: z.string().min(1, "Date is required"),
//   remarks: z.string().optional().nullable(),
// });

// type ExpenseForm = z.infer<typeof expenseSchema>;

// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-32 animate-in fade-in zoom-in-95 duration-500 w-full">
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
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Syncing Financials...</h3>
//       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Securely loading your ledger</p>
//     </div>
//   </div>
// );

// export const ExpenseManagement = () => {
//   const queryClient = useQueryClient();
//   const [newCategoryName, setNewCategoryName] = useState('');
  
//   const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

//   const today = new Date().toISOString().split('T')[0]; 
  
//   const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
//     resolver: zodResolver(expenseSchema),
//     defaultValues: { 
//       expense_date: today,
//       amount: 0,
//       category_id: 0,
//       remarks: ''
//     }
//   });

//   const { data: categories = [], isLoading: isLoadingCats } = useQuery({
//     queryKey: ['expenseCategories'],
//     queryFn: adminService.getExpenseCategories,
//   });

//   const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
//     queryKey: ['expenses'],
//     queryFn: adminService.getExpenses,
//   });

//   const createCategoryMutation = useMutation({
//     mutationFn: adminService.createExpenseCategory,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
//       setNewCategoryName('');
//       toast.success("Category added successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create category")
//   });

//   const saveExpenseMutation = useMutation({
//     mutationFn: (data: ExpenseForm) => editingExpenseId 
//       ? adminService.updateExpense(editingExpenseId, data) 
//       : adminService.createExpense(data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenses'] });
//       queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); 
      
//       handleCancelEdit(); 
//       toast.success(editingExpenseId ? "Expense updated successfully" : "Expense logged successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed")
//   });

//   const handleAddCategory = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newCategoryName.trim()) return;
//     createCategoryMutation.mutate({ name: newCategoryName });
//   };

//   const handleEditClick = (expense: any) => {
//     setEditingExpenseId(expense.id);
    
//     const formattedDate = new Date(expense.expense_date).toISOString().split('T')[0];
    
//     setValue('amount', expense.amount);
//     setValue('category_id', expense.category.id);
//     setValue('expense_date', formattedDate);
//     setValue('remarks', expense.remarks || '');

//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const handleCancelEdit = () => {
//     setEditingExpenseId(null);
//     reset({ 
//       expense_date: today, 
//       amount: 0, 
//       category_id: 0, 
//       remarks: '' 
//     });
//   };

//   if (isLoadingCats || isLoadingExpenses) return <LaundryLoader />;

//   return (
//     <div className="space-y-8 pb-20 animate-in fade-in duration-500">
//       <header>
//         <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Expenses</h1>
//         <p className="text-slate-500 font-medium mt-1">Track outgoing cash flow and operational costs.</p>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
//         {/* LEFT COLUMN */}
//         <div className="lg:col-span-5 space-y-6">
          
//           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
//             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
//               <Tag size={16} className="text-brand-primary" /> Manage Categories
//             </h3>
//             <form onSubmit={handleAddCategory} className="flex gap-2">
//               <input 
//                 value={newCategoryName}
//                 onChange={(e) => setNewCategoryName(e.target.value)}
//                 placeholder="e.g. Electricity, Fuel..."
//                 className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none"
//               />
//               <button 
//                 type="submit"
//                 disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
//                 className="bg-slate-900 text-white px-4 rounded-xl hover:bg-brand-primary transition-colors disabled:opacity-50"
//               >
//                 {createCategoryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
//               </button>
//             </form>
//             <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
//               {categories.map((c: any) => (
//                 <span key={c.id} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
//                   {c.name}
//                 </span>
//               ))}
//             </div>
//           </div>

//           {/* DYNAMIC FORM */}
//           <div className={`bg-white p-8 rounded-[2.5rem] border shadow-xl transition-colors duration-300 ${editingExpenseId ? 'border-brand-primary shadow-brand-primary/10' : 'border-slate-100 shadow-slate-200/40'}`}>
//             <div className="flex justify-between items-center mb-6">
//               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
//                 {editingExpenseId ? <><Edit3 className="text-brand-primary" /> Edit Expense</> : <><Receipt className="text-brand-primary" /> Log New Expense</>}
//               </h3>
//               {editingExpenseId && (
//                 <button onClick={handleCancelEdit} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1">
//                   <X size={14}/> Cancel
//                 </button>
//               )}
//             </div>
            
//             <form onSubmit={handleSubmit((data) => saveExpenseMutation.mutate(data))} className="space-y-5">
              
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
//                 <div className="relative mt-1">
//                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('expense_date')}
//                     type="date"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.expense_date && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.expense_date.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (AED)</label>
//                 <div className="relative mt-1">
//                   <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('amount', { valueAsNumber: true })}
//                     type="number"
//                     step="0.01"
//                     placeholder="0.00"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.amount && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.amount.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
//                 <select 
//                   {...register('category_id', { valueAsNumber: true })}
//                   className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none appearance-none"
//                 >
//                   <option value="">Select Category...</option>
//                   {categories.map((c: any) => (
//                     <option key={c.id} value={c.id}>{c.name}</option>
//                   ))}
//                 </select>
//                 {errors.category_id && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category_id.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
//                 <div className="relative mt-1">
//                   <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
//                   <textarea 
//                     {...register('remarks')}
//                     placeholder="What was this for?"
//                     rows={2}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-sm focus:ring-2 focus:ring-brand-primary outline-none resize-none"
//                   />
//                 </div>
//               </div>

//               <button 
//                 disabled={saveExpenseMutation.isPending}
//                 className={`w-full text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98] flex justify-center items-center gap-2 ${editingExpenseId ? 'bg-brand-primary hover:bg-brand-primary/90' : 'bg-slate-900 hover:bg-brand-primary'}`}
//               >
//                 {saveExpenseMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <>{editingExpenseId ? 'Update Expense' : 'Save Expense'} <ArrowRight size={16}/></>}
//               </button>
//             </form>
//           </div>
//         </div>

//         {/* RIGHT COLUMN: The Ledger */}
//         <div className="lg:col-span-7">
//           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] max-h-[800px]">
//             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Expense Ledger</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recent Transactions</p>
//               </div>
//               <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
//                 <Wallet size={20} />
//               </div>
//             </div>

//             <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
//               {expenses.length === 0 ? (
//                 <div className="text-center py-32 text-slate-400">
//                   <Receipt size={48} className="mx-auto mb-4 opacity-20" />
//                   <p className="font-bold text-sm">No expenses logged yet.</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {expenses.map((expense: any) => (
//                     <div 
//                       key={expense.id} 
//                       className={`bg-white p-5 rounded-2xl border transition-all flex justify-between items-center group ${editingExpenseId === expense.id ? 'border-brand-primary shadow-md' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
//                     >
//                       <div className="flex items-center gap-4">
//                         <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
//                           <Receipt size={20} />
//                         </div>
//                         <div>
//                           <p className="font-black text-slate-900">{expense.category?.name || "Uncategorized"}</p>
//                           <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
//                             <span className="flex items-center gap-1">
//                               <Calendar size={12} /> 
//                               {new Date(expense.expense_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
//                             </span>
//                             {expense.remarks && <span className="truncate max-w-[150px] md:max-w-[200px] hidden sm:inline-block">- {expense.remarks}</span>}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex items-center gap-4 shrink-0 ml-4">
//                         <p className="text-lg font-black text-slate-900 tracking-tight">
//                           AED {expense.amount.toFixed(2)}
//                         </p>
//                         <button 
//                           onClick={() => handleEditClick(expense)}
//                           className="p-2 bg-slate-50 hover:bg-brand-primary hover:text-white rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
//                           title="Edit Expense"
//                         >
//                           <Edit3 size={16} />
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };
// before fixing build errors
// // src/features/admin/pages/ExpenseManagement.tsx
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { toast } from 'sonner';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { 
//   Receipt, Plus, Tag, Calendar, Banknote, 
//   AlignLeft, Loader2, ArrowRight, Wallet, Edit3, X
// } from 'lucide-react';

// const expenseSchema = z.object({
//   amount: z.number({ invalid_type_error: "Amount is required" }).min(0.1, "Amount must be greater than 0"),
//   category_id: z.number({ invalid_type_error: "Please select a category" }).min(1, "Please select a category"),
//   expense_date: z.string().min(1, "Date is required"),
//   remarks: z.string().optional().nullable(),
// });

// type ExpenseForm = z.infer<typeof expenseSchema>;

// const LaundryLoader = () => (
//   // ... (Keep your exact LaundryLoader component here)
//   <div className="flex flex-col items-center justify-center space-y-8 py-32 animate-in fade-in zoom-in-95 duration-500 w-full">
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
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Syncing Financials...</h3>
//       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Securely loading your ledger</p>
//     </div>
//   </div>
// );

// export const ExpenseManagement = () => {
//   const queryClient = useQueryClient();
//   const [newCategoryName, setNewCategoryName] = useState('');
  
//   // NEW: State to track if we are editing an existing expense
//   const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

//   const today = new Date().toISOString().split('T')[0]; 
  
//  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ExpenseForm>({
//     resolver: zodResolver(expenseSchema),
//     defaultValues: { 
//       expense_date: today,
//       amount: 0,
//       category_id: 0,
//       remarks: ''
//     }
//   });

//   const { data: categories = [], isLoading: isLoadingCats } = useQuery({
//     queryKey: ['expenseCategories'],
//     queryFn: adminService.getExpenseCategories,
//   });

//   const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
//     queryKey: ['expenses'],
//     queryFn: adminService.getExpenses,
//   });

//   const createCategoryMutation = useMutation({
//     mutationFn: adminService.createExpenseCategory,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
//       setNewCategoryName('');
//       toast.success("Category added successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create category")
//   });

//   // MUTATION: Handles both Create and Update
//   const saveExpenseMutation = useMutation({
//     mutationFn: (data: any) => editingExpenseId 
//       ? adminService.updateExpense(editingExpenseId, data) 
//       : adminService.createExpense(data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenses'] });
//       queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); // Refresh the Reports API math!
      
//       handleCancelEdit(); // Resets form and states
//       toast.success(editingExpenseId ? "Expense updated successfully" : "Expense logged successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Action failed")
//   });

//   const handleAddCategory = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newCategoryName.trim()) return;
//     createCategoryMutation.mutate({ name: newCategoryName });
//   };

//   // NEW: Populates the form when an admin clicks "Edit"
//   const handleEditClick = (expense: any) => {
//     setEditingExpenseId(expense.id);
    
//     // Format the date properly for the HTML date input
//     const formattedDate = new Date(expense.expense_date).toISOString().split('T')[0];
    
//     setValue('amount', expense.amount);
//     setValue('category_id', expense.category.id);
//     setValue('expense_date', formattedDate);
//     setValue('remarks', expense.remarks || '');

//     // Smooth scroll to top so they see the form changed
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   // NEW: Resets back to "Create" mode
//   const handleCancelEdit = () => {
//     setEditingExpenseId(null);
//     reset({ expense_date: today, amount: undefined, category_id: undefined, remarks: '' });
//   };

//   if (isLoadingCats || isLoadingExpenses) return <LaundryLoader />;

//   return (
//     <div className="space-y-8 pb-20 animate-in fade-in duration-500">
//       <header>
//         <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Expenses</h1>
//         <p className="text-slate-500 font-medium mt-1">Track outgoing cash flow and operational costs.</p>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
//         {/* LEFT COLUMN */}
//         <div className="lg:col-span-5 space-y-6">
          
//           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
//             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
//               <Tag size={16} className="text-brand-primary" /> Manage Categories
//             </h3>
//             <form onSubmit={handleAddCategory} className="flex gap-2">
//               <input 
//                 value={newCategoryName}
//                 onChange={(e) => setNewCategoryName(e.target.value)}
//                 placeholder="e.g. Electricity, Fuel..."
//                 className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none"
//               />
//               <button 
//                 type="submit"
//                 disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
//                 className="bg-slate-900 text-white px-4 rounded-xl hover:bg-brand-primary transition-colors disabled:opacity-50"
//               >
//                 {createCategoryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
//               </button>
//             </form>
//             <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
//               {categories.map((c: any) => (
//                 <span key={c.id} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
//                   {c.name}
//                 </span>
//               ))}
//             </div>
//           </div>

//           {/* DYNAMIC FORM: Switches between Create and Edit */}
//           <div className={`bg-white p-8 rounded-[2.5rem] border shadow-xl transition-colors duration-300 ${editingExpenseId ? 'border-brand-primary shadow-brand-primary/10' : 'border-slate-100 shadow-slate-200/40'}`}>
//             <div className="flex justify-between items-center mb-6">
//               <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
//                 {editingExpenseId ? <><Edit3 className="text-brand-primary" /> Edit Expense</> : <><Receipt className="text-brand-primary" /> Log New Expense</>}
//               </h3>
//               {editingExpenseId && (
//                 <button onClick={handleCancelEdit} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1">
//                   <X size={14}/> Cancel
//                 </button>
//               )}
//             </div>
            
//             <form onSubmit={handleSubmit((data) => saveExpenseMutation.mutate(data))} className="space-y-5">
              
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
//                 <div className="relative mt-1">
//                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('expense_date')}
//                     type="date"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.expense_date && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.expense_date.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (AED)</label>
//                 <div className="relative mt-1">
//                   <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('amount', { valueAsNumber: true })}
//                     type="number"
//                     step="0.01"
//                     placeholder="0.00"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.amount && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.amount.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
//                 <select 
//                {...register('category_id', { valueAsNumber: true })}
//                   className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none appearance-none"
//                 >
//                   <option value="">Select Category...</option>
//                   {categories.map((c: any) => (
//                     <option key={c.id} value={c.id}>{c.name}</option>
//                   ))}
//                 </select>
//                 {errors.category_id && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category_id.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
//                 <div className="relative mt-1">
//                   <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
//                   <textarea 
//                     {...register('remarks')}
//                     placeholder="What was this for?"
//                     rows={2}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-sm focus:ring-2 focus:ring-brand-primary outline-none resize-none"
//                   />
//                 </div>
//               </div>

//               <button 
//                 disabled={saveExpenseMutation.isPending}
//                 className={`w-full text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg active:scale-[0.98] flex justify-center items-center gap-2 ${editingExpenseId ? 'bg-brand-primary hover:bg-brand-primary/90' : 'bg-slate-900 hover:bg-brand-primary'}`}
//               >
//                 {saveExpenseMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <>{editingExpenseId ? 'Update Expense' : 'Save Expense'} <ArrowRight size={16}/></>}
//               </button>
//             </form>
//           </div>
//         </div>

//         {/* RIGHT COLUMN: The Ledger */}
//         <div className="lg:col-span-7">
//           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] max-h-[800px]">
//             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Expense Ledger</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recent Transactions</p>
//               </div>
//               <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
//                 <Wallet size={20} />
//               </div>
//             </div>

//             <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
//               {expenses.length === 0 ? (
//                 <div className="text-center py-32 text-slate-400">
//                   <Receipt size={48} className="mx-auto mb-4 opacity-20" />
//                   <p className="font-bold text-sm">No expenses logged yet.</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {expenses.map((expense: any) => (
//                     <div 
//                       key={expense.id} 
//                       className={`bg-white p-5 rounded-2xl border transition-all flex justify-between items-center group ${editingExpenseId === expense.id ? 'border-brand-primary shadow-md' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}
//                     >
//                       <div className="flex items-center gap-4">
//                         <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
//                           <Receipt size={20} />
//                         </div>
//                         <div>
//                           <p className="font-black text-slate-900">{expense.category?.name || "Uncategorized"}</p>
//                           <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
//                             <span className="flex items-center gap-1">
//                               <Calendar size={12} /> 
//                               {new Date(expense.expense_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
//                             </span>
//                             {expense.remarks && <span className="truncate max-w-[150px] md:max-w-[200px] hidden sm:inline-block">- {expense.remarks}</span>}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex items-center gap-4 shrink-0 ml-4">
//                         <p className="text-lg font-black text-slate-900 tracking-tight">
//                           AED {expense.amount.toFixed(2)}
//                         </p>
//                         {/* EDIT BUTTON (Only visible on hover to keep UI clean) */}
//                         <button 
//                           onClick={() => handleEditClick(expense)}
//                           className="p-2 bg-slate-50 hover:bg-brand-primary hover:text-white rounded-xl text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
//                           title="Edit Expense"
//                         >
//                           <Edit3 size={16} />
//                         </button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// // src/features/admin/pages/ExpenseManagement.tsx
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { toast } from 'sonner';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { 
//   Receipt, Plus, Tag, Calendar, Banknote, 
//   AlignLeft, Loader2, ArrowRight, Wallet
// } from 'lucide-react';

// // 1. Zod Schema updated with Date validation
// const expenseSchema = z.object({
//   amount: z.coerce.number().min(0.1, "Amount must be greater than 0"),
//   category_id: z.coerce.number().min(1, "Please select a category"),
//   expense_date: z.string().min(1, "Date is required"), // <-- NEW: Date field
//   remarks: z.string().optional(),
// });

// type ExpenseForm = z.infer<typeof expenseSchema>;

// // Premium Laundry Loader Component
// const LaundryLoader = () => (
//   <div className="flex flex-col items-center justify-center space-y-8 py-32 animate-in fade-in zoom-in-95 duration-500 w-full">
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
//       <h3 className="text-xl font-black text-slate-900 tracking-tight">Syncing Financials...</h3>
//       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Securely loading your ledger</p>
//     </div>
//   </div>
// );

// export const ExpenseManagement = () => {
//   const queryClient = useQueryClient();
//   const [newCategoryName, setNewCategoryName] = useState('');

//   // 2. Initialize Form with Today's Date by default for maximum speed
//   const today = new Date().toISOString().split('T')[0]; // Yields 'YYYY-MM-DD'
  
//   const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseForm>({
//     resolver: zodResolver(expenseSchema),
//     defaultValues: {
//       expense_date: today 
//     }
//   });

//   const { data: categories = [], isLoading: isLoadingCats } = useQuery({
//     queryKey: ['expenseCategories'],
//     queryFn: adminService.getExpenseCategories,
//   });

//   const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery({
//     queryKey: ['expenses'],
//     queryFn: adminService.getExpenses,
//   });

//   const createCategoryMutation = useMutation({
//     mutationFn: adminService.createExpenseCategory,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
//       setNewCategoryName('');
//       toast.success("Category added successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create category")
//   });

//   const logExpenseMutation = useMutation({
//     mutationFn: adminService.createExpense,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['expenses'] });
//       // Reset form but keep the date as today so they can keep firing entries!
//       reset({ expense_date: today, amount: undefined, category_id: undefined, remarks: '' }); 
//       toast.success("Expense logged successfully");
//     },
//     onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to log expense")
//   });

//   const handleAddCategory = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newCategoryName.trim()) return;
//     createCategoryMutation.mutate({ name: newCategoryName });
//   };

//   // Show Premium Loader while initial data fetches
//   if (isLoadingCats || isLoadingExpenses) {
//     return <LaundryLoader />;
//   }

//   return (
//     <div className="space-y-8 pb-20 animate-in fade-in duration-500">
//       <header>
//         <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Expenses</h1>
//         <p className="text-slate-500 font-medium mt-1">Track outgoing cash flow and operational costs.</p>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
//         {/* LEFT COLUMN: Controls */}
//         <div className="lg:col-span-5 space-y-6">
          
//           {/* Quick Add Category Card */}
//           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
//             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
//               <Tag size={16} className="text-brand-primary" /> Manage Categories
//             </h3>
//             <form onSubmit={handleAddCategory} className="flex gap-2">
//               <input 
//                 value={newCategoryName}
//                 onChange={(e) => setNewCategoryName(e.target.value)}
//                 placeholder="e.g. Electricity, Fuel..."
//                 className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none"
//               />
//               <button 
//                 type="submit"
//                 disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
//                 className="bg-slate-900 text-white px-4 rounded-xl hover:bg-brand-primary transition-colors disabled:opacity-50"
//               >
//                 {createCategoryMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
//               </button>
//             </form>
//             <div className="mt-4 flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
//               {categories.map((c: any) => (
//                 <span key={c.id} className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md">
//                   {c.name}
//                 </span>
//               ))}
//             </div>
//           </div>

//           {/* Log Expense Form */}
//           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40">
//             <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
//               <Receipt className="text-brand-primary" /> Log New Expense
//             </h3>
            
//             <form onSubmit={handleSubmit((data) => logExpenseMutation.mutate(data))} className="space-y-5">
              
//               {/* DATE PICKER (NEW) */}
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expense Date</label>
//                 <div className="relative mt-1">
//                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('expense_date')}
//                     type="date"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.expense_date && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.expense_date.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (AED)</label>
//                 <div className="relative mt-1">
//                   <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                   <input 
//                     {...register('amount')}
//                     type="number"
//                     step="0.01"
//                     placeholder="0.00"
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-black text-lg focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//                   />
//                 </div>
//                 {errors.amount && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.amount.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
//                 <select 
//                   {...register('category_id')}
//                   className="w-full mt-1 px-5 py-4 bg-slate-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-brand-primary outline-none appearance-none"
//                 >
//                   <option value="">Select Category...</option>
//                   {categories.map((c: any) => (
//                     <option key={c.id} value={c.id}>{c.name}</option>
//                   ))}
//                 </select>
//                 {errors.category_id && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{errors.category_id.message}</p>}
//               </div>

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
//                 <div className="relative mt-1">
//                   <AlignLeft className="absolute left-4 top-4 text-slate-400" size={18} />
//                   <textarea 
//                     {...register('remarks')}
//                     placeholder="What was this for?"
//                     rows={2}
//                     className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-medium text-sm focus:ring-2 focus:ring-brand-primary outline-none resize-none"
//                   />
//                 </div>
//               </div>

//               <button 
//                 disabled={logExpenseMutation.isPending}
//                 className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-primary transition-all shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
//               >
//                 {logExpenseMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <>Save Expense <ArrowRight size={16}/></>}
//               </button>
//             </form>
//           </div>
//         </div>

//         {/* RIGHT COLUMN: The Ledger */}
//         <div className="lg:col-span-7">
//           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] max-h-[800px]">
//             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Expense Ledger</h3>
//                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recent Transactions</p>
//               </div>
//               <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400">
//                 <Wallet size={20} />
//               </div>
//             </div>

//             <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
//               {expenses.length === 0 ? (
//                 <div className="text-center py-32 text-slate-400">
//                   <Receipt size={48} className="mx-auto mb-4 opacity-20" />
//                   <p className="font-bold text-sm">No expenses logged yet.</p>
//                 </div>
//               ) : (
//                 <div className="space-y-3">
//                   {expenses.map((expense: any) => (
//                     <div key={expense.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-slate-200 transition-colors">
//                       <div className="flex items-center gap-4">
//                         <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
//                           <Receipt size={20} />
//                         </div>
//                         <div>
//                           <p className="font-black text-slate-900">{expense.category?.name || "Uncategorized"}</p>
//                           <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
//                             <span className="flex items-center gap-1">
//                               <Calendar size={12} /> 
//                               {/* Using UTC to prevent timezone shifting the selected date */}
//                               {new Date(expense.expense_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
//                             </span>
//                             {expense.remarks && <span className="truncate max-w-[150px] md:max-w-[200px] hidden sm:inline-block">- {expense.remarks}</span>}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="text-right shrink-0 ml-4">
//                         <p className="text-lg font-black text-slate-900 tracking-tight">
//                           AED {expense.amount.toFixed(2)}
//                         </p>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };
