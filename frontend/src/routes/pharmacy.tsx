import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, ShoppingCart, Plus, Minus, X, Pill, Star, ShieldCheck, 
  Truck, Tag, ChevronDown, Heart, MapPin, Upload, ChevronLeft, 
  ChevronRight, ArrowRight, Shield, Calendar, Microscope, Phone, 
  Lock, CheckCircle2, MessageCircle, Send, LogOut, Check, Activity,
  CreditCard, QrCode, Building2, Sparkles, Ticket, Clock
} from "lucide-react";
import { medicines } from "@/lib/medicineData";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Link } from "@tanstack/react-router";
import logoImg from "@/assets/logo.png";

export const Route = createFileRoute("/pharmacy")({
  head: () => ({
    meta: [
      { title: "Sanjeevani Pharmacy — Online Medicine & Health Store" },
      { name: "description", content: "Order genuine medicines, health essentials and book lab tests online. Quick doorstep delivery with Sanjeevani Pharmacy." },
    ],
  }),
  component: SanjeevaniPharmacyPage,
});

// TYPES
type CartItem = { id: string; qty: number; type: "medicine" | "lab_test" };
type ChatMessage = { sender: "user" | "bot"; text: string; time: string };

// MOCK DATA

// Popular Lab Tests
const labTests = [
  { id: "lab-cbc", name: "CBC Test (Complete Blood Count)", testsCount: 30, price: 299, mrp: 599, discount: 50, rating: 4.8 },
  { id: "lab-hba1c", name: "HbA1c Test (Hemoglobin A1c)", testsCount: 3, price: 399, mrp: 799, discount: 50, rating: 4.7 },
  { id: "lab-fbs", name: "FBS (Fasting Blood Sugar) Test", testsCount: 1, price: 99, mrp: 199, discount: 50, rating: 4.6 },
  { id: "lab-lipid", name: "Lipid Profile Test", testsCount: 8, price: 599, mrp: 1199, discount: 50, rating: 4.8 },
  { id: "lab-thyroid", name: "Thyroid Profile Total (T3, T4, TSH)", testsCount: 3, price: 349, mrp: 699, discount: 50, rating: 4.7 }
];

