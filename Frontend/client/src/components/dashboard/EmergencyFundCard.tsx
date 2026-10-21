import { ArrowUpRight, HeartPulse, Plus, ArrowDownLeft, Sliders, ShieldCheck, AlertCircle } from "lucide-react";
import type { EmergencyFundData } from "@/types";

interface Props {
  fund: EmergencyFundData;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onAdjustTarget?: () => void;
}

export default function EmergencyFundCard({ fund, onDeposit, onWithdraw, onAdjustTarget }: Props) {
  const current = fund.current || fund.current_amount || 0;
  const targetMonths = fund.target_months || 6;
  const monthlyEst = fund.monthly_expense_estimate || 45000;
  const recommended = fund.recommended || fund.recommended_amount || (monthlyEst * targetMonths);
  
  const rawMonthsCovered = fund.monthsCovered ?? (monthlyEst > 0 ? current / monthlyEst : 0);
  const monthsCovered = Number(rawMonthsCovered).toFixed(1);
  const percentComplete = fund.percentComplete ?? Math.min(100, Math.round((current / (recommended || 1)) * 100));

  const shortfall = fund.shortfall !== undefined ? fund.shortfall : Math.max(0, recommended - current);
  const surplus = fund.surplus !== undefined ? fund.surplus : Math.max(0, current - recommended);
  const isTargetMet = current >= recommended;

  return (
    <section className="relative overflow-hidden rounded-[26px] bg-[#fff8f3] p-6 shadow-[6px_9px_23px_rgba(42,65,55,.05)] border border-[#fae3d5]">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#fde5d6] blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-[#ad9584]">
              <HeartPulse size={15} className="text-[#ed9b76]" /> Safety Runway
            </div>
            <h3 className="mt-1 font-display text-[21px] font-bold tracking-[-.05em] text-[#172532]">
              Emergency Fund
            </h3>
          </div>

          {onAdjustTarget && (
            <button
              onClick={onAdjustTarget}
              className="flex items-center gap-1 rounded-xl bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#b07856] hover:bg-white transition shadow-sm"
              title="Adjust monthly target"
            >
              <Sliders size={13} /> Adjust
            </button>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#ad9584]">Saved Balance</span>
            <p className="font-display text-[30px] font-bold tracking-[-.06em] text-[#172532]">
              ₹{current.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-[#fae8dc] px-2.5 py-0.5 text-[11px] font-bold text-[#cf7245]">
              {monthsCovered} mos runway
            </span>
          </div>
        </div>

        {/* Runway Progress Bar */}
        <div className="mt-3 h-2.5 rounded-full bg-[#f3e5dc] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#ed9b76] transition-all duration-500"
            style={{ width: `${Math.min(100, percentComplete)}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between items-center text-[11px] text-[#b59d8d]">
          <span>{percentComplete}% of target runway ({targetMonths} mos)</span>
          {isTargetMet ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#2e7d5a]">
              <ShieldCheck size={12} /> Surplus: ₹{surplus.toLocaleString("en-IN")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-[#d9534f]">
              <AlertCircle size={12} /> Shortfall: ₹{shortfall.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-3 border-t border-[#f5dfd2] flex items-center justify-between">
          <button
            onClick={onDeposit}
            className="flex items-center gap-1.5 rounded-xl bg-[#ed9b76] px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#e08962] transition"
          >
            <Plus size={14} /> Deposit Funds
          </button>

          <button
            onClick={onWithdraw}
            disabled={current <= 0}
            className="flex items-center gap-1 text-[12px] font-bold text-[#b56e4c] hover:text-[#8f4b2b] transition disabled:opacity-40"
          >
            <ArrowDownLeft size={14} /> Withdraw for Emergency
          </button>
        </div>
      </div>
    </section>
  );
}
