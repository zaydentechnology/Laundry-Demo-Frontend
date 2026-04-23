// src/features/orders/pages/CreateOrderPage.tsx
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ordersService, type OrderPayload } from "../api/orders.service";
import { adminService } from "@/features/admin/api/admin.service";
import { userService } from "@/features/user/api/user.service";
import {
  Plus,
  Minus,
  Calendar,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Loader2,
  Wallet,
  ChevronDown,
  ChevronUp,
  Search,
  Info,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";
import { OrderSuccessScreen } from "../components/OrderSuccessScreen";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/utils/cn";

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center py-32 animate-in fade-in zoom-in-95 duration-500">
    <div className="relative w-24 h-24 bg-white/80 backdrop-blur-xl rounded-3xl border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-brand-primary/5 animate-pulse" />
      <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-brand-primary animate-spin" />
    </div>
    <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
      Preparing Menu
    </p>
  </div>
);

export const CreateOrderPage = () => {
  const { user: authUser } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: userService.getMe,
    initialData: authUser,
  });

  const [hangerNeeded, setHangerNeeded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const walletBalance = profile?.wallet_balance || 0;

  const { data: config } = useQuery({
    queryKey: ["systemConfig"],
    queryFn: adminService.getSystemConfig,
  });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalSavings, setFinalSavings] = useState(0);

  const [useWallet, setUseWallet] = useState(false);
  const [creditsToUse, setCreditsToUse] = useState<number>(0);

  const minPickupTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  }, []);

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["laundryItems"],
    queryFn: ordersService.getItems,
  });

  const { data: offers } = useQuery({
    queryKey: ["activeOffers"],
    queryFn: adminService.getOffers,
  });

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [items, searchQuery]);

  // const { subtotal, appliedOffer, discount, total } = useMemo(() => {
  //   if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };

  //   let sub = 0;
  //   Object.entries(cart).forEach(([cartKey, qty]) => {
  //     if (qty <= 0) return;
  //     const [itemIdStr, catIdStr] = cartKey.split('_');
  //     const item = items.find(i => i.id === Number(itemIdStr));
  //     if (!item || !item.services) return;

  //     const service = item.services.find(s => s.service_category_id === Number(catIdStr));
  //     if (service) {
  //       sub += service.price * qty;
  //     }
  //   });

  //   const bestOffer = offers
  //     ?.filter(o => o.is_active && sub >= o.min_order_amount)
  //     .sort((a, b) => b.discount_amount - a.discount_amount)[0];
  //   const disc = bestOffer ? bestOffer.discount_amount : 0;

  //   return {
  //     subtotal: sub,
  //     appliedOffer: bestOffer || null,
  //     discount: disc,
  //     total: Math.max(0, sub - disc)
  //   };
  // }, [cart, items, offers]);
  const { subtotal, appliedOffer, discount, total } = useMemo(() => {
    if (!items)
      return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };

    let sub = 0;
    Object.entries(cart).forEach(([cartKey, qty]) => {
      if (qty <= 0) return;
      const [itemIdStr, catIdStr] = cartKey.split("_");
      const item = items.find((i) => i.id === Number(itemIdStr));
      if (!item || !item.services) return;

      const service = item.services.find(
        (s) => s.service_category_id === Number(catIdStr),
      );
      if (service) {
        sub += service.price * qty;
      }
    });

    // UPDATED: Dynamically calculate the highest discount value based on the type
    const bestOffer = offers
      ?.filter((o) => o.is_active && sub >= o.min_order_amount)
      .map((o) => {
        // Compute the actual AED value of the discount for comparison
        const calculatedDiscount =
          o.discount_type === "PERCENTAGE"
            ? sub * (o.discount_amount / 100)
            : o.discount_amount;
        return { ...o, calculatedDiscount };
      })
      .sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)[0];

    const disc = bestOffer ? bestOffer.calculatedDiscount : 0;

    return {
      subtotal: sub,
      appliedOffer: bestOffer || null,
      discount: disc,
      total: Math.max(0, sub - disc),
    };
  }, [cart, items, offers]);

  const maxUsableCredits = Math.min(walletBalance, total);

  // UPDATED: Business Logic for Pickup Timings with Dynamic Time Range
  const pickupInfo = useMemo(() => {
    if (!pickupDate) return null;

    const selectedDate = new Date(pickupDate);
    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Business Hours: 8:30 AM (510 mins) to 10:30 PM (1350 mins)
    const openMinutes = 8 * 60 + 30;
    const closeMinutes = 22 * 60 + 30;

    let finalDateObj = new Date(selectedDate);
    let isWithinHours = true;

    if (timeInMinutes < openMinutes) {
      isWithinHours = false;
      finalDateObj.setHours(8, 30, 0, 0); // Bump to 8:30 AM same day
    } else if (timeInMinutes > closeMinutes) {
      isWithinHours = false;
      finalDateObj.setDate(finalDateObj.getDate() + 1); // Bump to next day
      finalDateObj.setHours(8, 30, 0, 0); // At 8:30 AM
    }

    const year = finalDateObj.getFullYear();
    const month = String(finalDateObj.getMonth() + 1).padStart(2, "0");
    const day = String(finalDateObj.getDate()).padStart(2, "0");
    const hh = String(finalDateObj.getHours()).padStart(2, "0");
    const mm = String(finalDateObj.getMinutes()).padStart(2, "0");

    // Helper to format Date objects into clean 12-hour AM/PM strings
    const formatAMPM = (dateObj: Date) => {
      let h = dateObj.getHours();
      const m = dateObj.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const mins = m < 10 ? `0${m}` : m;
      return `${h}:${mins} ${ampm}`;
    };

    // Calculate dynamic display message
    let displayMessage = "Order will be picked up between 8:30 AM and 9:30 AM.";
    if (isWithinHours) {
      const startTimeStr = formatAMPM(finalDateObj);
      const endDateObj = new Date(finalDateObj.getTime() + 60 * 60 * 1000); // Exact +1 Hour
      const endTimeStr = formatAMPM(endDateObj);
      displayMessage = `Order will be collected between ${startTimeStr} and ${endTimeStr}.`;
    }

    return {
      isWithinHours,
      displayMessage,
      finalDate: `${year}-${month}-${day}`,
      finalTime: `${hh}:${mm}`,
      finalDateTimeObj: finalDateObj,
    };
  }, [pickupDate]);

  const orderMutation = useMutation({
    mutationFn: ordersService.createOrder,
    onSuccess: () => {
      setFinalSavings(discount + (useWallet ? creditsToUse : 0));
      setShowSuccess(true);
    },
  });

  const updateQuantity = (
    itemId: number,
    catId: number | "base",
    delta: number,
  ) => {
    const key = `${itemId}_${catId}`;
    setCart((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta),
    }));
  };

  const handleCreditChange = (val: number) => {
    const numericVal = Math.max(0, Math.min(val, maxUsableCredits));
    setCreditsToUse(numericVal);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (subtotal === 0) return toast.error("Add at least one item");
    if (!pickupDate || !pickupInfo)
      return toast.error("Please select a pickup schedule");

    const now = new Date();

    // Use the potentially adjusted final time for past validation
    if (pickupInfo.finalDateTimeObj < now) {
      return toast.error(
        "Pickup time cannot be in the past. Please select current or future time.",
      );
    }

    const orderItemsPayload = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([key, qty]) => {
        const [itemIdStr, catIdStr] = key.split("_");
        return {
          item_id: Number(itemIdStr),
          service_category_id: Number(catIdStr),
          estimated_quantity: qty,
        };
      });

    const payload: OrderPayload = {
      pickup_date: pickupInfo.finalDate,
      pickup_time: pickupInfo.finalTime,
      items: orderItemsPayload,
      notes: "",
      credits_to_use: useWallet ? creditsToUse : 0,
      hanger_needed: hangerNeeded,
    };

    orderMutation.mutate(payload);
  };

  const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));
  const vatAmount = finalDisplayTotal * 0.05;

  const getItemTotalQty = (itemId: number) => {
    return Object.entries(cart).reduce((sum, [key, qty]) => {
      if (key.startsWith(`${itemId}_`)) return sum + qty;
      return sum;
    }, 0);
  };

  return (
    <div className="relative min-h-screen">
      {/* <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 brightness-75 pointer-events-none" style={{ backgroundImage: "url('/images/bg4.jpg')" }} /> */}
      <div
        className="fixed inset-0 z-0 bg-blue-900/50 bg-blend-overlay bg-cover bg-center opacity-60 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg4.jpg')" }}
      />
      <div className="relative z-10 max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
        <header className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm mt-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            New Order
          </h1>
          <p className="text-slate-500 font-medium">
            Select your items and services.
          </p>

          <div className="relative mt-6 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search items (e.g. Shirt, Suit, Blanket)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/80 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm"
            />
          </div>
        </header>

        {itemsLoading ? (
          <PageLoader />
        ) : (
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/60 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-blue-200/50">
              <ShoppingBag size={14} className="text-blue-600" /> Service Menu
            </h3>

            <div className="grid gap-3">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const totalQty = getItemTotalQty(item.id);
                  const isExpanded = expandedItem === item.id;
                  const startingPrice = item.services?.length
                    ? Math.min(...item.services.map((s) => s.price))
                    : 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm overflow-hidden transition-all duration-300"
                    >
                      <div
                        onClick={() =>
                          setExpandedItem(isExpanded ? null : item.id)
                        }
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-xs font-bold text-slate-500">
                            From AED {startingPrice}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {totalQty > 0 && (
                            <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">
                              {totalQty} Added
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="text-slate-400" />
                          ) : (
                            <ChevronDown className="text-slate-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && item.services && (
                        <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
                          {item.services.map((svc) => (
                            <div
                              key={svc.id}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-700">
                                  {svc.category?.name || "Service"}
                                </p>
                                <p className="text-xs font-bold text-brand-primary">
                                  AED {svc.price}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(
                                      item.id,
                                      svc.service_category_id,
                                      -1,
                                    );
                                  }}
                                  className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center active:scale-90"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-4 text-center font-black text-xs">
                                  {cart[
                                    `${item.id}_${svc.service_category_id}`
                                  ] || 0}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(
                                      item.id,
                                      svc.service_category_id,
                                      1,
                                    );
                                  }}
                                  className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/60 backdrop-blur-md p-10 rounded-[2rem] text-center border-2 border-dashed border-white">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    No items found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Schedule Section */}
        {/* Schedule Section - Fixed Mobile Overflow */}
        <section className="space-y-4 bg-blue-50/80 backdrop-blur-xl p-4 sm:p-6 rounded-[2rem] border border-blue-100 shadow-sm overflow-hidden">
          {/* Header: Reduced tracking on mobile and added max-w-full to prevent overflow */}
          <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.1em] sm:tracking-[0.2em] flex items-center gap-2 bg-white/60 backdrop-blur-md w-max max-w-full px-3 py-1.5 rounded-lg border border-blue-200/50">
            <Calendar size={14} className="text-blue-600 shrink-0" /> 
            <span className="truncate">When should we come?</span>
          </h3>

          <div className="relative space-y-3">
            <input
              type="datetime-local"
              value={pickupDate}
              min={minPickupTime}
            onChange={(e) => {
    const selectedValue = e.target.value;
    const now = new Date().getTime();
    const selectedTime = new Date(selectedValue).getTime();

    // If the user bypasses the UI and selects a past date (common on iOS)
    if (selectedTime < now) {
      toast.error("Past dates are not allowed. Snapping to earliest available time.");
      setPickupDate(minPickupTime); // Force reset to the minimum allowed
    } else {
      setPickupDate(selectedValue);
    }
  }}
  className={cn(
    "w-full p-4 sm:p-5 bg-white/90 backdrop-blur-xl border border-white rounded-[1.5rem] font-bold text-sm sm:text-base focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm",
    pickupDate ? "text-slate-900" : "text-slate-500",
  )}
            />

            {pickupInfo && (
              <div
                className={cn(
                  "p-3 sm:p-4 rounded-2xl border flex items-start gap-3 transition-colors",
                  pickupInfo.isWithinHours
                    ? "bg-brand-primary/5 border-brand-primary/10 text-brand-primary"
                    : "bg-amber-50 border-amber-200 text-amber-700",
                )}
              >
                <Info className="shrink-0 mt-0.5" size={16} />
                {/* min-w-0 and break-words ensures the text wraps instead of pushing the box wide */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-relaxed break-words">
                    {pickupInfo.displayMessage}
                  </p>
                  {!pickupInfo.isWithinHours && (
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70 leading-tight">
                      Outside business hours (8:30 AM - 10:30 PM)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        {/* <section className="space-y-4 bg-blue-50/80 backdrop-blur-xl p-6 rounded-[2rem] border border-blue-100 shadow-sm">
          <h3 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/60 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-blue-200/50">
            <Calendar size={14} className="text-blue-600" /> When should we
            come?
          </h3>
          <div className="relative space-y-3">
            <input
              type="datetime-local"
              value={pickupDate}
              min={minPickupTime}
              onChange={(e) => setPickupDate(e.target.value)}
              className={cn(
                "w-full p-5 bg-white/90 backdrop-blur-xl border border-white rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm",
                pickupDate ? "text-slate-900" : "text-slate-500",
              )}
            />
            {pickupInfo && (
              <div
                className={cn(
                  "p-4 rounded-2xl border flex items-start gap-3 transition-colors",
                  pickupInfo.isWithinHours
                    ? "bg-brand-primary/5 border-brand-primary/10 text-brand-primary"
                    : "bg-amber-50 border-amber-200 text-amber-700",
                )}
              >
                <Info className="shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold leading-relaxed">
                    {pickupInfo.displayMessage}
                  </p>
                  {!pickupInfo.isWithinHours && (
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">
                      Outside business hours (8:30 AM - 10:30 PM)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section> */}

        {/* HANGER PREFERENCE */}
        <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm p-6 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              Deliver on Hangers?
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              Receive your clothes ready to hang.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHangerNeeded(!hangerNeeded)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${hangerNeeded ? "bg-brand-primary" : "bg-slate-200"}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hangerNeeded ? "translate-x-8" : "translate-x-1"}`}
            />
          </button>
        </section>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-brand-primary/10 border border-slate-800 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/20 rounded-full blur-[3rem] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[3rem] pointer-events-none"></div>

          <div className="relative z-10 space-y-5">
            {appliedOffer && (
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-400 px-5 py-4 rounded-2xl border border-emerald-500/20 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <TicketPercent size={16} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    Savings Applied: {appliedOffer.name}
                  </span>
                </div>
                <span className="font-black text-sm tracking-tight">- AED {discount.toFixed(2)}</span>
              </div>
            )}

            {config?.referral_system_enabled && walletBalance > 0 && (
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 transition-colors p-5 rounded-2xl space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4 text-white">
                    <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all">
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-200">
                        Apply Credits
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Balance: <span className="text-brand-primary">{walletBalance.toFixed(2)} pts</span>
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ease-in-out ${useWallet ? "bg-brand-primary shadow-lg shadow-brand-primary/30" : "bg-slate-700"}`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-300 ease-in-out ${useWallet ? "translate-x-5" : "translate-x-0"}`}
                    ></div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={useWallet}
                    onChange={(e) => {
                      setUseWallet(e.target.checked);
                      if (e.target.checked && creditsToUse === 0)
                        setCreditsToUse(maxUsableCredits);
                    }}
                  />
                </label>
                
                {/* Smooth reveal for input */}
                <div className={`grid transition-all duration-300 ease-in-out ${useWallet ? "grid-rows-[1fr] opacity-100 pt-2 border-t border-white/5" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden flex gap-2">
                    <input
                      type="number"
                      value={creditsToUse || ""}
                      onChange={(e) =>
                        handleCreditChange(Number(e.target.value))
                      }
                      max={maxUsableCredits}
                      className="flex-1 bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-black outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setCreditsToUse(maxUsableCredits)}
                      className="bg-white/10 hover:bg-white/20 text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-5 space-y-2.5">
              <div className="flex justify-between items-center text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">
                <span>VAT Inclusive (5%)</span>
                <span>AED {vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] px-1">
                <span>TRN No: 100361207200003</span>
                <Info size={10} className="opacity-50" />
              </div>
            </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-5 border-t border-white/10 gap-5">
              <div className="text-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Grand Total
                </span>
                <div className="flex items-baseline gap-4 mt-1">
                  <span className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
                    <span className="text-brand-primary text-2xl sm:text-3xl pr-1">AED</span>
                    {finalDisplayTotal.toFixed(2)}
                  </span>
                  
                  {(discount > 0 || (useWallet && creditsToUse > 0)) && (
                    <div className="relative inline-flex items-center justify-center px-2 py-0.5 group">
                      {/* 1. Subtle green highlight box slightly skewed in the background */}
                      <span className="absolute inset-0 bg-emerald-500/10 rounded-lg transform -skew-x-12 border border-emerald-500/20"></span>
                      
                      {/* 2. The Old Price */}
                      <span className="relative text-2xl sm:text-3xl font-black text-slate-500 group-hover:text-slate-400 transition-colors">
                        {subtotal.toFixed(2)}
                      </span>
                      
                      {/* 3. The Custom Slash Effect - Looks like a glowing neon marker strike */}
                      <span className="absolute top-1/2 left-[-10%] w-[120%] h-[3px] bg-emerald-400 -rotate-6 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)] border-y border-slate-900 pointer-events-none transition-all group-hover:shadow-[0_0_16px_rgba(52,211,153,0.9)] group-hover:scale-105"></span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={subtotal === 0 || orderMutation.isPending}
                className="w-full sm:w-auto bg-brand-primary text-white px-8 py-5 rounded-[2rem] font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                {orderMutation.isPending ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Checkout 
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {showSuccess && (
          <OrderSuccessScreen
            savings={finalSavings}
            pickupDateTime={
              pickupInfo
                ? `${pickupInfo.finalDate}T${pickupInfo.finalTime}`
                : pickupDate
            }
            onClose={() => setShowSuccess(false)}
          />
        )}
      </div>
    </div>
  );
};
// // src/features/orders/pages/CreateOrderPage.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { userService } from '@/features/user/api/user.service';
// import {
//   Plus, Minus, Calendar, ShoppingBag, ArrowRight,
//   Sparkles, Loader2, Wallet, ChevronDown, ChevronUp,
//   Search, Info, TicketPercent
// } from 'lucide-react';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';
// import { useAuthStore } from '@/store/useAuthStore';
// import { cn } from '@/utils/cn';

// const PageLoader = () => (
//   <div className="flex flex-col items-center justify-center py-32 animate-in fade-in zoom-in-95 duration-500">
//     <div className="relative w-24 h-24 bg-white/80 backdrop-blur-xl rounded-3xl border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
//       <div className="absolute inset-0 bg-brand-primary/5 animate-pulse" />
//       <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-brand-primary animate-spin" />
//     </div>
//     <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Preparing Menu</p>
//   </div>
// );

// export const CreateOrderPage = () => {
//   const { user: authUser } = useAuthStore();

//   const { data: profile } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   const [hangerNeeded, setHangerNeeded] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const walletBalance = profile?.wallet_balance || 0;

//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   const [cart, setCart] = useState<Record<string, number>>({});
//   const [expandedItem, setExpandedItem] = useState<number | null>(null);
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//   const [useWallet, setUseWallet] = useState(false);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);

//   const minPickupTime = useMemo(() => {
//     const now = new Date();
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }, []);

//   const { data: items, isLoading: itemsLoading } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const filteredItems = useMemo(() => {
//     if (!items) return [];
//     if (!searchQuery.trim()) return items;
//     return items.filter(item =>
//       item.name.toLowerCase().includes(searchQuery.toLowerCase())
//     );
//   }, [items, searchQuery]);

//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };

//     let sub = 0;
//     Object.entries(cart).forEach(([cartKey, qty]) => {
//       if (qty <= 0) return;
//       const [itemIdStr, catIdStr] = cartKey.split('_');
//       const item = items.find(i => i.id === Number(itemIdStr));
//       if (!item || !item.services) return;

//       const service = item.services.find(s => s.service_category_id === Number(catIdStr));
//       if (service) {
//         sub += service.price * qty;
//       }
//     });

//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   const maxUsableCredits = Math.min(walletBalance, total);

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       setFinalSavings(discount + (useWallet ? creditsToUse : 0));
//       setShowSuccess(true);
//     },
//   });

//   const updateQuantity = (itemId: number, catId: number | 'base', delta: number) => {
//     const key = `${itemId}_${catId}`;
//     setCart((prev) => ({
//       ...prev,
//       [key]: Math.max(0, (prev[key] || 0) + delta)
//     }));
//   };

//   const handleCreditChange = (val: number) => {
//     const numericVal = Math.max(0, Math.min(val, maxUsableCredits));
//     setCreditsToUse(numericVal);
//   };

//   const handleSubmit = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     // --- UPDATED: Strict Past-Time Validation ---
//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();

//     // Check if selected time is in the past
//     if (selectedDateTime < now) {
//       return toast.error("Pickup time cannot be in the past. Please select current or future time.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');

//     const orderItemsPayload = Object.entries(cart)
//       .filter(([_, qty]) => qty > 0)
//       .map(([key, qty]) => {
//         const [itemIdStr, catIdStr] = key.split('_');
//         return {
//           item_id: Number(itemIdStr),
//           service_category_id: Number(catIdStr),
//           estimated_quantity: qty
//         };
//       });

//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: orderItemsPayload,
//       notes: "",
//       credits_to_use: useWallet ? creditsToUse : 0,
//       hanger_needed: hangerNeeded
//     };

//     orderMutation.mutate(payload);
//   };

//   const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));
//   const vatAmount = finalDisplayTotal * 0.05;

//   const getItemTotalQty = (itemId: number) => {
//     return Object.entries(cart).reduce((sum, [key, qty]) => {
//       if (key.startsWith(`${itemId}_`)) return sum + qty;
//       return sum;
//     }, 0);
//   };

//   return (
//     <div className="relative min-h-screen">
//       <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 brightness-75 pointer-events-none" style={{ backgroundImage: "url('/images/bg4.jpg')" }} />

//       <div className="relative z-10 max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//         <header className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm mt-2">
//           <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//           <p className="text-slate-500 font-medium">Select your items and services.</p>

//           <div className="relative mt-6 group">
//             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
//             <input
//               type="text"
//               placeholder="Search items (e.g. Shirt, Suit, Blanket)..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full pl-12 pr-4 py-4 bg-white/80 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm"
//             />
//           </div>
//         </header>

//         {itemsLoading ? (
//           <PageLoader />
//         ) : (
//           <section className="space-y-4">
//             <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
//               <ShoppingBag size={14} /> Service Menu
//             </h3>

//             <div className="grid gap-3">
//               {filteredItems.length > 0 ? (
//                 filteredItems.map((item) => {
//                   const totalQty = getItemTotalQty(item.id);
//                   const isExpanded = expandedItem === item.id;
//                   const startingPrice = item.services?.length
//                     ? Math.min(...item.services.map(s => s.price))
//                     : 0;

//                   return (
//                     <div key={item.id} className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm overflow-hidden transition-all duration-300">
//                       <div
//                         onClick={() => setExpandedItem(isExpanded ? null : item.id)}
//                         className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
//                       >
//                         <div>
//                           <p className="font-bold text-slate-800">{item.name}</p>
//                           <p className="text-xs font-bold text-slate-500">From AED {startingPrice}</p>
//                         </div>
//                         <div className="flex items-center gap-4">
//                           {totalQty > 0 && (
//                             <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">
//                               {totalQty} Added
//                             </span>
//                           )}
//                           {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//                         </div>
//                       </div>

//                       {isExpanded && item.services && (
//                         <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">
//                           {item.services.map((svc) => (
//                             <div key={svc.id} className="flex items-center justify-between">
//                               <div>
//                                 <p className="text-sm font-bold text-slate-700">{svc.category?.name || "Service"}</p>
//                                 <p className="text-xs font-bold text-brand-primary">AED {svc.price}</p>
//                               </div>
//                               <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
//                                 <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, -1); }} className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center active:scale-90"><Minus size={12}/></button>
//                                 <span className="w-4 text-center font-black text-xs">{cart[`${item.id}_${svc.service_category_id}`] || 0}</span>
//                                 <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, 1); }} className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90"><Plus size={12}/></button>
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })
//               ) : (
//                 <div className="bg-white/60 backdrop-blur-md p-10 rounded-[2rem] text-center border-2 border-dashed border-white">
//                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No items found matching "{searchQuery}"</p>
//                 </div>
//               )}
//             </div>
//           </section>
//         )}

//         {/* Schedule Section */}
//         <section className="space-y-4">
//           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
//             <Calendar size={14} /> When should we come?
//           </h3>
//           <div className="relative">
//             <input
//               type="datetime-local"
//               value={pickupDate}
//               min={minPickupTime}
//               onChange={(e) => setPickupDate(e.target.value)}
//               className={cn(
//                 "w-full p-5 bg-white/90 backdrop-blur-xl border border-white rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm",
//                 pickupDate ? "text-slate-900" : "text-slate-500"
//               )}
//             />
//           </div>
//         </section>

//         {/* HANGER PREFERENCE */}
//         <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm p-6 flex items-center justify-between">
//           <div>
//             <h3 className="font-black text-slate-800 flex items-center gap-2">Deliver on Hangers?</h3>
//             <p className="text-xs font-bold text-slate-500 mt-1">Receive your clothes ready to hang.</p>
//           </div>
//           <button
//             type="button"
//             onClick={() => setHangerNeeded(!hangerNeeded)}
//             className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${hangerNeeded ? 'bg-brand-primary' : 'bg-slate-200'}`}
//           >
//             <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hangerNeeded ? 'translate-x-8' : 'translate-x-1'}`} />
//           </button>
//         </section>

//         <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 space-y-6 relative overflow-hidden">
//           <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

//           <div className="relative z-10 space-y-4">
//             {appliedOffer && (
//               <div className="flex items-center justify-between bg-white/10 text-white px-4 py-3 rounded-xl border border-white/10 animate-pulse">
//                  <div className="flex items-center gap-2">
//                    <TicketPercent size={14} className="text-brand-primary" />
//                    <span className="text-[10px] font-black uppercase tracking-widest">Savings Applied: {appliedOffer.name}</span>
//                  </div>
//                  <span className="font-black text-xs">- AED {discount}</span>
//               </div>
//             )}

//             {config?.referral_system_enabled && walletBalance > 0 && (
//               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
//                 <label className="flex items-center justify-between cursor-pointer group">
//                   <div className="flex items-center gap-3 text-white">
//                     <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary">
//                       <Wallet size={16} />
//                     </div>
//                     <div>
//                       <p className="text-xs font-black uppercase tracking-widest">Apply Credits</p>
//                       <p className="text-[10px] text-slate-400 font-bold">Balance: {walletBalance.toFixed(2)} pts</p>
//                     </div>
//                   </div>
//                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useWallet ? 'bg-brand-primary' : 'bg-slate-700'}`}>
//                     <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useWallet ? 'translate-x-4' : 'translate-x-0'}`}></div>
//                   </div>
//                   <input type="checkbox" className="hidden" checked={useWallet} onChange={(e) => {
//                     setUseWallet(e.target.checked);
//                     if (e.target.checked && creditsToUse === 0) setCreditsToUse(maxUsableCredits);
//                   }} />
//                 </label>
//                 {useWallet && (
//                   <div className="pt-2 border-t border-white/10 flex gap-2">
//                     <input type="number" value={creditsToUse || ''} onChange={(e) => handleCreditChange(Number(e.target.value))} max={maxUsableCredits} className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 font-black outline-none focus:border-brand-primary transition-colors" placeholder="0" />
//                     <button type="button" onClick={() => setCreditsToUse(maxUsableCredits)} className="bg-white/10 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Max</button>
//                   </div>
//                 )}
//               </div>
//             )}

//             <div className="border-t border-white/10 pt-4 space-y-2">
//                <div className="flex justify-between items-center text-slate-400 text-[10px] font-black uppercase tracking-widest px-1">
//                   <span>VAT Inclusive (5%)</span>
//                   <span>AED {vatAmount.toFixed(2)}</span>
//                </div>
//                <div className="flex justify-between items-center text-brand-primary text-[9px] font-black uppercase tracking-[0.2em] px-1">
//                   <span>TRN No: 100361207200003</span>
//                   <Info size={10} />
//                </div>
//             </div>

//             <div className="flex items-center justify-between pt-2 border-t border-white/10">
//               <div className="text-white">
//                 <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Grand Total</span>
//                 <div className="flex items-baseline gap-2">
//                   <span className="text-4xl font-black tracking-tighter text-brand-primary">AED {finalDisplayTotal.toFixed(2)}</span>
//                   {(discount > 0 || (useWallet && creditsToUse > 0)) && (
//                     <span className="text-xs font-bold text-white/30 line-through">AED {subtotal.toFixed(2)}</span>
//                   )}
//                 </div>
//               </div>

//               <button
//                 onClick={handleSubmit}
//                 disabled={subtotal === 0 || orderMutation.isPending}
//                 className="bg-brand-primary text-white px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 disabled:opacity-30 transition-all"
//               >
//                 {orderMutation.isPending ? <Loader2 className="animate-spin" size={18}/> : (
//                   <>Checkout <ArrowRight size={18} /></>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {showSuccess && <OrderSuccessScreen savings={finalSavings} pickupDateTime={pickupDate} onClose={() => setShowSuccess(false)} />}
//       </div>
//     </div>
//   );
// };
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload, type LaundryItem } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { userService } from '@/features/user/api/user.service';
// import { Plus, Minus, Calendar, ShoppingBag, ArrowRight, Sparkles, Loader2, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';
// import { useAuthStore } from '@/store/useAuthStore';

// export const CreateOrderPage = () => {
//   const { user: authUser } = useAuthStore();

//   const { data: profile } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   const [hangerNeeded, setHangerNeeded] = useState(false);

//   const walletBalance = profile?.wallet_balance || 0;

//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   // UPGRADED CART STATE: Record<"itemId_categoryId", quantity>
//   // e.g., "1_base" (Standard Wash), "1_2" (Item 1, Dry Clean)
//   const [cart, setCart] = useState<Record<string, number>>({});
//   const [expandedItem, setExpandedItem] = useState<number | null>(null); // For accordion UI
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//   const [useWallet, setUseWallet] = useState(false);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);

//   const minPickupTime = useMemo(() => {
//     const now = new Date();
//     now.setHours(now.getHours() + 1);
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }, []);

