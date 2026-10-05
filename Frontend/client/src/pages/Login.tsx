import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { getDemoCredentials } from "@/auth/demoAuth";
import { fadeUp, staggerContainer } from "@/lib/animations";
import Logo from "@/components/Logo";

export default function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect inside effect to avoid setState during render
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(`/${role}`, { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  if (isAuthenticated && role) {
    return null;
  }

  const demoCredentials = getDemoCredentials();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    const user = await login(email, password);
    setLoading(false);
    if (user) {
      toast.success(`Welcome back, ${user.name}!`, {
        description: `Logging into your ${user.role} workspace`,
      });
      navigate(`/${user.role}`, { replace: true });
    } else {
      toast.error("Invalid credentials", {
        description: "Please check your email and password",
      });
    }
  };

  const fillCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6] text-[#172532]">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-[#d5f5e8] opacity-30 blur-[120px]" />
      <div className="pointer-events-none fixed -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-[#e3dcff] opacity-25 blur-[120px]" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <Logo size="lg" />
            </Link>
          </motion.div>

          {/* Login card */}
          <motion.div
            variants={fadeUp}
            className="rounded-[28px] border border-[#e3e9e3] bg-white p-7 shadow-[12px_18px_45px_rgba(42,65,55,.08)] sm:p-9"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#695db3]">
                <Sparkles size={12} /> Secure Login
              </div>
              <h1 className="font-display text-[28px] font-bold tracking-[-.06em]">
                Welcome back
              </h1>
              <p className="mt-1 text-[13px] text-[#82908a]">
                Sign in to your financial workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold text-[#76837b]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-[#e2e9e2] bg-[#f9fbf8] px-4 text-sm outline-none transition focus:border-[#7BE2BE] focus:ring-2 focus:ring-[#b8ecd6]"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-bold text-[#76837b]">
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-[#e2e9e2] bg-[#f9fbf8] px-4 pr-11 text-sm outline-none transition focus:border-[#7BE2BE] focus:ring-2 focus:ring-[#b8ecd6]"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ba6a0]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-[#728079]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-[#d0d8d2] accent-[#7BE2BE]"
                  />
                  Remember me
                </label>
                <button type="button" className="text-[12px] font-semibold text-[#695db3] hover:underline">
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#172532] text-[13px] font-bold text-white shadow-[6px_8px_18px_rgba(23,37,50,.14)] transition hover:-translate-y-0.5 hover:bg-[#243b4a] disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Login <ArrowRight size={16} className="text-[#7BE2BE]" />
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Demo credentials */}
          <motion.div
            variants={fadeUp}
            className="mt-5 rounded-[22px] border border-[#e5e0f8] bg-[#f8f6ff] p-5"
          >
            <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-[.14em] text-[#695db3]">
              Demo Accounts
            </p>
            <div className="space-y-2.5">
              {demoCredentials.map((cred) => (
                <button
                  key={cred.email}
                  onClick={() => fillCredentials(cred.email, cred.password)}
                  className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-[3px_4px_10px_rgba(109,91,183,.06)] transition hover:-translate-y-0.5 hover:shadow-[5px_7px_16px_rgba(109,91,183,.1)]"
                >
                  <div>
                    <p className="text-[12px] font-bold capitalize">{cred.role}</p>
                    <p className="mt-0.5 text-[11px] text-[#82908a]">
                      {cred.email} / {cred.password}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                      cred.role === "student"
                        ? "bg-[#e4dcff] text-[#695db3]"
                        : "bg-[#e7f8ef] text-[#3b8165]"
                    }`}
                  >
                    {cred.role}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Back to home */}
          <motion.div variants={fadeUp} className="mt-6 text-center">
            <Link
              href="/"
              className="text-[12px] font-semibold text-[#728079] hover:text-[#172532]"
            >
              ← Back to home
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
