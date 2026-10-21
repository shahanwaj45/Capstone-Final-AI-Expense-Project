import { useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "wouter";
import {
  ArrowRight, ArrowUpRight, Bot, BriefcaseBusiness, CalendarDays, ChevronDown,
  CreditCard, Goal, HeartPulse, LayoutDashboard, Menu, Mic, ReceiptIndianRupee,
  Sparkles, TrendingUp, WalletCards, X, CircleDollarSign, Activity,
} from "lucide-react";
import { fadeUp, staggerContainer, staggerContainerSlow } from "@/lib/animations";
import Logo from "@/components/Logo";

/* ─── Scroll-reveal wrapper ─── */
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Feature card data ─── */
const studentFeatures = [
  { icon: WalletCards, label: "Pocket Money", desc: "Track your monthly allowance and daily spending power.", color: "#7BE2BE" },
  { icon: CalendarDays, label: "Semester Budget", desc: "Plan finances across the entire academic semester.", color: "#a29bf4" },
  { icon: BriefcaseBusiness, label: "Project Expenses", desc: "Separate and manage project-specific costs.", color: "#f6ae8e" },
  { icon: Goal, label: "Savings Goals", desc: "Set targets and watch your progress grow.", color: "#4caf89" },
  { icon: ReceiptIndianRupee, label: "Receipt Scanner", desc: "Snap a photo and let AI extract the details.", color: "#e98b68" },
  { icon: Mic, label: "Voice Expense", desc: "Add expenses hands-free with voice commands.", color: "#a9dced" },
  { icon: Bot, label: "AI Insights", desc: "Get personalised spending recommendations.", color: "#695db3" },
];

const professionalFeatures = [
  { icon: CircleDollarSign, label: "Income Tracking", desc: "Monitor salary, freelance, and investment income.", color: "#7BE2BE" },
  { icon: ReceiptIndianRupee, label: "Expense Tracking", desc: "Categorise and analyse every transaction.", color: "#f6ae8e" },
  { icon: TrendingUp, label: "Predictions", desc: "AI-powered spending forecasts for smarter planning.", color: "#a29bf4" },
  { icon: HeartPulse, label: "Emergency Fund", desc: "Build and track your financial safety net.", color: "#ed9b76" },
  { icon: CreditCard, label: "Subscriptions", desc: "Manage recurring payments in one place.", color: "#a9dced" },
  { icon: Activity, label: "Financial Health", desc: "A holistic score for your overall money wellness.", color: "#4caf89" },
  { icon: Bot, label: "AI Insights", desc: "Data-driven advice tailored to your lifestyle.", color: "#695db3" },
];

const howItWorks = [
  { step: "01", title: "Login", desc: "Sign in as a student or professional to get your personalised workspace." },
  { step: "02", title: "Track Your Money", desc: "Add expenses, set budgets, and monitor your financial flow effortlessly." },
  { step: "03", title: "Get AI-Powered Insights", desc: "Receive smart recommendations that help you stay ahead every month." },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#172532]">
      {/* ───────── NAVBAR ───────── */}
      <nav className="sticky top-0 z-50 border-b border-[#e8ece6]/70 bg-[#FAF9F6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-7 text-[13px] font-semibold text-[#728079] lg:flex">
            <a href="#features" className="transition hover:text-[#172532]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#172532]">How It Works</a>
            <a href="#student" className="transition hover:text-[#172532]">Student</a>
            <a href="#professional" className="transition hover:text-[#172532]">Professional</a>
            <a href="#ai-features" className="transition hover:text-[#172532]">AI Features</a>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-[#52615a] transition hover:bg-white hover:shadow-sm">
              Login
            </Link>
            <Link href="/register" className="rounded-xl bg-[#172532] px-5 py-2.5 text-[12px] font-bold text-white shadow-[5px_7px_16px_rgba(23,37,50,.14)] transition hover:-translate-y-0.5 hover:bg-[#243b4a]">
              Get Started
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="rounded-xl bg-white p-2.5 shadow-sm lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#172532]/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-[280px] bg-[#FAF9F6] p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Logo size="sm" showText={false} />
                <button onClick={() => setMenuOpen(false)} className="rounded-xl bg-white p-2 text-[#728079]">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-8 flex flex-col gap-4 text-[14px] font-semibold text-[#52615a]">
                <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white">Features</a>
                <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white">How It Works</a>
                <a href="#student" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white">Student</a>
                <a href="#professional" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white">Professional</a>
                <a href="#ai-features" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white">AI Features</a>
                <hr className="border-[#e4eae5]" />
                <Link href="/login" className="rounded-xl px-3 py-2 hover:bg-white">Login</Link>
                <Link href="/register" className="rounded-xl bg-[#172532] px-4 py-3 text-center text-white">Get Started</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </nav>

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 top-20 h-[400px] w-[400px] rounded-full bg-[#d5f5e8] opacity-40 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 top-40 h-[350px] w-[350px] rounded-full bg-[#e3dcff] opacity-30 blur-[100px]" />

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            {/* Left – copy */}
            <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
              <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-[#695db3]">
                <Sparkles size={14} /> AI-Powered Finance
              </motion.div>
              <motion.h1 variants={fadeUp} className="font-display text-[44px] font-bold leading-[1.08] tracking-[-.06em] sm:text-[56px] lg:text-[64px]">
                Your Money,{" "}
                <span className="bg-gradient-to-r from-[#4caf89] to-[#7BE2BE] bg-clip-text text-transparent">Smarter.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-5 max-w-[500px] text-[15px] leading-7 text-[#6e7d75]">
                AI-powered expense tracking built for students and professionals. Understand your spending, find your next best move, and keep the month comfortable.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#172532] px-6 text-[13px] font-bold text-white shadow-[6px_8px_18px_rgba(23,37,50,.14)] transition hover:-translate-y-0.5 hover:bg-[#243b4a]">
                  Get Started <ArrowRight size={16} className="text-[#7BE2BE]" />
                </Link>
                <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-[13px] font-bold text-[#52615a] shadow-[3px_4px_12px_rgba(23,37,50,.06)] transition hover:-translate-y-0.5">
                  Login
                </Link>
              </motion.div>
            </motion.div>

            {/* Right – dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              className="relative"
            >
              {/* Main preview card */}
              <div className="rounded-[28px] border border-[#e3e9e3] bg-white p-6 shadow-[12px_18px_45px_rgba(42,65,55,.1)] sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9aa69f]">Monthly Spending</p>
                    <p className="mt-2 font-display text-[36px] font-bold tracking-[-.07em]">₹18,450</p>
                  </div>
                  <div className="rounded-xl bg-[#e7f8ef] p-3">
                    <TrendingUp size={20} className="text-[#4caf89]" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="text-[#4aaf82]">↓ 12%</span>
                  <span className="font-medium text-[#a2aca7]">this month</span>
                </div>
                <div className="mt-6 space-y-3">
                  {[
                    { label: "Food", value: "₹4,200", pct: 40, color: "#7BE2BE" },
                    { label: "Travel", value: "₹2,100", pct: 20, color: "#a29bf4" },
                    { label: "Bills", value: "₹6,400", pct: 55, color: "#f6ae8e" },
                    { label: "Others", value: "₹5,750", pct: 45, color: "#a9dced" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-14 text-[11px] text-[#82908a]">{item.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-[#f0f4ef]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.pct}%` }}
                          transition={{ delay: 0.8, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                      <span className="w-14 text-right text-[11px] font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating AI card */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                className="absolute -left-6 bottom-8 z-10 hidden rounded-[18px] border border-[#e5e0f8] bg-[#f3f0ff] px-4 py-3 shadow-[6px_8px_20px_rgba(109,91,183,.12)] sm:block"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#695db3]">
                  <Sparkles size={12} /> AI Insight
                </div>
                <p className="mt-1 max-w-[180px] text-[11px] leading-4 text-[#717c95]">
                  Food expenses are 18% higher than last month.
                </p>
              </motion.div>

              {/* Floating savings card */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
                className="absolute -right-4 top-6 z-10 hidden rounded-[18px] border border-[#d4efe1] bg-[#e7f8ef] px-4 py-3 shadow-[6px_8px_20px_rgba(76,175,137,.12)] sm:block"
              >
                <p className="text-[10px] font-bold text-[#3c896c]">Savings Goal</p>
                <p className="mt-1 font-display text-[18px] font-bold tracking-[-.04em]">68%</p>
                <div className="mt-1 h-1.5 w-20 rounded-full bg-[#cdeee1]">
                  <div className="h-full w-[68%] rounded-full bg-[#4caf89]" />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e7f8ef] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#3b8165]">
              <LayoutDashboard size={13} /> Built for your life
            </span>
            <h2 className="font-display text-[34px] font-bold tracking-[-.06em] sm:text-[44px]">
              Features that actually <span className="text-[#4caf89]">matter.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-[#82908a]">
              Every tool is designed to simplify your finances — whether you're managing pocket money or a professional portfolio.
            </p>
          </Reveal>

          {/* Student features */}
          <div id="student" className="mt-16">
            <Reveal>
              <h3 className="mb-8 text-center font-display text-[22px] font-bold tracking-[-.04em]">
                For <span className="text-[#695db3]">Students</span>
              </h3>
            </Reveal>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {studentFeatures.map((f) => (
                <motion.div
                  key={f.label}
                  variants={fadeUp}
                  whileHover={{ y: -4, boxShadow: "8px 14px 32px rgba(42,65,55,.1)" }}
                  className="group rounded-[22px] border border-[#eef1ed] bg-[#FAF9F6] p-5 shadow-[4px_6px_16px_rgba(42,65,55,.05)] transition-shadow"
                >
                  <div
                    className="grid h-11 w-11 place-items-center rounded-[14px]"
                    style={{ backgroundColor: `${f.color}20` }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <h4 className="mt-4 text-[14px] font-bold">{f.label}</h4>
                  <p className="mt-1.5 text-[12px] leading-5 text-[#82908a]">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Professional features */}
          <div id="professional" className="mt-20">
            <Reveal>
              <h3 className="mb-8 text-center font-display text-[22px] font-bold tracking-[-.04em]">
                For <span className="text-[#4caf89]">Professionals</span>
              </h3>
            </Reveal>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {professionalFeatures.map((f) => (
                <motion.div
                  key={f.label}
                  variants={fadeUp}
                  whileHover={{ y: -4, boxShadow: "8px 14px 32px rgba(42,65,55,.1)" }}
                  className="group rounded-[22px] border border-[#eef1ed] bg-[#FAF9F6] p-5 shadow-[4px_6px_16px_rgba(42,65,55,.05)] transition-shadow"
                >
                  <div
                    className="grid h-11 w-11 place-items-center rounded-[14px]"
                    style={{ backgroundColor: `${f.color}20` }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <h4 className="mt-4 text-[14px] font-bold">{f.label}</h4>
                  <p className="mt-1.5 text-[12px] leading-5 text-[#82908a]">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#695db3]">
              Simple process
            </span>
            <h2 className="font-display text-[34px] font-bold tracking-[-.06em] sm:text-[44px]">
              How it <span className="text-[#695db3]">works.</span>
            </h2>
          </Reveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainerSlow}
            className="mt-14 flex flex-col items-center gap-0"
          >
            {howItWorks.map((item, i) => (
              <motion.div key={item.step} variants={fadeUp} className="flex flex-col items-center">
                <div className="relative flex items-center gap-6 rounded-[24px] border border-[#e3e9e3] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.06)] sm:p-8 sm:gap-8 w-full max-w-lg">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-[#172532] font-display text-[20px] font-bold text-[#7BE2BE]">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-display text-[18px] font-bold tracking-[-.04em]">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-5 text-[#82908a]">{item.desc}</p>
                  </div>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="my-2 h-10 w-px bg-gradient-to-b from-[#d0e5d8] to-[#e3e9e3]" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── STUDENT VS PROFESSIONAL ───────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="text-center">
            <h2 className="font-display text-[34px] font-bold tracking-[-.06em] sm:text-[44px]">
              Two financial <span className="text-[#4caf89]">lifestyles</span>, one smart platform.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-[#82908a]">
              Whether you're budgeting your semester or managing a career, we've built a workspace that fits.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* Student card */}
            <Reveal>
              <div className="rounded-[28px] border border-[#e0e5f7] bg-gradient-to-br from-[#f5f3ff] to-[#FAF9F6] p-7 shadow-[6px_9px_23px_rgba(42,65,55,.06)] sm:p-9">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e4dcff] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#695db3]">
                  Student
                </div>
                <h3 className="font-display text-[26px] font-bold tracking-[-.05em]">Built for campus life.</h3>
                <p className="mt-3 text-[13px] leading-6 text-[#717c95]">
                  Track pocket money, plan semesters, manage project costs, and build savings habits — all without the noise of professional finance tools.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {["Pocket money tracking", "Semester planning", "Project expenses", "Savings goals", "Everyday spending insights"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[12px] font-semibold text-[#52615a]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a29bf4]" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-[#695db3]">
                  Try as Student <ArrowUpRight size={15} />
                </Link>
              </div>
            </Reveal>

            {/* Professional card */}
            <Reveal>
              <div className="rounded-[28px] border border-[#d4efe1] bg-gradient-to-br from-[#eef8f3] to-[#FAF9F6] p-7 shadow-[6px_9px_23px_rgba(42,65,55,.06)] sm:p-9">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e7f8ef] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#3b8165]">
                  Professional
                </div>
                <h3 className="font-display text-[26px] font-bold tracking-[-.05em]">Built for working life.</h3>
                <p className="mt-3 text-[13px] leading-6 text-[#717c95]">
                  Track income and expenses, manage subscriptions, build an emergency fund, and use AI to forecast your financial future.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {["Income management", "Monthly expense tracking", "Emergency fund", "Subscription management", "AI-powered predictions"].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-[12px] font-semibold text-[#52615a]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4caf89]" /> {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-[12px] font-bold text-[#3c896c]">
                  Try as Professional <ArrowUpRight size={15} />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────── AI FEATURES ───────── */}
      <section id="ai-features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal className="text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#695db3]">
              <Sparkles size={13} /> Powered by AI
            </span>
            <h2 className="font-display text-[34px] font-bold tracking-[-.06em] sm:text-[44px]">
              Intelligence that <span className="text-[#695db3]">works for you.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-[#82908a]">
              From receipt scanning to spending predictions — AI is woven into every corner of your financial workspace.
            </p>
          </Reveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="mt-14 grid gap-5 sm:grid-cols-3"
          >
            {[
              { title: "Smart Insights", desc: "Personalised recommendations based on your spending patterns and goals.", icon: Bot, gradient: "from-[#eef3ff] to-[#f5f3ff]" },
              { title: "Receipt Scanner", desc: "Snap a photo of any receipt and let AI extract and categorise the expense.", icon: ReceiptIndianRupee, gradient: "from-[#fff5ef] to-[#fff8f3]" },
              { title: "Voice Expense", desc: "Say it out loud. AI converts your voice into structured expense entries.", icon: Mic, gradient: "from-[#eef8f4] to-[#e7f8ef]" },
            ].map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className={`rounded-[24px] bg-gradient-to-br ${item.gradient} border border-[#eef1ed] p-6 shadow-[6px_9px_20px_rgba(42,65,55,.05)] sm:p-7`}
              >
                <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-white shadow-sm">
                  <item.icon size={22} className="text-[#695db3]" />
                </div>
                <h3 className="mt-5 font-display text-[18px] font-bold tracking-[-.04em]">{item.title}</h3>
                <p className="mt-2 text-[12px] leading-5 text-[#717c95]">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="bg-[#172532] py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-[34px] font-bold tracking-[-.06em] text-white sm:text-[44px]">
              Your money has a rhythm.{" "}
              <span className="text-[#7BE2BE]">Let's make it work for you.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[14px] leading-6 text-[#a5b9b0]">
              Start tracking, get insights, and build the financial habits that keep every month comfortable.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#7BE2BE] px-7 text-[13px] font-bold text-[#172532] shadow-[0_8px_24px_rgba(123,226,190,.3)] transition hover:-translate-y-0.5"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#3a5160] px-7 text-[13px] font-bold text-white transition hover:-translate-y-0.5 hover:border-[#7BE2BE]"
              >
                Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-[#e3e9e3] bg-[#FAF9F6] py-12">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div>
              <Logo size="sm" />
              <p className="mt-2 max-w-xs text-[12px] leading-5 text-[#82908a]">
                Smart money management for students and professionals.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-[12px] font-semibold text-[#728079]">
              <a href="#features" className="hover:text-[#172532]">Features</a>
              <a href="#student" className="hover:text-[#172532]">Student</a>
              <a href="#professional" className="hover:text-[#172532]">Professional</a>
              <a href="#ai-features" className="hover:text-[#172532]">AI Insights</a>
              <Link href="/register" className="hover:text-[#172532]">Register</Link>
              <Link href="/login" className="hover:text-[#172532]">Login</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-[#e3e9e3] pt-6 text-center text-[11px] text-[#a2aca7]">
            © 2026 AI Expense Tracker. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