//   const { data: items } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   // UPGRADED SUBTOTAL CALCULATION
//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };

//     let sub = 0;
//     Object.entries(cart).forEach(([cartKey, qty]) => {
//       if (qty <= 0) return;
//       const [itemIdStr, catIdStr] = cartKey.split('_');
//       const item = items.find(i => i.id === Number(itemIdStr));
//       if (!item || !item.services) return;

//       const service = item.services.find(s => s.service_category_id === Number(catIdStr));
//       if (service) {
//         sub += service.price * qty;
//       }
//     });

//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   const maxUsableCredits = Math.min(walletBalance, total);

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       setFinalSavings(discount + (useWallet ? creditsToUse : 0));
//       setShowSuccess(true);
//     },
//   });

//   // UPGRADED CART HANDLER
//   const updateQuantity = (itemId: number, catId: number | 'base', delta: number) => {
//     const key = `${itemId}_${catId}`;
//     setCart((prev) => ({
//       ...prev,
//       [key]: Math.max(0, (prev[key] || 0) + delta)
//     }));
//   };

//   const handleCreditChange = (val: number) => {
//     const numericVal = Math.max(0, Math.min(val, maxUsableCredits));
//     setCreditsToUse(numericVal);
//   };

//   const handleSubmit = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();
//     if ((selectedDateTime.getTime() - now.getTime()) / (1000 * 60) < 60) {
//       return toast.error("Pickup time must be at least 1 hour from now.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');

