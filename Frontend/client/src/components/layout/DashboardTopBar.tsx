import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CheckCheck,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { UserRole } from "@/types";
import api from "@/lib/api";

interface NotificationItem {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  timestamp: string;
  action_link?: string;
  is_read?: boolean;
}

interface Props {
  pageTitle: string;
  subtitle?: string;
  userInitials: string;
  role: UserRole;
  onMenuOpen: () => void;
  onSearch?: (query: string) => void;
}

export default function DashboardTopBar({
  pageTitle,
  subtitle,
  userInitials,
  role,
  onMenuOpen,
  onSearch,
}: Props) {
  const [, navigate] = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoadingNotes(true);
      const res = await api.get("/notifications");
      if (res.data?.success && res.data?.data) {
        const items = res.data.data.items || res.data.data.notifications || [];
        setNotifications(items);
        setUnreadCount(res.data.data.unread_count ?? items.length);
      }
    } catch (err: any) {
      console.warn("Could not load notifications:", err.message);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleUpdate = () => fetchNotifications();
    window.addEventListener("notifications-updated", handleUpdate);
    const interval = setInterval(fetchNotifications, 60000); // Poll once per minute
    return () => {
      window.removeEventListener("notifications-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [role]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  const handleClearAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("notifications-updated"));
      toast.success("All alerts marked as read");
    } catch {
      toast.error("Could not mark alerts as read");
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    try {
      if (!item.is_read) {
        await api.post(`/notifications/${item.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event("notifications-updated"));
      }
    } catch {
      // ignore
    }
    setShowNotifications(false);

    if (item.action_link) {
      navigate(item.action_link);
    } else {
      navigate(`/${role}/notifications`);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e6ebe6]/80 bg-[#f5f7f3]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          className="rounded-xl bg-white p-2.5 text-[#172532] shadow-sm lg:hidden"
          onClick={onMenuOpen}
          aria-label="Open navigation"
        >
          <Menu size={19} />
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#9ba6a0]">
            {subtitle ?? (role === "student" ? "Student workspace" : "Professional workspace")}
          </p>
          <h1 className="font-display text-[19px] font-bold tracking-[-.04em]">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 210, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search transactions"
                className="h-10 w-[210px] rounded-xl border border-[#e2e8e1] bg-white px-3 text-[12px] outline-none ring-[#7BE2BE] focus:ring-2"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShowSearch((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#728079] shadow-[3px_4px_10px_rgba(23,37,50,.06)] transition hover:-translate-y-0.5 hover:text-[#172532]"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* ── Notification Bell with Popover ── */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => {
              setShowNotifications((v) => !v);
              if (!showNotifications) fetchNotifications();
            }}
            className="relative grid h-10 w-10 place-items-center rounded-xl bg-white text-[#728079] shadow-[3px_4px_10px_rgba(23,37,50,.06)] transition hover:-translate-y-0.5 hover:text-[#172532]"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f29b75] text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 mt-2.5 w-[340px] sm:w-[380px] rounded-[24px] border border-[#e5ebe5] bg-white p-4 shadow-[0_20px_45px_rgba(42,65,55,.14)] z-50"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#f0f4f0]">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[15px] font-bold text-[#172532]">
                      Financial Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-[#fde8dc] px-2 py-0.5 text-[10px] font-bold text-[#d9534f]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#695db3] hover:underline"
                    >
                      <CheckCheck size={13} /> Mark read
                    </button>
                  )}
                </div>

                <div className="mt-3 max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-[#eef8f2] text-[#3b8165]">
                        <ShieldCheck size={20} />
                      </div>
                      <p className="text-[13px] font-bold text-[#172532]">All caught up!</p>
                      <p className="text-[11px] text-[#8e9c94]">
                        Zero active budget overruns or renewal alerts.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const isCritical = item.severity === "critical";
                      const isWarning = item.severity === "warning";
                      const iconBg = isCritical
                        ? "bg-[#fdeeed] text-[#d9534f]"
                        : isWarning
                        ? "bg-[#fef4e8] text-[#e08962]"
                        : "bg-[#eef2ff] text-[#695db3]";

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={`cursor-pointer rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${
                            item.is_read
                              ? "border-[#f0f3ef] bg-[#fafbfa] opacity-65"
                              : "border-[#e7eee6] bg-[#fdfefd] shadow-[2px_3px_8px_rgba(42,65,55,.03)]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${iconBg}`}>
                              {isCritical ? (
                                <AlertCircle size={16} />
                              ) : isWarning ? (
                                <AlertTriangle size={16} />
                              ) : (
                                <Calendar size={16} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-[12px] font-bold text-[#172532] truncate">
                                  {item.title}
                                </p>
                                <span className="text-[10px] text-[#9ba59f] shrink-0">
                                  {item.timestamp}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-[#6d7973]">
                                {item.message}
                              </p>
                              {item.action_link && (
                                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#357963] hover:underline">
                                  View details <ArrowRight size={11} />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3 border-t border-[#f0f4f0] pt-2.5 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate(`/${role}/notifications`);
                    }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#357963] hover:underline"
                  >
                    <span>View all notifications & alerts</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User initials pill */}
        <button
          onClick={() => {
            navigate(`/${role}/settings`);
            toast.info("Navigated to Profile Settings");
          }}
          className="hidden items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-[3px_4px_10px_rgba(23,37,50,.06)] sm:flex"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#dbeee6] text-[10px] font-bold text-[#357963]">
            {userInitials}
          </span>
          <ChevronDown size={14} className="text-[#9ba6a0]" />
        </button>
      </div>
    </header>
  );
}
