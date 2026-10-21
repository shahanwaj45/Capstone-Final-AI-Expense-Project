import type { LucideIcon } from "lucide-react";

// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = "student" | "professional";

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: UserRole;
  monthly_allowance?: number;
}

// ── Navigation ────────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
}

// ── Dashboard Metrics ─────────────────────────────────────────────────────────
export interface HeroMetric {
  label: string;
  value: string;
  progressLabel: string;
  progressPercent: string;
  progressValue: number;
  subtitle: string;
}

export interface StatMetric {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: LucideIcon;
  tone: "coral" | "mint";
}

// ── Transactions ──────────────────────────────────────────────────────────────
export interface Transaction {
  id?: string;
  name: string;
  category: string;
  date: string;
  amount: string;
  type?: "expense" | "income";
  color: "coral" | "cyan" | "blue" | "pink" | "mint" | "violet" | string;
}

// ── Budget ────────────────────────────────────────────────────────────────────
export interface BudgetCategory {
  id?: string;
  label: string;
  value: string;
  color: string;
  spent?: number;
  spent_formatted?: string;
  remaining?: number;
  percent_used?: number;
}

// ── Savings Goal ──────────────────────────────────────────────────────────────
export interface SavingsGoal {
  id?: string;
  name: string;
  current: number;
  target: number;
  percentComplete: number;
  deadline?: string | null;
  current_amount?: number;
  target_amount?: number;
}

// ── Emergency Fund ────────────────────────────────────────────────────────────
export interface EmergencyFundData {
  id?: string;
  current: number;
  current_amount?: number;
  recommended: number;
  recommended_amount?: number;
  monthsCovered: number;
  runway_months?: number;
  percentComplete: number;
  monthly_expense_estimate?: number;
  target_months?: number;
  shortfall?: number;
  surplus?: number;
}

// ── AI Insight ────────────────────────────────────────────────────────────────
export interface AIInsight {
  id?: string;
  headline: string;
  description: string;
  summary?: string;
  timestamp?: string;
  financial_health_score?: number;
  risk_level?: string;
  savings_potential_inr?: number;
  spending_anomalies?: any[];
  actionable_steps?: any[];
  category_leaks?: string[];
  source_period?: string;
  is_read?: boolean;
}

// ── Trend Data ────────────────────────────────────────────────────────────────
export interface TrendBar {
  month: string;
  height: number;
  isHighlighted?: boolean;
  amount?: number;
}
