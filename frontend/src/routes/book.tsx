import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { 
  Check, MapPin, Calendar, Clock, Stethoscope, CheckCircle2, Star, 
  Upload, X, User, Phone, FileText, Camera, CreditCard, Lock, 
  QrCode, Ticket, Building2, Sparkles, Percent, ShieldCheck, HelpCircle
} from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { fetchHospitals, fetchHospitalDetail, bookAppointment } from "@/lib/api";
import { type Hospital, type Doctor } from "@/lib/mockData";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book OPD Appointment — Sanjeevani" },
      { name: "description", content: "Book OPD appointments at any hospital across India in seconds." },
      { property: "og:title", content: "Book OPD Appointment — Sanjeevani" },
      { property: "og:description", content: "Choose hospital, doctor and slot. Instant confirmation." },
    ],
  }),
  component: BookPage,
});

const slots = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:30 AM", "12:00 PM", "3:00 PM", "3:30 PM", "4:30 PM", "5:00 PM", "6:00 PM", "6:30 PM"];
const steps = ["Hospital", "Doctor", "Date & Time", "Patient Details", "Review", "Payment"];

function BookPage() {
  const [step, setStep] = useState(0);
  const [hospitalId, setHospitalId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [done, setDone] = useState(false);
  const [tokenNo, setTokenNo] = useState("");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  
  // Patient details
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientIssue, setPatientIssue] = useState("");
  const [rxFile, setRxFile] = useState<File | null>(null);
  const rxInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking" | "insurance">("upi");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardFocus, setCardFocus] = useState<"front" | "back">("front");
  const [upiId, setUpiId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [timer, setTimer] = useState(299); // 5 minutes QR timer

  const [hospitalList, setHospitalList] = useState<Hospital[]>([]);
  const [doctorList, setDoctorList] = useState<Doctor[]>([]);

  useEffect(() => {
    fetchHospitals().then(setHospitalList);
  }, []);

  useEffect(() => {
    if (hospitalId) {
      fetchHospitalDetail(hospitalId).then((data) => {
        setDoctorList(data.doctors);
      });
    } else {
      setDoctorList([]);
    }
  }, [hospitalId]);

  const hospital = hospitalList.find((h) => h.id === hospitalId);
  const doctor = doctorList.find((d) => d.id === doctorId);

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // QR Code expiration timer
  useEffect(() => {
    if (step !== 5) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 299));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCardNumber = (value: string) => {
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

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "SANJEEVANI30") {
      setDiscountApplied(true);
      setCouponError("");
    } else {
      setCouponError("Invalid coupon code.");
      setDiscountApplied(false);
    }
  };

  const originalFee = doctor?.fee ?? 0;
  const discount = discountApplied ? Math.round(originalFee * 0.3) : 0;
  const finalFee = originalFee - discount;

  const handleConfirm = () => {
    if (!patientName || !patientIssue) return;
    if (!hospital || !doctor || !date || !slot) return;

    bookAppointment({
      hospital_id: hospital.id,
      doctor_id: doctor.id,
      department: doctor.specialty,
      slot_time: slot,
      symptoms: patientIssue,
      paymentMode: paymentMethod === "card" ? "Card" : (paymentMethod === "insurance" ? "Insurance" : "UPI"),
      type: "In-Person"
    }).then((res) => {
      const appt = res.appointment;
      setTokenNo(appt.booking_id || `A-${appt.queue_number}`);
      setDone(true);
    }).catch((err) => {
      console.error(err);
      alert("Error booking appointment: " + err.message);
    });
  };

  const handlePaymentSubmit = () => {
    setPaymentProcessing(true);
    
    // Simulate transaction delay
    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      
      // Navigate to success screen after showing checkmark visualizer
      setTimeout(() => {
        setPaymentSuccess(false);
        handleConfirm();
      }, 2000);
    }, 3000);
  };

  const QRCodeSVG = () => (
    <svg viewBox="0 0 100 100" className="h-36 w-36 mx-auto bg-white p-2 rounded-xl border border-slate-200/85 shadow-sm">
      <rect x="5" y="5" width="25" height="25" fill="#0f172a" rx="2" />
      <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="1" />
      <rect x="13" y="13" width="9" height="9" fill="#0f172a" rx="0.5" />
      
      <rect x="70" y="5" width="25" height="25" fill="#0f172a" rx="2" />
      <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="1" />
      <rect x="78" y="13" width="9" height="9" fill="#0f172a" rx="0.5" />
      
      <rect x="5" y="70" width="25" height="25" fill="#0f172a" rx="2" />
      <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="1" />
      <rect x="13" y="78" width="9" height="9" fill="#0f172a" rx="0.5" />
      
      <rect x="42" y="42" width="16" height="16" fill="#0d9488" rx="3" />
      <path d="M48 50 h4 M50 48 v4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      
      <rect x="35" y="10" width="5" height="15" fill="#0f172a" />
      <rect x="45" y="5" width="10" height="5" fill="#0f172a" />
      <rect x="60" y="15" width="5" height="5" fill="#0f172a" />
      <rect x="35" y="30" width="15" height="5" fill="#0f172a" />
      <rect x="55" y="30" width="10" height="5" fill="#0f172a" />
      <rect x="30" y="35" width="5" height="10" fill="#0f172a" />
      <rect x="5" y="35" width="15" height="5" fill="#0f172a" />
      <rect x="25" y="45" width="10" height="5" fill="#0f172a" />
      
      <rect x="70" y="35" width="15" height="5" fill="#0f172a" />
      <rect x="80" y="45" width="15" height="5" fill="#0f172a" />
      <rect x="65" y="55" width="5" height="10" fill="#0f172a" />
      <rect x="75" y="60" width="20" height="5" fill="#0f172a" />
      
      <rect x="35" y="70" width="5" height="20" fill="#0f172a" />
      <rect x="45" y="75" width="15" height="5" fill="#0f172a" />
      <rect x="45" y="85" width="10" height="10" fill="#0f172a" />
      <rect x="60" y="80" width="5" height="5" fill="#0f172a" />
      
      <rect x="50" y="65" width="10" height="5" fill="#0f172a" />
    </svg>
  );

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8 animate-scale-in">
        <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-glow relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-teal" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-10 w-10 animate-breathe" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-extrabold text-navy">Appointment Confirmed!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your OPD token has been generated and reserved.</p>
          
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border p-6 text-left relative">
            <div className="absolute top-4 right-4 rounded-full bg-success/15 px-3 py-1 text-[10px] font-bold text-success uppercase tracking-wider">
              Verified Token
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queue Position / Token No</div>
            <div className="font-display text-4xl font-extrabold text-navy mt-1 tracking-tight">{tokenNo}</div>
            
            <div className="mt-6 space-y-3 border-t border-border/60 pt-4 text-sm">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Hospital</span><span className="font-bold text-navy text-right">{hospital?.name}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Doctor</span><span className="font-bold text-navy text-right">{doctor?.name}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Specialty</span><span className="font-medium text-navy">{doctor?.specialty}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Scheduled Time</span><span className="font-bold text-teal">{date} · {slot}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Fee Paid</span><span className="font-extrabold text-teal">₹{finalFee}</span></div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-center gap-3">
            <button 
              onClick={() => {
                setDone(false); setStep(0); setHospitalId(""); setDoctorId("");
                setDate(""); setSlot(""); setTokenNo(""); setPatientName("");
                setPatientAge(""); setPatientGender(""); setPatientPhone("");
                setPatientIssue(""); setRxFile(null); setCapturedPhoto(null);
                setCouponCode(""); setDiscountApplied(false);
              }} 
              className="rounded-xl border border-border px-6 py-3 text-sm font-bold text-navy hover:bg-accent hover:border-teal/40 transition"
            >
              Book Another
            </button>
            <Link 
              to="/dashboard" 
              className="rounded-xl bg-gradient-teal px-6 py-3 text-sm font-bold text-white shadow-glow-teal hover:opacity-95 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Dynamic inline styles for card flip perspective */}
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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy tracking-tight">Book an OPD Appointment</h1>
          <p className="mt-1 text-sm text-muted-foreground">Skip the long queue at hospital receptions by booking instantly.</p>
        </div>
        <div className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground self-start md:self-auto">
          Step {step + 1} of 6: {steps[step]}
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mt-8">
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-teal transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / 6) * 100}%` }}
          />
        </div>
        
        <ol className="mt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-extrabold transition ${i < step ? "bg-success text-success-foreground" : i === step ? "bg-navy text-white shadow" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={i === step ? "text-navy font-bold" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8 relative overflow-hidden min-h-[400px]">
        
        {/* Secure loading screen during payment processing */}
        {paymentProcessing && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
            <div className="h-16 w-16 rounded-full border-4 border-teal border-t-transparent animate-spin flex items-center justify-center mb-6">
              <Lock className="h-6 w-6 text-teal animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-navy">Processing Secure Payment...</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Authorizing transaction of <b>₹{finalFee}</b>. We are securing your ABDM vault credentials. Please do not close or refresh this page.
            </p>
          </div>
        )}

        {/* Secure payment success popup */}
        {paymentSuccess && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6 animate-scale-in">
            <div className="h-16 w-16 rounded-full bg-teal-50 border border-teal-100 text-teal flex items-center justify-center mb-6 shadow-glow">
              <ShieldCheck className="h-10 w-10 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-navy">Payment Authorized!</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Transaction ID: <b>TXN-{Date.now().toString().slice(-8)}</b><br />
              Syncing digital records and generating patient OPD token...
            </p>
          </div>
        )}

        {step === 0 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-lg font-bold text-navy">Select medical centre</h2>
            <p className="text-xs text-muted-foreground">Choose the hospital location you want to visit.</p>
            
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {hospitalList.slice(0, 6).map((h) => (
                <button 
                  key={h.id} 
                  onClick={() => setHospitalId(h.id)} 
                  className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition duration-200 cursor-pointer ${hospitalId === h.id ? "border-teal bg-teal/5 ring-2 ring-teal/20" : "border-border hover:bg-accent/40"}`}
                >
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-muted overflow-hidden relative">
                    {imgErrors[h.id] ? (
                      <div className="flex h-full w-full items-center justify-center bg-teal/5 text-teal text-[10px] font-bold">Hosp</div>
                    ) : (
                      <img 
                        src={h.image} 
                        alt="" 
                        onError={() => setImgErrors(prev => ({ ...prev, [h.id]: true }))}
                        className="h-full w-full object-cover" 
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-navy truncate">{h.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> <span>{h.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                      <span className="flex items-center gap-0.5 text-warning font-semibold"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {h.rating}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-success font-medium">{h.beds.available} beds free</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Select Specialist Doctor</h2>
                <p className="text-xs text-muted-foreground">Doctors available at {hospital?.name}</p>
              </div>
              <button onClick={() => { setStep(0); setHospitalId(""); setDoctorId(""); }} className="text-xs font-semibold text-teal hover:underline">Change hospital</button>
            </div>
            
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {doctorList.length > 0 ? (
                doctorList.map((d) => (
                  <button 
                    key={d.id} 
                    onClick={() => setDoctorId(d.id)} 
                    className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition duration-200 cursor-pointer ${doctorId === d.id ? "border-teal bg-teal/5 ring-2 ring-teal/20" : "border-border hover:bg-accent/40"}`}
                  >
                    <div className="h-14 w-14 shrink-0 rounded-full bg-muted overflow-hidden relative border-2 border-border/40">
                      {imgErrors[d.id] ? (
                        <div className="flex h-full w-full items-center justify-center bg-teal/5 text-teal text-xs font-bold">Doc</div>
                      ) : (
                        <img 
                          src={d.avatar} 
                          alt="" 
                          onError={() => setImgErrors(prev => ({ ...prev, [d.id]: true }))}
                          className="h-full w-full object-cover" 
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-navy truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Stethoscope className="h-3.5 w-3.5 text-teal" /> <span>{d.specialty} · {d.experience} yrs exp</span></div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-0.5 text-[11px] font-bold text-warning"><Star className="h-3.5 w-3.5 fill-warning text-warning" /> {d.rating}</span>
                        <span className="text-xs font-bold text-navy bg-muted px-2 py-0.5 rounded-md">Fee: ₹{d.fee}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="sm:col-span-2 text-center py-10 rounded-2xl border border-dashed border-border bg-background">
                  <p className="text-sm text-muted-foreground">No doctors matching this hospital. Please go back and select another hospital.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-lg font-bold text-navy">Schedule Date & Slot</h2>
            <p className="text-xs text-muted-foreground">Select a convenient day and time for consultation.</p>
            
            <div className="mt-6 max-w-md">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Choose Appointment Date</label>
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input 
                  type="date" 
                  value={date} 
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)} 
                  className="w-full bg-transparent py-3 text-sm text-navy outline-none cursor-pointer" 
                />
              </div>
            </div>

            <div className="mt-8">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select OPD Hourly Slot</label>
              <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
                {slots.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => setSlot(s)} 
                    className={`rounded-xl border py-3 text-xs font-bold transition duration-200 cursor-pointer ${slot === s ? "border-teal bg-teal text-white shadow-glow-teal" : "border-border bg-background text-navy hover:border-teal/60"}`}
                  >
                    <Clock className="mx-auto mb-1 h-3.5 w-3.5" /> {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-lg font-bold text-navy">Patient Details</h2>
            <p className="text-xs text-muted-foreground">Tell us about yourself and your health concern so the doctor is prepared.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name <span className="text-destructive">*</span></label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g. Omkar Acharya" className="w-full bg-transparent py-2.5 text-sm text-navy outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Age</label>
                <input value={patientAge} onChange={e => setPatientAge(e.target.value)} type="number" min="1" max="120" placeholder="e.g. 28" className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-navy outline-none focus:border-teal/70 transition" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
                <select value={patientGender} onChange={e => setPatientGender(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-navy outline-none focus:border-teal/70 transition cursor-pointer">
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
                <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                  <span className="text-xs font-bold text-muted-foreground border-r border-border pr-2 shrink-0">+91</span>
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input value={patientPhone} onChange={e => setPatientPhone(e.target.value.replace(/\D/g, "").slice(0,10))} placeholder="10-digit mobile number" className="w-full bg-transparent py-2.5 text-sm text-navy outline-none" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Describe Your Issue / Symptoms <span className="text-destructive">*</span></label>
                <div className="mt-1.5 flex gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2.5 focus-within:border-teal/70 transition">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <textarea value={patientIssue} onChange={e => setPatientIssue(e.target.value)} rows={4} placeholder="e.g. I have been experiencing persistent headaches and mild fever for the past 3 days..." className="w-full bg-transparent text-sm text-navy outline-none resize-none" />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Be as specific as possible to help the doctor prepare in advance.</p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Prescription / Injury Photo <span className="text-xs font-normal normal-case text-muted-foreground/60">(Optional)</span>
                </label>
                
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input 
                      ref={rxInputRef} 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png" 
                      className="hidden" 
                      onChange={e => {
                        setRxFile(e.target.files?.[0] ?? null);
                        setCapturedPhoto(null);
                      }} 
                    />
                    {rxFile ? (
                      <div className="flex items-center gap-3 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 h-[72px]">
                        <FileText className="h-5 w-5 text-teal shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-navy truncate">{rxFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{(rxFile.size / 1024).toFixed(0)} KB · Attached</p>
                        </div>
                        <button type="button" onClick={() => setRxFile(null)} className="text-muted-foreground hover:text-destructive transition shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => rxInputRef.current?.click()} 
                        className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-teal bg-background hover:bg-teal/5 px-4 py-4 transition cursor-pointer group h-[72px]"
                      >
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-teal transition shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-navy">Upload prescription</p>
                          <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG up to 10MB</p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div>
                    {capturedPhoto ? (
                      <div className="flex items-center gap-3 rounded-xl border border-teal/30 bg-teal/5 px-4 py-2 h-[72px]">
                        <div className="h-10 w-12 rounded-lg overflow-hidden border border-border bg-white flex items-center justify-center shrink-0">
                          <img src={capturedPhoto} className="h-full w-full object-cover" alt="Captured injury" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-navy truncate">patient_capture.jpg</p>
                          <p className="text-[10px] text-muted-foreground">Webcam snapshot · Attached</p>
                        </div>
                        <button type="button" onClick={() => setCapturedPhoto(null)} className="text-muted-foreground hover:text-destructive transition shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setShowCamera(true)} 
                        className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-teal bg-background hover:bg-teal/5 px-4 py-4 transition cursor-pointer group h-[72px]"
                      >
                        <Camera className="h-5 w-5 text-muted-foreground group-hover:text-teal transition shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-semibold text-navy">Capture via Camera</p>
                          <p className="text-[10px] text-muted-foreground">Take snapshot of injury/slip</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-up">
            <h2 className="font-display text-lg font-bold text-navy">Review Booking Overview</h2>
            <p className="text-xs text-muted-foreground">Please double check details before finalizing your slot token.</p>
            <div className="mt-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border p-6 text-sm">
              <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Hospital</span><span className="font-bold text-navy text-right">{hospital?.name}</span></div>
              <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Doctor</span><span className="font-bold text-navy">{doctor?.name}</span></div>
              <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Specialty</span><span className="font-medium text-navy">{doctor?.specialty}</span></div>
              <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Date & Slot</span><span className="font-bold text-navy">{date || "—"} · {slot || "—"}</span></div>
              <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Patient</span><span className="font-bold text-navy">{patientName}{patientAge ? `, ${patientAge} yrs` : ""}{patientGender ? ` · ${patientGender}` : ""}</span></div>
              <div className="py-2.5 border-b border-border/40">
                <span className="text-muted-foreground block mb-1">Chief Complaint</span>
                <p className="text-navy font-medium text-xs leading-relaxed line-clamp-3">{patientIssue}</p>
              </div>
              {rxFile && <div className="flex justify-between py-2.5 border-b border-border/40"><span className="text-muted-foreground">Prescription</span><span className="font-semibold text-teal text-right truncate max-w-[180px]">{rxFile.name}</span></div>}
              {capturedPhoto && (
                <div className="flex justify-between py-2.5 border-b border-border/40 items-center">
                  <span className="text-muted-foreground">Captured Photo</span>
                  <div className="h-10 w-12 rounded-lg overflow-hidden border border-border bg-white flex items-center justify-center shrink-0">
                    <img src={capturedPhoto} className="h-full w-full object-cover" alt="Captured patient photo" />
                  </div>
                </div>
              )}
              <div className="mt-4 flex justify-between items-baseline pt-4"><span className="text-muted-foreground font-semibold">Consultation Fee</span><span className="font-display text-2xl font-extrabold text-teal">₹{doctor?.fee ?? 0}</span></div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-up space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-navy">Secure Checkout & Payment</h2>
              <p className="text-xs text-muted-foreground">All transactions are secured with ABDM-certified healthcare escrow protection.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-stretch">
              
              {/* Payment Methods */}
              <div className="border border-border rounded-2xl bg-slate-50/50 p-5 flex flex-col justify-between">
                
                {/* Method selector tabs */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { id: "upi", label: "UPI / QR", icon: QrCode },
                    { id: "card", label: "Card", icon: CreditCard },
                    { id: "netbanking", label: "Netbanking", icon: Building2 },
                    { id: "insurance", label: "Insurance", icon: ShieldCheck }
                  ].map((method) => {
                    const Icon = method.icon;
                    const active = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-bold transition duration-200 cursor-pointer ${
                          active 
                            ? "border-teal bg-white text-teal shadow-sm" 
                            : "border-border bg-white/40 text-slate-500 hover:bg-white hover:text-navy"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected payment content */}
                <div className="flex-1 flex flex-col justify-center min-h-[220px]">
                  
                  {/* UPI Method */}
                  {paymentMethod === "upi" && (
                    <div className="space-y-4 text-center animate-fade-up">
                      <div className="relative inline-block">
                        <QRCodeSVG />
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-[0.5px] opacity-0 hover:opacity-100 transition rounded-xl">
                          <span className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded">Verify Secure Scan</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-navy">Scan QR Code with GPay, Paytm or PhonePe</p>
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-warning" /> QR expires in <span className="font-mono font-bold text-warning">{formatTimer(timer)}</span>
                        </p>
                      </div>

                      <div className="relative max-w-xs mx-auto">
                        <span className="text-[10px] text-muted-foreground block text-left mb-1 font-bold uppercase tracking-wider">Or Enter UPI ID</span>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="username@okaxis" 
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border flex-1 font-semibold"
                          />
                          <button 
                            type="button" 
                            onClick={() => setUpiId("sanjeevani@payment-done")} 
                            className="bg-teal text-white px-3 py-2 rounded-xl text-[10px] font-bold hover:opacity-95"
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Method */}
                  {paymentMethod === "card" && (
                    <div className="grid gap-6 md:grid-cols-2 items-center animate-fade-up">
                      
                      {/* Card Visual Mockup */}
                      <div className="perspective-1000 py-2">
                        <div className={`relative w-full max-w-[280px] h-[160px] mx-auto transition-transform duration-500 transform-style-3d ${cardFocus === "back" ? "rotate-y-180" : ""}`}>
                          {/* Front */}
                          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-4 backface-hidden shadow-lg flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                              <span className="text-[8px] font-mono tracking-widest text-slate-400 font-bold">SANJEEVANI GATEWAY</span>
                              <div className="h-5 w-8 bg-white/10 rounded flex items-center justify-center font-bold text-[9px] text-white">
                                {cardNumber.startsWith("4") ? "VISA" : cardNumber.startsWith("5") ? "MC" : "CARD"}
                              </div>
                            </div>
                            <div className="font-mono text-sm tracking-widest text-slate-100 py-2">
                              {cardNumber ? cardNumber : "•••• •••• •••• ••••"}
                            </div>
                            <div className="flex justify-between items-end">
                              <div className="min-w-0 pr-2">
                                <span className="text-[6px] text-slate-400 block uppercase font-mono">Card Holder</span>
                                <span className="font-mono text-[10px] uppercase truncate block">{cardName || "PATIENT NAME"}</span>
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="text-[6px] text-slate-400 block uppercase font-mono">Expires</span>
                                <span className="font-mono text-[10px]">{cardExpiry || "MM/YY"}</span>
                              </div>
                            </div>
                          </div>
                          {/* Back */}
                          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-tr from-slate-950 to-slate-900 text-white backface-hidden rotate-y-180 shadow-lg flex flex-col justify-between py-4">
                            <div className="w-full h-8 bg-black/90" />
                            <div className="px-4 mt-2">
                              <div className="flex items-center justify-end bg-white/10 rounded pr-2">
                                <span className="font-mono text-xs italic font-bold tracking-widest py-1 text-slate-200">{cardCvv || "•••"}</span>
                              </div>
                            </div>
                            <div className="px-4 flex justify-between items-center text-[7px] text-slate-500 font-mono">
                              <span>3D SECURITY IN PROCESS</span>
                              <span>SSL 256-BIT</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inputs Card Form */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                          <input 
                            type="text" 
                            placeholder="4000 1234 5678 9010" 
                            maxLength={19}
                            value={cardNumber}
                            onFocus={() => setCardFocus("front")}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            className="w-full bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border font-mono mt-1 focus:border-teal"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cardholder Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Omkar Acharya" 
                            value={cardName}
                            onFocus={() => setCardFocus("front")}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border mt-1 focus:border-teal"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                            <input 
                              type="text" 
                              placeholder="MM/YY" 
                              maxLength={5}
                              value={cardExpiry}
                              onFocus={() => setCardFocus("front")}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 2) {
                                  val = val.slice(0, 2) + "/" + val.slice(2, 4);
                                }
                                setCardExpiry(val);
                              }}
                              className="w-full bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border mt-1 focus:border-teal text-center"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">CVV Code</label>
                            <input 
                              type="password" 
                              placeholder="•••" 
                              maxLength={3}
                              value={cardCvv}
                              onFocus={() => setCardFocus("back")}
                              onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                              className="w-full bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border mt-1 focus:border-teal text-center font-mono"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Netbanking Method */}
                  {paymentMethod === "netbanking" && (
                    <div className="space-y-4 animate-fade-up">
                      <p className="text-xs font-bold text-navy text-center mb-2">Select Popular Banks</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "sbi", label: "SBI", code: "State Bank" },
                          { id: "hdfc", label: "HDFC", code: "HDFC Bank" },
                          { id: "icici", label: "ICICI", code: "ICICI Bank" },
                          { id: "axis", label: "AXIS", code: "Axis Bank" }
                        ].map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition duration-150 cursor-pointer ${
                              selectedBank === bank.id 
                                ? "border-teal bg-teal/5 text-teal" 
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 mb-1 font-black">
                              {bank.id.toUpperCase()}
                            </div>
                            <span className="text-[9px] font-bold">{bank.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="max-w-xs mx-auto">
                        <label className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Or Select Other Bank</label>
                        <select 
                          value={selectedBank} 
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-navy outline-none cursor-pointer"
                        >
                          <option value="">Choose bank...</option>
                          <option value="kotak">Kotak Mahindra Bank</option>
                          <option value="yes">Yes Bank</option>
                          <option value="pnb">Punjab National Bank</option>
                          <option value="bob">Bank of Baroda</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Insurance Method */}
                  {paymentMethod === "insurance" && (
                    <div className="space-y-3 animate-fade-up max-w-sm mx-auto">
                      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-[10px] font-bold text-emerald-800 leading-normal mb-3">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Link your ABDM ABHA address to process co-pay coverage directly through health insurance policies.</span>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Insurance Provider</label>
                        <select 
                          value={insuranceProvider}
                          onChange={(e) => setInsuranceProvider(e.target.value)}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-navy outline-none cursor-pointer mt-1"
                        >
                          <option value="">Select insurance policy provider...</option>
                          <option value="star">Star Health Insurance</option>
                          <option value="niva">Niva Bupa Health</option>
                          <option value="hdfc_ergo">HDFC ERGO General</option>
                          <option value="lic">LIC Health Policy</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Policy ID / ABHA Address</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 91-2342-1234-11 or address@abha" 
                          value={insurancePolicy}
                          onChange={(e) => setInsurancePolicy(e.target.value)}
                          className="w-full bg-white text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border mt-1 focus:border-teal"
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Order Cost summary card */}
              <div className="border border-border rounded-2xl bg-white p-5 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">Order Summary</h4>
                  
                  <div className="space-y-2 border-b border-slate-100 pb-4 text-xs font-semibold">
                    <div className="flex justify-between items-center"><span className="text-slate-400">Consultation Fee</span><span className="text-slate-800">₹{originalFee}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-400">ABDM Sync Surcharge</span><span className="text-success">FREE</span></div>
                    {discountApplied && (
                      <div className="flex justify-between items-center text-teal"><span className="font-bold">Coupon Code (30%)</span><span>-₹{discount}</span></div>
                    )}
                  </div>

                  {/* Coupon Application Box */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      <Ticket className="h-3.5 w-3.5 text-teal" />
                      <span>Apply Promo Coupon</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. SANJEEVANI30" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="bg-slate-50 text-navy text-xs px-3 py-2 rounded-xl outline-none border border-border flex-1 font-bold tracking-wider"
                      />
                      <button 
                        type="button" 
                        onClick={applyCoupon}
                        className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 active:scale-95 transition"
                      >
                        Apply
                      </button>
                    </div>

                    {couponError && <p className="text-[10px] text-destructive font-bold">{couponError}</p>}
                    
                    {!discountApplied && (
                      <div 
                        onClick={() => { setCouponCode("SANJEEVANI30"); setDiscountApplied(false); }}
                        className="p-2.5 rounded-xl border border-dashed border-teal/20 bg-teal-50/20 text-[9px] font-bold text-teal flex items-center gap-1.5 cursor-pointer hover:bg-teal-50/50 transition"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal animate-pulse shrink-0" />
                        <span>Use Coupon <b>SANJEEVANI30</b> for 30% discount!</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-baseline mb-4">
                    <span className="text-xs font-bold text-slate-500">Amount to Pay</span>
                    <span className="font-display text-2xl font-black text-teal">₹{finalFee}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 justify-center">
                    <Lock className="h-3 w-3 text-slate-400" />
                    <span>256-bit Secure Gateway Interface</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-6">
          <button 
            type="button"
            onClick={back} 
            disabled={step === 0} 
            className="rounded-xl border border-border px-6 py-3 text-sm font-bold text-navy disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent transition"
          >
            Back
          </button>
          
          {step < 4 ? (
            <button
              type="button"
              onClick={next}
              disabled={
                (step === 0 && !hospitalId) ||
                (step === 1 && !doctorId) ||
                (step === 2 && (!date || !slot)) ||
                (step === 3 && (!patientName.trim() || !patientIssue.trim()))
              }
              className="rounded-xl bg-gradient-teal px-6 py-3 text-sm font-bold text-white shadow-glow-teal disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition"
            >
              Continue
            </button>
          ) : step === 4 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-xl bg-gradient-teal px-6 py-3 text-sm font-bold text-white shadow-glow-teal hover:opacity-95 transition"
            >
              Proceed to Payment
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaymentSubmit}
              disabled={
                paymentProcessing ||
                (paymentMethod === "card" && (!cardNumber || !cardName || !cardExpiry || !cardCvv)) ||
                (paymentMethod === "upi" && !upiId) ||
                (paymentMethod === "netbanking" && !selectedBank) ||
                (paymentMethod === "insurance" && (!insurancePolicy || !insuranceProvider))
              }
              className="rounded-xl bg-success px-6 py-3 text-sm font-bold text-white shadow-glow disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition"
            >
              Pay & Confirm Booking
            </button>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraCapture 
          onCapture={(dataUrl) => {
            setCapturedPhoto(dataUrl);
            setRxFile(null); // clear uploaded file if camera is captured
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
