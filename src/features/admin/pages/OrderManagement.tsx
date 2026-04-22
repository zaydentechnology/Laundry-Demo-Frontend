// src/features/admin/pages/OrderManagement.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../api/admin.service';
import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
import { 
  Search, Loader2, Edit3, Package, X, MinusCircle, 
  AlertCircle, Download, BarChart2, CalendarDays, 
  Clock, StickyNote, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import * as XLSX from 'xlsx';

export const OrderManagement = () => {
  const [search, setSearch] = useState('');
  const [editingOrder, setEditingOrder] = useState<any>(null); 
  const [isReportMode, setIsReportMode] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminAllOrders'],
    queryFn: adminService.getAllOrders,
    refetchInterval: 15000, 
  });

  const { data: masterItems = [] } = useQuery({
    queryKey: ['serviceItems'],
    queryFn: adminService.getItems,
    enabled: !!editingOrder, 
  });

  const matrixOptions = useMemo(() => {
    const options: any[] = [];
    masterItems.forEach((item: any) => {
      item.services?.forEach((svc: any) => {
        options.push({
          item_id: item.id,
          item_name: item.name,
          service_category_id: svc.service_category_id,
          service_name: svc.category?.name || "Service",
          price: svc.price
        });
      });
    });
    return options;
  }, [masterItems]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
      toast.success("Order updated!");
      setEditingOrder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update order.");
    }
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const searchLower = search.toLowerCase();
      const customerName = o.customer?.full_name?.toLowerCase() || '';
      const orderIdStr = o.id?.toString() || '';
      const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

      let matchesDate = true;
      if (isReportMode && (dateRange.from || dateRange.to)) {
        const orderDate = new Date(o.created_at || o.pickup_date);
        orderDate.setHours(0, 0, 0, 0); 
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (orderDate < fromDate) matchesDate = false;
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(0, 0, 0, 0);
          if (orderDate > toDate) matchesDate = false;
        }
      }
      return matchesSearch && matchesDate;
    });
  }, [orders, search, isReportMode, dateRange]);

  const handleExportExcel = () => {
    if (filteredOrders.length === 0) return toast.error("No data to export");

    const summaryData = filteredOrders.map((o: any) => ({
      "Order Number": formatOrderId(o.id),
      "Order Date": new Date(o.created_at).toLocaleDateString(),
      "Customer Name": o.customer?.full_name || 'Guest',
      "Mobile": o.customer?.mobile || 'N/A',
      "Building": o.customer?.building_name || 'N/A',
      "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
      "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
      "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
      "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
      "Total Amount": (o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price)).toFixed(2),
      "Status": o.status,
      "Hanger": o.hanger_needed ? "Yes" : "No",
      "Remarks": o.notes || ""
    }));

    const itemsDetailData: any[] = [];
    filteredOrders.forEach((o: any) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item: any) => {
          itemsDetailData.push({
            "Order Number": formatOrderId(o.id),
            "Order Date": new Date(o.created_at).toLocaleDateString(),
            "Customer Name": o.customer?.full_name || 'Guest',
            "Mobile": o.customer?.mobile || 'N/A',
            "Building": o.customer?.building_name || 'N/A',
            "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
            "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
            "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
            "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
            "Status": o.status,
            "Hanger": o.hanger_needed ? "Yes" : "No",
            "Remarks": o.notes || "",
            "Item Name": item.item?.name || 'Unknown',
            "Service": item.service_category?.name || 'Standard',
            "Quantity": o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity),
            "Item Unit Price": item.unit_price?.toFixed(2) || "0.00"
          });
        });
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Orders Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsDetailData), "Items Breakdown");
    XLSX.writeFile(wb, `Al_Nejoum_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    toast.success("Excel exported with matched columns!");
  };

  // NEW: State-Based Access Control Rule
  // We check the original database status to enforce a strict 2-step save process.
  const originalOrder = orders.find((o: any) => o.id === editingOrder?.id);
  const isItemEditingLocked = originalOrder?.status === 'NEW_ORDER';

  const handleLockedInteraction = () => {
    if (isItemEditingLocked) {
      toast.error("Items Locked! Please update status to Picked Up, save the order, and then reopen to edit items.");
    }
  };

  if (isLoading) return <OrderManagementSkeleton />;

  return (
    <div className="space-y-8 pb-20 relative">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
            <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input type="text" placeholder="Search ID or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
            </div>
            <button onClick={() => setIsReportMode(!isReportMode)} className={cn("px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border", isReportMode ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50")}>
              <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
            </button>
          </div>
        </div>
        {isReportMode && (
          <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">From</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
              <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">To</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
            </div>
            <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Download size={16} /> Export Excel</button>
          </div>
        )}
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50/50 group">
                  <td className="p-6 align-top">
                    <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{formatSafeDate(order.created_at)}</p>
                    {order.hanger_needed && (
                      <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">HANGER REQ</span>
                    )}
                    {order.notes && (
                      <div className="mt-2 flex items-start gap-1.5 text-brand-primary bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10 max-w-[200px]">
                        <StickyNote size={12} className="shrink-0 mt-0.5" />
                        <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{order.notes}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-6 align-top">
                    <p className="font-bold text-slate-900">{order.customer?.full_name || 'Guest'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile}</p>
                  </td>
                  <td className="p-6 align-top">
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                      <p><span className="text-amber-500 uppercase">Pick:</span> {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}</p>
                      <p><span className="text-emerald-500 uppercase">Drop:</span> {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} {order.expected_delivery_time ? `@ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}</p>
                    </div>
                  </td>
                  <td className="p-6 text-right align-top">
                    <p className="font-black text-slate-900 text-lg">AED {(order.final_price || order.estimated_price).toFixed(2)}</p>
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="p-6 text-right align-top">
                    <button onClick={() => setEditingOrder(JSON.parse(JSON.stringify(order)))} className="p-3 bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
                <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {editingOrder.notes && (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-start gap-4">
                  <StickyNote size={20} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-bold text-slate-900 leading-relaxed">{editingOrder.notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
                  {/* Status remains unlocked so they can change to PICKED_UP */}
                  <select value={editingOrder.status} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
                    <option value="NEW_ORDER">New Order</option>
                    <option value="PICKED_UP">Picked Up</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Hanger</label>
                  <select value={editingOrder.hanger_needed ? "true" : "false"} onChange={(e) => setEditingOrder({...editingOrder, hanger_needed: e.target.value === "true"})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
                    <option value="true">Yes</option><option value="false">No</option>
                  </select>
                </div>
              </div>

              {/* --- ENHANCED ITEM EDITOR WITH STATE-BASED LOCK --- */}
              <div 
                className={cn(
                  "p-5 rounded-[2rem] border space-y-4 transition-all duration-300", 
                  isItemEditingLocked ? "bg-slate-50/50 border-slate-100 opacity-80" : "bg-slate-50 border-slate-100 shadow-inner"
                )}
              >
                <div className="flex items-center justify-between ml-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Breakdown & Pricing Overrides</p>
                  {isItemEditingLocked && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>

                {isItemEditingLocked && (
                  <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-700 leading-relaxed">
                      Item modification is locked to prevent customer cart conflicts. 
                      <br/><strong className="text-amber-900">Please update status to "Picked Up" and Save to unlock.</strong>
                    </p>
                  </div>
                )}

                {/* We wrap the interactive elements in a div that catches clicks if locked */}
                <div className="space-y-3" onClickCapture={handleLockedInteraction}>
                  <div className={cn("space-y-3", isItemEditingLocked && "pointer-events-none")}>
                    {editingOrder.items?.map((i: any, index: number) => (
                      <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col flex-1 truncate pr-2">
                          <span className="text-xs font-bold text-slate-700 truncate">{i.item?.name}</span>
                          <span className="text-[9px] font-black text-brand-primary uppercase truncate">{i.service_category?.name}</span>
                        </div>
                        
                        <div className={cn("flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0", isItemEditingLocked && "opacity-50")}>
                          <div className="flex flex-col px-2">
                            <label className="text-[8px] font-black uppercase text-slate-400 text-center">Price</label>
                            <input 
                              type="number" min="0" step="0.5" 
                              value={i.unit_price !== undefined ? i.unit_price : 0} 
                              onChange={(e) => {
                                const newItems = [...editingOrder.items];
                                newItems[index] = { ...newItems[index], unit_price: parseFloat(e.target.value) || 0 };
                                setEditingOrder({...editingOrder, items: newItems});
                              }} 
                              disabled={isItemEditingLocked}
                              className="w-14 bg-transparent text-xs font-black text-slate-900 focus:outline-none text-center disabled:cursor-not-allowed" 
                            />
                          </div>
                          <div className="w-px h-6 bg-slate-200"></div>
                          <div className="flex flex-col px-2">
                            <label className="text-[8px] font-black uppercase text-slate-400 text-center">Qty</label>
                            <input 
                              type="number" min="0" 
                              value={i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0)} 
                              onChange={(e) => {
                                const newItems = [...editingOrder.items];
                                const qty = parseInt(e.target.value) || 0;
                                newItems[index] = { ...newItems[index], final_quantity: qty, estimated_quantity: qty };
                                setEditingOrder({...editingOrder, items: newItems});
                              }} 
                              disabled={isItemEditingLocked}
                              className="w-10 bg-transparent text-xs font-black text-slate-900 focus:outline-none text-center disabled:cursor-not-allowed" 
                            />
                          </div>
                          <button 
                            onClick={() => {
                              const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
                              setEditingOrder({ ...editingOrder, items: newItems });
                            }} 
                            disabled={isItemEditingLocked}
                            className="text-red-400 hover:text-red-600 p-2 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <MinusCircle size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    <select 
                      disabled={isItemEditingLocked}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary transition-colors cursor-pointer appearance-none disabled:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" 
                      value="" 
                      onChange={(e) => {
                        const [itemId, catId] = e.target.value.split('_').map(Number);
                        if (editingOrder.items.some((oi: any) => oi.item_id === itemId && oi.service_category_id === catId)) {
                          return toast.error("Already in order. Adjust quantity/price instead.");
                        }
                        const match = matrixOptions.find(o => o.item_id === itemId && o.service_category_id === catId);
                        const newItem = { 
                          item_id: itemId, service_category_id: catId, 
                          final_quantity: 1, estimated_quantity: 1, 
                          unit_price: match?.price,
                          item: { name: match?.item_name }, service_category: { name: match?.service_name }
                        };
                        setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
                      }}
                    >
                      <option value="" disabled>+ Add custom service...</option>
                      {matrixOptions.map((opt: any) => (
                        <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
                          {opt.item_name} - {opt.service_name} (AED {opt.price})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Pickup Logistics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={editingOrder.pickup_date ? editingOrder.pickup_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
                    <input type="time" value={editingOrder.pickup_time || ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Expected Delivery</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={editingOrder.expected_delivery_date ? editingOrder.expected_delivery_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
                    <input type="time" value={editingOrder.expected_delivery_time || ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button onClick={() => updateMutation.mutate({ 
                  id: editingOrder.id, 
                  data: { 
                    ...editingOrder, 
                    items: editingOrder.items.map((i: any) => ({ 
                      item_id: i.item_id, 
                      service_category_id: i.service_category_id, 
                      final_quantity: i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0),
                      unit_price: i.unit_price 
                    })) 
                  } 
                })} 
                disabled={updateMutation.isPending} 
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save All Changes & Recalculate"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getPickupWindow = (timeStr?: string) => {
  if (!timeStr) return "Pending";
  try {
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    const formatAMPM = (h: number, m: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      const displayM = m < 10 ? `0${m}` : m;
      return `${displayH}:${displayM} ${ampm}`;
    };
    const startTime = formatAMPM(hour, min);
    const endHour = (hour + 1) % 24;
    const endTime = formatAMPM(endHour, min);
    return `${startTime} - ${endTime}`;
  } catch (e) {
    return timeStr; 
  }
};

const OrderManagementSkeleton = () => (
  <div className="space-y-8 animate-pulse p-4">
    <div className="h-12 w-48 bg-slate-100 rounded-xl" />
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
    PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
    DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
    CANCELLED: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
      {status?.replace('_', ' ') || 'UNKNOWN'}
    </span>
  );
};
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { 
//   Search, Loader2, Edit3, Package, X, MinusCircle, 
//   AlertCircle, Download, BarChart2, CalendarDays, 
//   Clock, StickyNote 
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';
// import * as XLSX from 'xlsx';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order fully updated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order.");
//     }
//   });

//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); 
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }
//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   const handleExportExcel = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");

//     const summaryData = filteredOrders.map((o: any) => ({
//       "Order Number": formatOrderId(o.id),
//       "Order Date": new Date(o.created_at).toLocaleDateString(),
//       "Customer Name": o.customer?.full_name || 'Guest',
//       "Mobile": o.customer?.mobile || 'N/A',
//       "Building": o.customer?.building_name || 'N/A',
//       "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//       "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
//       "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//       "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
//       "Total Amount": (o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price)).toFixed(2),
//       "Status": o.status,
//       "Hanger": o.hanger_needed ? "Yes" : "No",
//       "Remarks": o.notes || ""
//     }));

//     const itemsDetailData: any[] = [];
//     filteredOrders.forEach((o: any) => {
//       if (o.items && o.items.length > 0) {
//         o.items.forEach((item: any) => {
//           itemsDetailData.push({
//             "Order Number": formatOrderId(o.id),
//             "Order Date": new Date(o.created_at).toLocaleDateString(),
//             "Customer Name": o.customer?.full_name || 'Guest',
//             "Mobile": o.customer?.mobile || 'N/A',
//             "Building": o.customer?.building_name || 'N/A',
//             "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//             "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
//             "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//             "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
//             "Status": o.status,
//             "Hanger": o.hanger_needed ? "Yes" : "No",
//             "Remarks": o.notes || "",
//             "Item Name": item.item?.name || 'Unknown',
//             "Service": item.service_category?.name || 'Standard',
//             "Quantity": o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity),
//             "Item Unit Price": item.unit_price.toFixed(2)
//           });
//         });
//       }
//     });

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Orders Summary");
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsDetailData), "Items Breakdown");
//     XLSX.writeFile(wb, `Al_Nejoum_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
//     toast.success("Excel exported with matched columns!");
//   };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input type="text" placeholder="Search ID or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//             </div>
//             <button onClick={() => setIsReportMode(!isReportMode)} className={cn("px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border", isReportMode ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50")}>
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>
//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">From</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">To</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//             </div>
//             <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Download size={16} /> Export Excel</button>
//           </div>
//         )}
//       </header>

//       <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left whitespace-nowrap">
//             <thead className="bg-slate-50/50 border-b border-slate-100">
//               <tr>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                 <th className="p-6"></th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {filteredOrders.map((order: any) => (
//                 <tr key={order.id} className="hover:bg-slate-50/50 group">
//                   <td className="p-6 align-top">
//                     <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{formatSafeDate(order.created_at)}</p>
//                     {order.hanger_needed && (
//                       <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">HANGER REQ</span>
//                     )}
//                     {order.notes && (
//                       <div className="mt-2 flex items-start gap-1.5 text-brand-primary bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10 max-w-[200px]">
//                         <StickyNote size={12} className="shrink-0 mt-0.5" />
//                         <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{order.notes}</p>
//                       </div>
//                     )}
//                   </td>
//                   <td className="p-6 align-top">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Guest'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile}</p>
//                   </td>
//                   <td className="p-6 align-top">
//                     <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
//                       <p><span className="text-amber-500 uppercase">Pick:</span> {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}</p>
//                       <p><span className="text-emerald-500 uppercase">Drop:</span> {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} {order.expected_delivery_time ? `@ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}</p>
//                     </div>
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <p className="font-black text-slate-900 text-lg">AED {(order.final_price || order.estimated_price).toFixed(2)}</p>
//                     <StatusBadge status={order.status} />
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <button onClick={() => setEditingOrder(JSON.parse(JSON.stringify(order)))} className="p-3 bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm">
//                       <Edit3 size={16} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
//             </div>
            
//             <div className="p-6 space-y-6">
//               {editingOrder.notes && (
//                 <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-start gap-4">
//                   <StickyNote size={20} className="text-amber-600 shrink-0" />
//                   <p className="text-sm font-bold text-slate-900 leading-relaxed">{editingOrder.notes}</p>
//                 </div>
//               )}
              
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
//                   <select value={editingOrder.status} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="NEW_ORDER">New Order</option>
//                     <option value="PICKED_UP">Picked Up</option>
//                     <option value="DELIVERED">Delivered</option>
//                     <option value="CANCELLED">Cancelled</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Hanger</label>
//                   <select value={editingOrder.hanger_needed ? "true" : "false"} onChange={(e) => setEditingOrder({...editingOrder, hanger_needed: e.target.value === "true"})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="true">Yes</option><option value="false">No</option>
//                   </select>
//                 </div>
//               </div>

//               {/* --- ENHANCED ITEM EDITOR --- */}
//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items Breakdown & Pricing Overrides</p>
//                 <div className="space-y-3">
//                   {editingOrder.items?.map((i: any, index: number) => (
//                     <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
//                       <div className="flex flex-col flex-1 truncate pr-2">
//                         <span className="text-xs font-bold text-slate-700 truncate">{i.item?.name}</span>
//                         <span className="text-[9px] font-black text-brand-primary uppercase truncate">{i.service_category?.name}</span>
//                       </div>
                      
//                       {/* INLINE EDIT CONTROLS */}
//                       <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
//                         <div className="flex flex-col px-2">
//                           <label className="text-[8px] font-black uppercase text-slate-400 text-center">Price</label>
//                           <input 
//                             type="number" min="0" step="0.5" 
//                             value={i.unit_price !== undefined ? i.unit_price : 0} 
//                             onChange={(e) => {
//                               const newItems = [...editingOrder.items];
//                               newItems[index] = { ...newItems[index], unit_price: parseFloat(e.target.value) || 0 };
//                               setEditingOrder({...editingOrder, items: newItems});
//                             }} 
//                             className="w-14 bg-transparent text-xs font-black text-slate-900 focus:outline-none text-center" 
//                           />
//                         </div>
//                         <div className="w-px h-6 bg-slate-200"></div>
//                         <div className="flex flex-col px-2">
//                           <label className="text-[8px] font-black uppercase text-slate-400 text-center">Qty</label>
//                           <input 
//                             type="number" min="0" 
//                             value={i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0)} 
//                             onChange={(e) => {
//                               const newItems = [...editingOrder.items];
//                               const qty = parseInt(e.target.value) || 0;
//                               newItems[index] = { ...newItems[index], final_quantity: qty, estimated_quantity: qty };
//                               setEditingOrder({...editingOrder, items: newItems});
//                             }} 
//                             className="w-10 bg-transparent text-xs font-black text-slate-900 focus:outline-none text-center" 
//                           />
//                         </div>
//                         <button onClick={() => {
//                           const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                           setEditingOrder({ ...editingOrder, items: newItems });
//                         }} className="text-red-400 hover:text-red-600 p-2 ml-1"><MinusCircle size={14} /></button>
//                       </div>

//                     </div>
//                   ))}
//                 </div>

//                 <select className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary transition-colors cursor-pointer appearance-none" value="" onChange={(e) => {
//                     const [itemId, catId] = e.target.value.split('_').map(Number);
//                     if (editingOrder.items.some((oi: any) => oi.item_id === itemId && oi.service_category_id === catId)) {
//                       return toast.error("Already in order. Adjust quantity/price instead.");
//                     }
//                     const match = matrixOptions.find(o => o.item_id === itemId && o.service_category_id === catId);
//                     const newItem = { 
//                       item_id: itemId, service_category_id: catId, 
//                       final_quantity: 1, estimated_quantity: 1, 
//                       unit_price: match?.price, // Inherit base price dynamically
//                       item: { name: match?.item_name }, service_category: { name: match?.service_name }
//                     };
//                     setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                 }}>
//                   <option value="" disabled>+ Add custom service...</option>
//                   {matrixOptions.map((opt: any) => (
//                     <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                       {opt.item_name} - {opt.service_name} (AED {opt.price})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6">
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Pickup Logistics</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.pickup_date ? editingOrder.pickup_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.pickup_time || ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Expected Delivery</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.expected_delivery_date ? editingOrder.expected_delivery_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.expected_delivery_time || ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//               </div>

//               {/* SUBMIT BUTTON WITH PAYLOAD MAPPING */}
//               <button onClick={() => updateMutation.mutate({ 
//                   id: editingOrder.id, 
//                   data: { 
//                     ...editingOrder, 
//                     items: editingOrder.items.map((i: any) => ({ 
//                       item_id: i.item_id, 
//                       service_category_id: i.service_category_id, 
//                       final_quantity: i.final_quantity > 0 ? i.final_quantity : (i.estimated_quantity || 0),
//                       unit_price: i.unit_price // <-- Pushes custom price to backend
//                     })) 
//                   } 
//                 })} 
//                 disabled={updateMutation.isPending} 
//                 className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
//               >
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save All Changes & Recalculate"}
//               </button>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };
//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);
//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { 
//   Search, Loader2, Edit3, Package, X, MinusCircle, 
//   AlertCircle, Download, BarChart2, CalendarDays, 
//   Clock, StickyNote 
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';
// import * as XLSX from 'xlsx';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order fully updated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order.");
//     }
//   });

//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); 
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }
//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   const handleExportExcel = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");

//     // --- SHEET 1: ORDERS SUMMARY ---
//     const summaryData = filteredOrders.map((o: any) => ({
//       "Order Number": formatOrderId(o.id),
//       "Order Date": new Date(o.created_at).toLocaleDateString(),
//       "Customer Name": o.customer?.full_name || 'Guest',
//       "Mobile": o.customer?.mobile || 'N/A',
//       "Building": o.customer?.building_name || 'N/A',
//       "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//       "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
//       "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//       "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
//       "Total Amount": (o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price)).toFixed(2),
//       "Status": o.status,
//       "Hanger": o.hanger_needed ? "Yes" : "No",
//       "Remarks": o.notes || ""
//     }));

//     // --- SHEET 2: ITEMS BREAKDOWN (Now includes all Order Summary columns) ---
//     const itemsDetailData: any[] = [];
//     filteredOrders.forEach((o: any) => {
//       if (o.items && o.items.length > 0) {
//         o.items.forEach((item: any) => {
//           itemsDetailData.push({
//             "Order Number": formatOrderId(o.id),
//             "Order Date": new Date(o.created_at).toLocaleDateString(),
//             "Customer Name": o.customer?.full_name || 'Guest',
//             "Mobile": o.customer?.mobile || 'N/A',
//             "Building": o.customer?.building_name || 'N/A',
//             "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//             "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
//             "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//             "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
//             "Status": o.status,
//             "Hanger": o.hanger_needed ? "Yes" : "No",
//             "Remarks": o.notes || "",
//             // Item Specifics
//             "Item Name": item.item?.name || 'Unknown',
//             "Service": item.service_category?.name || 'Standard',
//             "Quantity": o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity),
//             "Item Unit Price": item.unit_price.toFixed(2)
//           });
//         });
//       }
//     });

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Orders Summary");
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsDetailData), "Items Breakdown");
//     XLSX.writeFile(wb, `Al_Nejoum_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
//     toast.success("Excel exported with matched columns!");
//   };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input type="text" placeholder="Search ID or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//             </div>
//             <button onClick={() => setIsReportMode(!isReportMode)} className={cn("px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border", isReportMode ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50")}>
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>
//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">From</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">To</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//             </div>
//             <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Download size={16} /> Export Excel</button>
//           </div>
//         )}
//       </header>

//       <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left whitespace-nowrap">
//             <thead className="bg-slate-50/50 border-b border-slate-100">
//               <tr>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                 <th className="p-6"></th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {filteredOrders.map((order: any) => (
//                 <tr key={order.id} className="hover:bg-slate-50/50 group">
//                   <td className="p-6 align-top">
//                     <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{formatSafeDate(order.created_at)}</p>
//                     {order.hanger_needed && (
//                       <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">HANGER REQ</span>
//                     )}
//                     {order.notes && (
//                       <div className="mt-2 flex items-start gap-1.5 text-brand-primary bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10 max-w-[200px]">
//                         <StickyNote size={12} className="shrink-0 mt-0.5" />
//                         <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{order.notes}</p>
//                       </div>
//                     )}
//                   </td>
//                   <td className="p-6 align-top">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Guest'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile}</p>
//                   </td>
//                   <td className="p-6 align-top">
//                     <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
//                       <p><span className="text-amber-500 uppercase">Pick:</span> {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}</p>
//                       <p><span className="text-emerald-500 uppercase">Drop:</span> {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} {order.expected_delivery_time ? `@ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}</p>
//                     </div>
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <p className="font-black text-slate-900 text-lg">AED {(order.final_price || order.estimated_price).toFixed(2)}</p>
//                     <StatusBadge status={order.status} />
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <button onClick={() => setEditingOrder(JSON.parse(JSON.stringify(order)))} className="p-3 bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm">
//                       <Edit3 size={16} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
//             </div>
//             <div className="p-6 space-y-6">
//               {editingOrder.notes && (
//                 <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-start gap-4">
//                   <StickyNote size={20} className="text-amber-600 shrink-0" />
//                   <p className="text-sm font-bold text-slate-900 leading-relaxed">{editingOrder.notes}</p>
//                 </div>
//               )}
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
//                   <select value={editingOrder.status} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="NEW_ORDER">New Order</option>
//                     <option value="PICKED_UP">Picked Up</option>
//                     <option value="DELIVERED">Delivered</option>
//                     <option value="CANCELLED">Cancelled</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Hanger</label>
//                   <select value={editingOrder.hanger_needed ? "true" : "false"} onChange={(e) => setEditingOrder({...editingOrder, hanger_needed: e.target.value === "true"})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="true">Yes</option><option value="false">No</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items Breakdown</p>
//                 <div className="space-y-2">
//                   {editingOrder.items?.map((i: any, index: number) => (
//                     <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
//                       <div className="flex flex-col">
//                         <span className="text-xs font-bold text-slate-700">{i.item?.name}</span>
//                         <span className="text-[9px] font-black text-brand-primary uppercase">{i.service_category?.name}</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <input type="number" min="0" value={i.final_quantity || i.estimated_quantity || 0} onChange={(e) => {
//                           const newItems = [...editingOrder.items];
//                           newItems[index] = { ...newItems[index], final_quantity: parseInt(e.target.value) || 0, estimated_quantity: parseInt(e.target.value) || 0 };
//                           setEditingOrder({...editingOrder, items: newItems});
//                         }} className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm border-none focus:ring-2 focus:ring-brand-primary" />
//                         <button onClick={() => {
//                           const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                           setEditingOrder({ ...editingOrder, items: newItems });
//                         }} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg"><MinusCircle size={16} /></button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 <select className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary transition-colors cursor-pointer appearance-none" value="" onChange={(e) => {
//                     const [itemId, catId] = e.target.value.split('_').map(Number);
//                     if (editingOrder.items.some((oi: any) => oi.item_id === itemId && oi.service_category_id === catId)) {
//                       return toast.error("Already in order. Increase quantity instead.");
//                     }
//                     const match = matrixOptions.find(o => o.item_id === itemId && o.service_category_id === catId);
//                     const newItem = { 
//                       item_id: itemId, service_category_id: catId, 
//                       final_quantity: 1, estimated_quantity: 1, 
//                       item: { name: match?.item_name }, service_category: { name: match?.service_name }
//                     };
//                     setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                 }}>
//                   <option value="" disabled>+ Add service to order...</option>
//                   {matrixOptions.map((opt: any) => (
//                     <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                       {opt.item_name} - {opt.service_name} (AED {opt.price})
//                     </option>
//                   ))}
//                 </select>
//               </div>
//               <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6">
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Pickup Logistics</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.pickup_date ? editingOrder.pickup_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.pickup_time || ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Expected Delivery</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.expected_delivery_date ? editingOrder.expected_delivery_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.expected_delivery_time || ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//               </div>
//               <button onClick={() => updateMutation.mutate({ id: editingOrder.id, data: { ...editingOrder, items: editingOrder.items.map((i: any) => ({ item_id: i.item_id, service_category_id: i.service_category_id, final_quantity: i.final_quantity || i.estimated_quantity || 0 })) } })} disabled={updateMutation.isPending} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70">
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save All Changes & Recalculate"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };
//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);
//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { 
//   Search, Loader2, Edit3, Package, X, MinusCircle, 
//   AlertCircle, Download, BarChart2, CalendarDays, 
//   Clock, StickyNote 
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';
// import * as XLSX from 'xlsx';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   // RESTORED: Matrix logic for adding new services
//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order fully updated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order.");
//     }
//   });

//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); 
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }
//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   const handleExportExcel = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");
//     const summaryData = filteredOrders.map((o: any) => ({
//       "Order Number": formatOrderId(o.id),
//       "Order Date": new Date(o.created_at).toLocaleDateString(),
//       "Customer Name": o.customer?.full_name || 'Guest',
//       "Mobile": o.customer?.mobile || 'N/A',
//       "Building": o.customer?.building_name || 'N/A',
//       "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//       "Pickup Window": o.pickup_time ? getPickupWindow(o.pickup_time) : 'N/A',
//       "Expected Delivery": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//       "Delivery Time": o.expected_delivery_time ? formatTimeTo12h(o.expected_delivery_time) : 'TBD',
//       "Total Amount": (o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price)).toFixed(2),
//       "Status": o.status,
//       "Hanger": o.hanger_needed ? "Yes" : "No",
//       "Remarks": o.notes || ""
//     }));
//     const itemsDetailData: any[] = [];
//     filteredOrders.forEach((o: any) => {
//       if (o.items && o.items.length > 0) {
//         o.items.forEach((item: any) => {
//           itemsDetailData.push({
//             "Order ID": formatOrderId(o.id),
//             "Customer": o.customer?.full_name || 'Guest',
//             "Pickup Date": o.pickup_date ? formatSafeDate(o.pickup_date, 'yyyy-MM-dd') : 'N/A',
//             "Delivery Date": o.expected_delivery_date ? formatSafeDate(o.expected_delivery_date, 'yyyy-MM-dd') : 'TBD',
//             "Item Name": item.item?.name || 'Unknown',
//             "Service": item.service_category?.name || 'Standard',
//             "Quantity": o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity),
//             "Price": item.unit_price.toFixed(2)
//           });
//         });
//       }
//     });
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Orders Summary");
//     XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsDetailData), "Items Breakdown");
//     XLSX.writeFile(wb, `Al_Nejoum_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
//   };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input type="text" placeholder="Search ID or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all" />
//             </div>
//             <button onClick={() => setIsReportMode(!isReportMode)} className={cn("px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border", isReportMode ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50")}>
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>
//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">From</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//               <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">To</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-6 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold color-scheme-dark border-none" /></div>
//             </div>
//             <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Download size={16} /> Export Excel</button>
//           </div>
//         )}
//       </header>

//       {/* DESKTOP TABLE */}
//       <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full text-left whitespace-nowrap">
//             <thead className="bg-slate-50/50 border-b border-slate-100">
//               <tr>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                 <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                 <th className="p-6"></th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-50">
//               {filteredOrders.map((order: any) => (
//                 <tr key={order.id} className="hover:bg-slate-50/50 group">
//                   <td className="p-6 align-top">
//                     <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{formatSafeDate(order.created_at)}</p>
                    
//                     {/* RESTORED: Hanger Indicator */}
//                     {order.hanger_needed && (
//                       <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">HANGER REQ</span>
//                     )}

//                     {order.notes && (
//                       <div className="mt-2 flex items-start gap-1.5 text-brand-primary bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10 max-w-[200px]">
//                         <StickyNote size={12} className="shrink-0 mt-0.5" />
//                         <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{order.notes}</p>
//                       </div>
//                     )}
//                   </td>
//                   <td className="p-6 align-top">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Guest'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile}</p>
//                   </td>
//                   <td className="p-6 align-top">
//                     <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
//                       <p><span className="text-amber-500 uppercase">Pick:</span> {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}</p>
//                       <p><span className="text-emerald-500 uppercase">Drop:</span> {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} {order.expected_delivery_time ? `@ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}</p>
//                     </div>
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <p className="font-black text-slate-900 text-lg">AED {(order.final_price || order.estimated_price).toFixed(2)}</p>
//                     <StatusBadge status={order.status} />
//                   </td>
//                   <td className="p-6 text-right align-top">
//                     <button onClick={() => setEditingOrder(JSON.parse(JSON.stringify(order)))} className="p-3 bg-slate-50 text-slate-400 hover:bg-brand-primary hover:text-white rounded-xl transition-all shadow-sm">
//                       <Edit3 size={16} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* MODAL: COMBINED ITEM MANAGEMENT + SCHEDULE + REMARKS */}
//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X size={20} /></button>
//             </div>

//             <div className="p-6 space-y-6">
//               {/* RESTORED: Remarks at Top */}
//               {editingOrder.notes && (
//                 <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-start gap-4">
//                   <StickyNote size={20} className="text-amber-600 shrink-0" />
//                   <p className="text-sm font-bold text-slate-900 leading-relaxed">{editingOrder.notes}</p>
//                 </div>
//               )}

//               {/* STATUS & HANGER */}
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Status</label>
//                   <select value={editingOrder.status} onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="NEW_ORDER">New Order</option>
//                     <option value="PICKED_UP">Picked Up</option>
//                     <option value="DELIVERED">Delivered</option>
//                     <option value="CANCELLED">Cancelled</option>
//                   </select>
//                 </div>
//                 <div className="space-y-1">
//                   <label className="text-[10px] font-black text-slate-400 uppercase">Hanger</label>
//                   <select value={editingOrder.hanger_needed ? "true" : "false"} onChange={(e) => setEditingOrder({...editingOrder, hanger_needed: e.target.value === "true"})} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm border-none focus:ring-2 focus:ring-brand-primary">
//                     <option value="true">Yes</option><option value="false">No</option>
//                   </select>
//                 </div>
//               </div>

//               {/* RESTORED: FULL ITEM EDITING & ADDING */}
//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Items Breakdown</p>
//                 <div className="space-y-2">
//                   {editingOrder.items?.map((i: any, index: number) => (
//                     <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
//                       <div className="flex flex-col">
//                         <span className="text-xs font-bold text-slate-700">{i.item?.name}</span>
//                         <span className="text-[9px] font-black text-brand-primary uppercase">{i.service_category?.name}</span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <input type="number" min="0" value={i.final_quantity || i.estimated_quantity || 0} onChange={(e) => {
//                           const newItems = [...editingOrder.items];
//                           newItems[index] = { ...newItems[index], final_quantity: parseInt(e.target.value) || 0, estimated_quantity: parseInt(e.target.value) || 0 };
//                           setEditingOrder({...editingOrder, items: newItems});
//                         }} className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm border-none focus:ring-2 focus:ring-brand-primary" />
//                         <button onClick={() => {
//                           const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                           setEditingOrder({ ...editingOrder, items: newItems });
//                         }} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg"><MinusCircle size={16} /></button>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 {/* ADD NEW SERVICE SELECT */}
//                 <select className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary transition-colors cursor-pointer appearance-none" value="" onChange={(e) => {
//                     const [itemId, catId] = e.target.value.split('_').map(Number);
//                     if (editingOrder.items.some((oi: any) => oi.item_id === itemId && oi.service_category_id === catId)) {
//                       return toast.error("Already in order. Increase quantity instead.");
//                     }
//                     const match = matrixOptions.find(o => o.item_id === itemId && o.service_category_id === catId);
//                     const newItem = { 
//                       item_id: itemId, service_category_id: catId, 
//                       final_quantity: 1, estimated_quantity: 1, 
//                       item: { name: match?.item_name }, service_category: { name: match?.service_name }
//                     };
//                     setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                 }}>
//                   <option value="" disabled>+ Add service to order...</option>
//                   {matrixOptions.map((opt: any) => (
//                     <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                       {opt.item_name} - {opt.service_name} (AED {opt.price})
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* SCHEDULE SECTION */}
//               <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white space-y-6">
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Pickup Logistics</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.pickup_date ? editingOrder.pickup_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.pickup_time || ''} onChange={(e) => setEditingOrder({...editingOrder, pickup_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//                 <div className="space-y-3">
//                   <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2"><Package size={12} /> Expected Delivery</h4>
//                   <div className="grid grid-cols-2 gap-3">
//                     <input type="date" value={editingOrder.expected_delivery_date ? editingOrder.expected_delivery_date.split('T')[0] : ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_date: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                     <input type="time" value={editingOrder.expected_delivery_time || ''} onChange={(e) => setEditingOrder({...editingOrder, expected_delivery_time: e.target.value})} className="bg-white/10 p-3 rounded-xl text-xs font-bold border-none color-scheme-dark" />
//                   </div>
//                 </div>
//               </div>

//               <button onClick={() => updateMutation.mutate({ id: editingOrder.id, data: { ...editingOrder, items: editingOrder.items.map((i: any) => ({ item_id: i.item_id, service_category_id: i.service_category_id, final_quantity: i.final_quantity || i.estimated_quantity || 0 })) } })} disabled={updateMutation.isPending} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70">
//                 {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save All Changes & Recalculate"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // ... Preserved Helper Functions: getPickupWindow, OrderManagementSkeleton, StatusBadge ...
// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };
//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);
//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { 
//   Search, Loader2, Edit3, Package, X, MinusCircle, 
//   AlertCircle, Download, BarChart2, CalendarDays, 
//   Clock, StickyNote // <-- Added StickyNote icon
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';
// import * as XLSX from 'xlsx';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
  
//   // Report Mode States
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//     refetchInterval: 15000, 
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order updated and financials recalculated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order. Check connection.");
//     }
//   });

//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); 
        
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }

//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   const handleExportExcel = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");

//     // --- SHEET 1: ORDERS SUMMARY (1 Row Per Order) ---
//     const summaryData = filteredOrders.map((o: any) => ({
//       "Order Number": formatOrderId(o.id),
//       "Order Date": new Date(o.created_at || o.pickup_date).toLocaleDateString(),
//       "Customer Name": o.customer?.full_name || 'Guest',
//       "Mobile Number": o.customer?.mobile || 'N/A',
//       "Building": o.customer?.building_name || 'N/A',
//       "Flat": o.customer?.flat_number || 'N/A',
//       "Total Amount (AED)": (o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price)).toFixed(2),
//       "Status": o.status,
//       "Hanger": o.hanger_needed ? "Yes" : "No",
//       "Remarks": o.notes || ""
//     }));

//     // --- SHEET 2: ITEMS BREAKDOWN (Detailed View) ---
//     const itemsDetailData: any[] = [];
//     filteredOrders.forEach((o: any) => {
//       if (o.items && o.items.length > 0) {
//         o.items.forEach((item: any) => {
//           itemsDetailData.push({
//             "Order ID": formatOrderId(o.id),
//             "Customer": o.customer?.full_name || 'Guest',
//             "Item Name": item.item?.name || 'Unknown',
//             "Service Type": item.service_category?.name || 'Standard',
//             "Quantity": o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity),
//             "Unit Price": item.unit_price.toFixed(2),
//             "Line Total": ( (o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity)) * item.unit_price ).toFixed(2)
//           });
//         });
//       }
//     });

//     // --- GENERATE EXCEL FILE ---
//     const wb = XLSX.utils.book_new();
    
//     // Create and append the Summary sheet
//     const wsSummary = XLSX.utils.json_to_sheet(summaryData);
//     XLSX.utils.book_append_sheet(wb, wsSummary, "Orders Summary");

//     // Create and append the Items Detail sheet
//     const wsDetails = XLSX.utils.json_to_sheet(itemsDetailData);
//     XLSX.utils.book_append_sheet(wb, wsDetails, "Items Breakdown");

//     // Export the file
//     XLSX.writeFile(wb, `Al_Nejoum_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    
//     toast.success("Excel report generated with 2 sheets!");
//   };

//   // const handleExportCSV = () => {
//   //   if (filteredOrders.length === 0) return toast.error("No data to export");
//   //   const headers = [
//   //     "Order Number", "Order Date", "Customer Name", "Mobile Number", 
//   //     "Building Name", "Flat Number",
//   //     "Item Name",     // New
//   //     "Service",       // New
//   //     "Qty",           // New
//   //     "Amount (AED)", "Status", "Hanger Needed", "Remarks"
//   //   ];
//   // const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

//   //   // UPDATED LOGIC: Create a row for every item in every order
//   //   const csvRows: string[] = [];

//   //   filteredOrders.forEach((o: any) => {
//   //     const orderDate = new Date(o.created_at || o.pickup_date).toLocaleDateString();
//   //     const displayPrice = o.status === 'NEW_ORDER' ? o.estimated_price : (o.final_price || o.estimated_price);

//   //     // If order has items, create a row for each item
//   //     if (o.items && o.items.length > 0) {
//   //       o.items.forEach((item: any) => {
//   //         const qty = o.status === 'NEW_ORDER' ? item.estimated_quantity : (item.final_quantity || item.estimated_quantity);
          
//   //         const row = [
//   //           formatOrderId(o.id),
//   //           orderDate,
//   //           o.customer?.full_name || 'Guest',
//   //           o.customer?.mobile || 'N/A',
//   //           o.customer?.building_name || 'N/A',
//   //           o.customer?.flat_number || 'N/A',
//   //           item.item?.name || 'Unknown Item',              // Item Name
//   //           item.service_category?.name || 'Standard',      // Service
//   //           qty,                                            // Qty
//   //           displayPrice?.toFixed(2) || '0.00',
//   //           o.status,
//   //           o.hanger_needed ? "Yes" : "No",
//   //           o.notes || ""
//   //         ];
//   //         csvRows.push(row.map(escapeCSV).join(','));
//   //       });
//   //     } else {
//   //       // Fallback: If no items, still show the order row
//   //       const row = [
//   //         formatOrderId(o.id),
//   //         orderDate,
//   //         o.customer?.full_name || 'Guest',
//   //         o.customer?.mobile || 'N/A',
//   //         o.customer?.building_name || 'N/A',
//   //         o.customer?.flat_number || 'N/A',
//   //         "N/A", "N/A", "0", // Item, Service, Qty placeholders
//   //         displayPrice?.toFixed(2) || '0.00',
//   //         o.status,
//   //         o.hanger_needed ? "Yes" : "No",
//   //         o.notes || ""
//   //       ];
//   //       csvRows.push(row.map(escapeCSV).join(','));
//   //     }
//   //   });

//   //   const csvContent = [headers.join(','), ...csvRows].join('\n');
//   //   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//   //   const link = document.createElement('a');
//   //   link.href = URL.createObjectURL(blob);
//   //   link.download = `Detailed_Orders_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
//   //   link.click();
//   // };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input 
//                 type="text"
//                 placeholder="Search ID or Customer..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             <button 
//               onClick={() => setIsReportMode(!isReportMode)}
//               className={cn(
//                 "px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border",
//                 isReportMode 
//                   ? "bg-brand-primary text-white border-brand-primary" 
//                   : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
//               )}
//             >
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>

//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4 animate-in fade-in slide-in-from-top-2">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">From Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">To Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//             </div>
//             <button onClick={handleExportExcel} className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm">
//               <Download size={16} /> Export CSV
//             </button>
//           </div>
//         )}
//       </header>

//       {filteredOrders.length === 0 ? (
//         <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100 shadow-sm">
//            <Package className="mx-auto text-slate-200 mb-4" size={56} />
//            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No Orders Found</p>
//         </div>
//       ) : (
//         <>
//           <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left whitespace-nowrap">
//                 <thead className="bg-slate-50/50 border-b border-slate-100">
//                   <tr>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Address</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                     <th className="p-6"></th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filteredOrders.map((order: any) => {
//                     const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
//                     return (
//                       <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
//                         <td className="p-6 align-top">
//                           <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
//                             {formatSafeDate(order.created_at || order.pickup_date)}
//                           </p>
                          
//                           {/* NEW: VISUAL REMARKS PREVIEW */}
//                           {order.notes && (
//                             <div className="mt-3 flex items-start gap-1.5 text-brand-primary bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/10 max-w-[200px]">
//                               <StickyNote size={12} className="shrink-0 mt-0.5" />
//                               <p className="text-[9px] font-black leading-tight uppercase tracking-tight">{order.notes}</p>
//                             </div>
//                           )}

//                           {order.hanger_needed && (
//                             <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
//                               HANGER REQ
//                             </span>
//                           )}
//                         </td>

//                         <td className="p-6 align-top">
//                           <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile || 'No Phone'}</p>
//                           {isReportMode && (
//                             <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
//                               {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                             </p>
//                           )}
//                         </td>

//                         <td className="p-6 align-top">
//                           <div className="flex flex-col gap-1.5">
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-amber-400"></span>
//                               <span className="w-8">Pick:</span> 
//                               {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}
//                             </p>
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
//                               <span className="w-8">Drop:</span> 
//                               {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} 
//                               {order.expected_delivery_time ? ` @ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}
//                             </p>
//                           </div>
//                         </td>

//                         <td className="p-6 align-top"><StatusBadge status={order.status} /></td>

//                         <td className="p-6 text-right align-top">
//                           <p className="font-black text-slate-900 text-lg">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
//                             {order.status === 'NEW_ORDER' ? 'Estimated' : 'Final'}
//                           </p>
//                         </td>

//                         <td className="p-6 text-right align-top">
//                           <button 
//                             onClick={() => {
//                               const orderCopy = JSON.parse(JSON.stringify(order));
//                               orderCopy.items = orderCopy.items || [];
//                               setEditingOrder(orderCopy);
//                             }}
//                             className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group-hover:bg-brand-primary group-hover:text-white"
//                           >
//                             <Edit3 size={16} />
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 gap-4 md:hidden">
//             {filteredOrders.map((order: any) => {
//               const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
//               return (
//                 <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
//                   <div className="flex justify-between items-start">
//                      <div className="flex flex-col gap-1">
//                        <span className="font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg text-xs w-max">{formatOrderId(order.id)}</span>
//                        {order.hanger_needed && <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Hanger Req.</span>}
//                      </div>
//                      <StatusBadge status={order.status} />
//                   </div>
                  
//                   {/* NEW: MOBILE REMARKS BLOCK */}
//                   {order.notes && (
//                     <div className="bg-brand-primary/5 border border-brand-primary/10 p-4 rounded-2xl flex items-start gap-3">
//                       <StickyNote className="text-brand-primary shrink-0" size={16} />
//                       <p className="text-[10px] font-black uppercase text-brand-primary leading-tight">{order.notes}</p>
//                     </div>
//                   )}

//                   <div className="bg-slate-50 p-4 rounded-2xl">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.customer?.mobile || 'No Phone'}</p>
//                     {isReportMode && (
//                       <p className="text-[10px] font-bold text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200">
//                         {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                       </p>
//                     )}
//                   </div>

//                   <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
//                      <div>
//                        <p className="text-[9px] font-black text-amber-500 uppercase">Pickup</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'}</p>
//                      </div>
//                      <div>
//                        <p className="text-[9px] font-black text-emerald-500 uppercase">Delivery</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'}</p>
//                      </div>
//                   </div>
                  
//                   <div className="flex justify-between items-center mt-1">
//                     <div>
//                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount ({order.status === 'NEW_ORDER' ? 'Est.' : 'Final'})</p>
//                       <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                     </div>
//                     <button
//                       onClick={() => {
//                         const orderCopy = JSON.parse(JSON.stringify(order));
//                         orderCopy.items = orderCopy.items || [];
//                         setEditingOrder(orderCopy);
//                       }}
//                       className="px-5 py-3 bg-slate-900 text-white hover:bg-brand-primary rounded-xl transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
//                     >
//                       <Edit3 size={14} /> Edit
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </>
//       )}

//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-0">
            
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
//                 <X size={20} className="text-slate-500" />
//               </button>
//             </div>

//             <div className="p-6 space-y-6">
              
//               {/* NEW: PROMINENT INSTRUCTION BOX IN MODAL */}
//               {editingOrder.notes && (
//                 <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
//                   <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm shrink-0">
//                     <StickyNote size={20} />
//                   </div>
//                   <div>
//                     <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Customer Remarks</p>
//                     <p className="text-sm font-bold text-slate-900 leading-relaxed">{editingOrder.notes}</p>
//                   </div>
//                 </div>
//               )}

//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Force Status</label>
//                 <select 
//                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 mt-1 focus:ring-2 focus:ring-brand-primary transition-all"
//                   value={editingOrder.status}
//                   onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
//                 >
//                   <option value="NEW_ORDER">New Order (Pending)</option>
//                   <option value="PICKED_UP">Picked Up (In Facility)</option>
//                   <option value="DELIVERED">Delivered (Completed)</option>
//                   <option value="CANCELLED">Cancelled</option>
//                 </select>
//               </div>

//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <div className="flex justify-between items-center">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Contents</p>
//                   <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
//                     <AlertCircle size={12}/> Affects Pricing
//                   </span>
//                 </div>
                
//                 <div className="space-y-2">
//                   {editingOrder.items.length === 0 ? (
//                     <p className="text-xs font-bold text-slate-400 text-center py-4">No items currently in order.</p>
//                   ) : (
//                     editingOrder.items.map((i: any, index: number) => {
//                       const displayQty = i.final_quantity || i.estimated_quantity || 0;
//                       const itemName = i.item?.name || 'Unknown Item';
//                       const categoryName = i.service_category?.name || 'Unknown Service';

//                       return (
//                         <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-brand-primary/20">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700">{itemName}</span>
//                             <span className="text-[10px] font-black text-brand-primary uppercase">{categoryName}</span>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <input 
//                               type="number" 
//                               min="0"
//                               value={displayQty === 0 ? '' : displayQty} 
//                               placeholder="0"
//                               onChange={(e) => {
//                                 const val = parseInt(e.target.value) || 0;
//                                 const newItems = [...editingOrder.items];
//                                 newItems[index] = { ...newItems[index], final_quantity: val, estimated_quantity: val };
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all"
//                             />
//                             <button 
//                               onClick={() => {
//                                 const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
//                             >
//                               <MinusCircle size={16} />
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>

//                 <div className="pt-2">
//                   <select 
//                     className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary/40 focus:border-brand-primary transition-colors cursor-pointer appearance-none"
//                     onChange={(e) => {
//                       const compositeKey = e.target.value;
//                       if (!compositeKey) return;
//                       const [itemIdStr, catIdStr] = compositeKey.split('_');
//                       const selectedItemId = parseInt(itemIdStr);
//                       const selectedCatId = parseInt(catIdStr);
//                       const matrixMatch = matrixOptions.find(o => 
//                         o.item_id === selectedItemId && o.service_category_id === selectedCatId
//                       );
//                       if (editingOrder.items.some((oi: any) => oi.item_id === selectedItemId && oi.service_category_id === selectedCatId)) {
//                         toast.error(`This exact service is already in the order. Please increase its quantity instead.`);
//                         return; 
//                       }
//                       const newItem = { 
//                         item_id: selectedItemId, 
//                         service_category_id: selectedCatId,
//                         final_quantity: 1, 
//                         estimated_quantity: 1, 
//                         item: { name: matrixMatch?.item_name },
//                         service_category: { name: matrixMatch?.service_name }
//                       };
//                       setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                     }}
//                     value=""
//                   >
//                     <option value="" disabled>+ Add service to order...</option>
//                     {matrixOptions.map((opt: any) => (
//                       <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                         {opt.item_name} - {opt.service_name} (AED {opt.price})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="pt-4">
//                 <button 
//                   onClick={() => {
//                     const payloadItems = editingOrder.items
//                       .map((i: any) => ({ 
//                         item_id: i.item_id, 
//                         service_category_id: i.service_category_id,
//                         final_quantity: i.final_quantity || i.estimated_quantity || 0 
//                       }))
//                       .filter((i: any) => i.final_quantity > 0); 

//                     updateMutation.mutate({ 
//                       id: editingOrder.id, 
//                       data: { 
//                         status: editingOrder.status,
//                         items: payloadItems
//                       } 
//                     });
//                   }}
//                   disabled={updateMutation.isPending}
//                   className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
//                 >
//                   {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save & Recalculate Price"}
//                 </button>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };
//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);
//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { Search, Loader2, Edit3, Package, X, MinusCircle, AlertCircle, Download, BarChart2, CalendarDays, Clock } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
  
//   // Report Mode States
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//     refetchInterval: 15000, // <-- NEW: Live background polling every 15 seconds
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order updated and financials recalculated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order. Check connection.");
//     }
//   });

//   // Combined Filter Logic (Search + Date Range)
//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       // 1. Text Search
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       // 2. Date Filter
//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); 
        
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }

//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   // Pure JS CSV Export Function
//   const handleExportCSV = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");

//     const headers = [
//       "Order Number", "Order Date", "Customer Name", "Mobile Number", 
//       "Building Name", "Flat Number", "Amount (AED)", "Status", "Hanger Needed"
//     ];

//     const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

//     const csvRows = filteredOrders.map((o: any) => {
//       const displayPrice = o.status === 'NEW_ORDER' ? o.estimated_price : o.final_price;
//       const orderDate = new Date(o.created_at || o.pickup_date).toLocaleDateString();

//       return [
//         formatOrderId(o.id),
//         orderDate,
//         o.customer?.full_name || 'Guest',
//         o.customer?.mobile || 'N/A',
//         o.customer?.building_name || 'N/A',
//         o.customer?.flat_number || 'N/A',
//         displayPrice?.toFixed(2) || '0.00',
//         o.status,
//         o.hanger_needed ? "Yes" : "No"
//       ].map(escapeCSV).join(',');
//     });

//     const csvContent = [headers.join(','), ...csvRows].join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `Orders_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
//     link.click();
//   };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input 
//                 type="text"
//                 placeholder="Search ID or Customer..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             <button 
//               onClick={() => setIsReportMode(!isReportMode)}
//               className={cn(
//                 "px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border",
//                 isReportMode 
//                   ? "bg-brand-primary text-white border-brand-primary" 
//                   : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
//               )}
//             >
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>

//         {/* REPORT MODE CONTROLS */}
//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4 animate-in fade-in slide-in-from-top-2">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">From Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">To Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//             </div>
            
//             <button 
//               onClick={handleExportCSV}
//               className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
//             >
//               <Download size={16} /> Export CSV
//             </button>
//           </div>
//         )}
//       </header>

//       {filteredOrders.length === 0 ? (
//         <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100 shadow-sm">
//            <Package className="mx-auto text-slate-200 mb-4" size={56} />
//            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No Orders Found</p>
//         </div>
//       ) : (
//         <>
//           {/* DESKTOP VIEW */}
//           <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left whitespace-nowrap">
//                 <thead className="bg-slate-50/50 border-b border-slate-100">
//                   <tr>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Address</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                     <th className="p-6"></th> {/* NEW: Always visible for the edit button */}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filteredOrders.map((order: any) => {
//                     const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
                    
//                     return (
//                       <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        
//                         <td className="p-6">
//                           <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
//                             {formatSafeDate(order.created_at || order.pickup_date)}
//                           </p>
//                           {order.hanger_needed && (
//                             <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
//                               HANGER REQ
//                             </span>
//                           )}
//                         </td>

//                         <td className="p-6">
//                           <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile || 'No Phone'}</p>
//                           {isReportMode && (
//                             <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
//                               {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                             </p>
//                           )}
//                         </td>

//                         <td className="p-6">
//                           <div className="flex flex-col gap-1.5">
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-amber-400"></span>
//                               <span className="w-8">Pick:</span> 
//                               {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}
//                             </p>
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
//                               <span className="w-8">Drop:</span> 
//                               {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} 
//                               {order.expected_delivery_time ? ` @ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}
//                             </p>
//                           </div>
//                         </td>

//                         <td className="p-6"><StatusBadge status={order.status} /></td>

//                         <td className="p-6 text-right">
//                           <p className="font-black text-slate-900 text-lg">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
//                             {order.status === 'NEW_ORDER' ? 'Estimated' : 'Final'}
//                           </p>
//                         </td>

//                         {/* NEW: Edit Action Always Available */}
//                         <td className="p-6 text-right">
//                           <button 
//                             onClick={() => {
//                               const orderCopy = JSON.parse(JSON.stringify(order));
//                               orderCopy.items = orderCopy.items || [];
//                               setEditingOrder(orderCopy);
//                             }}
//                             className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group-hover:bg-brand-primary group-hover:text-white"
//                           >
//                             <Edit3 size={16} />
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* MOBILE VIEW */}
//           <div className="grid grid-cols-1 gap-4 md:hidden">
//             {filteredOrders.map((order: any) => {
//               const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
              
//               return (
//                 <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
//                   <div className="flex justify-between items-start">
//                      <div className="flex flex-col gap-1">
//                        <span className="font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg text-xs w-max">{formatOrderId(order.id)}</span>
//                        {order.hanger_needed && <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Hanger Req.</span>}
//                      </div>
//                      <StatusBadge status={order.status} />
//                   </div>
                  
//                   <div className="bg-slate-50 p-4 rounded-2xl">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.customer?.mobile || 'No Phone'}</p>
//                     {isReportMode && (
//                       <p className="text-[10px] font-bold text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200">
//                         {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                       </p>
//                     )}
//                   </div>

//                   <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
//                      <div>
//                        <p className="text-[9px] font-black text-amber-500 uppercase">Pickup</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'}</p>
//                      </div>
//                      <div>
//                        <p className="text-[9px] font-black text-emerald-500 uppercase">Delivery</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'}</p>
//                      </div>
//                   </div>
                  
//                   <div className="flex justify-between items-center mt-1">
//                     <div>
//                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount ({order.status === 'NEW_ORDER' ? 'Est.' : 'Final'})</p>
//                       <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                     </div>
//                     {/* NEW: Edit Action Always Available on Mobile */}
//                     <button
//                       onClick={() => {
//                         const orderCopy = JSON.parse(JSON.stringify(order));
//                         orderCopy.items = orderCopy.items || [];
//                         setEditingOrder(orderCopy);
//                       }}
//                       className="px-5 py-3 bg-slate-900 text-white hover:bg-brand-primary rounded-xl transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
//                     >
//                       <Edit3 size={14} /> Edit
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </>
//       )}

//       {/* GOD MODE EDIT MODAL (Unchanged and Safely Preserved) */}
//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-0">
            
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
//                 <X size={20} className="text-slate-500" />
//               </button>
//             </div>

//             <div className="p-6 space-y-6">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Force Status</label>
//                 <select 
//                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 mt-1 focus:ring-2 focus:ring-brand-primary transition-all"
//                   value={editingOrder.status}
//                   onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
//                 >
//                   <option value="NEW_ORDER">New Order (Pending)</option>
//                   <option value="PICKED_UP">Picked Up (In Facility)</option>
//                   <option value="DELIVERED">Delivered (Completed)</option>
//                   <option value="CANCELLED">Cancelled</option>
//                 </select>
//               </div>

//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <div className="flex justify-between items-center">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Contents</p>
//                   <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
//                     <AlertCircle size={12}/> Affects Pricing
//                   </span>
//                 </div>
                
//                 <div className="space-y-2">
//                   {editingOrder.items.length === 0 ? (
//                     <p className="text-xs font-bold text-slate-400 text-center py-4">No items currently in order.</p>
//                   ) : (
//                     editingOrder.items.map((i: any, index: number) => {
//                       const displayQty = i.final_quantity || i.estimated_quantity || 0;
//                       const itemName = i.item?.name || 'Unknown Item';
//                       const categoryName = i.service_category?.name || 'Unknown Service';

//                       return (
//                         <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-brand-primary/20">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700">{itemName}</span>
//                             <span className="text-[10px] font-black text-brand-primary uppercase">{categoryName}</span>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <input 
//                               type="number" 
//                               min="0"
//                               value={displayQty === 0 ? '' : displayQty} 
//                               placeholder="0"
//                               onChange={(e) => {
//                                 const val = parseInt(e.target.value) || 0;
//                                 const newItems = [...editingOrder.items];
//                                 newItems[index] = { ...newItems[index], final_quantity: val, estimated_quantity: val };
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all"
//                             />
//                             <button 
//                               onClick={() => {
//                                 const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
//                             >
//                               <MinusCircle size={16} />
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>

//                 <div className="pt-2">
//                   <select 
//                     className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary/40 focus:border-brand-primary transition-colors cursor-pointer appearance-none"
//                     onChange={(e) => {
//                       const compositeKey = e.target.value;
//                       if (!compositeKey) return;
                      
//                       const [itemIdStr, catIdStr] = compositeKey.split('_');
//                       const selectedItemId = parseInt(itemIdStr);
//                       const selectedCatId = parseInt(catIdStr);

//                       const matrixMatch = matrixOptions.find(o => 
//                         o.item_id === selectedItemId && o.service_category_id === selectedCatId
//                       );
                      
//                       if (editingOrder.items.some((oi: any) => oi.item_id === selectedItemId && oi.service_category_id === selectedCatId)) {
//                         toast.error(`This exact service is already in the order. Please increase its quantity instead.`);
//                         return; 
//                       }
                      
//                       const newItem = { 
//                         item_id: selectedItemId, 
//                         service_category_id: selectedCatId,
//                         final_quantity: 1, 
//                         estimated_quantity: 1, 
//                         item: { name: matrixMatch?.item_name },
//                         service_category: { name: matrixMatch?.service_name }
//                       };
                      
//                       setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                     }}
//                     value=""
//                   >
//                     <option value="" disabled>+ Add service to order...</option>
//                     {matrixOptions.map((opt: any) => (
//                       <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                         {opt.item_name} - {opt.service_name} (AED {opt.price})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="pt-4">
//                 <button 
//                   onClick={() => {
//                     const payloadItems = editingOrder.items
//                       .map((i: any) => ({ 
//                         item_id: i.item_id, 
//                         service_category_id: i.service_category_id,
//                         final_quantity: i.final_quantity || i.estimated_quantity || 0 
//                       }))
//                       .filter((i: any) => i.final_quantity > 0); 

//                     updateMutation.mutate({ 
//                       id: editingOrder.id, 
//                       data: { 
//                         status: editingOrder.status,
//                         items: payloadItems
//                       } 
//                     });
//                   }}
//                   disabled={updateMutation.isPending}
//                   className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
//                 >
//                   {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save & Recalculate Price"}
//                 </button>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // --- Helper Functions Preserved ---

// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
    
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };

//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);

//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };

// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId, formatSafeDate, formatTimeTo12h } from '@/utils/formatters';
// import { Search, Loader2, Edit3, Package, X, MinusCircle, AlertCircle, Download, BarChart2, CalendarDays, Clock } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
  
//   // NEW: Report Mode States
//   const [isReportMode, setIsReportMode] = useState(false);
//   const [dateRange, setDateRange] = useState({ from: '', to: '' });

//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order updated and financials recalculated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order. Check connection.");
//     }
//   });

//   // UPDATED: Combined Filter Logic (Search + Date Range)
//   const filteredOrders = useMemo(() => {
//     return orders.filter((o: any) => {
//       // 1. Text Search
//       const searchLower = search.toLowerCase();
//       const customerName = o.customer?.full_name?.toLowerCase() || '';
//       const orderIdStr = o.id?.toString() || '';
//       const matchesSearch = customerName.includes(searchLower) || orderIdStr.includes(searchLower);

//       // 2. Date Filter (Only apply if in report mode and dates are selected)
//       let matchesDate = true;
//       if (isReportMode && (dateRange.from || dateRange.to)) {
//         const orderDate = new Date(o.created_at || o.pickup_date);
//         orderDate.setHours(0, 0, 0, 0); // Normalize time for accurate day comparison
        
//         if (dateRange.from) {
//           const fromDate = new Date(dateRange.from);
//           fromDate.setHours(0, 0, 0, 0);
//           if (orderDate < fromDate) matchesDate = false;
//         }
//         if (dateRange.to) {
//           const toDate = new Date(dateRange.to);
//           toDate.setHours(0, 0, 0, 0);
//           if (orderDate > toDate) matchesDate = false;
//         }
//       }

//       return matchesSearch && matchesDate;
//     });
//   }, [orders, search, isReportMode, dateRange]);

//   // NEW: Pure JS CSV Export Function
//   const handleExportCSV = () => {
//     if (filteredOrders.length === 0) return toast.error("No data to export");

//     const headers = [
//       "Order Number", "Order Date", "Customer Name", "Mobile Number", 
//       "Building Name", "Flat Number", "Amount (AED)", "Status", "Hanger Needed"
//     ];

//     const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

//     const csvRows = filteredOrders.map((o: any) => {
//       const displayPrice = o.status === 'NEW_ORDER' ? o.estimated_price : o.final_price;
//       const orderDate = new Date(o.created_at || o.pickup_date).toLocaleDateString();

//       return [
//         formatOrderId(o.id),
//         orderDate,
//         o.customer?.full_name || 'Guest',
//         o.customer?.mobile || 'N/A',
//         o.customer?.building_name || 'N/A',
//         o.customer?.flat_number || 'N/A',
//         displayPrice?.toFixed(2) || '0.00',
//         o.status,
//         o.hanger_needed ? "Yes" : "No"
//       ].map(escapeCSV).join(',');
//     });

//     const csvContent = [headers.join(','), ...csvRows].join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `Orders_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
//     link.click();
//   };

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col gap-6">
//         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//           <div>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//             <p className="text-slate-500 font-medium">Manage and analyze all customer transactions.</p>
//           </div>
//           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
//             <div className="relative group flex-1 md:w-80">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//               <input 
//                 type="text"
//                 placeholder="Search ID or Customer..."
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//               />
//             </div>
//             {/* Toggle Report Mode Button */}
//             <button 
//               onClick={() => setIsReportMode(!isReportMode)}
//               className={cn(
//                 "px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm border",
//                 isReportMode 
//                   ? "bg-brand-primary text-white border-brand-primary" 
//                   : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
//               )}
//             >
//               <BarChart2 size={18} /> {isReportMode ? "Exit Report" : "Analytics"}
//             </button>
//           </div>
//         </div>

//         {/* REPORT MODE CONTROLS */}
//         {isReportMode && (
//           <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-end justify-between gap-4 animate-in fade-in slide-in-from-top-2">
//             <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">From Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//               <div>
//                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">To Date</label>
//                 <div className="relative">
//                   <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                   <input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="pl-12 pr-4 py-3 bg-white/10 text-white rounded-xl font-bold border border-white/10 outline-none focus:border-brand-primary color-scheme-dark w-full md:w-48" />
//                 </div>
//               </div>
//             </div>
            
//             <button 
//               onClick={handleExportCSV}
//               className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
//             >
//               <Download size={16} /> Export CSV
//             </button>
//           </div>
//         )}
//       </header>

//       {filteredOrders.length === 0 ? (
//         <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100 shadow-sm">
//            <Package className="mx-auto text-slate-200 mb-4" size={56} />
//            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No Orders Found</p>
//         </div>
//       ) : (
//         <>
//           {/* DESKTOP VIEW */}
//           <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left whitespace-nowrap">
//                 <thead className="bg-slate-50/50 border-b border-slate-100">
//                   <tr>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Info</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer & Address</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
//                     {!isReportMode && <th className="p-6"></th>}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filteredOrders.map((order: any) => {
//                     // PRICING FIX: Accurate Final Price Logic
//                     const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
                    
//                     return (
//                       <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        
//                         {/* 1. Order Info */}
//                         <td className="p-6">
//                           <p className="font-black text-slate-900">{formatOrderId(order.id)}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
//                             {formatSafeDate(order.created_at || order.pickup_date)}
//                           </p>
//                           {order.hanger_needed && (
//                             <span className="inline-block mt-2 text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
//                               HANGER REQ
//                             </span>
//                           )}
//                         </td>

//                         {/* 2. Customer Detail (Expands dynamically in report mode) */}
//                         <td className="p-6">
//                           <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile || 'No Phone'}</p>
//                           {isReportMode && (
//                             <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
//                               {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                             </p>
//                           )}
//                         </td>

//                         {/* 3. Schedule (Pickup & Delivery Times added) */}
//                         <td className="p-6">
//                           <div className="flex flex-col gap-1.5">
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-amber-400"></span>
//                               <span className="w-8">Pick:</span> 
//                               {order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'} @ {order.pickup_time ? getPickupWindow(order.pickup_time) : 'N/A'}
//                             </p>
//                             <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
//                               <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
//                               <span className="w-8">Drop:</span> 
//                               {order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'} 
//                               {order.expected_delivery_time ? ` @ ${formatTimeTo12h(order.expected_delivery_time)}` : ''}
//                             </p>
//                           </div>
//                         </td>

//                         {/* 4. Status */}
//                         <td className="p-6"><StatusBadge status={order.status} /></td>

//                         {/* 5. Amount (FIXED to show correct final price) */}
//                         <td className="p-6 text-right">
//                           <p className="font-black text-slate-900 text-lg">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
//                             {order.status === 'NEW_ORDER' ? 'Estimated' : 'Final'}
//                           </p>
//                         </td>

//                         {/* 6. Edit Action (Hidden in report mode to keep view clean) */}
//                         {!isReportMode && (
//                           <td className="p-6 text-right">
//                             <button 
//                               onClick={() => {
//                                 const orderCopy = JSON.parse(JSON.stringify(order));
//                                 orderCopy.items = orderCopy.items || [];
//                                 setEditingOrder(orderCopy);
//                               }}
//                               className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group-hover:bg-brand-primary group-hover:text-white"
//                             >
//                               <Edit3 size={16} />
//                             </button>
//                           </td>
//                         )}
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* MOBILE VIEW */}
//           <div className="grid grid-cols-1 gap-4 md:hidden">
//             {filteredOrders.map((order: any) => {
//               const displayPrice = order.status === 'NEW_ORDER' ? order.estimated_price : (order.final_price || order.estimated_price);
              
