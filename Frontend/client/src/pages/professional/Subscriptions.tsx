import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Edit2,
  Clock,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeaturePageHeader from "@/components/dashboard/FeaturePageHeader";
import { studentNav } from "@/data/studentData";
import { professionalNav } from "@/data/professionalData";
import api from "@/lib/api";

const PRESET_COLORS = [
  "#E50914", // Netflix Red
  "#1DB954", // Spotify Green
  "#00A8E1", // Prime Blue
  "#7BE2BE", // Mint
  "#a29bf4", // Purple
  "#fed876", // Amber
  "#ffb0c8", // Pink
  "#10a37f", // OpenAI Teal
];

export default function Subscriptions() {
  const { role } = useAuth();
  const isStudent = role === "student";

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTotal, setMonthlyTotal] = useState("₹0");
  const [annualTotal, setAnnualTotal] = useState("₹0");
  const [upcomingRenewal, setUpcomingRenewal] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "paused">("all");

  // Add Subscription Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("Monthly");
  const [nextDate, setNextDate] = useState("");
  const [color, setColor] = useState("#a9dced");
  const [logPayment, setLogPayment] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Subscription Modal state
  const [editingSub, setEditingSub] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCycle, setEditCycle] = useState("Monthly");
  const [editNextDate, setEditNextDate] = useState("");
  const [editColor, setEditColor] = useState("#a9dced");
  const [editSaving, setEditSaving] = useState(false);

  // Renew / Log action state
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const fetchSubs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/subscriptions");
      if (res.data.success) {
        const d = res.data.data;
        setSubscriptions(d.items || []);
        setMonthlyTotal(d.monthly_formatted || d.total_formatted || "₹0");
        setAnnualTotal(d.annual_formatted || "₹0");
        setUpcomingRenewal(d.upcoming_renewal || null);
        setActiveCount(d.active_count ?? (d.items || []).filter((s: any) => s.is_active).length);
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim()) {
      toast.error("Please enter subscription service name");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid amount greater than ₹0");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        amount: amt,
        cycle,
        color,
        log_payment: logPayment,
      };
      if (nextDate) payload.next_billing_date = nextDate;

      const res = await api.post("/subscriptions", payload);
      if (res.data.success) {
        toast.success(`Subscription "${name}" added successfully!`);
        setIsModalOpen(false);
        setName("");
        setAmount("");
        setCycle("Monthly");
        setNextDate("");
        setColor("#a9dced");
        setLogPayment(true);
        await fetchSubs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add subscription");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (s: any) => {
    setEditingSub(s);
    setEditName(s.name || "");
    setEditAmount(String(s.amount_raw || parseFloat(String(s.amount).replace(/[^0-9.]/g, "") || "0")));
    setEditCycle(s.cycle || "Monthly");
    setEditNextDate(s.next_billing_date || "");
    setEditColor(s.color || "#a9dced");
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;
    const amt = parseFloat(editAmount);
    if (!editName.trim()) {
      toast.error("Service name is required");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setEditSaving(true);
      const payload: any = {
        name: editName.trim(),
        amount: amt,
        cycle: editCycle,
        color: editColor,
        next_billing_date: editNextDate || null,
      };
      const res = await api.put(`/subscriptions/${editingSub.id}`, payload);
      if (res.data.success) {
        toast.success(`Updated "${editName}"`);
        setEditingSub(null);
        await fetchSubs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update subscription");
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async (id: string, subName: string) => {
    try {
      const res = await api.post(`/subscriptions/${id}/toggle`);
      if (res.data.success) {
        const isNowActive = res.data.data?.is_active;
        toast.success(isNowActive ? `Resumed "${subName}"` : `Paused "${subName}"`);
        await fetchSubs();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleRenewNow = async (id: string, subName: string) => {
    try {
      setRenewingId(id);
      const res = await api.post(`/subscriptions/${id}/renew`);
      if (res.data.success) {
        toast.success(res.data.data.message || `Payment for ${subName} recorded and renewal date advanced! 🎉`);
        await fetchSubs();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process renewal");
    } finally {
      setRenewingId(null);
    }
  };

  const deleteSub = async (id: string, subName: string) => {
    if (!confirm(`Are you sure you want to remove "${subName}"?`)) return;

    try {
      await api.delete(`/subscriptions/${id}`);
      toast.success(`${subName} removed from subscriptions`);
      await fetchSubs();
    } catch {
      toast.error("Failed to remove subscription");
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    if (filterTab === "active") return s.is_active;
    if (filterTab === "paused") return !s.is_active;
    return true;
  });

  return (
    <DashboardLayout
      role={role!}
      navItems={isStudent ? studentNav : professionalNav}
      pageTitle="Subscriptions"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FeaturePageHeader
          role={role!}
          title="Recurring Subscriptions"
          description="Manage all your digital tools, memberships, and automated bills. Track normalized monthly burn, upcoming renewal dates, and one-click payment logs."
          icon={CreditCard}
          accentColor="#a9dced"
          accentBg="#e7f7fa"
        />

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-[#172532] px-4 py-2.5 text-[12px] font-bold text-white shadow-md shadow-[#172532]/20 transition hover:bg-[#25394b] active:scale-95 self-start sm:self-auto"
        >
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* Top Overview Cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[26px] bg-[#172532] p-6 text-white shadow-[10px_14px_35px_rgba(23,37,50,.16)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#a5b9b0]">Monthly Commitments</p>
            <span className="rounded-full bg-[#273a4b] px-2.5 py-0.5 text-[10px] font-bold text-[#7BE2BE]">Normalized</span>
          </div>
          <p className="mt-3 font-display text-[34px] font-bold tracking-[-.06em] text-[#7BE2BE]">{monthlyTotal}</p>
          <p className="mt-2 text-[11px] text-[#a5b9b0]">{activeCount} active recurring services</p>
        </div>

        <div className="rounded-[26px] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
          <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9aa69f]">Annualized Spend</p>
          <p className="mt-3 font-display text-[32px] font-bold tracking-[-.06em] text-[#172532]">{annualTotal}</p>
          <p className="mt-2 text-[11px] text-[#9ba59f]">Projected 12-month recurring total</p>
        </div>

        <div className="rounded-[26px] bg-[#eef3ff] p-6 shadow-[6px_9px_23px_rgba(42,65,55,.05)] border border-[#dde6fa]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#695db3]">Upcoming Renewal</p>
            {upcomingRenewal?.days_until_renewal !== undefined && (
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                upcomingRenewal.days_until_renewal <= 3 ? "bg-[#fdedeb] text-[#d9534f]" : "bg-[#e5e1fc] text-[#6355bc]"
              }`}>
                {upcomingRenewal.days_until_renewal === 0 ? "Today" : upcomingRenewal.days_until_renewal === 1 ? "Tomorrow" : `In ${upcomingRenewal.days_until_renewal} days`}
              </span>
            )}
          </div>
          <p className="mt-3 font-display text-[28px] font-bold tracking-[-.06em] text-[#2c2269]">
            {upcomingRenewal ? upcomingRenewal.next : "None soon"}
          </p>
          <p className="mt-2 text-[11px] text-[#8c8bb3]">
            {upcomingRenewal ? `${upcomingRenewal.name} · ${upcomingRenewal.amount}` : "All renewals up to date"}
          </p>
        </div>
      </div>

      {/* Active Subscriptions Card */}
      <div className="mt-6 rounded-[26px] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#edf3ef]">
          <div>
            <h3 className="font-display text-[21px] font-bold tracking-[-.05em] text-[#172532]">Subscriptions Roster</h3>
            <p className="text-[12px] text-[#82908a]">Auto-billed software, streaming, utilities, and memberships</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-[#f5f8f4] p-1">
            <button
              onClick={() => setFilterTab("all")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "all" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              All ({subscriptions.length})
            </button>
            <button
              onClick={() => setFilterTab("active")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "active" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterTab("paused")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "paused" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              Paused ({subscriptions.length - activeCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 flex h-32 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#a9dced] border-t-transparent" />
          </div>
        ) : filteredSubs.length > 0 ? (
          <div className="mt-4 divide-y divide-[#edf2ed]">
            {filteredSubs.map((s: any) => {
              const daysLeft = s.days_until_renewal;
              const isDueSoon = daysLeft !== null && daysLeft !== undefined && daysLeft >= 0 && daysLeft <= 3;
              const isOverdue = s.is_overdue;

              return (
                <div
                  key={s.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 transition hover:bg-[#fafcfa] px-3 rounded-2xl ${
                    !s.is_active ? "opacity-60 bg-[#f9fbf9]/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="h-12 w-12 grid place-items-center rounded-2xl shadow-sm shrink-0"
                      style={{ backgroundColor: `${s.color || '#a9dced'}22` }}
                    >
                      <CreditCard size={20} style={{ color: s.color || '#333' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-[#172532]">{s.name}</p>
                        {!s.is_active ? (
                          <span className="rounded-full bg-[#f0f4ef] px-2 py-0.5 text-[9px] font-bold uppercase text-[#82908a]">
                            Paused
                          </span>
                        ) : isOverdue ? (
                          <span className="rounded-full bg-[#fdedeb] px-2 py-0.5 text-[9px] font-bold uppercase text-[#d9534f]">
                            Due for renewal
                          </span>
                        ) : isDueSoon ? (
                          <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[9px] font-bold uppercase text-[#695db3]">
                            Renewing soon
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#e7f8ef] px-2 py-0.5 text-[9px] font-bold uppercase text-[#357963]">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9ba59f] mt-0.5">
                        <span className="font-semibold text-[#6c7873]">{s.cycle || "Monthly"}</span>
                        <span>•</span>
                        <span>Burn: {s.monthly_burn_formatted}/mo</span>
                        {s.next && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#695db3] font-medium">
                              <Calendar size={11} /> Renewing: {s.next}
                              {daysLeft !== null && daysLeft !== undefined && (
                                <span className="text-[10px]">
                                  ({daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : daysLeft > 0 ? `in ${daysLeft}d` : `${Math.abs(daysLeft)}d ago`})
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                    <div className="text-right">
                      <span className="font-display text-[16px] font-bold text-[#df7f64] block">
                        −{s.amount}
                      </span>
                      {s.cycle && s.cycle.toLowerCase() !== "monthly" && (
                        <span className="text-[10px] text-[#9ba59f] font-medium block">
                          ({s.monthly_burn_formatted}/mo)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 border-l border-[#eef2ee]">
                      {/* One-click Pay / Renew */}
                      {s.is_active && (
                        <button
                          onClick={() => handleRenewNow(s.id, s.name)}
                          disabled={renewingId === s.id}
                          className="flex items-center gap-1 rounded-xl bg-[#e7f8ef] px-2.5 py-1.5 text-[11px] font-bold text-[#357963] hover:bg-[#d8f3e5] transition disabled:opacity-50"
                          title="Log payment and advance renewal date"
                        >
                          <RotateCw size={12} className={renewingId === s.id ? "animate-spin" : ""} />
                          <span className="hidden md:inline">Log Payment</span>
                        </button>
                      )}

                      {/* Pause / Resume */}
                      <button
                        onClick={() => handleToggleActive(s.id, s.name)}
                        className={`rounded-xl p-2 transition ${
                          s.is_active
                            ? "text-[#82908a] hover:text-[#172532] hover:bg-[#f3f6f3]"
                            : "text-[#357963] hover:bg-[#e7f8ef]"
                        }`}
                        title={s.is_active ? "Pause subscription" : "Resume subscription"}
                      >
                        {s.is_active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="rounded-xl p-2 text-[#82908a] hover:text-[#172532] hover:bg-[#f3f6f3] transition"
                        title="Edit subscription"
                      >
                        <Edit2 size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteSub(s.id, s.name)}
                        className="rounded-xl p-2 text-[#b0beba] hover:text-red-500 hover:bg-[#fdedeb] transition"
                        title="Remove subscription"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <CreditCard size={36} className="mx-auto mb-3 text-[#a9dced]" />
            <h4 className="font-display text-[18px] font-bold text-[#172532]">
              {filterTab === "all" ? "No subscriptions added" : `No ${filterTab} subscriptions`}
            </h4>
            <p className="mt-1 text-[13px] text-[#82908a]">
              Keep track of Netflix, Spotify, gym memberships, and cloud tools in one central dashboard.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#172532] px-5 py-2.5 text-[12px] font-bold text-white shadow-md hover:bg-[#25394b] transition"
            >
              <Plus size={15} /> Add your first subscription
            </button>
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ed]">
              <h3 className="font-display text-[20px] font-bold text-[#172532]">
                Add Recurring Subscription
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-[#82908a] hover:bg-[#f3f6f3] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubscription} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Service / Tool Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Spotify, Gym, ChatGPT Plus, AWS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3.5 py-2.5 text-[13px] font-semibold text-[#172532] focus:border-[#a9dced] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Cost per Cycle (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[14px] font-bold text-[#82908a]">₹</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="e.g. 649"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] py-2.5 pl-8 pr-3.5 text-[13px] font-semibold text-[#172532] focus:border-[#a9dced] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3 py-2.5 text-[12px] font-semibold text-[#172532] focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                    Next Renewal Date
                  </label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3 py-2.5 text-[12px] font-semibold text-[#172532] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full transition ${
                        color === c ? "ring-2 ring-[#172532] scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="log_initial_payment"
                  checked={logPayment}
                  onChange={(e) => setLogPayment(e.target.checked)}
                  className="h-4 w-4 rounded text-[#357963] focus:ring-[#357963]"
                />
                <label htmlFor="log_initial_payment" className="text-[12px] font-medium text-[#4c5c53]">
                  Record initial payment as an expense in transactions right now
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf2ed]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-[12px] font-bold text-[#82908a] hover:bg-[#f3f6f3] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#172532] px-5 py-2 text-[12px] font-bold text-white shadow-md transition hover:bg-[#25394b] disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Save Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2ed]">
              <h3 className="font-display text-[20px] font-bold text-[#172532]">
                Edit Subscription
              </h3>
              <button
                onClick={() => setEditingSub(null)}
                className="rounded-full p-1.5 text-[#82908a] hover:bg-[#f3f6f3] transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubscription} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Service / Tool Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3.5 py-2.5 text-[13px] font-semibold text-[#172532] focus:border-[#a9dced] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Cost per Cycle (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[14px] font-bold text-[#82908a]">₹</span>
                  <input
                    type="number"
                    step="1"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] py-2.5 pl-8 pr-3.5 text-[13px] font-semibold text-[#172532] focus:border-[#a9dced] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={editCycle}
                    onChange={(e) => setEditCycle(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3 py-2.5 text-[12px] font-semibold text-[#172532] focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                    Next Renewal Date
                  </label>
                  <input
                    type="date"
                    value={editNextDate}
                    onChange={(e) => setEditNextDate(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3 py-2.5 text-[12px] font-semibold text-[#172532] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[.12em] text-[#82908a] mb-1.5">
                  Color Tag
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`h-7 w-7 rounded-full transition ${
                        editColor === c ? "ring-2 ring-[#172532] scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#edf2ed]">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="rounded-xl px-4 py-2 text-[12px] font-bold text-[#82908a] hover:bg-[#f3f6f3] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-[#172532] px-5 py-2 text-[12px] font-bold text-white shadow-md transition hover:bg-[#25394b] disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Update Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
