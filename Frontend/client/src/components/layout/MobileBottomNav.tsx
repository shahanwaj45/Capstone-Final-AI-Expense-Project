import { Link, useLocation } from "wouter";
import { LayoutDashboard, ReceiptIndianRupee, Camera, Mic, Menu } from "lucide-react";
import type { UserRole } from "@/types";

interface Props {
  role: UserRole;
  onMenuOpen: () => void;
}

export default function MobileBottomNav({ role, onMenuOpen }: Props) {
  const [location] = useLocation();

  const basePath = role === "professional" ? "/professional" : "/student";
  const dashboardPath = basePath;
  const expensesPath = `${basePath}/expenses`;
  const scanPath = `${basePath}/receipt-scanner`;
  const voicePath = `${basePath}/voice-expense`;

  const isCurrent = (path: string) => {
    if (path === dashboardPath) {
      return location === dashboardPath;
    }
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 block lg:hidden bg-white/95 backdrop-blur-md border-t border-[#e5ede7] shadow-[0_-4px_20px_rgba(23,37,50,0.06)] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {/* Home / Dashboard */}
        <Link
          to={dashboardPath}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            isCurrent(dashboardPath)
              ? "text-[#2b7256] font-bold"
              : "text-[#7b8c84] hover:text-[#172532]"
          }`}
        >
          <LayoutDashboard size={19} className={isCurrent(dashboardPath) ? "stroke-[2.5]" : ""} />
          <span className="text-[10px] mt-0.5">Home</span>
        </Link>

        {/* Expenses */}
        <Link
          to={expensesPath}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            isCurrent(expensesPath)
              ? "text-[#2b7256] font-bold"
              : "text-[#7b8c84] hover:text-[#172532]"
          }`}
        >
          <ReceiptIndianRupee size={19} className={isCurrent(expensesPath) ? "stroke-[2.5]" : ""} />
          <span className="text-[10px] mt-0.5">Expenses</span>
        </Link>

        {/* Center Camera Scan Button */}
        <Link
          to={scanPath}
          className="group relative -top-3 flex flex-col items-center"
        >
          <div className={`flex h-13 w-13 items-center justify-center rounded-full shadow-[0_6px_20px_rgba(56,239,125,0.4)] transition active:scale-95 ${
            isCurrent(scanPath)
              ? "bg-[#172532] border-2 border-[#7BE2BE] text-[#7BE2BE]"
              : "bg-gradient-to-tr from-[#172532] to-[#253d52] border-2 border-white text-white"
          }`}>
            <Camera size={23} className="group-hover:scale-110 transition" />
          </div>
          <span className="text-[10px] font-bold text-[#20362c] -mt-0.5">Scan</span>
        </Link>

        {/* Voice Expense */}
        <Link
          to={voicePath}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition ${
            isCurrent(voicePath)
              ? "text-[#2b7256] font-bold"
              : "text-[#7b8c84] hover:text-[#172532]"
          }`}
        >
          <Mic size={19} className={isCurrent(voicePath) ? "stroke-[2.5]" : ""} />
          <span className="text-[10px] mt-0.5">Voice</span>
        </Link>

        {/* Menu (Opens Drawer) */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[#7b8c84] hover:text-[#172532] transition"
        >
          <Menu size={19} />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