//               return (
//                 <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
//                   <div className="flex justify-between items-start">
//                      <div className="flex flex-col gap-1">
//                        <span className="font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg text-xs w-max">{formatOrderId(order.id)}</span>
//                        {order.hanger_needed && <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Hanger Req.</span>}
//                      </div>
//                      <StatusBadge status={order.status} />
//                   </div>
                  
//                   <div className="bg-slate-50 p-4 rounded-2xl">
//                     <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                     <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.customer?.mobile || 'No Phone'}</p>
//                     {isReportMode && (
//                       <p className="text-[10px] font-bold text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200">
//                         {order.customer?.building_name || 'N/A'}, Flat {order.customer?.flat_number || 'N/A'}
//                       </p>
//                     )}
//                   </div>

//                   <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
//                      <div>
//                        <p className="text-[9px] font-black text-amber-500 uppercase">Pickup</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.pickup_date ? formatSafeDate(order.pickup_date, 'MMM dd') : 'N/A'}</p>
//                      </div>
//                      <div>
//                        <p className="text-[9px] font-black text-emerald-500 uppercase">Delivery</p>
//                        <p className="text-[10px] font-bold text-slate-700">{order.expected_delivery_date ? formatSafeDate(order.expected_delivery_date, 'MMM dd') : 'TBD'}</p>
//                      </div>
//                   </div>
                  