//     // UPGRADED PAYLOAD BUILDER
//    const orderItemsPayload = Object.entries(cart)
//       .filter(([_, qty]) => qty > 0)
//       .map(([key, qty]) => {
//         const [itemIdStr, catIdStr] = key.split('_');
//         return {
//           item_id: Number(itemIdStr),
//           service_category_id: Number(catIdStr), // Strictly send the number
//           estimated_quantity: qty
//         };
//       });

//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: orderItemsPayload,
//       notes: "",
//       credits_to_use: useWallet ? creditsToUse : 0,
//       hanger_needed: hangerNeeded
//     };

//     orderMutation.mutate(payload);
//   };

//   const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));

//   // Helper to count total active items under one parent item
//   const getItemTotalQty = (itemId: number) => {
//     return Object.entries(cart).reduce((sum, [key, qty]) => {
//       if (key.startsWith(`${itemId}_`)) return sum + qty;
//       return sum;
//     }, 0);
//   };

//   return (
//     <div className="relative min-h-screen">
//       <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 brightness-75 pointer-events-none" style={{ backgroundImage: "url('/images/bg4.jpg')" }} />

//       <div className="relative z-10 max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//         <header className="bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm mt-2">
//           <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//           <p className="text-slate-500 font-medium">Select your items and services.</p>
//         </header>

