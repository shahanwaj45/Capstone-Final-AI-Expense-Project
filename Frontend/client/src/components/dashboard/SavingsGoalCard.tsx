import { Plus, Target, Trash2, Award, Calendar, CheckCircle2 } from "lucide-react";
import type { SavingsGoal } from "@/types";

interface Props {
  goal: SavingsGoal;
  onContribute?: (goal: SavingsGoal) => void;
  onDelete?: (id: string, name: string) => void;
}

export default function SavingsGoalCard({ goal, onContribute, onDelete }: Props) {
  const current = goal.current || (goal as any).current_amount || 0;
  const target = goal.target || (goal as any).target_amount || 1;
  const percentComplete = goal.percentComplete ?? Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const isCompleted = percentComplete >= 100;

  return (
    <section className={`relative overflow-hidden rounded-[26px] p-6 shadow-[6px_9px_23px_rgba(42,65,55,.05)] border transition hover:-translate-y-0.5 ${
      isCompleted ? "bg-[#eaf8f0] border-[#c4e9d5]" : "bg-[#f4faf7] border-[#e2efe8]"
    }`}>
      {/* Subtle background glow */}
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#d6f2e4] blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-[#699a88]">
              <Target size={14} className="text-[#3ea87c]" /> Savings Goal
            </div>
            <h3 className="mt-1 font-display text-[21px] font-bold tracking-[-.05em] text-[#172532]">
              {goal.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {isCompleted ? (
              <span className="flex items-center gap-1 rounded-full bg-[#d5f3e2] px-2.5 py-1 text-[10px] font-bold text-[#237c53]">
                <Award size={12} /> Achieved!
              </span>
            ) : percentComplete >= 50 ? (
              <span className="rounded-full bg-[#e3f4eb] px-2.5 py-1 text-[10px] font-bold text-[#358a62]">
                ⚡ Halfway
              </span>
            ) : null}

            {onDelete && goal.id && (
              <button
                onClick={() => onDelete(goal.id!, goal.name)}
                className="rounded-lg p-1.5 text-[#9aa69f] hover:text-red-500 hover:bg-white/80 transition"
                title="Delete goal"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#81a99d]">Current Savings</span>
            <p className="font-display text-[28px] font-bold tracking-[-.06em] text-[#172532]">
              ₹{current.toLocaleString("en-IN")}
            </p>
          </div>
          <p className={`mb-1 text-[12px] font-bold ${isCompleted ? "text-[#237c53]" : "text-[#499876]"}`}>
            {percentComplete}% saved
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 h-2.5 rounded-full bg-[#dbeee5] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? "bg-[#2ea870]" : "bg-[#4caf89]"
            }`}
            style={{ width: `${Math.min(100, percentComplete)}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] text-[#71988b]">
          <span>Target: ₹{target.toLocaleString("en-IN")}</span>
          <span>{isCompleted ? "Goal Completed 🎉" : `₹${remaining.toLocaleString("en-IN")} left`}</span>
        </div>

        {(goal as any).deadline && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-[#8aa89d]">
            <Calendar size={12} />
            <span>Target Date: {(goal as any).deadline}</span>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-[#d8ece2] flex items-center justify-between">
          <button
            onClick={() => onContribute && onContribute(goal)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-[#2e7d5a] hover:text-[#1d5c41] transition"
          >
            <Plus size={14} /> Add Contribution
          </button>

          {isCompleted && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-[#2e7d5a]">
              <CheckCircle2 size={13} /> Complete
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