//                   <div className="flex justify-between items-center mt-1">
//                     <div>
//                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount ({order.status === 'NEW_ORDER' ? 'Est.' : 'Final'})</p>
//                       <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">AED {displayPrice?.toFixed(2) || '0.00'}</p>
//                     </div>
//                     {!isReportMode && (
//                       <button
//                         onClick={() => {
//                           const orderCopy = JSON.parse(JSON.stringify(order));
//                           orderCopy.items = orderCopy.items || [];
//                           setEditingOrder(orderCopy);
//                         }}
//                         className="px-5 py-3 bg-slate-900 text-white hover:bg-brand-primary rounded-xl transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
//                       >
//                         <Edit3 size={14} /> Edit
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </>
//       )}

//       {/* GOD MODE EDIT MODAL (Unchanged and Safely Preserved) */}
//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-0">
            
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
//                 <X size={20} className="text-slate-500" />
//               </button>
//             </div>

//             <div className="p-6 space-y-6">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Force Status</label>
//                 <select 
//                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 mt-1 focus:ring-2 focus:ring-brand-primary transition-all"
//                   value={editingOrder.status}
//                   onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
//                 >
//                   <option value="NEW_ORDER">New Order (Pending)</option>
//                   <option value="PICKED_UP">Picked Up (In Facility)</option>
//                   <option value="DELIVERED">Delivered (Completed)</option>
//                   <option value="CANCELLED">Cancelled</option>
//                 </select>
//               </div>