// Value Deals at Rs 100
const valueDeals = [
  { id: "v1", name: "Sanjeevani Pharmacy Activated Charcoal Soap, 250 gm (2x125 gm)", generic: "Activated Charcoal, Aloe Vera", category: "Personal Care", price: 99.4, mrp: 177.5, image: "https://images.unsplash.com/photo-1607006342460-7a91702f23cf?w=400&q=80", rating: 4.6, discount: 44 },
  { id: "v2", name: "Sanjeevani Essentials Aqua Blue Hand Wash, 500 ml (2x250 ml)", generic: "Aqua, Anti-bacterial formula", category: "Personal Care", price: 99.2, mrp: 160, image: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80", rating: 4.5, discount: 38 },
  { id: "v3", name: "Sanjeevani Essentials Refreshing Body Wash, 400 ml", generic: "Menthol & Sea Minerals", category: "Personal Care", price: 100, mrp: 200, image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80", rating: 4.7, discount: 50 },
  { id: "v4", name: "Sanjeevani Life Premium Citrus Refreshing Wet Wipes, 60s", generic: "Citrus, Aloe Vera extracts", category: "Personal Care", price: 99.2, mrp: 160, image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80", rating: 4.4, discount: 38 },
  { id: "v5", name: "Sanjeevani Life Aloe Vera Skin Care Gel, 200 gm", generic: "Pure Aloe Vera Extract", category: "Skin Care", price: 99.2, mrp: 160, image: "https://images.unsplash.com/photo-1556229174-5e42a09e45af?w=400&q=80", rating: 4.5, discount: 38 },
  { id: "v6", name: "Sanjeevani Essentials Sandal Soap, 250 gm (2x125 gm)", generic: "Sandalwood extract & Glycerin", category: "Personal Care", price: 99.4, mrp: 177.5, image: "https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&q=80", rating: 4.6, discount: 44 }
];

// OneTouch Diabetes Management
const diabetesDeals = [
  { id: "d1", name: "OneTouch Select Plus Simple Glucometer (Free 10 Strips)", generic: "Blood Glucose Monitor", category: "Health Devices", price: 817, mrp: 1075, image: "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=400&q=80", rating: 4.8, discount: 24 },
  { id: "d2", name: "OneTouch Select Plus Test Strips, 50 Count", generic: "Select Plus Glucose Strips", category: "Health Devices", price: 1139.05, mrp: 1199, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&q=80", rating: 4.7, discount: 5 },
  { id: "d3", name: "OneTouch Verio Test Strips, 50 Count", generic: "Verio Glucose Strips", category: "Health Devices", price: 1186.55, mrp: 1249, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&q=80", rating: 4.6, discount: 5 },
  { id: "d4", name: "OneTouch Delica Plus Lancets, 25 Count", generic: "Delica Plus Lancets 30G", category: "Health Devices", price: 164, mrp: 180, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&q=80", rating: 4.4, discount: 9 },
  { id: "d5", name: "OneTouch Select Plus Test Strips, 25 Count", generic: "Select Plus Glucose Strips", category: "Health Devices", price: 652.8, mrp: 680, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&q=80", rating: 4.5, discount: 4 },
  { id: "d6", name: "OneTouch Verio Test Strips, 25 Count", generic: "Verio Glucose Strips", category: "Health Devices", price: 629.76, mrp: 656, image: "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&q=80", rating: 4.5, discount: 4 }
];

// Combine all products for easy search and detail lookup
const allProducts = [
  ...medicines,
  ...valueDeals.map(v => ({ ...v, prescription: false, inStock: true, dosage: "Apply as directed", uses: "Daily Hygiene and skincare", sideEffects: "None", manufacturer: "Sanjeevani Pharmacy" })),
  ...diabetesDeals.map(d => ({ ...d, prescription: false, inStock: true, dosage: "Use as directed by device manual", uses: "Blood glucose monitoring", sideEffects: "None", manufacturer: "OneTouch (LifeScan)" })),
  ...labTests.map(l => ({ ...l, generic: "Diagnostic test at home", category: "Lab Tests", prescription: false, inStock: true, dosage: "N/A", uses: "General health diagnostics", sideEffects: "None", manufacturer: "Sanjeevani Diagnostics", image: "https://images.unsplash.com/photo-1579153138244-3917a00811d1?w=400&q=80", brand: "Sanjeevani Diagnostics" }))
];

const healthConditions = [
  { id: "cond-diab", name: "Diabetes Care", icon: "🩸" },
  { id: "cond-card", name: "Cardiac Care", icon: "❤️" },
  { id: "cond-stom", name: "Stomach Care", icon: "胃" },
  { id: "cond-pain", name: "Pain Relief", icon: "💊" },
  { id: "cond-live", name: "Liver Care", icon: "🧪" },
  { id: "cond-oral", name: "Oral Care", icon: "🦷" },
  { id: "cond-resp", name: "Respiratory", icon: "🫁" },
  { id: "cond-sex", name: "Sexual Health", icon: "👩‍❤️‍👨" },
  { id: "cond-elder", name: "Elderly Care", icon: "👴" },
  { id: "cond-cold", name: "Cold & Immunity", icon: "🤧" }
];

const brands = [
  { id: "b-whisper", name: "WHISPER", logoText: "whisper", color: "text-teal-600 font-extrabold italic text-lg" },
  { id: "b-aveeno", name: "AVEENO", logoText: "Aveeno.", color: "text-amber-800 font-serif font-bold text-lg" },
  { id: "b-volini", name: "VOLINI", logoText: "VOLINI", color: "text-indigo-900 font-black tracking-tighter text-xl" },
  { id: "b-revital", name: "REVITAL", logoText: "REVITAL H", color: "text-red-600 font-extrabold text-md" },
  { id: "b-mamypoko", name: "MAMYPOKO", logoText: "MamyPoko", color: "text-blue-500 font-bold font-sans text-md" },
  { id: "b-fastup", name: "FAST&UP", logoText: "FAST&UP", color: "text-yellow-600 font-extrabold tracking-tight text-lg" },
  { id: "b-dabur", name: "DABUR", logoText: "Dabur", color: "text-emerald-700 font-bold text-lg font-serif" },
  { id: "b-himalaya", name: "HIMALAYA", logoText: "Himalaya", color: "text-cyan-700 font-semibold text-lg" }
];

const categories = [
  { id: "c-sanjeevani", name: "Sanjeevani Products", image: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=150&q=80" },
  { id: "c-baby", name: "Baby Care", image: "https://images.unsplash.com/photo-1515488042361-404e9250afef?w=150&q=80" },
  { id: "c-monsoon", name: "Monsoon Essentials", image: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=150&q=80" },
  { id: "c-personal", name: "Personal Care", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&q=80" },
  { id: "c-nutrition", name: "Nutritional Drinks", image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=150&q=80" },
  { id: "c-skin", name: "Skin Care", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=150&q=80" },
  { id: "c-fitness", name: "Fitness & Gym", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&q=80" },
  { id: "c-ayur", name: "Ayurveda & Herbal", image: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?w=150&q=80" }
];

const promoBanners = [
  { id: 1, title: "JUST LAUNCHED", heading: "Explore Sanjeevani Trusted Alternatives", subheading: "Same Salt, Bigger Savings. Lab-tested formulations.", bg: "from-navy to-teal/90", accent: "text-teal" },
  { id: 2, title: "MEMBER BENEFITS", heading: "Join Sanjeevani Circle Membership", subheading: "Get flat 10% cashbacks, free shipping & doctor advice.", bg: "from-navy to-navy/80", accent: "text-teal" },
  { id: 3, title: "LIMITED OFFER", heading: "Save Up to 25% on Medicine Spends", subheading: "With Sanjeevani Credit Card SELECT. Apply today.", bg: "from-slate-900 to-zinc-950", accent: "text-teal" }
];

// ─── GROQ AI PHARMACY ASSISTANT ─────────────────────────────────────────────
// Using Groq · Llama 3.3 70B — free tier, ultra-fast inference
// Get your free API key at: https://console.groq.com
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const PHARMACY_SYSTEM_PROMPT = `You are Rishi AI, the expert AI assistant for Sanjeevani Pharmacy — India's most trusted online medical store.

You have deep knowledge of:
- Medicines: generic names, brand names, dosage, uses, side effects, interactions, storage conditions
- Lab Tests: CBC, HbA1c, Lipid Profile, Thyroid, Liver Function, KFT, Vitamin D, B12, etc.
- Health conditions: Diabetes, Hypertension, Cardiac, Respiratory, Liver, Kidney, Thyroid, Skin, etc.
- Sanjeevani Platform: orders placed within 2 hours express delivery, genuine sourcing from licensed manufacturers, ABDM-compliant health records, prescription uploads verified by certified pharmacists.
- Coupons: First order → SANJEEVANI20 (20% off + free shipping). Circle Members → SJCIRCLE10 (10% cashback). Lab tests → LABFIRST50.
- Pricing: All medicines at Sanjeevani are 5–60% cheaper than MRP. Free delivery on orders above ₹500.
- Safety: Prescription drugs (Rx) require a valid prescription. OTC drugs are available without prescription.
- Indian pharmacy regulations (CDSCO), common drug schedules (H, X, G), and AYUSH medicines.

Communication style:
- Be warm, professional, and extremely helpful. Use clear bullet points and formatting for detailed answers.
- Always recommend consulting a doctor for diagnosis. Never substitute for actual medical advice.
- For serious symptoms (chest pain, breathlessness, severe headache), urgently advise seeking immediate emergency care.
- Respond in the same language the user writes in (Hindi/English mix is fine).
- Keep responses concise but comprehensive — answer exactly what is asked.

Platform info:
- Website: Sanjeevani Pharmacy (sanjeevani.in)
- Support: 1800-200-1066 | care@sanjeevani.in | Pan-India 24/7
- Return Policy: 30-day hassle-free returns for sealed/unopened products`;

const askGroq = async (userMessage: string, history: { role: string; content: string }[]): Promise<string> => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: PHARMACY_SYSTEM_PROMPT },
        ...history,
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.95,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response right now. Please try again.";
};

// LOGO COMPONENT
function SanjeevaniLogo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white border border-border shadow-xs flex items-center justify-center">
        <img src={logoImg} className="h-full w-full object-cover scale-[1.8] origin-center" alt="Sanjeevani Logo" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white" />
      </div>
      <div className="leading-tight text-left">
        <div className="font-display text-[1.15rem] font-extrabold text-navy tracking-tight">Sanjeevani</div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Pharmacy Store</div>
      </div>
    </div>
  );
}

// MAIN PAGE COMPONENT
function SanjeevaniPharmacyPage() {
  useScrollReveal();

  // STATES
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  
  // Checkout & Payment states
  const [checkoutStep, setCheckoutStep] = useState<null | "delivery" | "payment" | "processing" | "success">(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [deliveryPincode, setDeliveryPincode] = useState("");
  
  const [payMethod, setPayMethod] = useState<"upi" | "card" | "netbanking" | "insurance">("upi");
  const [payCardNum, setPayCardNum] = useState("");
  const [payCardName, setPayCardName] = useState("");
  const [payCardExpiry, setPayCardExpiry] = useState("");
  const [payCardCvv, setPayCardCvv] = useState("");
  const [payCardFocus, setPayCardFocus] = useState<"front" | "back">("front");
  const [payUpiId, setPayUpiId] = useState("");
  const [paySelectedBank, setPaySelectedBank] = useState("");
  const [payCoupon, setPayCoupon] = useState("");
  const [payDiscountApplied, setPayDiscountApplied] = useState(false);
  const [payCouponError, setPayCouponError] = useState("");
  const [payInsurancePolicy, setPayInsurancePolicy] = useState("");
  const [payInsuranceProvider, setPayInsuranceProvider] = useState("");
  const [payTimer, setPayTimer] = useState(299);
  const [placedOrderId, setPlacedOrderId] = useState("");

  // Custom Modals
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [pinCode, setPinCode] = useState("833219");
  const [tempPinCode, setTempPinCode] = useState("833219");
  const [addressName, setAddressName] = useState("Chandil");

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Carousel
  const [bannerIdx, setBannerIdx] = useState(0);



  // Image errors cache
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // SCROLL CONTAINER REFS
  const valueDealsRef = useRef<HTMLDivElement>(null);
  const diabetesRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // SCROLL DETECTION
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 150);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // BANNER AUTOMATION
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % promoBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // SEARCH FILTERING
  const filteredProducts = useMemo(() => {
    if (!q) return [];
    const term = q.toLowerCase();
    return allProducts.filter(
      p => p.name.toLowerCase().includes(term) || p.generic.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }, [q]);

  // CART HANDLERS
  const addToCart = (id: string, type: "medicine" | "lab_test" = "medicine") => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) return prev.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { id, qty: 1, type }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c));
    });
  };

  const getQty = (id: string) => cart.find((c) => c.id === id)?.qty ?? 0;
  
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  
  const totalPrice = cart.reduce((s, c) => {
    const p = allProducts.find((prod) => prod.id === c.id);
    return s + (p?.price ?? 0) * c.qty;
  }, 0);

  const selectedProduct = allProducts.find((p) => p.id === selectedMedId);

  // MOCK ACTIONS
  const handlePinSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPinCode(tempPinCode);
    const pinStr = tempPinCode.trim();
    if (pinStr.startsWith("11")) setAddressName("Delhi");
    else if (pinStr.startsWith("40")) setAddressName("Mumbai");
    else if (pinStr.startsWith("70")) setAddressName("Kolkata");
    else if (pinStr.startsWith("56")) setAddressName("Bengaluru");
    else if (pinStr.startsWith("60")) setAddressName("Chennai");
    else setAddressName("Delivery Area");
    setShowAddressModal(false);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginStep === "phone") {
      if (loginPhone.length < 10) return;
      setLoginStep("otp");
    } else {
      if (loginOtp.length < 4) return;
      setIsLoggedIn(true);
      setUserProfile({ name: "Omkar Acharya", phone: loginPhone });
      setShowLoginModal(false);
      setLoginStep("phone");
      setLoginPhone("");
      setLoginOtp("");
    }
  };

  const simulateRxUpload = () => {
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setUploadSuccess(true);
          setUploadedFile("rx_prescription_scan.pdf");
          return 100;
        }
        return p + 30;
      });
    }, 400);
  };

  // Sync pincode and profile when entering delivery step
  useEffect(() => {
    if (checkoutStep === "delivery") {
      setDeliveryPincode(pinCode);
      if (isLoggedIn && userProfile) {
        setDeliveryName(userProfile.name);
        setDeliveryPhone(userProfile.phone);
      }
    }
  }, [checkoutStep, pinCode, isLoggedIn, userProfile]);

  // QR Code expiration timer for pharmacy checkout
  useEffect(() => {
    if (checkoutStep !== "payment") return;
    const interval = setInterval(() => {
      setPayTimer((t) => (t > 0 ? t - 1 : 299));
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutStep]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPayCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const applyPayCoupon = () => {
    if (payCoupon.trim().toUpperCase() === "SANJEEVANI20") {
      setPayDiscountApplied(true);
      setPayCouponError("");
    } else {
      setPayCouponError("Invalid coupon code.");
      setPayDiscountApplied(false);
    }
  };

  const PharmacyQRCodeSVG = () => (
    <svg viewBox="0 0 100 100" className="h-28 w-28 mx-auto bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
      <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="1.5" />
      <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="0.5" />
      <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="0.2" />
      
      <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="1.5" />
      <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="0.5" />
      <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="0.2" />
      
      <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="1.5" />
      <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="0.5" />
      <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="0.2" />
      
      <rect x="42" y="42" width="16" height="16" fill="#0d9488" rx="2" />
      <path d="M48 50 h4 M50 48 v4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Random QR bits */}
      <rect x="35" y="10" width="5" height="15" fill="#0f172a" />
      <rect x="45" y="5" width="10" height="5" fill="#0f172a" />
      <rect x="60" y="15" width="5" height="5" fill="#0f172a" />
      <rect x="35" y="30" width="15" height="5" fill="#0f172a" />
      <rect x="55" y="30" width="10" height="5" fill="#0f172a" />
      <rect x="30" y="35" width="5" height="10" fill="#0f172a" />
      <rect x="5" y="35" width="15" height="5" fill="#0f172a" />
      
      <rect x="70" y="35" width="15" height="5" fill="#0f172a" />
      <rect x="80" y="45" width="15" height="5" fill="#0f172a" />
      <rect x="65" y="55" width="5" height="10" fill="#0f172a" />
      <rect x="75" y="60" width="20" height="5" fill="#0f172a" />
      
      <rect x="35" y="70" width="5" height="20" fill="#0f172a" />
      <rect x="45" y="75" width="15" height="5" fill="#0f172a" />
      <rect x="60" y="80" width="5" height="5" fill="#0f172a" />
    </svg>
  );

  const handlePlaceOrder = (finalPaidAmount: number) => {
    if (cart.length === 0) return;
    const orderId = `SJ-${Math.floor(100000 + Math.random() * 900000)}`;
    setPlacedOrderId(orderId);
    
    const summary = cart.map(c => {
      const p = allProducts.find(prod => prod.id === c.id);
      return `${p?.name} (${c.qty}x)`;
    }).join(", ");

    const newRecord = {
      id: `r_order_${Date.now()}`,
      type: "prescription" as const,
      title: `Sanjeevani Pharmacy Order #${orderId}`,
      doctor: "Verified Sanjeevani Pharmacist",
      hospital: "Central Warehouse Dispatch",
      date: new Date().toISOString().split("T")[0],
      summary: `Items: ${summary}. Paid: ₹${finalPaidAmount}. Status: Dispatched (Express Delivery in 2 Hours to ${deliveryName}, ${deliveryAddress}).`,
    };

    const localRecords = JSON.parse(localStorage.getItem("userRecords") || "[]");
    localStorage.setItem("userRecords", JSON.stringify([newRecord, ...localRecords]));
  };



  // SCROLL ROW LOGIC
  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const scrollAmt = 500;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmt : scrollAmt,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-600/20 selection:text-navy">
      
      {/* PHARMACY SUB-HEADER BAR */}
      <div className="sticky top-16 z-30 w-full bg-white/95 backdrop-blur-md border-b border-border/80 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Store Title & Delivery Location */}
          <div className="flex items-center gap-4 justify-between md:justify-start">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-teal flex items-center justify-center text-white">
                <Pill className="h-4 w-4" />
              </div>
              <span className="font-display font-bold text-navy text-sm">Pharmacy Store</span>
            </div>
            
            <div className="h-4 w-px bg-border hidden md:block" />
            
            {/* Delivery Address */}
            <button 
              onClick={() => { setTempPinCode(pinCode); setShowAddressModal(true); }}
              className="flex items-center gap-1.5 text-left text-xs font-semibold text-muted-foreground hover:text-teal transition py-1 px-2.5 rounded-lg hover:bg-slate-50 border border-border/60 cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 text-teal animate-pulse" />
              <div>
                <span className="text-slate-400 font-normal">Deliver to: </span>
                <span className="text-navy font-bold">{addressName} {pinCode}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
          </div>

          {/* Center: Search input */}
          <div className="flex-1 max-w-lg relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search medicines, wellness items, categories..."
              className="w-full bg-muted/40 border border-border/80 focus:border-teal/80 focus:bg-white text-xs text-navy rounded-full pl-10 pr-9 py-2.5 outline-none transition"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right: Actions (Upload & Cart) */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            {/* Upload Prescription */}
            <button 
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-teal/20 bg-teal/5 text-teal hover:bg-teal hover:text-white px-3.5 py-2 text-xs font-bold transition cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Rx</span>
            </button>

            {/* Cart Icon */}
            <button 
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-xl bg-muted/65 hover:bg-muted text-navy transition cursor-pointer flex items-center justify-center h-9 w-9"
            >
              <ShoppingCart className="h-4.5 w-4.5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[9px] font-black w-5 h-5 rounded-full grid place-items-center border-2 border-white shadow animate-scale-in">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* SANJEEVANI CATEGORIES SUB-NAV */}
      <div className="bg-navy text-white/95 overflow-x-auto whitespace-nowrap scrollbar-none py-3 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between gap-6 px-4 text-xs font-semibold">
          {[
            "Sanjeevani Products", "Baby Care", "Nutritional Drinks & Supplements", 
            "Women Care", "Personal Care", "Ayurveda", "Health Devices", 
            "Home Essentials", "Health Condition"
          ].map((catName, idx) => (
            <button 
              key={idx}
              onClick={() => setQ(catName === "Sanjeevani Products" ? "Sanjeevani" : catName)}
              className="hover:text-teal transition cursor-pointer"
            >
              {catName}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH RESULTS VIEW */}
      {q ? (
        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-black text-slate-800">Search Results</h1>
              <p className="text-xs text-slate-500 mt-1">Found {filteredProducts.length} items for "{q}"</p>
            </div>
            <button 
              onClick={() => setQ("")}
              className="text-xs font-bold text-navy hover:underline"
            >
              Back to Home
            </button>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((p) => {
                const qty = getQty(p.id);
                const discount = p.discount || Math.round((1 - p.price / p.mrp) * 100);
                return (
                  <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition">
                    <div>
                      {/* Image */}
                      <div 
                        onClick={() => setSelectedMedId(p.id)}
                        className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center p-3 cursor-pointer"
                      >
                        {imgErrors[p.id] ? (
                          <Pill className="h-10 w-10 text-slate-300" />
                        ) : (
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            onError={() => setImgErrors(prev => ({ ...prev, [p.id]: true }))}
                            className="h-full w-full object-contain mix-blend-multiply" 
                          />
                        )}
                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-teal text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                            {discount}% OFF
                          </div>
                        )}
                        {p.prescription && (
                          <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                            Rx Required
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mb-1">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{p.rating}</span>
                      </div>
                      <h3 
                        onClick={() => setSelectedMedId(p.id)}
                        className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-teal transition cursor-pointer min-h-[32px]"
                      >
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.generic}</p>
                    </div>

                    {/* Pricing / CTA */}
                    <div className="mt-4 pt-3 border-t border-slate-50">
                      <div className="flex items-baseline gap-1.5 mb-2.5">
                        <span className="text-sm font-black text-slate-800">₹{p.price}</span>
                        {p.mrp > p.price && (
                          <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                        )}
                      </div>
                      
                      {qty === 0 ? (
                        <button 
                          onClick={() => addToCart(p.id, p.category === "Lab Tests" ? "lab_test" : "medicine")}
                          className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-2 rounded-lg transition uppercase tracking-wider cursor-pointer"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center justify-between border border-teal rounded-lg overflow-hidden bg-slate-50/50">
                          <button 
                            onClick={() => removeFromCart(p.id)}
                            className="px-2 py-1.5 text-navy hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-xs font-bold text-slate-800">{qty}</span>
                          <button 
                            onClick={() => addToCart(p.id)}
                            className="px-2 py-1.5 text-navy hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-8 max-w-md mx-auto">
              <Pill className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-800">No products found</h2>
              <p className="text-xs text-slate-400 mt-2">We couldn't find matches for "{q}". Try typing another medicine name like Paracetamol, Metformin or check spelling.</p>
              <button 
                onClick={() => setQ("")}
                className="mt-6 bg-navy hover:bg-teal text-white text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </main>
      ) : (
        /* SANJEEVANI PHARMACY HOMEPAGE CONTENT */
        <>
          {/* HERO SEARCH SECTION & PROMO CAROUSEL */}
          <section className="bg-navy py-12 text-white relative overflow-hidden noise">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid md:grid-cols-12 gap-8 items-center">
              
              {/* Left search card */}
              <div className="md:col-span-7 space-y-6">
                <div className="space-y-2">
                  <h1 className="text-3xl md:text-4xl font-extrabold font-display leading-tight tracking-tight">
                    Buy Medicines and Essentials
                  </h1>
                  <p className="text-sm text-emerald-100/80">
                    Search from 50,000+ authentic items from Sanjeevani's trusted pharmacy network.
                  </p>
                </div>

                {/* Hero search bar */}
                <div className="bg-white rounded-2xl p-1.5 shadow-xl flex items-center gap-2 border border-teal/20">
                  <div className="flex-1 flex items-center gap-2 pl-3">
                    <Search className="h-5 w-5 text-slate-400 shrink-0" />
                    <input 
                      type="text" 
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search medicines (e.g. Dolo 650, Volini, Metformin)..."
                      className="w-full bg-transparent text-slate-800 text-sm py-2.5 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setQ(q || "Paracetamol")}
                    className="bg-teal hover:bg-teal/90 text-white text-xs font-bold px-6 py-3 rounded-xl transition uppercase cursor-pointer"
                  >
                    Search
                  </button>
                </div>

                {/* Trust badges */}
                <div className="flex items-center gap-6 text-[11px] text-slate-300 pt-2 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal" /> 100% Genuine Guarantee
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-teal" /> Express Home Delivery
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-teal" /> Best Prices & Discounts
                  </span>
                </div>
              </div>

              {/* Right promo carousel */}
              <div className="md:col-span-5 relative">
                <div className="relative overflow-hidden rounded-2xl h-48 w-full shadow-2xl bg-gradient-to-br from-emerald-800 to-teal-950 p-6 flex flex-col justify-between border border-emerald-700/30">
                  {promoBanners.map((b, idx) => (
                    <div 
                      key={b.id} 
                      className={`absolute inset-0 bg-gradient-to-br ${b.bg} p-6 flex flex-col justify-between transition-opacity duration-700 ${
                        idx === bannerIdx ? "opacity-100 z-10" : "opacity-0 z-0"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="bg-white/10 text-white/90 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-white/10 inline-block">
                          {b.title}
                        </span>
                        <h2 className="text-xl font-extrabold text-white font-display mt-2 leading-snug">
                          {b.heading}
                        </h2>
                        <p className="text-xs text-slate-200">
                          {b.subheading}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <span className={`text-[10px] font-bold ${b.accent}`}>
                          *T&C Apply
                        </span>
                        <button 
                          onClick={() => {
                            if (b.id === 1) setQ("Sanjeevani");
                            if (b.id === 2) setShowLoginModal(true);
                            if (b.id === 3) setShowUploadModal(true);
                          }}
                          className="bg-white hover:bg-slate-50 text-slate-800 text-[10px] font-bold px-4 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Explore</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicators */}
                  <div className="absolute bottom-4 left-6 flex gap-1.5 z-20">
                    {promoBanners.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setBannerIdx(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === bannerIdx ? "bg-white w-4" : "bg-white/40 w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* QUICK LINKS SECTION (4 cards Grid) */}
          <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Prescription Card */}
              <div 
                onClick={() => setShowUploadModal(true)}
                className="bg-teal/5 border border-teal/10 rounded-2xl p-5 hover:shadow-md transition cursor-pointer flex items-start gap-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal text-white shadow-sm">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Upload Prescription</h3>
                  <p className="text-xs text-slate-500">Get flat 20%* off on prescription medicines.</p>
                  <span className="text-[10px] font-bold text-teal hover:underline flex items-center gap-0.5 mt-2 font-display">
                    UPLOAD NOW <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* Doctor Consult Card */}
              <Link 
                to="/book"
                className="bg-purple-50/70 border border-purple-100 rounded-2xl p-5 hover:shadow-md transition cursor-pointer flex items-start gap-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-600 text-white shadow-sm">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Doctor Appointment</h3>
                  <p className="text-xs text-slate-500">Consult certified specialists online in 10 mins.</p>
                  <span className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-0.5 mt-2">
                    BOOK NOW <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>

              {/* Health Insurance Card */}
              <div 
                onClick={() => alert("Explore comprehensive healthcare plans by contacting our health partners. Coming soon!")}
                className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5 hover:shadow-md transition cursor-pointer flex items-start gap-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Health Insurance</h3>
                  <p className="text-xs text-slate-500">Cashless medical coverage, explore affordable premiums.</p>
                  <span className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-0.5 mt-2">
                    EXPLORE PLANS <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* Lab Tests Card */}
              <div 
                onClick={() => {
                  if (labRef.current) {
                    labRef.current.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 hover:shadow-md transition cursor-pointer flex items-start gap-4"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-500 text-white shadow-sm">
                  <Microscope className="h-6 w-6" />
                </div>
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Lab Tests</h3>
                  <p className="text-xs text-slate-500">Diagnostic testing from home with certified reports.</p>
                  <span className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5 mt-2">
                    AT HOME <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* BROWSE BY HEALTH CONDITION */}
          <section className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <h2 className="text-lg font-black text-slate-800 mb-5 text-left font-display">
              Browse by Health Conditions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              {healthConditions.map((cond) => (
                <div 
                  key={cond.id}
                  onClick={() => setQ(cond.name.replace(" Care", ""))}
                  className="bg-white border border-slate-100 hover:border-teal rounded-2xl p-4 text-center cursor-pointer transition shadow-xs hover:shadow-md group flex flex-col items-center justify-center gap-2.5"
                >
                  <span className="text-2xl group-hover:scale-110 transition duration-300">
                    {cond.icon}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-teal transition">
                    {cond.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* VALUE DEALS SECTION (Rs 100 Deals) */}
          <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 font-display">
                Value Deals at Rs 100
              </h2>
              <button onClick={() => setQ("Personal Care")} className="text-xs font-bold text-teal hover:underline uppercase tracking-wider">
                View All
              </button>
            </div>
            
            <div className="relative group">
              {/* Scroll buttons */}
              <button 
                onClick={() => scrollContainer(valueDealsRef, "left")}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => scrollContainer(valueDealsRef, "right")}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div 
                ref={valueDealsRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {valueDeals.map((p) => {
                  const qty = getQty(p.id);
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition min-w-[210px] max-w-[210px] shrink-0 snap-start"
                    >
                      <div>
                        {/* Image */}
                        <div 
                          onClick={() => setSelectedMedId(p.id)}
                          className="aspect-square bg-slate-50/50 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center p-3 cursor-pointer"
                        >
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="h-full w-full object-contain mix-blend-multiply" 
                          />
                          <div className="absolute top-2 left-2 bg-teal text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            Value Deal
                          </div>
                        </div>

                        {/* Title */}
                        <h3 
                          onClick={() => setSelectedMedId(p.id)}
                          className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-teal transition cursor-pointer min-h-[32px]"
                        >
                          {p.name}
                        </h3>
                      </div>

                      {/* Pricing / CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-50">
                        <div className="flex items-baseline gap-1.5 mb-2.5">
                          <span className="text-sm font-black text-slate-800">₹{p.price}</span>
                          <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                          <span className="text-[9px] text-teal font-bold">{p.discount}% OFF</span>
                        </div>
                        
                        {qty === 0 ? (
                          <button 
                            onClick={() => addToCart(p.id)}
                            className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-2 rounded-lg transition uppercase tracking-wider cursor-pointer"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-between border border-teal rounded-lg overflow-hidden bg-slate-50/50">
                            <button 
                              onClick={() => removeFromCart(p.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">{qty}</span>
                            <button 
                              onClick={() => addToCart(p.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* BANNER 2: PROMOTION STRIP */}
          <section className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-navy to-teal/70 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-4 border border-teal/20 shadow-md">
              <div className="space-y-1 text-center sm:text-left">
                <span className="bg-teal text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  NEW BENEFIT
                </span>
                <h3 className="text-lg font-black font-display mt-2">
                  Save Up to 25% on Your Medicine Spends With Sanjeevani Credit Card SELECT
                </h3>
                <p className="text-xs text-emerald-100/70">
                  Earn Reward Points on Pharmacy, Diagnostics, and Consultations.
                </p>
              </div>
              <button 
                onClick={() => alert("Redirecting to Credit Card Application Form. Coming soon!")}
                className="bg-teal hover:bg-teal/90 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition shadow cursor-pointer"
              >
                Apply Now
              </button>
            </div>
          </section>

          {/* POPULAR LAB TESTS SECTION */}
          <section ref={labRef} className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 font-display">
                Popular Lab Tests
              </h2>
              <button onClick={() => alert("Full Diagnostics booking catalog coming soon!")} className="text-xs font-bold text-teal hover:underline uppercase tracking-wider">
                View All
              </button>
            </div>

            <div className="relative group">
              <button 
                onClick={() => scrollContainer(labRef, "left")}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => scrollContainer(labRef, "right")}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div 
                ref={labRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {labTests.map((t) => {
                  const qty = getQty(t.id);
                  return (
                    <div 
                      key={t.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition min-w-[260px] max-w-[260px] shrink-0 snap-start"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-2xl">🧪</div>
                          <span className="text-[9px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">
                            Safe lab-at-home
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px]">
                          {t.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">{t.testsCount} Tests Included</p>
                        
                        <div className="flex items-center gap-1 mt-3">
                          <span className="text-xs bg-slate-50 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-100 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {t.rating}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-navy">₹{t.price}</span>
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{t.mrp}</span>
                        </div>

                        {qty === 0 ? (
                          <button 
                            onClick={() => addToCart(t.id, "lab_test")}
                            className="bg-transparent border border-navy text-navy hover:bg-navy hover:text-white text-xs font-bold px-4 py-1.5 rounded-lg transition uppercase cursor-pointer"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 bg-slate-50 border border-navy rounded-lg">
                            <button 
                              onClick={() => removeFromCart(t.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-1 text-xs font-bold text-slate-800">{qty}</span>
                            <button 
                              onClick={() => addToCart(t.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ONETOUCH DIABETES MANAGEMENT */}
          <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-800 font-display">
                OneTouch Diabetes Management
              </h2>
              <button onClick={() => setQ("Diabetes")} className="text-xs font-bold text-teal hover:underline uppercase tracking-wider">
                View All
              </button>
            </div>

            <div className="relative group">
              {/* Scroll buttons */}
              <button 
                onClick={() => scrollContainer(diabetesRef, "left")}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => scrollContainer(diabetesRef, "right")}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div 
                ref={diabetesRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {diabetesDeals.map((p) => {
                  const qty = getQty(p.id);
                  return (
                    <div 
                      key={p.id} 
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-lg transition min-w-[210px] max-w-[210px] shrink-0 snap-start"
                    >
                      <div>
                        {/* Image */}
                        <div 
                          onClick={() => setSelectedMedId(p.id)}
                          className="aspect-square bg-slate-50/50 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center p-3 cursor-pointer"
                        >
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="h-full w-full object-contain mix-blend-multiply" 
                          />
                        </div>

                        {/* Title */}
                        <h3 
                          onClick={() => setSelectedMedId(p.id)}
                          className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-teal transition cursor-pointer min-h-[32px]"
                        >
                          {p.name}
                        </h3>
                      </div>

                      {/* Pricing / CTA */}
                      <div className="mt-4 pt-3 border-t border-slate-50">
                        <div className="flex items-baseline gap-1.5 mb-2.5">
                          <span className="text-sm font-black text-slate-800">₹{p.price}</span>
                          {p.mrp > p.price && (
                            <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                          )}
                          {p.discount > 0 && (
                            <span className="text-[9px] text-teal font-bold">{p.discount}% OFF</span>
                          )}
                        </div>
                        
                        {qty === 0 ? (
                          <button 
                            onClick={() => addToCart(p.id)}
                            className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-2 rounded-lg transition uppercase tracking-wider cursor-pointer"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center justify-between border border-teal rounded-lg overflow-hidden bg-slate-50/50">
                            <button 
                              onClick={() => removeFromCart(p.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-bold text-slate-800">{qty}</span>
                            <button 
                              onClick={() => addToCart(p.id)}
                              className="px-2 py-1 text-navy hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SHOP BY BRAND */}
          <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <h2 className="text-lg font-black text-slate-800 mb-5 text-left font-display">
              Shop By Brand
            </h2>

            <div className="relative group">
              <button 
                onClick={() => scrollContainer(brandRef, "left")}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={() => scrollContainer(brandRef, "right")}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 bg-white border border-slate-100 rounded-full shadow-md text-slate-600 hover:text-navy hover:scale-105 transition grid place-items-center cursor-pointer opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div 
                ref={brandRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {brands.map((b) => (
                  <div 
                    key={b.id}
                    onClick={() => setQ(b.name)}
                    className="bg-white border border-slate-100 rounded-2xl px-6 py-6 text-center cursor-pointer transition hover:shadow-md hover:border-teal min-w-[140px] max-w-[140px] shrink-0 snap-start flex flex-col items-center justify-center min-h-[90px]"
                  >
                    <span className={b.color}>{b.logoText}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-wider">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SHOP BY CATEGORY */}
          <section className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-5 text-left font-display">
              Shop By Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {categories.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => setQ(c.name)}
                  className="bg-white border border-slate-100 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-teal transition flex flex-col items-center p-3 text-center"
                >
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center mb-3">
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* MOCK SANJEEVANI FEATURES FOOTER */}
          <section className="bg-white py-10 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-center text-lg font-black text-navy mb-8 font-display uppercase tracking-wider">
                Why Choose Sanjeevani Pharmacy?
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-teal/10 text-teal grid place-items-center">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">100% Genuine Medicine</h3>
                  <p className="text-xs text-slate-400 max-w-xs">All products sourced directly from manufacturers with rigorous audits.</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-teal/10 text-teal grid place-items-center">
                    <Truck className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">2 Hours Express Delivery</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Super fast doorstep delivery from your nearest Sanjeevani Pharmacy branch.</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-teal/10 text-teal grid place-items-center">
                    <Tag className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Easy Returns & Exchanges</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Hassle-free 30-day return policy for unopened medicine strips and devices.</p>
                </div>
                <div className="space-y-2 flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-teal/10 text-teal grid place-items-center">
                    <Pill className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Certified Pharmacists</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Free tele-verification and prescription consultation by experts.</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}



      {/* ADDRESS / LOCATION MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-xs" onClick={() => setShowAddressModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center">
            <div className="h-12 w-12 bg-teal/10 text-teal rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-md">Enter Delivery Location</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">Enter your PIN code to check active stores and express delivery times.</p>
            
            <form onSubmit={handlePinSave} className="space-y-4">
              <input 
                type="text"
                maxLength={6}
                value={tempPinCode}
                onChange={(e) => setTempPinCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit PIN code (e.g. 833219)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-sm font-extrabold text-navy tracking-[0.2em] outline-none focus:border-teal focus:bg-white"
              />
              <button 
                type="submit" 
                className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider cursor-pointer"
              >
                Apply Location
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-xs" onClick={() => setShowLoginModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <button onClick={() => setShowLoginModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6">
              <SanjeevaniLogo />
              <h3 className="font-extrabold text-slate-800 text-md mt-4">Welcome to Sanjeevani Pharmacy</h3>
              <p className="text-xs text-slate-400 mt-1">Sign in with phone and access diagnostics, consultations & health record histories.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginStep === "phone" ? (
                <div className="space-y-3">
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-400 border-r border-slate-200 pr-2 mr-2">+91</span>
                    <input 
                      type="tel"
                      maxLength={10}
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter mobile number"
                      className="w-full bg-transparent text-sm text-slate-800 font-semibold outline-none"
                    />
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider cursor-pointer"
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-xs text-teal font-semibold">Simulated OTP sent to +91 {loginPhone}</p>
                  <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <input 
                      type="text"
                      maxLength={4}
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 4-digit code (e.g. 1234)"
                      className="w-full bg-transparent text-center text-sm font-extrabold text-slate-800 tracking-[0.4em] outline-none"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full bg-teal hover:bg-navy text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider cursor-pointer"
                  >
                    Verify & Login
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLoginStep("phone")}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-600 hover:underline pt-2"
                  >
                    Change phone number
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* PRESCRIPTION UPLOADER MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-xs" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <button onClick={() => setShowUploadModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <h3 className="font-extrabold text-slate-800 text-md">Upload Doctor Prescription</h3>
              <p className="text-xs text-slate-400 mt-1">Upload a photo or PDF of your doctor's prescription. Our pharmacists will decode it and add the right medicines to your cart.</p>
            </div>

            {uploadSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-14 w-14 bg-teal/10 text-teal rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Prescription Received!</h4>
                  <p className="text-xs text-slate-500 mt-1">File: <span className="font-bold text-navy">{uploadedFile}</span></p>
                </div>
                <div className="bg-teal/5 border border-teal/10 p-4 rounded-2xl text-left max-w-sm mx-auto">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Success Reward Applied</p>
                  <p className="text-xs text-teal font-bold mt-1">20% discount coupon applied. A pharmacist will call you in 5 minutes to verify items.</p>
                </div>
                <button 
                  onClick={() => { setShowUploadModal(false); setUploadSuccess(false); setUploadProgress(0); }}
                  className="bg-navy hover:bg-teal text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {uploadProgress > 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <p className="text-xs font-semibold text-slate-500">Uploading prescription scan...</p>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                      <div className="bg-teal h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-navy">{uploadProgress}% Complete</span>
                  </div>
                ) : (
                  <>
                    <div 
                      onClick={simulateRxUpload}
                      className="border-2 border-dashed border-slate-200 hover:border-teal bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
                    >
                      <Upload className="h-10 w-10 text-slate-300 group-hover:text-teal" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Click to upload prescription</p>
                        <p className="text-[10px] text-slate-400 mt-1">Supports PDF, JPG, PNG up to 10MB</p>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-100 p-4.5 rounded-2xl flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-left leading-normal">
                        <p className="text-[10px] font-extrabold text-amber-800 uppercase">Privacy Guarantee</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">Your prescription is encrypted securely and only viewed by certified clinical pharmacists to dispense medicines.</p>
                      </div>
                    </div>

                    <button 
                      onClick={simulateRxUpload}
                      className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider cursor-pointer"
                    >
                      Use Sample Prescription
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEDICINE DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-xs" onClick={() => setSelectedMedId(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto scrollbar-thin">
            <button onClick={() => setSelectedMedId(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition">
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col md:flex-row gap-5 items-start mt-2">
              <div className="w-full md:w-1/3 aspect-square bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-4 relative shrink-0">
                {imgErrors[selectedProduct.id] ? (
                  <Pill className="h-12 w-12 text-slate-300" />
                ) : (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full w-full object-contain mix-blend-multiply" />
                )}
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase">
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.prescription && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">
                      Rx
                    </span>
                  )}
                </div>
                
                <h2 className="text-base font-extrabold text-slate-800 mt-2 font-display">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5 italic">{selectedProduct.generic}</p>
                
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-500 font-bold">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{selectedProduct.rating}</span>
                  <span className="text-slate-300 font-normal ml-1">· Manufacturer: {selectedProduct.manufacturer}</span>
                </div>

                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-xl font-black text-slate-800">₹{selectedProduct.price}</span>
                  <span className="text-xs text-slate-400 line-through">₹{selectedProduct.mrp}</span>
                  <span className="text-xs text-teal font-extrabold">
                    {Math.round((1 - selectedProduct.price / selectedProduct.mrp) * 100)}% OFF
                  </span>
                </div>
              </div>
            </div>

            {/* Description Sections */}
            <div className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-left">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dosage Directions</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedProduct.dosage}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Therapeutic Uses</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedProduct.uses}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Potential Side Effects</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedProduct.sideEffects}</p>
              </div>
            </div>

            {/* Cart action inside modal */}
            <div className="mt-8 border-t border-slate-100 pt-4 flex gap-4">
              <button 
                onClick={() => { addToCart(selectedProduct.id); setSelectedMedId(null); }}
                className="flex-1 bg-navy hover:bg-teal text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider cursor-pointer"
              >
                Add to Cart
              </button>
              <button 
                onClick={() => setSelectedMedId(null)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-6 py-3 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {showCart && (
        <div className="fixed inset-0 z-[110] overflow-hidden">
          <style>{`
            .perspective-1000 {
              perspective: 1000px;
            }
            .transform-style-3d {
              transform-style: preserve-3d;
            }
            .backface-hidden {
              backface-visibility: hidden;
            }
            .rotate-y-180 {
              transform: rotateY(180deg);
            }
          `}</style>

          <div className="absolute inset-0 bg-navy/40 backdrop-blur-xs transition-opacity" onClick={() => {
            if (checkoutStep !== "processing") {
              setShowCart(false);
              setCheckoutStep(null);
            }
          }} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-slide-right text-left">
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-md">
                    {checkoutStep === null && "Your Cart"}
                    {checkoutStep === "delivery" && "Delivery Address"}
                    {checkoutStep === "payment" && "Secure Checkout"}
                    {checkoutStep === "processing" && "Processing..."}
                    {checkoutStep === "success" && "Order Confirmed!"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {checkoutStep === null && `${totalItems} items selected`}
                    {checkoutStep === "delivery" && "Enter delivery destination"}
                    {checkoutStep === "payment" && "Choose payment mode"}
                    {checkoutStep === "processing" && "Securing ABDM gateway"}
                    {checkoutStep === "success" && "Arriving in 2 Hours"}
                  </p>
                </div>
                {checkoutStep !== "processing" && checkoutStep !== "success" && (
                  <button 
                    onClick={() => {
                      setShowCart(false);
                      setCheckoutStep(null);
                    }} 
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-xl transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin relative bg-slate-50/15">
                
                {/* 1. CART LIST */}
                {checkoutStep === null && (
                  <>
                    {cart.length > 0 ? (
                      cart.map((item) => {
                        const p = allProducts.find((prod) => prod.id === item.id);
                        if (!p) return null;
                        return (
                          <div key={item.id} className="flex gap-3 bg-white border border-slate-100 p-3 rounded-2xl hover:shadow-xs transition items-center">
                            <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-center p-2 relative">
                              {imgErrors[p.id] ? (
                                <Pill className="h-8 w-8 text-slate-300" />
                              ) : (
                                <img src={p.image} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">{p.name}</h4>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">{p.generic}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-xs font-black text-slate-850">₹{p.price * item.qty}</span>
                                {item.qty > 1 && (
                                  <span className="text-[9px] text-slate-455 font-semibold">(₹{p.price}/item)</span>
                                )}
                              </div>
                            </div>

                            {/* Quantity adjuster */}
                            <div className="flex items-center border border-teal/20 rounded-lg overflow-hidden bg-white shrink-0 shadow-2xs">
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="px-1.5 py-1 hover:bg-slate-50 text-navy transition cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-1 text-xs font-bold text-slate-800">{item.qty}</span>
                              <button 
                                onClick={() => addToCart(item.id)}
                                className="px-1.5 py-1 hover:bg-slate-50 text-navy transition cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-16">
                        <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h4 className="font-bold text-slate-800 text-sm">Cart is empty</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Explore value deals, diagnostics and add items to your health basket.</p>
                      </div>
                    )}
                  </>
                )}

                {/* 2. DELIVERY DETAILS STEP */}
                {checkoutStep === "delivery" && (
                  <div className="space-y-4 animate-fade-up">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Receiver Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Omkar Acharya" 
                        value={deliveryName}
                        onChange={(e) => setDeliveryName(e.target.value)}
                        className="w-full bg-white text-navy text-xs px-3.5 py-3 rounded-xl border border-border outline-none focus:border-teal mt-1 transition shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                      <div className="relative flex items-center bg-white border border-border rounded-xl px-3.5 py-1 focus-within:border-teal mt-1 transition shadow-2xs">
                        <span className="text-xs font-bold text-slate-400 border-r border-slate-200 pr-2 mr-2">+91</span>
                        <input 
                          type="text" 
                          maxLength={10}
                          placeholder="10-digit number" 
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="w-full bg-transparent py-2.5 text-xs text-navy outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Delivery Address</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. Flat 302, Green Meadows, 5th Cross Road" 
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-white text-navy text-xs px-3.5 py-3 rounded-xl border border-border outline-none focus:border-teal mt-1 transition resize-none shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">City</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Jamshedpur" 
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          className="w-full bg-white text-navy text-xs px-3.5 py-3 rounded-xl border border-border outline-none focus:border-teal mt-1 transition shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">State</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Jharkhand" 
                          value={deliveryState}
                          onChange={(e) => setDeliveryState(e.target.value)}
                          className="w-full bg-white text-navy text-xs px-3.5 py-3 rounded-xl border border-border outline-none focus:border-teal mt-1 transition shadow-2xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Delivery PIN Code</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        placeholder="e.g. 833219" 
                        value={deliveryPincode}
                        onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, ""))}
                        className="w-full bg-white text-navy text-xs px-3.5 py-3 rounded-xl border border-border outline-none focus:border-teal mt-1 font-mono tracking-widest text-center transition shadow-2xs"
                      />
                    </div>
                  </div>
                )}

                {/* 3. SECURE PAYMENT STEP */}
                {checkoutStep === "payment" && (
                  <div className="space-y-4 animate-fade-up">
                    
                    {/* Mode Tabs */}
                    <div className="grid grid-cols-4 gap-1.5 border border-slate-100 bg-slate-100 p-1 rounded-xl shadow-2xs">
                      {[
                        { id: "upi", label: "UPI / QR", icon: QrCode },
                        { id: "card", label: "Card", icon: CreditCard },
                        { id: "netbanking", label: "Netbank", icon: Building2 },
                        { id: "insurance", label: "ABHA", icon: ShieldCheck }
                      ].map((method) => {
                        const Icon = method.icon;
                        const active = payMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPayMethod(method.id as any)}
                            className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black transition duration-150 cursor-pointer ${
                              active 
                                ? "bg-white text-teal shadow-xs" 
                                : "text-slate-500 hover:text-navy"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{method.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Method Content Panel */}
                    <div className="min-h-[190px] flex flex-col justify-center border border-slate-100/60 bg-white p-3 rounded-2xl shadow-2xs">
                      
                      {/* UPI */}
                      {payMethod === "upi" && (
                        <div className="space-y-3 text-center animate-fade-up">
                          <PharmacyQRCodeSVG />
                          <div>
                            <p className="text-xs font-bold text-navy">Scan with GPay, PhonePe or Paytm</p>
                            <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3 text-warning" /> QR expires in <span className="font-mono font-bold text-warning">{formatTimer(payTimer)}</span>
                            </p>
                          </div>
                          
                          <div className="max-w-xs mx-auto text-left">
                            <span className="text-[9px] text-muted-foreground block font-bold uppercase tracking-wider">Or Enter UPI ID</span>
                            <div className="flex gap-1.5 mt-1">
                              <input 
                                type="text" 
                                placeholder="name@upi" 
                                value={payUpiId}
                                onChange={(e) => setPayUpiId(e.target.value)}
                                className="bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border flex-1 outline-none font-semibold"
                              />
                              <button 
                                type="button" 
                                onClick={() => setPayUpiId("patient@okaxis")} 
                                className="bg-teal text-white px-3 py-1.5 rounded-lg text-[9px] font-bold hover:opacity-90 cursor-pointer"
                              >
                                Verify
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card */}
                      {payMethod === "card" && (
                        <div className="space-y-3 animate-fade-up">
                          
                          {/* Sized-down Flipping Credit Card Visual */}
                          <div className="perspective-1000 py-1 scale-90">
                            <div className={`relative w-[220px] h-[120px] mx-auto transition-transform duration-500 transform-style-3d ${payCardFocus === "back" ? "rotate-y-180" : ""}`}>
                              {/* Front */}
                              <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-3 backface-hidden shadow-md flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                  <span className="text-[6px] font-mono tracking-widest text-slate-400 font-bold">SANJEEVANI CARD</span>
                                  <div className="h-3.5 w-6 bg-white/10 rounded flex items-center justify-center font-bold text-[6px] text-slate-350">
                                    {payCardNum.startsWith("4") ? "VISA" : payCardNum.startsWith("5") ? "MC" : "CARD"}
                                  </div>
                                </div>
                                <div className="font-mono text-[10px] tracking-widest text-slate-100 py-1">
                                  {payCardNum ? payCardNum : "•••• •••• •••• ••••"}
                                </div>
                                <div className="flex justify-between items-end">
                                  <div className="min-w-0 pr-1">
                                    <span className="text-[5px] text-slate-400 block uppercase font-mono">Card Holder</span>
                                    <span className="font-mono text-[7px] uppercase truncate block">{payCardName || "PATIENT NAME"}</span>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <span className="text-[5px] text-slate-400 block uppercase font-mono">Expires</span>
                                    <span className="font-mono text-[7px]">{payCardExpiry || "MM/YY"}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Back */}
                              <div className="absolute inset-0 w-full h-full rounded-xl bg-gradient-to-tr from-slate-950 to-slate-900 text-white backface-hidden rotate-y-180 shadow-md flex flex-col justify-between py-2.5">
                                <div className="w-full h-5 bg-black/90" />
                                <div className="px-3">
                                  <div className="flex items-center justify-end bg-white/10 rounded pr-1">
                                    <span className="font-mono text-[9px] italic font-bold tracking-widest py-0.5 text-slate-200">{payCardCvv || "•••"}</span>
                                  </div>
                                </div>
                                <div className="px-3 flex justify-between items-center text-[5px] text-slate-500 font-mono">
                                  <span>3D SECURE VAULT</span>
                                  <span>SSL SECURED</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <input 
                              type="text" 
                              placeholder="Card Number" 
                              maxLength={19}
                              value={payCardNum}
                              onFocus={() => setPayCardFocus("front")}
                              onChange={(e) => setPayCardNum(formatPayCardNumber(e.target.value))}
                              className="w-full bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border font-mono outline-none focus:border-teal"
                            />

                            <input 
                              type="text" 
                              placeholder="Cardholder Name" 
                              value={payCardName}
                              onFocus={() => setPayCardFocus("front")}
                              onChange={(e) => setPayCardName(e.target.value)}
                              className="w-full bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border outline-none focus:border-teal"
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="text" 
                                placeholder="MM/YY" 
                                maxLength={5}
                                value={payCardExpiry}
                                onFocus={() => setPayCardFocus("front")}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, "");
                                  if (val.length > 2) {
                                    val = val.slice(0, 2) + "/" + val.slice(2, 4);
                                  }
                                  setPayCardExpiry(val);
                                }}
                                className="w-full bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border text-center outline-none focus:border-teal"
                              />
                              <input 
                                type="password" 
                                placeholder="CVV" 
                                maxLength={3}
                                value={payCardCvv}
                                onFocus={() => setPayCardFocus("back")}
                                onChange={(e) => setPayCardCvv(e.target.value.replace(/\D/g, ""))}
                                className="w-full bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border text-center font-mono outline-none focus:border-teal"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Netbanking */}
                      {payMethod === "netbanking" && (
                        <div className="space-y-3 animate-fade-up text-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Select Bank</span>
                          <div className="grid grid-cols-2 gap-2">
                            {["SBI", "HDFC", "ICICI", "AXIS"].map((bank) => (
                              <button
                                key={bank}
                                type="button"
                                onClick={() => setPaySelectedBank(bank)}
                                className={`py-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                  paySelectedBank === bank 
                                    ? "border-teal bg-teal/5 text-teal shadow-2xs" 
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-350"
                                }`}
                              >
                                {bank} Bank
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Insurance */}
                      {payMethod === "insurance" && (
                        <div className="space-y-2 animate-fade-up max-w-xs mx-auto">
                          <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-[9px] font-semibold text-emerald-800 leading-normal">
                            Link your ABHA address to request cashless claims through Star Health or government policies.
                          </div>
                          <select 
                            value={payInsuranceProvider}
                            onChange={(e) => setPayInsuranceProvider(e.target.value)}
                            className="w-full rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-navy outline-none cursor-pointer mt-1"
                          >
                            <option value="">Choose Insurer...</option>
                            <option value="star">Star Health</option>
                            <option value="niva">Niva Bupa</option>
                            <option value="lic">LIC Health Care</option>
                          </select>
                          <input 
                            type="text" 
                            placeholder="ABHA address / Policy ID" 
                            value={payInsurancePolicy}
                            onChange={(e) => setPayInsurancePolicy(e.target.value)}
                            className="w-full bg-slate-50 text-navy text-xs px-3 py-1.5 rounded-lg border border-border outline-none focus:border-teal"
                          />
                        </div>
                      )}

                    </div>

                    {/* Promo Coupon Section */}
                    <div className="border border-dashed border-teal/20 bg-teal-50/10 p-3 rounded-2xl space-y-2 shadow-2xs">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <Tag className="h-3.5 w-3.5 text-teal" />
                        <span>Promotional Coupon Code</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="e.g. SANJEEVANI20" 
                          value={payCoupon}
                          onChange={(e) => setPayCoupon(e.target.value)}
                          className="bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border flex-1 font-bold tracking-wider"
                        />
                        <button 
                          type="button" 
                          onClick={applyPayCoupon}
                          className="bg-navy text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-slate-900 cursor-pointer transition active:scale-95"
                        >
                          Apply
                        </button>
                      </div>

                      {payCouponError && <p className="text-[9px] text-destructive font-bold">{payCouponError}</p>}
                      
                      {!payDiscountApplied && (
                        <div 
                          onClick={() => { setPayCoupon("SANJEEVANI20"); setPayDiscountApplied(false); }}
                          className="text-[9px] font-semibold text-teal flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <Sparkles className="h-3 w-3 text-teal animate-pulse" />
                          <span>Tip: Use code <b>SANJEEVANI20</b> for 20% discount!</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. TRANSACTION PROCESSING STATE */}
                {checkoutStep === "processing" && (
                  <div className="flex flex-col items-center justify-center text-center py-16 space-y-5">
                    <div className="h-14 w-14 rounded-full border-4 border-teal border-t-transparent animate-spin flex items-center justify-center">
                      <Lock className="h-5 w-5 text-teal animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-navy text-sm">Processing Secure Payment...</h4>
                      <p className="text-xs text-slate-400 mt-2 max-w-xs leading-normal">
                        Verifying details and transferring ₹{totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0) + ((totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0)) >= 500 ? 0 : 49)} securely to Sanjeevani Escrow Account.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. SUCCESS STEP */}
                {checkoutStep === "success" && (
                  <div className="space-y-6 py-4 animate-scale-in text-center">
                    <div className="h-16 w-16 bg-emerald-50 text-teal border border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-md">
                      <CheckCircle2 className="h-9 w-9 animate-bounce" />
                    </div>
                    
                    <div>
                      <h3 className="font-black text-slate-800 text-lg">Order Placed Successfully!</h3>
                      <p className="text-xs text-slate-500 mt-1">Estimating delivery in <b>2 Hours (Express)</b></p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-4 text-left text-xs space-y-2 max-w-sm mx-auto shadow-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Order ID:</span><span className="font-bold text-navy">{placedOrderId}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Recipient:</span><span className="font-bold text-navy">{deliveryName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Mobile No:</span><span className="font-bold text-navy">+91 {deliveryPhone}</span></div>
                      <div className="border-t border-slate-200/50 pt-2 flex justify-between"><span className="text-slate-400">Shipping To:</span><span className="font-bold text-navy text-right max-w-[180px] truncate">{deliveryAddress}, {deliveryCity}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Total Paid:</span><span className="font-extrabold text-teal">₹{totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0) + ((totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0)) >= 500 ? 0 : 49)}</span></div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100/50 rounded-xl p-3.5 text-left text-[10px] text-emerald-800 font-bold max-w-sm mx-auto leading-normal">
                      ✅ Digital Health Record Synced. Receipt receipt copy sent to +91 {deliveryPhone} and saved in your Sanjeevani Dashboard.
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && checkoutStep !== "processing" && (
                <div className="p-5 border-t border-slate-100 bg-white">
                  
                  {/* Calculation Details for steps other than Success */}
                  {checkoutStep !== "success" && (
                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-bold text-slate-800">₹{totalPrice}</span>
                      </div>
                      {payDiscountApplied && (
                        <div className="flex justify-between text-teal">
                          <span>Coupon Discount (20%)</span>
                          <span>-₹{Math.round(totalPrice * 0.2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery Surcharge</span>
                        {(totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0)) >= 500 ? (
                          <span className="font-bold text-teal uppercase">Free</span>
                        ) : (
                          <span className="font-bold text-slate-800">₹49</span>
                        )}
                      </div>
                      <div className="flex justify-between border-t border-slate-200/60 pt-3 text-sm font-black text-slate-855">
                        <span>Total Due</span>
                        <span className="text-navy font-black text-sm">
                          ₹{totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0) + ((totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0)) >= 500 ? 0 : 49)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Buttons for Cart Step */}
                  {checkoutStep === null && (
                    <button 
                      onClick={() => setCheckoutStep("delivery")}
                      className="w-full bg-navy hover:bg-teal text-white text-xs font-bold py-3.5 rounded-xl transition uppercase tracking-wider mt-5 shadow-md shadow-navy/10 cursor-pointer"
                    >
                      Proceed to Delivery
                    </button>
                  )}

                  {/* Buttons for Delivery Step */}
                  {checkoutStep === "delivery" && (
                    <div className="flex gap-2.5 mt-5">
                      <button 
                        onClick={() => setCheckoutStep(null)}
                        className="border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer"
                      >
                        Back
                      </button>
                      <button 
                        onClick={() => setCheckoutStep("payment")}
                        disabled={!deliveryName.trim() || !deliveryPhone.trim() || deliveryPhone.length < 10 || !deliveryAddress.trim() || !deliveryCity.trim() || !deliveryState.trim() || !deliveryPincode.trim()}
                        className="flex-1 bg-navy hover:bg-teal text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Proceed to Payment
                      </button>
                    </div>
                  )}

                  {/* Buttons for Payment Step */}
                  {checkoutStep === "payment" && (
                    <div className="flex gap-2.5 mt-5">
                      <button 
                        onClick={() => setCheckoutStep("delivery")}
                        className="border border-slate-200 hover:bg-slate-100 text-slate-650 text-xs font-bold px-4 py-3 rounded-xl transition cursor-pointer"
                      >
                        Back
                      </button>
                      <button 
                        onClick={() => {
                          const finalAmount = totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0) + ((totalPrice - (payDiscountApplied ? Math.round(totalPrice * 0.2) : 0)) >= 500 ? 0 : 49);
                          setCheckoutStep("processing");
                          setTimeout(() => {
                            setCheckoutStep("success");
                            handlePlaceOrder(finalAmount);
                          }, 3000);
                        }}
                        disabled={
                          (payMethod === "card" && (!payCardNum || !payCardName || !payCardExpiry || !payCardCvv)) ||
                          (payMethod === "upi" && !payUpiId) ||
                          (payMethod === "netbanking" && !paySelectedBank) ||
                          (payMethod === "insurance" && (!payInsurancePolicy || !payInsuranceProvider))
                        }
                        className="flex-1 bg-success hover:opacity-95 text-white text-xs font-bold py-3 rounded-xl transition uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-glow"
                      >
                        Pay & Complete Order
                      </button>
                    </div>
                  )}

                  {/* Buttons for Success Step */}
                  {checkoutStep === "success" && (
                    <button 
                      onClick={() => {
                        setCart([]);
                        setCheckoutStep(null);
                        setShowCart(false);
                        setDeliveryName("");
                        setDeliveryPhone("");
                        setDeliveryAddress("");
                        setDeliveryCity("");
                        setDeliveryState("");
                        setDeliveryPincode("");
                        setPayCardNum("");
                        setPayCardName("");
                        setPayCardExpiry("");
                        setPayCardCvv("");
                        setPayUpiId("");
                        setPaySelectedBank("");
                        setPayCoupon("");
                        setPayDiscountApplied(false);
                      }}
                      className="w-full bg-teal hover:bg-navy text-white text-xs font-bold py-3.5 rounded-xl transition uppercase tracking-wider mt-5 cursor-pointer shadow-md"
                    >
                      Continue Shopping
                    </button>
                  )}
                  
                  {checkoutStep !== "success" && (
                    <p className="text-[9px] text-slate-400 text-center mt-2.5">
                      🔒 Secured with SSL 256-bit encrypted escrow protection protocols.
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
