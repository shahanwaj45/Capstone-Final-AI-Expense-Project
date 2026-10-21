import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import {
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  User as UserIcon,
  Mail,
  Lock,
  GraduationCap,
  Briefcase,
  Check,
  AlertCircle,
  IndianRupee,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import type { UserRole } from "@/types";
import { fadeUp, staggerContainer } from "@/lib/animations";
import Logo from "@/components/Logo";

export default function Register() {
  const { register, checkEmailAvailable, isAuthenticated, role: userRole } = useAuth();
  const [, navigate] = useLocation();

  const [role, setRole] = useState<UserRole>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [monthlyAllowance, setMonthlyAllowance] = useState<string>("30000");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  // Email availability state
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // If already logged in, redirect to workspace
  useEffect(() => {
    if (isAuthenticated && userRole) {
      navigate(`/${userRole}`, { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  // Adjust default allowance when role switches
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === "student" && monthlyAllowance === "85000") {
      setMonthlyAllowance("30000");
    } else if (newRole === "professional" && monthlyAllowance === "30000") {
      setMonthlyAllowance("85000");
    }
  };

  // Debounced email check
  useEffect(() => {
    if (!email || !email.includes("@") || email.length < 5) {
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }

    setEmailChecking(true);
    const timer = setTimeout(async () => {
      const isAvail = await checkEmailAvailable(email);
      setEmailAvailable(isAvail);
      setEmailChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, checkEmailAvailable]);

  // Compute password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-gray-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak (minimum 6 chars)", color: "bg-red-400" };
      case 2:
        return { score: 2, label: "Fair", color: "bg-amber-400" };
      case 3:
        return { score: 3, label: "Good", color: "bg-blue-400" };
      case 4:
        return { score: 4, label: "Strong & Secure", color: "bg-emerald-500" };
      default:
        return { score: 0, label: "Too short", color: "bg-red-300" };
    }
  };

  const strength = getPasswordStrength(password);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  // Generate initials preview
  const getInitials = (val: string) => {
    const parts = val.trim().split(" ");
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return val.slice(0, 2).toUpperCase() || "AI";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (emailAvailable === false) {
      toast.error("Email is already registered", {
        description: "Please sign in or use a different email address",
      });
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!agreeTerms) {
      toast.error("Please accept the terms to create your account");
      return;
    }

    setLoading(true);
    const allowanceVal = parseFloat(monthlyAllowance) || (role === "student" ? 30000 : 85000);

    const res = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      monthly_allowance: allowanceVal,
    });

    setLoading(false);

    if (res.success && res.user) {
      toast.success(`Account created! Welcome, ${res.user.name}`, {
        description: `Your ${res.user.role} workspace has been initialized`,
      });
      navigate(`/${res.user.role}`, { replace: true });
    } else {
      toast.error(res.error || "Failed to create account", {
        description: "Please check your information and try again",
      });
    }
  };

  if (isAuthenticated && userRole) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] text-[#172532]">
      {/* Decorative gradient blur background orbs */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[#d5f5e8] opacity-35 blur-[120px]" />
      <div className="pointer-events-none fixed -right-32 bottom-1/4 h-[450px] w-[450px] rounded-full bg-[#e3dcff] opacity-30 blur-[120px]" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-[480px]"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} className="mb-6 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <Logo size="lg" />
            </Link>
          </motion.div>

          {/* Registration Card */}
          <motion.div
            variants={fadeUp}
            className="rounded-[28px] border border-[#e3e9e3] bg-white p-6 shadow-[12px_18px_45px_rgba(42,65,55,.08)] sm:p-8"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-[#695db3]">
                <Sparkles size={12} /> Instant Account Setup
              </div>
              <h1 className="font-display text-[26px] font-bold tracking-[-.05em] sm:text-[28px]">
                Create Your Account
              </h1>
              <p className="mt-1 text-[13px] text-[#82908a]">
                Choose your track to get a personalized AI expense workspace
              </p>
            </div>

            {/* Role Switcher Cards */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleChange("student")}
                className={`relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                  role === "student"
                    ? "border-[#7BE2BE] bg-[#f0fbf5] shadow-[0_4px_16px_rgba(123,226,190,0.2)] ring-2 ring-[#7BE2BE]/30"
                    : "border-[#e6ede6] bg-[#fafcfa] hover:border-[#ccd6cc]"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-xl ${
                      role === "student" ? "bg-[#7BE2BE] text-[#172532]" : "bg-[#e8ede8] text-[#718077]"
                    }`}
                  >
                    <GraduationCap size={18} />
                  </div>
                  {role === "student" && (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[#357963] text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[13px] font-bold text-[#172532]">Student</p>
                <p className="mt-0.5 text-[11px] text-[#788880]">Pocket money, semester budget & AI scanner</p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange("professional")}
                className={`relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                  role === "professional"
                    ? "border-[#a29bf4] bg-[#f7f5ff] shadow-[0_4px_16px_rgba(162,155,244,0.2)] ring-2 ring-[#a29bf4]/30"
                    : "border-[#e6ede6] bg-[#fafcfa] hover:border-[#ccd6cc]"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-xl ${
                      role === "professional" ? "bg-[#a29bf4] text-white" : "bg-[#e8ede8] text-[#718077]"
                    }`}
                  >
                    <Briefcase size={17} />
                  </div>
                  {role === "professional" && (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[#695db3] text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-[13px] font-bold text-[#172532]">Professional</p>
                <p className="mt-0.5 text-[11px] text-[#788880]">Salary, emergency runway & predictive AI</p>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#76837b]">
                  <span>Full Name</span>
                  {name.trim().length >= 2 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#357963]">
                      Initials: <strong className="rounded bg-[#dbeee6] px-1.5 py-0.5">{getInitials(name)}</strong>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba6a0]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="h-11 w-full rounded-xl border border-[#e2e9e2] bg-[#f9fbf8] pl-10 pr-4 text-sm outline-none transition focus:border-[#7BE2BE] focus:ring-2 focus:ring-[#b8ecd6]"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#76837b]">
                  <span>Email Address</span>
                  {emailChecking && <span className="text-[10px] text-[#82908a]">Checking availability...</span>}
                  {emailAvailable === true && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#357963]">
                      <Check size={11} strokeWidth={3} /> Email available
                    </span>
                  )}
                  {emailAvailable === false && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                      <AlertCircle size={11} /> Already registered
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba6a0]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`h-11 w-full rounded-xl border bg-[#f9fbf8] pl-10 pr-4 text-sm outline-none transition focus:ring-2 ${
                      emailAvailable === false
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : emailAvailable === true
                        ? "border-[#7BE2BE] focus:border-[#7BE2BE] focus:ring-[#b8ecd6]"
                        : "border-[#e2e9e2] focus:border-[#7BE2BE] focus:ring-[#b8ecd6]"
                    }`}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Monthly Allowance / Income starting budget */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#76837b]">
                  {role === "student" ? "Monthly Pocket Money / Allowance" : "Estimated Monthly Income"}
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#76837b]">
                    ₹
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={monthlyAllowance}
                    onChange={(e) => setMonthlyAllowance(e.target.value)}
                    placeholder={role === "student" ? "30000" : "85000"}
                    className="h-11 w-full rounded-xl border border-[#e2e9e2] bg-[#f9fbf8] pl-8 pr-4 text-sm outline-none transition focus:border-[#7BE2BE] focus:ring-2 focus:ring-[#b8ecd6]"
                  />
                </div>
                {/* Quick amount suggestion chips */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[#9ba6a0]">Quick presets:</span>
                  {(role === "student" ? [15000, 25000, 30000, 50000] : [50000, 85000, 120000, 180000]).map(
                    (amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setMonthlyAllowance(amt.toString())}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                          monthlyAllowance === amt.toString()
                            ? "bg-[#172532] text-white"
                            : "bg-[#edf3ee] text-[#55665e] hover:bg-[#dfe8df]"
                        }`}
                      >
                        ₹{amt.toLocaleString("en-IN")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold text-[#76837b]">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba6a0]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 w-full rounded-xl border border-[#e2e9e2] bg-[#f9fbf8] pl-10 pr-11 text-sm outline-none transition focus:border-[#7BE2BE] focus:ring-2 focus:ring-[#b8ecd6]"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ba6a0] hover:text-[#172532]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-[#ecefe9]">
                      <div
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color : "bg-transparent"
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strength.score >= 4 ? strength.color : "bg-transparent"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#86968d]">
                      <span>Strength</span>
                      <span className="font-semibold">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[#76837b]">
                  <span>Confirm Password</span>
                  {passwordsMatch && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#357963]">
                      <Check size={11} strokeWidth={3} /> Passwords match
                    </span>
                  )}
                  {confirmPassword && !passwordsMatch && (
                    <span className="text-[10px] font-bold text-red-500">Does not match</span>
                  )}
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ba6a0]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className={`h-11 w-full rounded-xl border bg-[#f9fbf8] pl-10 pr-4 text-sm outline-none transition focus:ring-2 ${
                      confirmPassword && !passwordsMatch
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : passwordsMatch
                        ? "border-[#7BE2BE] focus:border-[#7BE2BE] focus:ring-[#b8ecd6]"
                        : "border-[#e2e9e2] focus:border-[#7BE2BE] focus:ring-[#b8ecd6]"
                    }`}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {/* Terms checkbox */}
              <label className="flex items-start gap-2.5 pt-1 text-[12px] text-[#6e7d75]">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#d0d8d2] accent-[#7BE2BE]"
                  required
                />
                <span>
                  I agree to create my AI financial workspace and store transaction records securely.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || emailAvailable === false}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#172532] text-[13px] font-bold text-white shadow-[6px_8px_18px_rgba(23,37,50,.14)] transition hover:-translate-y-0.5 hover:bg-[#243b4a] disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Create {role === "student" ? "Student" : "Professional"} Account{" "}
                    <ArrowRight size={16} className="text-[#7BE2BE]" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-5 border-t border-[#edf2ec] pt-4 text-center">
              <p className="text-[13px] text-[#728079]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-bold text-[#172532] underline decoration-[#7BE2BE] decoration-2 underline-offset-4 transition hover:text-[#388e6c]"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </motion.div>

          {/* Security badge & Features preview */}
          <motion.div
            variants={fadeUp}
            className="mt-4 flex items-center justify-center gap-4 text-center text-[11px] text-[#86968d]"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#357963]" /> JWT 256-bit Secure
            </span>
            <span>•</span>
            <span>Local SQLite Database</span>
            <span>•</span>
            <span>Instant Access</span>
          </motion.div>

          {/* Back to home */}
          <motion.div variants={fadeUp} className="mt-5 text-center">
            <Link href="/" className="text-[12px] font-semibold text-[#728079] hover:text-[#172532]">
              ← Back to home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