//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <div className="flex justify-between items-center">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Contents</p>
//                   <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
//                     <AlertCircle size={12}/> Affects Pricing
//                   </span>
//                 </div>
                
//                 <div className="space-y-2">
//                   {editingOrder.items.length === 0 ? (
//                     <p className="text-xs font-bold text-slate-400 text-center py-4">No items currently in order.</p>
//                   ) : (
//                     editingOrder.items.map((i: any, index: number) => {
//                       const displayQty = i.final_quantity || i.estimated_quantity || 0;
//                       const itemName = i.item?.name || 'Unknown Item';
//                       const categoryName = i.service_category?.name || 'Unknown Service';

//                       return (
//                         <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-brand-primary/20">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700">{itemName}</span>
//                             <span className="text-[10px] font-black text-brand-primary uppercase">{categoryName}</span>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <input 
//                               type="number" 
//                               min="0"
//                               value={displayQty === 0 ? '' : displayQty} 
//                               placeholder="0"
//                               onChange={(e) => {
//                                 const val = parseInt(e.target.value) || 0;
//                                 const newItems = [...editingOrder.items];
//                                 newItems[index] = { ...newItems[index], final_quantity: val, estimated_quantity: val };
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all"
//                             />
//                             <button 
//                               onClick={() => {
//                                 const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
//                             >
//                               <MinusCircle size={16} />
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>

