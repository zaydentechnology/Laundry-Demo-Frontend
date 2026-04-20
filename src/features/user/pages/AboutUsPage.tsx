// src/features/user/pages/AboutUsPage.tsx
import {
  History,
  Target,
  Ship,
  MapPin,
  Phone,
  Mail,
  Info,
  Award,
  Users,
  ShieldCheck,
  Star,
  Briefcase,
  Droplets,
  Wind,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/utils/cn";

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
            <Star size={14} fill="currentColor" /> 20+ Years of Excellence
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            Al Nejoum Al Arbaah
          </h1>
          <p className="text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
            Established in 2003, we have established ourselves as a prominent
            player in the UAE with high-quality service delivery exceeding
            customer expectations.
          </p>
        </header>

        {/* STATS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Ship, label: "Capacity", val: "5000kg/Day" },
            { icon: Users, label: "Professionals", val: "35+ Staff" },
            { icon: History, label: "Experience", val: "20+ Years" },
            { icon: Award, label: "Outlets", val: "4 Retails" },
          ].map((stat, i) => (
            <div
              key={i}
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

        {/* OUR PROCESSES SECTION */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 bg-white/50 backdrop-blur-md w-max px-3 py-1.5 rounded-lg border border-white">
            How We Work
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
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
            ].map((process, i) => (
              <div
                key={i}
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

        {/* MAJOR CLIENTS GRID */}
        <section className="bg-white/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Briefcase size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Our Major Clients
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "Armed Forces Officers Club",
              "Pan Emirates Home Furnishing",
              "Multi Tech Engineering",
              "Al Rostomani Heavy Vehicle",
              "Galadari Heavy Equipment",
              "Sharjah International Airport Hotel",
              "City Taxi",
              "Mangurad Security",
              "Malabar Gold",
              "Brightwell Product LLC",
              "DAMAC (Green Point)",
              "Gb Equipments",
              "Certis Guarding LLC",
              "Farnek Services LLC",
              "Al Bawardy Marine Engineering",
            ].map((client, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-slate-600 hover:text-brand-primary transition-colors cursor-default"
              >
                <CheckCircle2
                  size={14}
                  className="text-brand-primary shrink-0"
                />
                <span className="text-xs font-bold">{client}</span>
              </div>
            ))}
          </div>
        </section>

        {/* IMAGE SECTION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="aspect-video relative overflow-hidden rounded-[2.5rem] bg-slate-100 border border-white shadow-sm flex items-center justify-center">
            <img
              src="/images/aboutus2.png"
              alt="Our Facility"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              onError={(e) => {
                // If the image fails to load, this helps keep the UI clean
                e.currentTarget.style.display = "none";
              }}
            />
            {/* This text will be hidden behind the image because of 'absolute' and 'object-cover' */}
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Facility Image
            </div>
          </div>

          <div className="aspect-video relative overflow-hidden rounded-[2.5rem] bg-slate-100 border border-white shadow-sm flex items-center justify-center">
            <img
              src="/images/aboutus1.png"
              alt="Modern Machinery"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Machinery Image
            </div>
          </div>
        </section>

        {/* UPDATED CONTACT SECTION */}
        <section className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white space-y-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2 bg-brand-primary rounded-xl text-white">
              <Info size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tight">
                Official Contact
              </h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                Al Nejoum Al Arbaah Laundry
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 text-sm font-medium">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin
                  className="shrink-0 mt-1 text-brand-primary"
                  size={20}
                />
                <p className="leading-relaxed text-slate-300">
                  Industrial Area-13, Behind National Paint
                  <br />
                  Near to Dubai Dates Factory
                  <br />
                  Post Box No. 26697, Sharjah
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="shrink-0 text-brand-primary" size={20} />
                <a
                  href="mailto:alnejoumlaundry@yahoo.com"
                  className="text-slate-300 hover:text-white transition-colors underline underline-offset-4"
                >
                  alnejoumlaundry@yahoo.com
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Phone className="shrink-0 mt-1 text-brand-primary" size={20} />
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Office Tel & Fax
                    </p>
                    <p className="text-slate-200">06-5530600</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Mobile / WhatsApp
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-200">
                      <p>0501535565</p>
                      <p>0501552254</p>
                      <p>0501554105</p>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