//         {/* UPGRADED ITEM SELECTION (Nested Accordion) */}
//         <section className="space-y-4">
//           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
//             <ShoppingBag size={14} /> Service Menu
//           </h3>
//           <div className="grid gap-3">
//            {items?.map((item) => {
//               const totalQty = getItemTotalQty(item.id);
//               const isExpanded = expandedItem === item.id;

//               // Helper to find lowest price to display on parent row
//               const startingPrice = item.services?.length
//                 ? Math.min(...item.services.map(s => s.price))
//                 : 0;

//               return (
//                 <div key={item.id} className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm overflow-hidden transition-all duration-300">

//                   {/* Parent Row (Clickable) */}
//                   <div
//                     onClick={() => setExpandedItem(isExpanded ? null : item.id)}
//                     className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
//                   >
//                     <div>
//                       <p className="font-bold text-slate-800">{item.name}</p>
//                       <p className="text-xs font-bold text-slate-500">From AED {startingPrice}</p>
//                     </div>

//                     <div className="flex items-center gap-4">
//                       {totalQty > 0 && (
//                         <span className="bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-lg">
//                           {totalQty} Added
//                         </span>
//                       )}
//                       {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
//                     </div>
//                   </div>

//                   {/* Expanded Nested Services Array */}
//                   {isExpanded && item.services && (
//                     <div className="px-5 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-200">