//                 <div className="pt-2">
//                   <select 
//                     className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary/40 focus:border-brand-primary transition-colors cursor-pointer appearance-none"
//                     onChange={(e) => {
//                       const compositeKey = e.target.value;
//                       if (!compositeKey) return;
                      
//                       const [itemIdStr, catIdStr] = compositeKey.split('_');
//                       const selectedItemId = parseInt(itemIdStr);
//                       const selectedCatId = parseInt(catIdStr);

//                       const matrixMatch = matrixOptions.find(o => 
//                         o.item_id === selectedItemId && o.service_category_id === selectedCatId
//                       );
                      
//                       if (editingOrder.items.some((oi: any) => oi.item_id === selectedItemId && oi.service_category_id === selectedCatId)) {
//                         toast.error(`This exact service is already in the order. Please increase its quantity instead.`);
//                         return; 
//                       }
                      
//                       const newItem = { 
//                         item_id: selectedItemId, 
//                         service_category_id: selectedCatId,
//                         final_quantity: 1, 
//                         estimated_quantity: 1, 
//                         item: { name: matrixMatch?.item_name },
//                         service_category: { name: matrixMatch?.service_name }
//                       };
                      
//                       setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                     }}
//                     value=""
//                   >
//                     <option value="" disabled>+ Add service to order...</option>
//                     {matrixOptions.map((opt: any) => (
//                       <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                         {opt.item_name} - {opt.service_name} (AED {opt.price})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="pt-4">
//                 <button 
//                   onClick={() => {
//                     const payloadItems = editingOrder.items
//                       .map((i: any) => ({ 
//                         item_id: i.item_id, 
//                         service_category_id: i.service_category_id,
//                         final_quantity: i.final_quantity || i.estimated_quantity || 0 
//                       }))
//                       .filter((i: any) => i.final_quantity > 0); 

