import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Plus, X, HeartPulse, Sliders, ArrowDownLeft, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/layout/DashboardLayout";
import HeroMetricCard from "@/components/dashboard/HeroMetricCard";
import StatCard from "@/components/dashboard/StatCard";
import SpendingPulseChart from "@/components/dashboard/SpendingPulseChart";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import BudgetHealthCard from "@/components/dashboard/BudgetHealthCard";
import EmergencyFundCard from "@/components/dashboard/EmergencyFundCard";
import SavingsGoalCard from "@/components/dashboard/SavingsGoalCard";
import TransactionList from "@/components/dashboard/TransactionList";
import AddExpenseModal from "@/components/dashboard/AddExpenseModal";
import { professionalNav } from "@/data/professionalData";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/auth/AuthContext";
import api from "@/lib/api";
import { getISTGreeting, formatISTDate } from "@/lib/utils";

const FALLBACK_EMERGENCY_FUND = {
  current: 180000,
  recommended: 270000,
  monthsCovered: 4.0,
  percentComplete: 67,
  monthly_expense_estimate: 45000,
  target_months: 6,
  shortfall: 90000,
  surplus: 0
};
const FALLBACK_SAVINGS_GOAL = { name: "No goals yet", current: 0, target: 0, percentComplete: 0 };

type EmergencyModalMode = "deposit" | "withdraw" | "adjust" | null;

