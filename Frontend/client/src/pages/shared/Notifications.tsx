import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  Goal,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Check,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeaturePageHeader from "@/components/dashboard/FeaturePageHeader";
import { studentNav } from "@/data/studentData";
import { professionalNav } from "@/data/professionalData";
import api from "@/lib/api";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: "info" | "warning" | "critical";
  action_link?: string;
  is_read: boolean;
  timestamp: string;
  created_at: string;
}

export default function Notifications() {
  const { role } = useAuth();
  const isStudent = role === "student";
  const [, navigate] = useLocation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "priority">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications");
      if (res.data.success) {
        setNotifications(res.data.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      toast.error("Could not fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success("Alert marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success("All alerts marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success("Notification dismissed");
    } catch {
      toast.error("Failed to dismiss notification");
    }
  };

  const handleClearRead = async () => {
    try {
      await api.delete("/notifications/clear");
      setNotifications((prev) => prev.filter((n) => !n.is_read));
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success("Cleared read notifications");
    } catch {
      toast.error("Failed to clear read notifications");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const criticalCount = notifications.filter((n) => n.severity === "critical" || n.severity === "warning").length;

  const filtered = notifications.filter((item) => {
    if (filterTab === "unread" && item.is_read) return false;
    if (filterTab === "priority" && item.severity === "info") return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  return (
    <DashboardLayout
      role={role!}
      navItems={isStudent ? studentNav : professionalNav}
      pageTitle="Notifications & Financial Alerts"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FeaturePageHeader
          role={role!}
          title="Financial Alerts Center"
          description="Real-time monitoring for category limits, safe-to-spend velocity, subscription renewals, and savings milestones."
          icon={Bell}
          accentColor="#f29b75"
          accentBg="#fff0eb"
        />

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-[12px] font-bold text-[#172532] border border-[#e4eae4] shadow-sm hover:bg-[#f6f8f6] transition"
            >
              <CheckCheck size={14} className="text-[#357963]" /> Mark All Read
            </button>
          )}

          {notifications.some((n) => n.is_read) && (
            <button
              onClick={handleClearRead}
              className="flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-[12px] font-bold text-[#82908a] border border-[#e4eae4] shadow-sm hover:text-[#d9534f] hover:border-[#fcd9d6] transition"
            >
              <Trash2 size={13} /> Clear Read
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Row */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[24px] bg-white p-5 shadow-[4px_6px_18px_rgba(42,65,55,.05)] border border-[#edf3ef]">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#9aa69f]">Unread Alerts</p>
          <p className="mt-2 font-display text-[32px] font-bold tracking-[-.06em] text-[#172532]">{unreadCount}</p>
          <p className="mt-1 text-[11px] text-[#9ba59f]">Requiring your attention</p>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-[4px_6px_18px_rgba(42,65,55,.05)] border border-[#edf3ef]">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#e08962]">High Priority</p>
          <p className="mt-2 font-display text-[32px] font-bold tracking-[-.06em] text-[#df7f64]">{criticalCount}</p>
          <p className="mt-1 text-[11px] text-[#9ba59f]">Critical thresholds & warnings</p>
        </div>

        <div className="rounded-[24px] bg-[#eef8f2] p-5 shadow-[4px_6px_18px_rgba(42,65,55,.05)] border border-[#d6ede0]">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#3b8165]">Alert System Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#55c797] animate-pulse" />
            <span className="font-display text-[22px] font-bold text-[#235846]">Live & Synchronized</span>
          </div>
          <p className="mt-1 text-[11px] text-[#558673]">Evaluated against Indian Standard Time (IST)</p>
        </div>
      </div>

      {/* Main Alert List Container */}
      <div className="mt-6 rounded-[26px] bg-white p-6 shadow-[6px_9px_23px_rgba(42,65,55,.07)] border border-[#edf3ef]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#edf3ef]">
          {/* Filter Tabs */}
          <div className="flex items-center rounded-xl bg-[#f5f8f4] p-1">
            <button
              onClick={() => setFilterTab("all")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "all" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterTab("unread")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "unread" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilterTab("priority")}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                filterTab === "priority" ? "bg-white text-[#172532] shadow-sm" : "text-[#718078] hover:text-[#172532]"
              }`}
            >
              Warnings & Limits ({criticalCount})
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-[#9ba59f]" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-[#dfe5df] bg-[#f9fbf8] px-3 py-1.5 text-[11px] font-semibold text-[#172532] focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="budget_alert">Budget Alerts</option>
              <option value="subscription_renewal">Subscriptions</option>
              <option value="savings_milestone">Savings Goals</option>
              <option value="emergency_fund">Emergency Reserve</option>
              <option value="ai_insight">AI Intelligence</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f29b75] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#eef8f2] text-[#3b8165]">
              <ShieldCheck size={28} />
            </div>
            <h4 className="font-display text-[19px] font-bold text-[#172532]">All Caught Up!</h4>
            <p className="mt-1 text-[13px] text-[#82908a] max-w-sm mx-auto">
              {filterTab === "unread"
                ? "You have marked all pending alerts as read."
                : "No active threshold breaches, renewals, or warnings found."}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((item) => {
              const isCritical = item.severity === "critical";
              const isWarning = item.severity === "warning";

              const icon = isCritical ? (
                <AlertCircle size={18} />
              ) : isWarning ? (
                <AlertTriangle size={18} />
              ) : item.type === "subscription_renewal" ? (
                <Calendar size={18} />
              ) : item.type === "savings_milestone" ? (
                <Goal size={18} />
              ) : (
                <Sparkles size={18} />
              );

              const badgeColor = isCritical
                ? "bg-[#fdeeed] text-[#d9534f]"
                : isWarning
                ? "bg-[#fef4e8] text-[#e08962]"
                : "bg-[#eef2ff] text-[#6355bc]";

              return (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 transition hover:shadow-sm ${
                    item.is_read
                      ? "border-[#edf2ed] bg-[#fbfcfb] opacity-75"
                      : "border-[#e0ebe0] bg-white shadow-[2px_3px_10px_rgba(42,65,55,.03)]"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${badgeColor}`}>
                      {icon}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-[14px] font-bold text-[#172532]">{item.title}</h4>
                        {!item.is_read && (
                          <span className="flex h-2 w-2 rounded-full bg-[#f29b75]" />
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[#55645c] leading-relaxed max-w-2xl">{item.message}</p>
                      <p className="mt-1.5 text-[10px] font-semibold text-[#9ba59f]">{item.timestamp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {item.action_link && (
                      <button
                        onClick={() => navigate(item.action_link!)}
                        className="flex items-center gap-1 rounded-xl bg-[#f5f8f4] px-3 py-1.5 text-[11px] font-bold text-[#357963] hover:bg-[#e7f8ef] transition"
                      >
                        <span>View</span>
                        <ExternalLink size={12} />
                      </button>
                    )}

                    {!item.is_read && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="rounded-xl p-2 text-[#82908a] hover:text-[#357963] hover:bg-[#f0f5f1] transition"
                        title="Mark as read"
                      >
                        <Check size={15} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteNotification(item.id)}
                      className="rounded-xl p-2 text-[#b0beba] hover:text-[#d9534f] hover:bg-[#fdedeb] transition"
                      title="Dismiss alert"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