//                     updateMutation.mutate({ 
//                       id: editingOrder.id, 
//                       data: { 
//                         status: editingOrder.status,
//                         items: payloadItems
//                       } 
//                     });
//                   }}
//                   disabled={updateMutation.isPending}
//                   className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
//                 >
//                   {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save & Recalculate Price"}
//                 </button>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // --- Helper Functions Preserved ---

// // Re-using the time window formatter from OrderDetails for consistency
// const getPickupWindow = (timeStr?: string) => {
//   if (!timeStr) return "Pending";
//   try {
//     const [hourStr, minStr] = timeStr.split(':');
//     const hour = parseInt(hourStr, 10);
//     const min = parseInt(minStr, 10);
    
//     const formatAMPM = (h: number, m: number) => {
//       const ampm = h >= 12 ? 'PM' : 'AM';
//       const displayH = h % 12 || 12;
//       const displayM = m < 10 ? `0${m}` : m;
//       return `${displayH}:${displayM} ${ampm}`;
//     };

//     const startTime = formatAMPM(hour, min);
//     const endHour = (hour + 1) % 24;
//     const endTime = formatAMPM(endHour, min);

//     return `${startTime} - ${endTime}`;
//   } catch (e) {
//     return timeStr; 
//   }
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };
// // src/features/admin/pages/OrderManagement.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminService } from '../api/admin.service';
// import { formatOrderId } from '@/utils/formatters';
// import { Search, Loader2, Edit3, Package, X, MinusCircle, AlertCircle } from 'lucide-react';
// import { toast } from 'sonner';
// import { cn } from '@/utils/cn';