//                       {item.services.map((svc) => (
//                         <div key={svc.id} className="flex items-center justify-between">
//                           <div>
//                             <p className="text-sm font-bold text-slate-700">{svc.category?.name || "Service"}</p>
//                             <p className="text-xs font-bold text-brand-primary">AED {svc.price}</p>
//                           </div>
//                           <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
//                             <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, -1); }} className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center active:scale-90"><Minus size={12}/></button>
//                             <span className="w-4 text-center font-black text-xs">{cart[`${item.id}_${svc.service_category_id}`] || 0}</span>
//                             <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, svc.service_category_id, 1); }} className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center active:scale-90"><Plus size={12}/></button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </section>

//         {/* ... (Keep your Schedule Section and Order Summary Sections exactly the same) ... */}

//         {/* Schedule Section */}
//         <section className="space-y-4">
//           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
//             <Calendar size={14} /> When should we come?
//           </h3>
//           <div className="relative">
//             <input
//               type="datetime-local"
//               value={pickupDate}
//               min={minPickupTime}
//               onChange={(e) => setPickupDate(e.target.value)}
//               className={`w-full p-5 bg-white/90 backdrop-blur-xl border border-white rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${
//                 pickupDate ? "text-slate-900" : "text-slate-500"
//               }`}
//             />
//             {!pickupDate && (
//               <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
//                 <span className="text-slate-500 font-bold bg-white/90 pr-8">Tap to select date & time</span>
//               </div>
//             )}
//           </div>
//         </section>

//         {/* NEW: HANGER PREFERENCE */}
//         <section className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm p-6 flex items-center justify-between">
//           <div>
//             <h3 className="font-black text-slate-800 flex items-center gap-2">
//               Deliver on Hangers?
//             </h3>
//             <p className="text-xs font-bold text-slate-500 mt-1">Receive your clothes ready to hang.</p>
//           </div>
//           <button
//             type="button"
//             onClick={() => setHangerNeeded(!hangerNeeded)}
//             className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${hangerNeeded ? 'bg-brand-primary' : 'bg-slate-200'}`}
//           >
//             <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hangerNeeded ? 'translate-x-8' : 'translate-x-1'}`} />
//           </button>
//         </section>

//         {/* Order Summary & Wallet Engine */}
//         <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 space-y-4 relative overflow-hidden">
//           {/* Subtle glow effect behind checkout card */}
//           <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none"></div>

//           <div className="relative z-10">
//             {appliedOffer && (
//               <div className="flex items-center justify-between bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 animate-pulse mb-4">
//                  <div className="flex items-center gap-2">
//                    <Sparkles size={14} className="text-yellow-400" />
//                    <span className="text-[10px] font-black uppercase tracking-widest">Saving {appliedOffer.name}</span>
//                  </div>
//                  <span className="font-black text-xs">- AED {discount}</span>
//               </div>
//             )}

//             {/* WALLET SECTION */}
//             {config?.referral_system_enabled && walletBalance > 0 && (
//               <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 animate-in fade-in duration-500 mb-4">
//                 <label className="flex items-center justify-between cursor-pointer group">
//                   <div className="flex items-center gap-3 text-white">
//                     <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary group-hover:scale-110 transition-transform">
//                       <Wallet size={16} />
//                     </div>
//                     <div>
//                       <p className="text-xs font-black uppercase tracking-widest">Pay with Credits</p>
//                       <p className="text-[10px] text-slate-400 font-bold tracking-wider">Balance: {walletBalance.toFixed(2)} pts</p>
//                     </div>
//                   </div>
//                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useWallet ? 'bg-brand-primary' : 'bg-slate-700'}`}>
//                     <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useWallet ? 'translate-x-4' : 'translate-x-0'}`}></div>
//                   </div>
//                   <input
//                     type="checkbox"
//                     className="hidden"
//                     checked={useWallet}
//                     onChange={(e) => {
//                       setUseWallet(e.target.checked);
//                       if (e.target.checked && creditsToUse === 0) {
//                         setCreditsToUse(maxUsableCredits);
//                       }
//                     }}
//                   />
//                 </label>

//                 {useWallet && (
//                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/10 flex gap-2">
//                     <input
//                       type="number"
//                       value={creditsToUse || ''}
//                       onChange={(e) => handleCreditChange(Number(e.target.value))}
//                       max={maxUsableCredits}
//                       min={0}
//                       className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 font-black outline-none focus:border-brand-primary transition-colors"
//                       placeholder="0"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setCreditsToUse(maxUsableCredits)}
//                       className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
//                     >
//                       Max
//                     </button>
//                   </div>
//                 )}
//               </div>
//             )}

//             <div className="flex items-center justify-between pt-2">
//               <div className="text-white">
//                 <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Estimated Total</span>
//                 <div className="flex items-baseline gap-2">
//                   <span className="text-3xl font-black tracking-tighter">AED {finalDisplayTotal.toFixed(2)}</span>
//                   {(discount > 0 || (useWallet && creditsToUse > 0)) && (
//                     <span className="text-xs font-bold text-white/30 line-through">AED {subtotal.toFixed(2)}</span>
//                   )}
//                 </div>
//               </div>

//               <button
//                 onClick={handleSubmit}
//                 disabled={subtotal === 0 || orderMutation.isPending}
//                 className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
//               >
//                 {orderMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : (
//                   <>Place Order <ArrowRight size={16} /></>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         {showSuccess && <OrderSuccessScreen savings={finalSavings} pickupDateTime={pickupDate} onClose={() => setShowSuccess(false)} />}
//       </div>
//     </div>
//   );
// };
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { userService } from '@/features/user/api/user.service'; // <-- Added this
// import { Plus, Minus, Calendar, ShoppingBag, ArrowRight, Sparkles, Loader2, Wallet } from 'lucide-react';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';
// import { useAuthStore } from '@/store/useAuthStore';

// export const CreateOrderPage = () => {
//   const { user: authUser } = useAuthStore();

//   // 1. FETCH LIVE PROFILE: This ensures credits update without re-logging
//   const { data: profile } = useQuery({
//     queryKey: ['userProfile'],
//     queryFn: userService.getMe,
//     initialData: authUser
//   });

//   const walletBalance = profile?.wallet_balance || 0;

//   // 2. FETCH SYSTEM CONFIG
//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   const [cart, setCart] = useState<Record<number, number>>({});
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//   const [useWallet, setUseWallet] = useState(false);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);

//   const minPickupTime = useMemo(() => {
//     const now = new Date();
//     now.setHours(now.getHours() + 1);
//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');
//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }, []);

//   const { data: items } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };
//     const sub = items.reduce((sum, item) => sum + (item.base_price * (cart[item.id] || 0)), 0);
//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   // Max credits limited by order total
//   const maxUsableCredits = Math.min(walletBalance, total);

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       setFinalSavings(discount + (useWallet ? creditsToUse : 0));
//       setShowSuccess(true);
//     },
//   });

//   const updateQuantity = (itemId: number, delta: number) => {
//     setCart((prev) => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
//     }));
//   };

//   const handleCreditChange = (val: number) => {
//     const numericVal = Math.max(0, Math.min(val, maxUsableCredits));
//     setCreditsToUse(numericVal);
//   };

//   const handleSubmit = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();
//     const diffInMinutes = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60);

//     if (diffInMinutes < 60) {
//       return toast.error("Pickup time must be at least 1 hour from now.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');
//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: Object.entries(cart)
//         .filter(([_, qty]) => qty > 0)
//         .map(([id, qty]) => ({ item_id: Number(id), estimated_quantity: qty })),
//       notes: "",
//       credits_to_use: useWallet ? creditsToUse : 0
//     };

