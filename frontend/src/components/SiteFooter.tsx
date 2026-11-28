import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Mail, Phone, MapPin, Twitter, Linkedin, Instagram, Youtube, ShieldCheck, Award, ArrowRight, Heart } from "lucide-react";
import logoImg from "@/assets/logo.png";

const footerLinks = {
  Patients: [
    { label: "Find a Hospital", to: "/hospitals" },
    { label: "Book Appointment", to: "/book" },
    { label: "Lab Reports", to: "/dashboard" },
    { label: "Booking Status", to: "/dashboard" },
    { label: "Health Records", to: "/dashboard" },
  ],
  Services: [
    { label: "Live Bed Availability", to: "/hospitals" },
    { label: "OPD Token System", to: "/book" },
    { label: "AI Emergency Response", to: "/emergency" },
    { label: "Online Pharmacy", to: "/pharmacy" },
    { label: "Health Vault", to: "/dashboard" },
  ],
  Company: [
    { label: "About Sanjeevani", to: "/about" },
    { label: "Partner Hospitals", to: "/hospitals" },
    { label: "For Doctors", to: "/" },
    { label: "Press & Media", to: "/" },
    { label: "Careers", to: "/" },
  ],
};

const socials = [
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Youtube, label: "YouTube", href: "#" },
];

const certBadges = [
  { label: "ISO 27001", sub: "Data Security" },
  { label: "HIPAA", sub: "Compliant" },
  { label: "NABH", sub: "Accredited" },
  { label: "SSL 256-bit", sub: "Encrypted" },
];

export function SiteFooter() {
  const location = useLocation();
  const isPharmacy = location.pathname === "/pharmacy";

  return (
    <footer className="mt-0 border-t border-border/40 bg-navy text-navy-foreground">
      {/* Top CTA strip */}
      <div className="border-b border-white/10 bg-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">Ready to get started?</p>
            <p className="mt-1 font-display text-xl font-bold text-white">India's most trusted healthcare platform</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/book" className="inline-flex items-center gap-2 rounded-xl bg-gradient-teal px-5 py-2.5 text-sm font-bold text-white shadow-glow-teal transition hover:opacity-90">
              Book Appointment <ArrowRight className="h-4 w-4" />
            </Link>
            {!isPharmacy && (
              <Link to="/emergency" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/15 transition">
                Emergency SOS
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-white shadow-md flex items-center justify-center">
                <img src={logoImg} className="h-full w-full object-cover scale-[1.8] origin-center" alt="Sanjeevani Logo" />
              </div>
              <div>
                <div className="font-display text-lg font-extrabold text-white">Sanjeevani</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/50">Healthcare Network</div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              India's unified OPD & hospital network — connecting every patient to every hospital with real-time bed availability, instant bookings & AI-powered emergency response across 600+ cities.
            </p>

            {/* Contact */}
            <ul className="mt-6 space-y-2.5 text-sm text-white/60">
              <li className="flex items-center gap-2.5 hover:text-white transition cursor-pointer">
                <Phone className="h-3.5 w-3.5 shrink-0 text-teal" /> 1800-200-1066
              </li>
              <li className="flex items-center gap-2.5 hover:text-white transition cursor-pointer">
                <Mail className="h-3.5 w-3.5 shrink-0 text-teal" /> care@sanjeevani.in
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-teal" /> Pan-India · 24/7 Support
              </li>
            </ul>

            {/* Socials */}
            <div className="mt-6 flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/12 hover:text-white hover:border-white/25 transition">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{section}</h4>
              <ul className="mt-5 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-sm text-white/55 hover:text-white transition-colors duration-200">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-14 border-t border-white/10 pt-10">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Certifications & Compliance</p>
          <div className="flex flex-wrap gap-3">
            {certBadges.map((b) => (
              <div key={b.label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <ShieldCheck className="h-4 w-4 text-teal" />
                <div>
                  <div className="text-xs font-bold text-white/85">{b.label}</div>
                  <div className="text-[10px] text-white/45">{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © 2026 Sanjeevani Health Network Pvt. Ltd. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-white/40">
            Made with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for every Indian patient
          </p>
          <div className="flex gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white/70 transition">Privacy Policy</a>
            <a href="#" className="hover:text-white/70 transition">Terms of Use</a>
            <a href="#" className="hover:text-white/70 transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