export default function ProfessionalDashboard() {
  const [showAdd, setShowAdd] = useState(false);
  const [modalType, setModalType] = useState<"expense" | "income">("expense");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard("professional");

  // Emergency Fund Modal State
  const [efModalMode, setEfModalMode] = useState<EmergencyModalMode>(null);
  const [efAmount, setEfAmount] = useState("");
  const [efMonthlyEstimate, setEfMonthlyEstimate] = useState("45000");
  const [efTargetMonths, setEfTargetMonths] = useState("6");
  const [efSubmitting, setEfSubmitting] = useState(false);

  const greetingName = user?.name?.split(" ")[0] ?? "there";
  const greeting = getISTGreeting();
  const today = formatISTDate(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const handleOpenDeposit = () => {
    setEfAmount("");
    setEfModalMode("deposit");
  };

  const handleOpenWithdraw = () => {
    setEfAmount("");
    setEfModalMode("withdraw");
  };

  const handleOpenAdjust = () => {
    const ef = data?.emergencyFund || FALLBACK_EMERGENCY_FUND;
    setEfMonthlyEstimate(String(ef.monthly_expense_estimate || 45000));
    setEfTargetMonths(String(ef.target_months || 6));
    setEfModalMode("adjust");
  };

  const handleEfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!efModalMode) return;

    setEfSubmitting(true);
    try {
      if (efModalMode === "deposit") {
        const amt = parseFloat(efAmount);
        if (isNaN(amt) || amt <= 0) {
          toast.error("Please enter a valid deposit amount");
          setEfSubmitting(false);
          return;
        }
        await api.post("/emergency-fund/contribute", { amount: amt });
        toast.success(`Deposited ₹${amt.toLocaleString("en-IN")} into Emergency Reserve!`);
      } else if (efModalMode === "withdraw") {
        const amt = parseFloat(efAmount);
        if (isNaN(amt) || amt <= 0) {
          toast.error("Please enter a valid withdrawal amount");
          setEfSubmitting(false);
          return;
        }
        await api.post("/emergency-fund/withdraw", { amount: amt });
        toast.success(`Withdrew ₹${amt.toLocaleString("en-IN")} from Emergency Reserve`);
      } else if (efModalMode === "adjust") {
        const est = parseFloat(efMonthlyEstimate);
        const tMonths = parseInt(efTargetMonths, 10);
        if (isNaN(est) || est <= 0 || isNaN(tMonths) || tMonths <= 0) {
          toast.error("Please enter valid positive numbers for target runway");
          setEfSubmitting(false);
          return;
        }
        await api.put("/emergency-fund", {
          monthly_expense_estimate: est,
          target_months: tMonths,
        });
        toast.success(`Updated emergency runway target to ${tMonths} months!`);
      }

      setEfModalMode(null);
      await refetch();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to update Emergency Fund";
      toast.error(msg);
    } finally {
      setEfSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      role="professional"
      navItems={professionalNav}
      pageTitle={`${greeting}, ${greetingName}`}
      subtitle={today}
    >
      {/* ── Hero banner + CTA ── */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e7f8ef] px-3 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-[#3b8165]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#55c797]" /> Your money at a glance
          </div>
          <h2 className="max-w-[620px] font-display text-[31px] font-bold leading-[1.08] tracking-[-.06em] sm:text-[40px]">
            Steady growth, smarter <span className="text-[#4bbf90]">decisions.</span>
          </h2>
          <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#82908a]">
            Monitor your income, optimise spending, and let AI guide your financial future.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => { setModalType("income"); setShowAdd(true); }}
            className="h-11 rounded-xl bg-[#2b7256] px-4 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(43,114,86,.3)] transition hover:-translate-y-0.5 hover:bg-[#235d46]"
          >
            <Plus size={16} className="mr-1.5 text-[#7BE2BE]" />
            Add Income Received
          </Button>
          <Button
            onClick={() => { setModalType("expense"); setShowAdd(true); }}
            className="group h-11 rounded-xl bg-[#172532] px-4 text-[12px] font-bold text-white shadow-[6px_8px_18px_rgba(23,37,50,.14)] transition hover:-translate-y-0.5 hover:bg-[#243b4a]"
          >
            <Plus size={17} className="mr-1.5 text-[#7BE2BE] transition group-hover:rotate-90" />
            Add Expense
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7BE2BE] border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* ── Main metrics row ── */}
          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr_1fr]">
            <HeroMetricCard metric={data.heroMetric} />
            {data.statMetrics.map((m: any, i: number) => (
              <StatCard key={m.label} metric={m} index={i} />
            ))}
          </div>

          {/* ── Charts + AI row ── */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.42fr_1fr]">
            <SpendingPulseChart trendBars={data.trendBars} />
            <AIInsightCard
              insight={data.aiInsight}
              onAction={() => {
                navigate("/professional/ai-insights");
                toast.success("Insight saved to your workspace");
              }}
            />
          </div>

          {/* ── Budget + Emergency + Savings row ── */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">
            <BudgetHealthCard categories={data.budgetCategories} usedPercent={data.budgetUsedPercent} />
            <EmergencyFundCard
              fund={data.emergencyFund ?? FALLBACK_EMERGENCY_FUND}
              onDeposit={handleOpenDeposit}
              onWithdraw={handleOpenWithdraw}
              onAdjustTarget={handleOpenAdjust}
            />
            <SavingsGoalCard goal={data.savingsGoal ?? FALLBACK_SAVINGS_GOAL} />
          </div>

          {/* ── Transactions ── */}
          <TransactionList transactions={data.recentTransactions} />
        </>
      ) : (
        <div className="mt-10 text-center text-[#82908a]">Failed to load dashboard. Please try again.</div>
      )}

      {/* ── Add transaction modal ── */}
      <AddExpenseModal
        open={showAdd}
        onClose={() => { setShowAdd(false); refetch(); }}
        initialType={modalType}
      />

      {/* ── Emergency Fund Action Modal ── */}
      {efModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] border border-[#f5dfd2] bg-white p-7 shadow-[0_20px_50px_rgba(42,65,55,.15)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#f5ebe1]">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fae8dc] text-[#cf7245]">
                  {efModalMode === "adjust" ? <Sliders size={18} /> : efModalMode === "deposit" ? <Plus size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <h3 className="font-display text-[18px] font-bold text-[#172532]">
                    {efModalMode === "deposit" && "Deposit to Emergency Fund"}
                    {efModalMode === "withdraw" && "Emergency Withdrawal"}
                    {efModalMode === "adjust" && "Configure Runway Target"}
                  </h3>
                  <p className="text-[11px] text-[#8e9c94]">
                    {efModalMode === "deposit" && "Boost your liquid financial buffer"}
                    {efModalMode === "withdraw" && "Draw reserves for an unexpected expense"}
                    {efModalMode === "adjust" && "Set monthly expense baseline & target months"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEfModalMode(null)}
                className="grid h-8 w-8 place-items-center rounded-xl text-[#8e9c94] hover:bg-[#f3f6f3]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEfSubmit} className="mt-5 space-y-4">
              {efModalMode === "deposit" && (
                <div>
                  <label className="block text-[11px] font-bold text-[#728079] mb-1.5">
                    Deposit Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={efAmount}
                    onChange={(e) => setEfAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    autoFocus
                    required
                    className="h-11 w-full rounded-xl border border-[#e2e8e2] bg-[#f9fbf8] px-4 text-sm font-semibold outline-none focus:border-[#ed9b76] focus:ring-2 focus:ring-[#fde5d6]"
                  />
                  <p className="mt-1.5 text-[11px] text-[#8b9891]">
                    Current balance: ₹{((data?.emergencyFund?.current || 180000)).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              {efModalMode === "withdraw" && (
                <div>
                  <label className="block text-[11px] font-bold text-[#728079] mb-1.5">
                    Withdrawal Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={data?.emergencyFund?.current || 180000}
                    step="any"
                    value={efAmount}
                    onChange={(e) => setEfAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    autoFocus
                    required
                    className="h-11 w-full rounded-xl border border-[#e2e8e2] bg-[#f9fbf8] px-4 text-sm font-semibold outline-none focus:border-[#ed9b76] focus:ring-2 focus:ring-[#fde5d6]"
                  />
                  <p className="mt-1.5 text-[11px] text-[#cf7245]">
                    Available balance: ₹{((data?.emergencyFund?.current || 180000)).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              {efModalMode === "adjust" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-[#728079] mb-1.5">
                      Monthly Expense Estimate (₹)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={efMonthlyEstimate}
                      onChange={(e) => setEfMonthlyEstimate(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-[#e2e8e2] bg-[#f9fbf8] px-4 text-sm font-semibold outline-none focus:border-[#ed9b76] focus:ring-2 focus:ring-[#fde5d6]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#728079] mb-1.5">
                      Target Safety Runway (Months)
                    </label>
                    <select
                      value={efTargetMonths}
                      onChange={(e) => setEfTargetMonths(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e2e8e2] bg-[#f9fbf8] px-4 text-sm font-semibold outline-none focus:border-[#ed9b76] focus:ring-2 focus:ring-[#fde5d6]"
                    >
                      <option value="3">3 Months (Standard Starter)</option>
                      <option value="6">6 Months (Recommended CFP Baseline)</option>
                      <option value="9">9 Months (Conservative)</option>
                      <option value="12">12 Months (Maximum Resilience)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#f5ebe1]">
                <button
                  type="button"
                  onClick={() => setEfModalMode(null)}
                  className="rounded-xl px-4 py-2 text-[12px] font-semibold text-[#728079] hover:bg-[#f3f6f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={efSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#ed9b76] px-5 py-2 text-[12px] font-bold text-white shadow-md hover:bg-[#e08962] transition disabled:opacity-50"
                >
                  {efSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check size={14} /> Confirm
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-5 right-5 z-20 grid h-12 w-12 place-items-center rounded-2xl bg-[#172532] text-white shadow-[0_10px_28px_rgba(23,37,50,.22)] transition hover:-translate-y-1 lg:hidden"
        aria-label="Add expense"
      >
        <Plus size={21} className="text-[#7BE2BE]" />
      </button>
    </DashboardLayout>
  );
}