//     orderMutation.mutate(payload);
//   };

//   const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//         <p className="text-slate-500 font-medium">Professional care for your favorites.</p>
//       </header>

//       {/* Item Selection Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <ShoppingBag size={14} /> Service Menu
//         </h3>
//         <div className="grid gap-3">
//           {items?.map((item) => (
//             <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-primary/20 transition-all">
//               <div>
//                 <p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{item.name}</p>
//                 <p className="text-xs font-bold text-slate-400">AED {item.base_price} / pc</p>
//               </div>
//               <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
//                 <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={14}/></button>
//                 <span className="w-4 text-center font-black text-sm">{cart[item.id] || 0}</span>
//                 <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={14}/></button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* Schedule Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <Calendar size={14} /> When should we come?
//         </h3>
//         <div className="relative">
//           <input
//             type="datetime-local"
//             value={pickupDate}
//             min={minPickupTime}
//             onChange={(e) => setPickupDate(e.target.value)}
//             className={`w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${
//               pickupDate ? "text-slate-900" : "text-slate-400"
//             }`}
//           />
//           {!pickupDate && (
//             <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
//               <span className="text-slate-400 font-bold bg-white pr-8">Tap to select date & time</span>
//             </div>
//           )}
//         </div>
//       </section>

//       {/* UPGRADED: Order Summary & Wallet Engine */}
//       <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 space-y-4">
//         {appliedOffer && (
//           <div className="flex items-center justify-between bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 animate-pulse">
//              <div className="flex items-center gap-2">
//                <Sparkles size={14} className="text-yellow-400" />
//                <span className="text-[10px] font-black uppercase tracking-widest">Saving {appliedOffer.name}</span>
//              </div>
//              <span className="font-black text-xs">- AED {discount}</span>
//           </div>
//         )}

//         {/* WALLET SECTION: Only shows if system is ON AND balance > 0 */}
//         {config?.referral_system_enabled && walletBalance > 0 && (
//           <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 animate-in fade-in duration-500">
//             <label className="flex items-center justify-between cursor-pointer group">
//               <div className="flex items-center gap-3 text-white">
//                 <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary group-hover:scale-110 transition-transform">
//                   <Wallet size={16} />
//                 </div>
//                 <div>
//                   <p className="text-xs font-black uppercase tracking-widest">Pay with Credits</p>
//                   <p className="text-[10px] text-slate-400 font-bold tracking-wider">Balance: {walletBalance.toFixed(2)} pts</p>
//                 </div>
//               </div>
//               <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useWallet ? 'bg-brand-primary' : 'bg-slate-700'}`}>
//                 <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useWallet ? 'translate-x-4' : 'translate-x-0'}`}></div>
//               </div>
//               <input
//                 type="checkbox"
//                 className="hidden"
//                 checked={useWallet}
//                 onChange={(e) => {
//                   setUseWallet(e.target.checked);
//                   if (e.target.checked && creditsToUse === 0) {
//                     setCreditsToUse(maxUsableCredits);
//                   }
//                 }}
//               />
//             </label>

//             {useWallet && (
//               <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/10 flex gap-2">
//                 <input
//                   type="number"
//                   value={creditsToUse || ''}
//                   onChange={(e) => handleCreditChange(Number(e.target.value))}
//                   max={maxUsableCredits}
//                   min={0}
//                   className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 font-black outline-none focus:border-brand-primary transition-colors"
//                   placeholder="0"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setCreditsToUse(maxUsableCredits)}
//                   className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
//                 >
//                   Max
//                 </button>
//               </div>
//             )}
//           </div>
//         )}

//         <div className="flex items-center justify-between pt-2">
//           <div className="text-white">
//             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Estimated Total</span>
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-black tracking-tighter">AED {finalDisplayTotal.toFixed(2)}</span>
//               {(discount > 0 || (useWallet && creditsToUse > 0)) && (
//                 <span className="text-xs font-bold text-white/30 line-through">AED {subtotal.toFixed(2)}</span>
//               )}
//             </div>
//           </div>

//           <button
//             onClick={handleSubmit}
//             disabled={subtotal === 0 || orderMutation.isPending}
//             className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
//           >
//             {orderMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : (
//               <>Place Order <ArrowRight size={16} /></>
//             )}
//           </button>
//         </div>
//       </div>

// {showSuccess && <OrderSuccessScreen savings={finalSavings} pickupDateTime={pickupDate} onClose={() => setShowSuccess(false)} />}    </div>
//   );
// };
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { Plus, Minus, Calendar, ShoppingBag, ArrowRight, Sparkles, Loader2, Wallet } from 'lucide-react';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';
// import { useAuthStore } from '@/store/useAuthStore';

// export const CreateOrderPage = () => {
//   const { user } = useAuthStore();
//   const walletBalance = user?.wallet_balance || 0;

//   // NEW: Fetch System Config to check if referral is enabled
//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   const [cart, setCart] = useState<Record<number, number>>({});
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//   const [useWallet, setUseWallet] = useState(false);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);

//   const minPickupTime = useMemo(() => {
//     const now = new Date();
//     now.setHours(now.getHours() + 1);

//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');

//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }, []);

//   const { data: items } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };
//     const sub = items.reduce((sum, item) => sum + (item.base_price * (cart[item.id] || 0)), 0);
//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   const maxUsableCredits = Math.min(walletBalance, total);

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       setFinalSavings(discount + (useWallet ? creditsToUse : 0));
//       setShowSuccess(true);
//     },
//   });

//   const updateQuantity = (itemId: number, delta: number) => {
//     setCart((prev) => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
//     }));
//   };

//   const handleCreditChange = (val: number) => {
//     if (val < 0) val = 0;
//     if (val > maxUsableCredits) val = maxUsableCredits;
//     setCreditsToUse(val);
//   };

//   const handleSubmit = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();
//     const diffInMinutes = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60);

//     if (diffInMinutes < 60) {
//       return toast.error("Pickup time must be at least 1 hour from now.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');
//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: Object.entries(cart)
//         .filter(([_, qty]) => qty > 0)
//         .map(([id, qty]) => ({ item_id: Number(id), estimated_quantity: qty })),
//       notes: "",
//       credits_to_use: useWallet ? creditsToUse : 0
//     };

//     orderMutation.mutate(payload);
//   };

//   const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//         <p className="text-slate-500 font-medium">Professional care for your favorites.</p>
//       </header>

//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <ShoppingBag size={14} /> Service Menu
//         </h3>
//         <div className="grid gap-3">
//           {items?.map((item) => (
//             <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-primary/20 transition-all">
//               <div>
//                 <p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{item.name}</p>
//                 <p className="text-xs font-bold text-slate-400">AED {item.base_price} / pc</p>
//               </div>
//               <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
//                 <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={14}/></button>
//                 <span className="w-4 text-center font-black text-sm">{cart[item.id] || 0}</span>
//                 <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={14}/></button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>

//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <Calendar size={14} /> When should we come?
//         </h3>
//         <div className="relative">
//           <input
//             type="datetime-local"
//             value={pickupDate}
//             min={minPickupTime}
//             onChange={(e) => {
//               if (e.target.value < minPickupTime) {
//                 toast.error("Pickup must be at least 1 hour from now");
//                 return;
//               }
//               setPickupDate(e.target.value);
//             }}
//             className={`w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${
//               pickupDate ? "text-slate-900" : "text-slate-400"
//             }`}
//           />
//           {!pickupDate && (
//             <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
//               <span className="text-slate-400 font-bold bg-white pr-8">Tap to select date & time</span>
//             </div>
//           )}
//         </div>
//       </section>

//       <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 space-y-4">
//         {appliedOffer && (
//           <div className="flex items-center justify-between bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 animate-pulse">
//              <div className="flex items-center gap-2">
//                <Sparkles size={14} className="text-yellow-400" />
//                <span className="text-[10px] font-black uppercase tracking-widest">Saving {appliedOffer.name}</span>
//              </div>
//              <span className="font-black text-xs">- AED {discount}</span>
//           </div>
//         )}