// export const OrderManagement = () => {
//   const [search, setSearch] = useState('');
//   const [editingOrder, setEditingOrder] = useState<any>(null); 
//   const queryClient = useQueryClient();

//   const { data: orders = [], isLoading } = useQuery({
//     queryKey: ['adminAllOrders'],
//     queryFn: adminService.getAllOrders,
//   });

//   const { data: masterItems = [] } = useQuery({
//     queryKey: ['serviceItems'],
//     queryFn: adminService.getItems,
//     enabled: !!editingOrder, 
//   });

//   // FLATTEN MASTER ITEMS FOR THE MATRIX DROPDOWN
//   const matrixOptions = useMemo(() => {
//     const options: any[] = [];
//     masterItems.forEach((item: any) => {
//       item.services?.forEach((svc: any) => {
//         options.push({
//           item_id: item.id,
//           item_name: item.name,
//           service_category_id: svc.service_category_id,
//           service_name: svc.category?.name || "Service",
//           price: svc.price
//         });
//       });
//     });
//     return options;
//   }, [masterItems]);

//   const updateMutation = useMutation({
//     mutationFn: ({ id, data }: { id: number, data: any }) => adminService.adminUpdateOrder(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['adminAllOrders'] });
//       toast.success("Order updated and financials recalculated!");
//       setEditingOrder(null);
//     },
//     onError: (err: any) => {
//       toast.error(err.response?.data?.detail || "Failed to update order. Check connection.");
//     }
//   });

