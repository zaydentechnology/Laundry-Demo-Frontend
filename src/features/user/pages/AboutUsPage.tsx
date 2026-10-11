// src/features/user/pages/AboutUsPage.tsx
// Demo content only: no original client contact information or client lists.

import {
  MapPin,
  Phone,
  Info,
  Users,
  ShieldCheck,
  Star,
  Briefcase,
  Droplets,
  Wind,
  CheckCircle2,
  Clock3,
  Sparkles,
  PackageCheck,
} from "lucide-react";

const PHONE_DISPLAY = "+91 8431945251";
const PHONE_LINK = "tel:+918431945251";
const DEMO_ADDRESS = ["123 Demo Avenue", "Sample City, CA 90000", "United States (Sample Address)"];

const highlights = [
  { icon: Sparkles, label: "Care", val: "Fabric-Focused" },
  { icon: Users, label: "Experience", val: "Customer First" },
  { icon: Clock3, label: "Workflow", val: "Easy Tracking" },
  { icon: PackageCheck, label: "Service", val: "End-to-End" },
];

const processes = [
  {
    title: "Wet Washing",
    icon: Droplets,
    desc: "Using automated systems and specialized formulas controlled by computers for precision cleaning.",
  },
  {
    title: "Wet Cleaning",
    icon: Wind,
    desc: "A chemical-free alternative to dry cleaning using 'chilled' water to provide excellent stain removal.",
  },
  {
    title: "Dry Cleaning",
    icon: ShieldCheck,
    desc: "Computerized pre-spotting and processing for delicate garments that require specialized fabric care.",
  },
];

const features = [
  "Convenient order management",
  "Clear service selection",
  "Order status tracking",
  "Organized customer records",
  "Flexible laundry workflows",
  "Simple pickup and delivery coordination",
];

export const AboutUsPage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Background Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center opacity-40 brightness-75 pointer-events-none"
        style={{ backgroundImage: "url('/images/bg4.jpg')" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24">
        {/* HERO SECTION */}
        <header className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-brand-primary/20">
            <Star size={14} fill="currentColor" /> Zayden Laundry Demo
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            Welcome to Zayden Laundry
          </h1>
          <p className="text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
            Explore a modern laundry experience built around convenient services,
            clear order tracking, and thoughtful garment care. This is a
            demonstration of the laundry management experience powered by Zayden.
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Demonstration environment · Sample business information
          </p>
        </header>

        {/* HIGHLIGHTS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white shadow-sm text-center space-y-1"
            >
              <div className="h-10 w-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-2">
                <stat.icon size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
              <p className="text-sm font-black text-slate-900">{stat.val}</p>
            </div>
          ))}
        </section>

        {/* KEEP EXISTING SERVICE DESCRIPTIONS */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
            How We Work
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {processes.map((process) => (
              <div
                key={process.title}
                className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-sm space-y-3"
              >
                <div className="h-12 w-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                  <process.icon size={24} />
                </div>
                <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">
                  {process.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {process.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* REPLACES REAL CLIENT LIST WITH GENERIC DEMO FEATURES */}
        <section className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Briefcase size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              What This Demo Offers
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-slate-600"
              >
                <CheckCircle2 size={14} className="text-brand-primary shrink-0" />
                <span className="text-xs font-bold">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* No legacy client facility photos: neutral demo presentation instead */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-video rounded-[2.5rem] bg-white/80 border border-white shadow-sm flex flex-col gap-3 items-center justify-center p-8 text-center">
            <Droplets size={42} className="text-brand-primary" />
            <h4 className="font-black text-slate-900">Professional Garment Care</h4>
            <p className="text-xs text-slate-500">Explore laundry and garment-care services in this sample experience.</p>
          </div>
          <div className="aspect-video rounded-[2.5rem] bg-white/80 border border-white shadow-sm flex flex-col gap-3 items-center justify-center p-8 text-center">
            <PackageCheck size={42} className="text-brand-primary" />
            <h4 className="font-black text-slate-900">Simple Order Management</h4>
            <p className="text-xs text-slate-500">See how the platform organizes customer orders and service workflows.</p>
          </div>
        </section>

        {/* DEMO CONTACT SECTION */}
        <section className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white space-y-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2 bg-brand-primary rounded-xl text-white">
              <Info size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight">Contact Zayden</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                Laundry Management Demo
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 text-sm font-medium">
            <div className="flex items-start gap-4">
              <MapPin className="shrink-0 mt-1 text-brand-primary" size={20} />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sample US Address</p>
                <p className="leading-relaxed text-slate-300">
                  {DEMO_ADDRESS.map((line, i) => (
                    <span key={line}>{line}{i !== DEMO_ADDRESS.length - 1 && <br />}</span>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="shrink-0 mt-1 text-brand-primary" size={20} />
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Phone / WhatsApp</p>
                <a href={PHONE_LINK} className="text-slate-200 hover:text-white underline underline-offset-4">
                  {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            This is a product demonstration. The US address is fictional and is not an operating branch.
          </p>
        </section>
      </div>
    </div>
  );
};
