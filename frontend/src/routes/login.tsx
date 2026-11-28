import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail, Lock, User, Phone, MapPin, Droplet, Calendar, Sparkles, ArrowRight, LockKeyhole, AlertCircle } from "lucide-react";
import { loginUser, registerUser } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In / Sign Up — Sanjeevani" },
      { name: "description", content: "Access your Sanjeevani health portal. Secure clinical records." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sign In Form state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) return;
    setLoading(true);
    setError(null);

    try {
      await loginUser(signInEmail, signInPassword);
      router.navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !phone) return;
    setLoading(true);
    setError(null);

    try {
      await registerUser({
        name,
        email,
        password,
        gender,
        dob,
        bloodGroup,
        phone,
        address,
      });

      // Automatically sign in user after successful signup
      await loginUser(email, password);
      router.navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-glow relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-teal" />
        
        {/* Header */}
        <div className="text-center mb-8 mt-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal mb-3">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-navy tracking-tight">Sanjeevani Health Portal</h1>
          <p className="text-xs text-muted-foreground mt-1">Access your digital health vault and book OPD slots.</p>
        </div>

        {/* Tabs switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/30 mb-6">
          <button
            onClick={() => { setActiveTab("signin"); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === "signin" ? "bg-white text-teal shadow-xs" : "text-muted-foreground hover:text-navy"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab("signup"); setError(null); }}
            className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeTab === "signup" ? "bg-white text-teal shadow-xs" : "text-muted-foreground hover:text-navy"}`}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/10 p-3 text-xs text-destructive font-semibold">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Forms */}
        {activeTab === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="e.g. aarav.mehta@example.com"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="password"
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-teal py-3 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In to Vault"} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4 text-xs font-semibold max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. aarav.mehta@example.com"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal/70 cursor-pointer font-bold"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-navy outline-none focus:border-teal/70 cursor-pointer font-bold"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date of Birth</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Mobile Number</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Address</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-1 focus-within:border-teal/70 transition">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sector 5, Mumbai"
                  className="w-full bg-transparent py-3 text-navy outline-none font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-teal py-3 text-xs font-bold text-white shadow-glow-teal hover:opacity-95 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Registering..." : "Create Account"} <Sparkles className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