//   const filteredOrders = orders.filter((o: any) => {
//     const searchLower = search.toLowerCase();
//     const customerName = o.customer?.full_name?.toLowerCase() || '';
//     const orderIdStr = o.id?.toString() || '';
//     return customerName.includes(searchLower) || orderIdStr.includes(searchLower);
//   });

//   if (isLoading) return <OrderManagementSkeleton />;

//   return (
//     <div className="space-y-8 pb-20 relative">
//       <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
//         <div>
//           <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Order Vault</h1>
//           <p className="text-slate-500 font-medium">Manage all customer transactions.</p>
//         </div>
//         <div className="relative w-full md:w-80 group">
//           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//           <input 
//             type="text"
//             placeholder="Search by ID or Customer..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-brand-primary outline-none transition-all"
//           />
//         </div>
//       </header>

//       {filteredOrders.length === 0 ? (
//         <div className="bg-white rounded-[3rem] py-24 text-center border-2 border-dashed border-slate-100 shadow-sm">
//            <Package className="mx-auto text-slate-200 mb-4" size={56} />
//            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No Orders Found</p>
//         </div>
//       ) : (
//         <>
//           {/* DESKTOP VIEW */}
//           <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-left whitespace-nowrap">
//                 <thead className="bg-slate-50/50 border-b border-slate-100">
//                   <tr>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
//                     <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Amount</th>
//                     <th className="p-6"></th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-50">
//                   {filteredOrders.map((order: any) => (
//                     <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
//                       <td className="p-6 font-black text-slate-400">{formatOrderId(order.id)}</td>
//                       <td className="p-6">
//                         <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                         <p className="text-[10px] font-bold text-slate-400 uppercase">{order.customer?.mobile || 'No Phone'}</p>
//                       </td>
//                       <td className="p-6"><StatusBadge status={order.status} /></td>
//                       <td className="p-6 font-black text-slate-900">AED {order.estimated_price?.toFixed(2) || '0.00'}</td>
//                       <td className="p-6 text-right">
//                         <button 
//                           onClick={() => {
//                             const orderCopy = JSON.parse(JSON.stringify(order));
//                             orderCopy.items = orderCopy.items || [];
//                             setEditingOrder(orderCopy);
//                           }}
//                           className="p-3 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group-hover:bg-brand-primary group-hover:text-white"
//                         >
//                           <Edit3 size={16} />
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* MOBILE VIEW */}
//           <div className="grid grid-cols-1 gap-4 md:hidden">
//             {filteredOrders.map((order: any) => (
//               <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
//                 <div className="flex justify-between items-start">
//                    <span className="font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg text-xs">{formatOrderId(order.id)}</span>
//                    <StatusBadge status={order.status} />
//                 </div>
                
//                 <div className="bg-slate-50 p-4 rounded-2xl">
//                   <p className="font-bold text-slate-900">{order.customer?.full_name || 'Unknown User'}</p>
//                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{order.customer?.mobile || 'No Phone'}</p>
//                 </div>
                
//                 <div className="flex justify-between items-center mt-1">
//                   <div>
//                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Est. Amount</p>
//                     <p className="font-black text-slate-900 text-lg leading-tight mt-0.5">AED {order.estimated_price?.toFixed(2) || '0.00'}</p>
//                   </div>
//                   <button
//                     onClick={() => {
//                       const orderCopy = JSON.parse(JSON.stringify(order));
//                       orderCopy.items = orderCopy.items || [];
//                       setEditingOrder(orderCopy);
//                     }}
//                     className="px-5 py-3 bg-slate-900 text-white hover:bg-brand-primary rounded-xl transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
//                   >
//                     <Edit3 size={14} /> Edit
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </>
//       )}

//       {/* GOD MODE EDIT MODAL */}
//       {editingOrder && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
//           <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl space-y-0">
            
//             <div className="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
//               <div>
//                 <h3 className="text-xl font-black text-slate-900">Modify Order</h3>
//                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{formatOrderId(editingOrder.id)}</p>
//               </div>
//               <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
//                 <X size={20} className="text-slate-500" />
//               </button>
//             </div>

//             <div className="p-6 space-y-6">
//               <div>
//                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Force Status</label>
//                 <select 
//                   className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border border-slate-100 mt-1 focus:ring-2 focus:ring-brand-primary transition-all"
//                   value={editingOrder.status}
//                   onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
//                 >
//                   <option value="NEW_ORDER">New Order (Pending)</option>
//                   <option value="PICKED_UP">Picked Up (In Facility)</option>
//                   <option value="DELIVERED">Delivered (Completed)</option>
//                   <option value="CANCELLED">Cancelled</option>
//                 </select>
//               </div>

//               <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 space-y-4">
//                 <div className="flex justify-between items-center">
//                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Contents</p>
//                   <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
//                     <AlertCircle size={12}/> Affects Pricing
//                   </span>
//                 </div>
                
//                 <div className="space-y-2">
//                   {editingOrder.items.length === 0 ? (
//                     <p className="text-xs font-bold text-slate-400 text-center py-4">No items currently in order.</p>
//                   ) : (
//                     editingOrder.items.map((i: any, index: number) => {
//                       const displayQty = i.final_quantity || i.estimated_quantity || 0;
//                       // Display Name combines Item + Category
//                       const itemName = i.item?.name || 'Unknown Item';
//                       const categoryName = i.service_category?.name || 'Unknown Service';

//                       return (
//                         <div key={index} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-brand-primary/20">
//                           <div className="flex flex-col">
//                             <span className="text-xs font-bold text-slate-700">{itemName}</span>
//                             <span className="text-[10px] font-black text-brand-primary uppercase">{categoryName}</span>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <input 
//                               type="number" 
//                               min="0"
//                               value={displayQty === 0 ? '' : displayQty} 
//                               placeholder="0"
//                               onChange={(e) => {
//                                 const val = parseInt(e.target.value) || 0;
//                                 const newItems = [...editingOrder.items];
//                                 newItems[index] = { ...newItems[index], final_quantity: val, estimated_quantity: val };
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-sm outline-none focus:ring-2 focus:ring-brand-primary transition-all"
//                             />
//                             <button 
//                               onClick={() => {
//                                 const newItems = editingOrder.items.filter((_: any, idx: number) => idx !== index);
//                                 setEditingOrder({ ...editingOrder, items: newItems });
//                               }}
//                               className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
//                             >
//                               <MinusCircle size={16} />
//                             </button>
//                           </div>
//                         </div>
//                       );
//                     })
//                   )}
//                 </div>

//                 <div className="pt-2">
//                   <select 
//                     className="w-full p-4 rounded-xl border-2 border-dashed border-slate-200 bg-white text-xs font-bold text-slate-500 outline-none hover:border-brand-primary/40 focus:border-brand-primary transition-colors cursor-pointer appearance-none"
//                     onChange={(e) => {
//                       const compositeKey = e.target.value;
//                       if (!compositeKey) return;
                      
//                       const [itemIdStr, catIdStr] = compositeKey.split('_');
//                       const selectedItemId = parseInt(itemIdStr);
//                       const selectedCatId = parseInt(catIdStr);

//                       // Find the exact matrix option
//                       const matrixMatch = matrixOptions.find(o => 
//                         o.item_id === selectedItemId && o.service_category_id === selectedCatId
//                       );
                      
//                       // Check for duplicates
//                       if (editingOrder.items.some((oi: any) => oi.item_id === selectedItemId && oi.service_category_id === selectedCatId)) {
//                         toast.error(`This exact service is already in the order. Please increase its quantity instead.`);
//                         return; 
//                       }
                      
//                       // Add new item with UI display mocks
//                       const newItem = { 
//                         item_id: selectedItemId, 
//                         service_category_id: selectedCatId,
//                         final_quantity: 1, 
//                         estimated_quantity: 1, 
//                         item: { name: matrixMatch?.item_name },
//                         service_category: { name: matrixMatch?.service_name }
//                       };
                      
//                       setEditingOrder({ ...editingOrder, items: [...editingOrder.items, newItem] });
//                     }}
//                     value=""
//                   >
//                     <option value="" disabled>+ Add service to order...</option>
//                     {matrixOptions.map((opt: any) => (
//                       <option key={`${opt.item_id}_${opt.service_category_id}`} value={`${opt.item_id}_${opt.service_category_id}`}>
//                         {opt.item_name} - {opt.service_name} (AED {opt.price})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="pt-4">
//                 <button 
//                   onClick={() => {
//                     // UPDATED PAYLOAD: Strictly enforce service_category_id
//                     const payloadItems = editingOrder.items
//                       .map((i: any) => ({ 
//                         item_id: i.item_id, 
//                         service_category_id: i.service_category_id,
//                         final_quantity: i.final_quantity || i.estimated_quantity || 0 
//                       }))
//                       .filter((i: any) => i.final_quantity > 0); 

//                     updateMutation.mutate({ 
//                       id: editingOrder.id, 
//                       data: { 
//                         status: editingOrder.status,
//                         items: payloadItems
//                       } 
//                     });
//                   }}
//                   disabled={updateMutation.isPending}
//                   className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
//                 >
//                   {updateMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : "Save & Recalculate Price"}
//                 </button>
//               </div>

//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const OrderManagementSkeleton = () => (
//   <div className="space-y-8 animate-pulse p-4">
//     <div className="h-12 w-48 bg-slate-100 rounded-xl" />
//     <div className="space-y-4">
//       {[1, 2, 3, 4].map(i => (
//         <div key={i} className="h-24 bg-white border border-slate-100 rounded-[2rem]" />
//       ))}
//     </div>
//   </div>
// );

// const StatusBadge = ({ status }: { status: string }) => {
//   const styles: any = {
//     NEW_ORDER: "bg-amber-50 text-amber-600 border-amber-100",
//     PICKED_UP: "bg-blue-50 text-blue-600 border-blue-100",
//     DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
//     CANCELLED: "bg-red-50 text-red-600 border-red-100",
//   };
//   return (
//     <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border", styles[status])}>
//       {status?.replace('_', ' ') || 'UNKNOWN'}
//     </span>
//   );
// };

