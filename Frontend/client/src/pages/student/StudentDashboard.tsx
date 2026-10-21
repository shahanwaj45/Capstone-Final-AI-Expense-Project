import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Plus, Sparkles, ArrowUpRight } from "lucide-react";
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
import { studentNav } from "@/data/studentData";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/auth/AuthContext";
import { getISTGreeting, formatISTDate } from "@/lib/utils";

// Fallback data shapes to avoid null crashes
const FALLBACK_EMERGENCY_FUND = {
  current: 0,
  recommended: 180000,
  monthsCovered: 0,
  percentComplete: 0,
};

const FALLBACK_SAVINGS_GOAL = {
  name: "No goals yet",
  current: 0,
  target: 0,
  percentComplete: 0,
};

export default function StudentDashboard() {
  const [showAdd, setShowAdd] = useState(false);
  const [modalType, setModalType] = useState<"expense" | "income">("expense");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data, loading, refetch } = useDashboard("student");

  const greetingName = user?.name?.split(" ")[0] ?? "there";
  const greeting = getISTGreeting();
  const today = formatISTDate(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <DashboardLayout
      role="student"
      navItems={studentNav}
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
            A calmer way to stay <span className="text-[#4bbf90]">ahead.</span>
          </h2>
          <p className="mt-3 max-w-[560px] text-[13px] leading-6 text-[#82908a]">
            Understand your spending, find your next best move, and keep the month feeling comfortable.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => { setModalType("income"); setShowAdd(true); }}
            className="h-11 rounded-xl bg-[#2b7256] px-4 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(43,114,86,.3)] transition hover:-translate-y-0.5 hover:bg-[#235d46]"
          >
            <Plus size={16} className="mr-1.5 text-[#7BE2BE]" />
            Add Money Received
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
                navigate("/student/ai-insights");
                toast.success("Insight saved to your workspace");
              }}
            />
          </div>

          {/* ── Budget + Emergency + Savings row ── */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr_1fr]">
            <BudgetHealthCard categories={data.budgetCategories} usedPercent={data.budgetUsedPercent} />
            <EmergencyFundCard fund={data.emergencyFund ?? FALLBACK_EMERGENCY_FUND} />
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