//         {/* WALLET SECTION: Only shows if referral_system_enabled is true */}
//         {config?.referral_system_enabled && (
//           <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 animate-in fade-in duration-500">
//             <label className="flex items-center justify-between cursor-pointer group">
//               <div className="flex items-center gap-3 text-white">
//                 <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary group-hover:scale-110 transition-transform">
//                   <Wallet size={16} />
//                 </div>
//                 <div>
//                   <p className="text-xs font-black uppercase tracking-widest">Pay with Credits</p>
//                   <p className="text-[10px] text-slate-400 font-bold tracking-wider">Balance: {walletBalance.toFixed(2)} pts</p>
//                 </div>
//               </div>
//               <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useWallet ? 'bg-brand-primary' : 'bg-slate-700'}`}>
//                 <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useWallet ? 'translate-x-4' : 'translate-x-0'}`}></div>
//               </div>
//               <input
//                 type="checkbox"
//                 className="hidden"
//                 checked={useWallet}
//                 onChange={(e) => {
//                   setUseWallet(e.target.checked);
//                   if (e.target.checked && creditsToUse === 0) {
//                     setCreditsToUse(maxUsableCredits);
//                   }
//                 }}
//               />
//             </label>

//             {useWallet && (
//               <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/10 flex gap-2">
//                 <input
//                   type="number"
//                   value={creditsToUse || ''}
//                   onChange={(e) => handleCreditChange(Number(e.target.value))}
//                   max={maxUsableCredits}
//                   min={0}
//                   className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 font-black outline-none focus:border-brand-primary transition-colors"
//                   placeholder="0"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setCreditsToUse(maxUsableCredits)}
//                   className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
//                 >
//                   Max
//                 </button>
//               </div>
//             )}
//           </div>
//         )}

//         <div className="flex items-center justify-between pt-2">
//           <div className="text-white">
//             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Estimated Total</span>
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-black tracking-tighter">AED {finalDisplayTotal.toFixed(2)}</span>
//               {(discount > 0 || (useWallet && creditsToUse > 0)) && (
//                 <span className="text-xs font-bold text-white/30 line-through">AED {subtotal.toFixed(2)}</span>
//               )}
//             </div>
//           </div>

//           <button
//             onClick={handleSubmit}
//             disabled={subtotal === 0 || orderMutation.isPending}
//             className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
//           >
//             {orderMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : (
//               <>Place Order <ArrowRight size={16} /></>
//             )}
//           </button>
//         </div>
//       </div>

//       {showSuccess && <OrderSuccessScreen savings={finalSavings} onClose={() => setShowSuccess(false)} />}
//     </div>
//   );
// };
// // src/features/orders/pages/CreateOrderPage.tsx
// import { useState, useMemo } from 'react';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// import { Plus, Minus, Calendar, ShoppingBag, ArrowRight, Sparkles, Loader2, Wallet } from 'lucide-react';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';
// import { useAuthStore } from '@/store/useAuthStore'; // <-- Imported to get wallet balance

// export const CreateOrderPage = () => {
//   const { user } = useAuthStore(); // <-- Get current user data
//   const walletBalance = user?.wallet_balance || 0;

//   const { data: config } = useQuery({
//     queryKey: ['systemConfig'],
//     queryFn: adminService.getSystemConfig,
//   });

//   const [cart, setCart] = useState<Record<number, number>>({});
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//   // NEW: Wallet States
//   const [useWallet, setUseWallet] = useState(false);
//   const [creditsToUse, setCreditsToUse] = useState<number>(0);

//   const minPickupTime = useMemo(() => {
//     const now = new Date();
//     now.setHours(now.getHours() + 1); // Add the 1-hour buffer

//     const year = now.getFullYear();
//     const month = String(now.getMonth() + 1).padStart(2, '0');
//     const day = String(now.getDate()).padStart(2, '0');
//     const hours = String(now.getHours()).padStart(2, '0');
//     const minutes = String(now.getMinutes()).padStart(2, '0');

//     return `${year}-${month}-${day}T${hours}:${minutes}`;
//   }, []);

//   const { data: items } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };
//     const sub = items.reduce((sum, item) => sum + (item.base_price * (cart[item.id] || 0)), 0);
//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   // Max credits they can use is either their total balance OR the total order cost (whichever is lower)
//   const maxUsableCredits = Math.min(walletBalance, total);

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       // Show total savings including the wallet usage!
//       setFinalSavings(discount + (useWallet ? creditsToUse : 0));
//       setShowSuccess(true);
//     },
//   });

//   const updateQuantity = (itemId: number, delta: number) => {
//     setCart((prev) => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
//     }));
//   };

//   const handleCreditChange = (val: number) => {
//     if (val < 0) val = 0;
//     if (val > maxUsableCredits) val = maxUsableCredits;
//     setCreditsToUse(val);
//   };

//   const handleSubmit = (e?: React.FormEvent) => {
//     if (e) e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();

//     const diffInMinutes = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60);

//     if (diffInMinutes < 60) {
//       return toast.error("Pickup time must be at least 1 hour from now.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');

//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: Object.entries(cart)
//         .filter(([_, qty]) => qty > 0)
//         .map(([id, qty]) => ({ item_id: Number(id), estimated_quantity: qty })),
//       notes: "",
//       credits_to_use: useWallet ? creditsToUse : 0 // <-- Pass credits safely to API
//     };

//     orderMutation.mutate(payload);
//   };

//   // The actual final price displayed to user
//   const finalDisplayTotal = Math.max(0, total - (useWallet ? creditsToUse : 0));

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//         <p className="text-slate-500 font-medium">Professional care for your favorites.</p>
//       </header>

//       {/* Item Selection Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <ShoppingBag size={14} /> Service Menu
//         </h3>
//         <div className="grid gap-3">
//           {items?.map((item) => (
//             <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-primary/20 transition-all">
//               <div>
//                 <p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{item.name}</p>
//                 <p className="text-xs font-bold text-slate-400">AED {item.base_price} / pc</p>
//               </div>
//               <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
//                 <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={14}/></button>
//                 <span className="w-4 text-center font-black text-sm">{cart[item.id] || 0}</span>
//                 <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={14}/></button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* Schedule Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <Calendar size={14} /> When should we come?
//         </h3>
//         <div className="relative">
//           <input
//             type="datetime-local"
//             value={pickupDate}
//             min={minPickupTime}
//             onChange={(e) => {
//               if (e.target.value < minPickupTime) {
//                 toast.error("Pickup must be at least 1 hour from now");
//                 return;
//               }
//               setPickupDate(e.target.value);
//             }}
//             className={`w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${
//               pickupDate ? "text-slate-900" : "text-slate-400"
//             }`}
//           />

//           {/* Custom Mobile-Friendly Placeholder */}
//           {!pickupDate && (
//             <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
//               <span className="text-slate-400 font-bold bg-white pr-8">
//                 Tap to select date & time
//               </span>
//             </div>
//           )}
//         </div>
//       </section>

//       {/* UPGRADED: Order Summary & Wallet Engine */}
//       <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 space-y-4">

//         {appliedOffer && (
//           <div className="flex items-center justify-between bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 animate-pulse">
//              <div className="flex items-center gap-2">
//                <Sparkles size={14} className="text-yellow-400" />
//                <span className="text-[10px] font-black uppercase tracking-widest">Saving {appliedOffer.name}</span>
//              </div>
//              <span className="font-black text-xs">- AED {discount}</span>
//           </div>
//         )}

//         {/* Wallet Toggle & Input */}
//         <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
//           <label className="flex items-center justify-between cursor-pointer group">
//             <div className="flex items-center gap-3 text-white">
//               <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary group-hover:scale-110 transition-transform">
//                 <Wallet size={16} />
//               </div>
//               <div>
//                 <p className="text-xs font-black uppercase tracking-widest">Pay with Credits</p>
//                 <p className="text-[10px] text-slate-400 font-bold tracking-wider">Balance: {walletBalance.toFixed(2)} pts</p>
//               </div>
//             </div>

//             {/* The Toggle UI */}
//             <div className={`w-10 h-6 rounded-full p-1 transition-colors ${useWallet ? 'bg-brand-primary' : 'bg-slate-700'}`}>
//               <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useWallet ? 'translate-x-4' : 'translate-x-0'}`}></div>
//             </div>
//             {/* Hidden actual checkbox to control state */}
//             <input
//               type="checkbox"
//               className="hidden"
//               checked={useWallet}
//               onChange={(e) => {
//                 setUseWallet(e.target.checked);
//                 // Auto-fill max available credits when toggled on
//                 if (e.target.checked && creditsToUse === 0) {
//                   setCreditsToUse(maxUsableCredits);
//                 }
//               }}
//             />
//           </label>

