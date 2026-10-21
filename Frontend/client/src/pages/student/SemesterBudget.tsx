import { useEffect, useState } from "react";
import {
  CalendarDays,
  Edit2,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  PieChart,
  X,
  Plus,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeaturePageHeader from "@/components/dashboard/FeaturePageHeader";
import { studentNav } from "@/data/studentData";
import api from "@/lib/api";

export default function SemesterBudget() {
  const [selectedTerm, setSelectedTerm] = useState<"spring" | "fall">("fall");
  const [semesterData, setSemesterData] = useState<any>(null);
  const [months, setMonths] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Single Month Modal
  const [editingMonth, setEditingMonth] = useState<any>(null);
  const [monthBudgetInput, setMonthBudgetInput] = useState("");
  const [savingMonth, setSavingMonth] = useState(false);

  // Set Entire Term Modal
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [termMonthlyBudgetInput, setTermMonthlyBudgetInput] = useState("12000");
  const [savingTerm, setSavingTerm] = useState(false);

  const fetchSemester = async (term: "spring" | "fall") => {
    try {
      setLoading(true);
      const res = await api.get("/semester", { params: { term } });
      if (res.data.success) {
        const d = res.data.data;
        setSemesterData(d);
        const mList = Array.isArray(d) ? d : (d.months || d.items || []);
        setMonths(mList);
        setCategories(d.categories || []);
      }
    } catch (err) {
      console.error("Failed to load semester budget:", err);
      toast.error("Failed to load semester budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically default to current active term based on month
    const currentMonth = new Date().getMonth() + 1;
    const initialTerm = currentMonth <= 6 ? "spring" : "fall";
    setSelectedTerm(initialTerm);
    fetchSemester(initialTerm);
  }, []);

  const handleTermChange = (term: "spring" | "fall") => {
    setSelectedTerm(term);
    fetchSemester(term);
  };

  const handleOpenEditMonth = (m: any) => {
    setEditingMonth(m);
    setMonthBudgetInput(String(m.budget || 15000));
  };

  const handleSaveMonthBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMonth) return;
    const amt = parseFloat(monthBudgetInput);
    if (isNaN(amt) || amt < 0) {
      toast.error("Please enter a valid budget amount");
      return;
    }

    try {
      setSavingMonth(true);
      const res = await api.post("/semester", {
        month: editingMonth.month_num || editingMonth.month,
        year: editingMonth.year || new Date().getFullYear(),
        budget: amt,
      });
      if (res.data.success) {
        toast.success(`Updated budget for ${editingMonth.month} to ₹${amt.toLocaleString("en-IN")}!`);
        setEditingMonth(null);
        await fetchSemester(selectedTerm);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update monthly budget");
    } finally {
      setSavingMonth(false);
    }
  };

  const handleSaveTermBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(termMonthlyBudgetInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid monthly budget amount");
      return;
    }

    try {
      setSavingTerm(true);
      const res = await api.post("/semester/set-term", {
        term: selectedTerm,
        year: new Date().getFullYear(),
        monthly_budget: amt,
      });
      if (res.data.success) {
        toast.success(res.data.data.message || `Set entire ${selectedTerm} semester to ₹${amt.toLocaleString("en-IN")}/month!`);
        setIsTermModalOpen(false);
        await fetchSemester(selectedTerm);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to set term budget");
    } finally {
      setSavingTerm(false);
    }
  };

  const totalBudget = semesterData?.total_budget ?? months.reduce((acc, m) => acc + (m.budget || 0), 0);
  const totalSpent = semesterData?.total_spent ?? months.reduce((acc, m) => acc + (m.spent || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const paceStatus = semesterData?.pace_status || (percentUsed <= 75 ? "On Track" : percentUsed <= 100 ? "Pacing Normal" : "Over Budget");

  return (
    <DashboardLayout role="student" navItems={studentNav} pageTitle="Semester Budget">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FeaturePageHeader
          role="student"
          title="Collegiate Semester Budget"
          description="Plan, allocate, and monitor your finances across the full academic semester. Track month-by-month burn rates and term runway."
          icon={CalendarDays}
          accentColor="#a29bf4"
          accentBg="#f0edff"
        />

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Term Switcher */}
          <div className="flex items-center rounded-2xl bg-[#eef2ee] p-1 shadow-inner">
            <button
              onClick={() => handleTermChange("spring")}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
                selectedTerm === "spring"
                  ? "bg-white text-[#172532] shadow-sm"
                  : "text-[#6f7e76] hover:text-[#172532]"
              }`}
            >
              Spring (Jan–Jun)
            </button>
            <button
              onClick={() => handleTermChange("fall")}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-bold transition ${
                selectedTerm === "fall"
                  ? "bg-white text-[#172532] shadow-sm"
                  : "text-[#6f7e76] hover:text-[#172532]"
              }`}
            >
              Fall / Monsoon (Jul–Dec)
            </button>
          </div>

          <button
            onClick={() => setIsTermModalOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-[#172532] px-4 py-2.5 text-[12px] font-bold text-white shadow-md shadow-[#172532]/20 transition hover:bg-[#25394b] active:scale-95"
          >
            <Sliders size={14} /> Set Term Target
          </button>
        </div>
      </div>

      {/* Top Semester Metric Cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <div className="rounded-[26px] bg-[#172532] p-5 text-white shadow-[10px_14px_35px_rgba(23,37,50,.16)]">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#a5b9b0]">Semester Allocation</p>
          <p className="mt-2 font-display text-[30px] font-bold tracking-[-.06em] text-[#7BE2BE]">
            ₹{totalBudget.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-[#a5b9b0]">Total planned 6-month budget</p>
        </div>

        <div className="rounded-[26px] bg-white p-5 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9aa69f]">Term Outflow</p>
          <p className="mt-2 font-display text-[30px] font-bold tracking-[-.06em] text-[#df7f64]">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-[#9ba59f]">{percentUsed}% of semester budget used</p>
        </div>

        <div className="rounded-[26px] bg-white p-5 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9aa69f]">Remaining Runway</p>
          <p className="mt-2 font-display text-[30px] font-bold tracking-[-.06em] text-[#357963]">
            ₹{remainingBudget.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-[11px] text-[#9ba59f]">Remaining balance for term</p>
        </div>

        <div className="rounded-[26px] bg-[#f0edff] p-5 shadow-[6px_9px_23px_rgba(42,65,55,.05)] border border-[#dfd7ff]">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#6355bc]">Semester Health</p>
          <p className="mt-2 font-display text-[26px] font-bold tracking-[-.05em] text-[#3f3192]">
            {paceStatus}
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-[#dfd7ff]">
            <div
              className={`h-full rounded-full ${percentUsed > 90 ? "bg-[#e68767]" : "bg-[#7c6dc7]"}`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Monthly Cards Grid */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-[20px] font-bold text-[#172532]">
              {semesterData?.term_label || (selectedTerm === "spring" ? "Spring Term Months" : "Fall / Monsoon Term Months")}
            </h3>
            <p className="text-[12px] text-[#82908a]">Click "Adjust" on any month to fine-tune its spending ceiling</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-[26px] bg-white border border-[#edf2ed]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#a29bf4] border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {months.map((m) => {
              const bgt = m.budget || 15000;
              const spnt = m.spent || 0;
              const pct = bgt > 0 ? Math.round((spnt / bgt) * 100) : 0;
              const isOver = spnt > bgt;
              const remaining = Math.max(0, bgt - spnt);

              return (
                <div
                  key={m.month_num || m.month}
                  className={`relative rounded-[24px] border p-5 shadow-[4px_6px_18px_rgba(42,65,55,.05)] transition hover:shadow-md ${
                    m.status === "active"
                      ? "border-[#7BE2BE] bg-white ring-2 ring-[#7BE2BE]/30"
                      : m.status === "complete"
                        ? "border-[#e3e9e3] bg-[#f9fbf8]"
                        : "border-[#eef1ed] bg-[#fafcfa]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-[17px] font-bold text-[#172532]">{m.month}</h4>
                      {m.status === "active" && (
                        <span className="flex h-2 w-2 rounded-full bg-[#55c797] animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          m.status === "active"
                            ? "bg-[#e7f8ef] text-[#357963]"
                            : m.status === "complete"
                              ? "bg-[#f0f4ef] text-[#82908a]"
                              : "bg-[#f5f8f4] text-[#a2aca7]"
                        }`}
                      >
                        {m.status}
                      </span>
                      <button
                        onClick={() => handleOpenEditMonth(m)}
                        className="rounded-lg p-1.5 text-[#8c9891] hover:text-[#172532] hover:bg-[#edf2ed] transition"
                        title="Adjust monthly budget"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <p className="font-display text-[26px] font-bold tracking-[-.05em] text-[#172532]">
                        ₹{spnt.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-[#9ba59f]">of ₹{bgt.toLocaleString("en-IN")} target limit</p>
                    </div>
                    <div className="text-right">
                      {isOver ? (
                        <span className="text-[11px] font-bold text-[#d9534f]">
                          +₹{(spnt - bgt).toLocaleString("en-IN")} over
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#357963]">
                          ₹{remaining.toLocaleString("en-IN")} left
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 h-2.5 rounded-full bg-[#eef1ed] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct > 100
                          ? "bg-[#d9534f]"
                          : pct > 85
                            ? "bg-[#f6ae8e]"
                            : "bg-[#7BE2BE]"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-[#9ba59f]">
                    <span>{pct}% utilized</span>
                    <span>{m.status === "complete" ? "Closed month" : m.status === "active" ? "Current month" : "Upcoming"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Semester Outflow Category Distribution */}
      {categories.length > 0 && (
        <div className="mt-8 rounded-[26px] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
          <div className="flex items-center justify-between pb-3 border-b border-[#edf3ef]">
            <div>
              <h3 className="font-display text-[19px] font-bold text-[#172532]">
                Semester Category Drivers
              </h3>
              <p className="text-[12px] text-[#82908a]">Aggregated expense distribution across this academic term</p>
            </div>
            <span className="rounded-xl bg-[#f0edff] px-3 py-1 text-[11px] font-bold text-[#6355bc]">
              Total: ₹{totalSpent.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c: any) => (
              <div key={c.category} className="rounded-2xl bg-[#f9fbf8] p-4 border border-[#edf2ed]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#172532]">{c.category}</span>
                  <span className="text-[11px] font-bold text-[#6355bc]">{c.percentage}%</span>
                </div>
                <p className="mt-2 font-display text-[20px] font-bold text-[#172532]">{c.formatted}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#e8eee8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#a29bf4]"
                    style={{ width: `${Math.min(c.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Single Month Modal */}
      {editingMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ed]">
              <h3 className="font-display text-[18px] font-bold text-[#172532]">
                Adjust {editingMonth.month} Budget
              </h3>
              <button
                onClick={() => setEditingMonth(null)}
                className="rounded-full p-1.5 text-[#82908a] hover:bg-[#f3f6f3] transition"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveMonthBudget} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Monthly Allowance / Budget Target (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[14px] font-bold text-[#82908a]">₹</span>
                  <input
                    type="number"
                    step="500"
                    value={monthBudgetInput}
                    onChange={(e) => setMonthBudgetInput(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] py-2.5 pl-8 pr-3.5 text-[14px] font-semibold text-[#172532] focus:border-[#a29bf4] focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#9ba59f]">
                  Current spent in {editingMonth.month}: ₹{(editingMonth.spent || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf2ed]">
                <button
                  type="button"
                  onClick={() => setEditingMonth(null)}
                  className="rounded-xl px-4 py-2 text-[12px] font-bold text-[#82908a] hover:bg-[#f3f6f3] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMonth}
                  className="rounded-xl bg-[#172532] px-5 py-2 text-[12px] font-bold text-white shadow-md transition hover:bg-[#25394b] disabled:opacity-50"
                >
                  {savingMonth ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Entire Semester Target Modal */}
      {isTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ed]">
              <h3 className="font-display text-[19px] font-bold text-[#172532]">
                Set {selectedTerm === "spring" ? "Spring" : "Fall / Monsoon"} Term Target
              </h3>
              <button
                onClick={() => setIsTermModalOpen(false)}
                className="rounded-full p-1.5 text-[#82908a] hover:bg-[#f3f6f3] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTermBudget} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Monthly Target for All 6 Months (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[14px] font-bold text-[#82908a]">₹</span>
                  <input
                    type="number"
                    step="500"
                    value={termMonthlyBudgetInput}
                    onChange={(e) => setTermMonthlyBudgetInput(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] py-2.5 pl-8 pr-3.5 text-[14px] font-semibold text-[#172532] focus:border-[#a29bf4] focus:outline-none"
                  />
                </div>
                <div className="mt-2 rounded-xl bg-[#f0edff] p-3 text-[11px] font-medium text-[#4d3fa5]">
                  Setting ₹{parseFloat(termMonthlyBudgetInput || "0").toLocaleString("en-IN")}/month will configure an aggregate semester runway of <strong>₹{(parseFloat(termMonthlyBudgetInput || "0") * 6).toLocaleString("en-IN")}</strong> across all 6 months of the term.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf2ed]">
                <button
                  type="button"
                  onClick={() => setIsTermModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-[12px] font-bold text-[#82908a] hover:bg-[#f3f6f3] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTerm}
                  className="rounded-xl bg-[#172532] px-5 py-2 text-[12px] font-bold text-white shadow-md transition hover:bg-[#25394b] disabled:opacity-50"
                >
                  {savingTerm ? "Applying..." : "Apply to Semester"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