//           {useWallet && (
//             <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/10 flex gap-2">
//               <input
//                 type="number"
//                 value={creditsToUse || ''}
//                 onChange={(e) => handleCreditChange(Number(e.target.value))}
//                 max={maxUsableCredits}
//                 min={0}
//                 className="flex-1 bg-white/10 border border-white/10 text-white rounded-xl px-4 py-2 font-black outline-none focus:border-brand-primary transition-colors"
//                 placeholder="0"
//               />
//               <button
//                 type="button"
//                 onClick={() => setCreditsToUse(maxUsableCredits)}
//                 className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
//               >
//                 Max
//               </button>
//             </div>
//           )}
//         </div>

//         <div className="flex items-center justify-between pt-2">
//           <div className="text-white">
//             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Estimated Total</span>
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-black tracking-tighter">AED {finalDisplayTotal.toFixed(2)}</span>
//               {(discount > 0 || (useWallet && creditsToUse > 0)) && (
//                 <span className="text-xs font-bold text-white/30 line-through">AED {subtotal.toFixed(2)}</span>
//               )}
//             </div>
//           </div>

//           <button
//             onClick={handleSubmit}
//             disabled={subtotal === 0 || orderMutation.isPending}
//             className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
//           >
//             {orderMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : (
//               <>Place Order <ArrowRight size={16} /></>
//             )}
//           </button>
//         </div>
//       </div>

//       {showSuccess && (
//         <OrderSuccessScreen
//           savings={finalSavings}
//           onClose={() => setShowSuccess(false)}
//         />
//       )}
//     </div>
//   );
// };
// // src/features/orders/pages/CreateOrderPage.tsx
// import { useState, useMemo } from 'react';
// // import { useNavigate } from 'react-router-dom';
// import { useQuery, useMutation } from '@tanstack/react-query';
// import { ordersService, type OrderPayload } from '../api/orders.service';
// import { adminService } from '@/features/admin/api/admin.service';
// // import { Button } from '@/components/ui/Button';
// // import { Input } from '@/components/ui/Input';
// import { Plus, Minus, Calendar, ShoppingBag, ArrowRight, Sparkles,Loader2 } from 'lucide-react';
// // import { cn } from '@/utils/cn';
// import { toast } from 'sonner';
// import { OrderSuccessScreen } from '../components/OrderSuccessScreen';

// export const CreateOrderPage = () => {
//   // const navigate = useNavigate();
//   const [cart, setCart] = useState<Record<number, number>>({});
//   const [pickupDate, setPickupDate] = useState('');
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [finalSavings, setFinalSavings] = useState(0);

//  const minPickupTime = useMemo(() => {
//   const now = new Date();
//   now.setHours(now.getHours() + 1); // Add the 1-hour buffer

//   // Format to: YYYY-MM-DDTHH:mm (Required by datetime-local)
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0');
//   const day = String(now.getDate()).padStart(2, '0');
//   const hours = String(now.getHours()).padStart(2, '0');
//   const minutes = String(now.getMinutes()).padStart(2, '0');

//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// }, []);

//   const { data: items } = useQuery({
//     queryKey: ['laundryItems'],
//     queryFn: ordersService.getItems,
//   });

//   const { data: offers } = useQuery({
//     queryKey: ['activeOffers'],
//     queryFn: adminService.getOffers,
//   });

//   const orderMutation = useMutation({
//     mutationFn: ordersService.createOrder,
//     onSuccess: () => {
//       setFinalSavings(discount);
//       setShowSuccess(true);
//     },
//   });

//   const { subtotal, appliedOffer, discount, total } = useMemo(() => {
//     if (!items) return { subtotal: 0, appliedOffer: null, discount: 0, total: 0 };
//     const sub = items.reduce((sum, item) => sum + (item.base_price * (cart[item.id] || 0)), 0);
//     const bestOffer = offers
//       ?.filter(o => o.is_active && sub >= o.min_order_amount)
//       .sort((a, b) => b.discount_amount - a.discount_amount)[0];
//     const disc = bestOffer ? bestOffer.discount_amount : 0;

//     return {
//       subtotal: sub,
//       appliedOffer: bestOffer || null,
//       discount: disc,
//       total: Math.max(0, sub - disc)
//     };
//   }, [cart, items, offers]);

//   const updateQuantity = (itemId: number, delta: number) => {
//     setCart((prev) => ({
//       ...prev,
//       [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
//     }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (subtotal === 0) return toast.error('Add at least one item');
//     if (!pickupDate) return toast.error('Please select a pickup schedule');

//     const selectedDateTime = new Date(pickupDate);
//     const now = new Date();

//     // Calculate the difference in minutes
//     const diffInMinutes = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60);

//     if (diffInMinutes < 60) {
//       return toast.error("Pickup time must be at least 1 hour from now.");
//     }

//     const [datePart, timePart] = pickupDate.split('T');
//     const payload: OrderPayload = {
//       pickup_date: datePart,
//       pickup_time: timePart,
//       items: Object.entries(cart)
//         .filter(([_, qty]) => qty > 0)
//         .map(([id, qty]) => ({ item_id: Number(id), estimated_quantity: qty })),
//       notes: ""
//     };
//     orderMutation.mutate(payload);
//   };

//   return (
//     <div className="max-w-2xl mx-auto space-y-8 pb-12 px-4 pt-4">
//       <header>
//         <h1 className="text-3xl font-black text-slate-900 tracking-tighter">New Order</h1>
//         <p className="text-slate-500 font-medium">Professional care for your favorites.</p>
//       </header>

//       {/* Item Selection Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <ShoppingBag size={14} /> Service Menu
//         </h3>
//         <div className="grid gap-3">
//           {items?.map((item) => (
//             <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-primary/20 transition-all">
//               <div>
//                 <p className="font-bold text-slate-800 group-hover:text-brand-primary transition-colors">{item.name}</p>
//                 <p className="text-xs font-bold text-slate-400">AED {item.base_price} / pc</p>
//               </div>
//               <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl">
//                 <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-all"><Minus size={14}/></button>
//                 <span className="w-4 text-center font-black text-sm">{cart[item.id] || 0}</span>
//                 <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={14}/></button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* Schedule Section */}
//       <section className="space-y-4">
//         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
//           <Calendar size={14} /> When should we come?
//         </h3>
//         <div className="relative">
//           <input
//             type="datetime-local"
//             value={pickupDate}
//             // min={new Date().toISOString().slice(0, 16)}
//             min={minPickupTime}
//             // onChange={(e) => setPickupDate(e.target.value)}
//             onChange={(e) => {
//     if (e.target.value < minPickupTime) {
//       toast.error("Pickup must be at least 1 hour from now");
//       return;
//     }
//     setPickupDate(e.target.value);
//   }}
//             className={`w-full p-5 bg-white border border-slate-100 rounded-[1.5rem] font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all shadow-sm ${
//               pickupDate ? "text-slate-900" : "text-slate-400"
//             }`}
//           />

//           {/* Custom Mobile-Friendly Placeholder */}
//           {!pickupDate && (
//             <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
//               {/* bg-white covers the browser's ugly default "dd/mm/yyyy" format while leaving the right-side calendar icon clickable on desktop */}
//               <span className="text-slate-400 font-bold bg-white pr-8">
//                 Tap to select date & time
//               </span>
//             </div>
//           )}
//         </div>
//       </section>
//            {/* FIXED: Order Summary moved to Top for Mobile Accessibility */}
//       <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-200 space-y-4">
//         {appliedOffer && (
//           <div className="flex items-center justify-between bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 animate-pulse">
//              <div className="flex items-center gap-2">
//                <Sparkles size={14} className="text-yellow-400" />
//                <span className="text-[10px] font-black uppercase tracking-widest">Saving {appliedOffer.name}</span>
//              </div>
//              <span className="font-black text-xs">- AED {discount}</span>
//           </div>
//         )}

//         <div className="flex items-center justify-between">
//           <div className="text-white">
//             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Estimated Total</span>
//             <div className="flex items-baseline gap-2">
//               <span className="text-3xl font-black tracking-tighter">AED {total}</span>
//               {discount > 0 && <span className="text-xs font-bold text-white/30 line-through">AED {subtotal}</span>}
//             </div>
//           </div>

//           <button
//             onClick={handleSubmit}
//             disabled={subtotal === 0 || orderMutation.isPending}
//             className="bg-brand-primary text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
//           >
//             {orderMutation.isPending ? <Loader2 className="animate-spin" size={16}/> : (
//               <>Place Order <ArrowRight size={16} /></>
//             )}
//           </button>
//         </div>
//       </div>

//       {showSuccess && (
//         <OrderSuccessScreen
//           savings={finalSavings}
//           onClose={() => setShowSuccess(false)}
//         />
//       )}
//     </div>
//   );
// };
