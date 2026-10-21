from datetime import datetime, date
import calendar
from app.utils.timezone import get_ist_now, get_ist_today

def format_inr(amount):
    """Format a number as Indian Rupee string (e.g. 11550 -> '₹11,550')"""
    return f"₹{float(amount):,.0f}"

def get_canonical_month_range(year=None, month=None):
    """
    Returns canonical (start_datetime, end_datetime) for a specific year and month
    in Indian Standard Time (IST), or current IST calendar month if not provided.
    Start: YYYY-MM-01 00:00:00 (IST)
    End:   YYYY-(MM+1)-01 00:00:00 (IST)
    """
    now = get_ist_now()
    y = int(year) if year is not None else now.year
    m = int(month) if month is not None else now.month
    start = datetime(y, m, 1, 0, 0, 0)
    if m == 12:
        end = datetime(y + 1, 1, 1, 0, 0, 0)
    else:
        end = datetime(y, m + 1, 1, 0, 0, 0)
    return start, end

# Alias for backward compatibility across existing calls
get_current_month_range = get_canonical_month_range

def calculate_financial_health(user, db_session=None):
    """
    Calculate financial health score (0-100) based on:
    - Budget adherence (40 pts)
    - Savings goal progress (30 pts)
    - Emergency fund (20 pts)
    - Spending trend (10 pts)
    """
    from app.models.transaction import Transaction
    from sqlalchemy import func
    
    score = 0
    start, end = get_canonical_month_range()
    
    # Get current month spending (strictly expense type)
    monthly_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    monthly_spent = float(monthly_spent)
    
    # Budget adherence
    monthly_budget = float(user.monthly_allowance) if user.monthly_allowance else 30000.0
    if monthly_budget > 0:
        usage_pct = (monthly_spent / monthly_budget) * 100
        if usage_pct <= 70:
            budget_score = 40
        elif usage_pct <= 100:
            budget_score = max(20, 40 - (usage_pct - 70) * 0.67)
        else:
            budget_score = max(0, 20 - (usage_pct - 100) * 0.5)
        score += budget_score

    # Savings goal progress
    goals = user.savings_goals.all()
    if goals:
        avg_progress = sum(g.percent_complete for g in goals) / len(goals)
        score += (avg_progress / 100) * 30
    else:
        score += 15  # Neutral if no goals set

    # Emergency fund
    ef = user.emergency_fund
    if ef:
        months_covered = ef.months_covered
        ef_score = min(1.0, months_covered / 6.0) * 20
        score += ef_score
    else:
        score += 0

    # Spending trend (last month vs current month)
    last_month_year = start.year if start.month > 1 else start.year - 1
    last_month_num = start.month - 1 if start.month > 1 else 12
    last_month_start, last_month_end = get_canonical_month_range(last_month_year, last_month_num)

    last_month_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= last_month_start,
        Transaction.date < last_month_end
    ).scalar() or 0
    last_month_spent = float(last_month_spent)
    
    if last_month_spent == 0 or monthly_spent <= last_month_spent:
        score += 10
    else:
        pct_increase = (monthly_spent - last_month_spent) / last_month_spent
        score += max(0, 10 - pct_increase * 20)

    return round(min(100, max(0, score)))

def calculate_budget_health(user, db_session, month=None, year=None):
    """
    Computes analytical Budget Health metrics (TASK 5):
    1. Budget Utilization Ratio ((Actual Expense / Budget Limit) * 100)
    2. Savings Adherence Score (0-30 pts)
    3. Emergency Reserve Factor (0-30 pts)
    Outputs composite score (0-100), color status (Optimal, Warning, Critical), and actionable advice.
    """
    from app.models.transaction import Transaction
    from app.models.budget import Budget
    from sqlalchemy import func

    start, end = get_canonical_month_range(year, month)
    
    # 1. Budget limits & actual expenses for this calendar period
    budgets = Budget.query.filter_by(
        user_id=user.id,
        month=start.month,
        year=start.year
    ).all()

    total_budget_limit = sum(float(b.limit_amount) for b in budgets)
    if total_budget_limit == 0:
        total_budget_limit = float(user.monthly_allowance) if user.monthly_allowance else 30000.0

    total_actual_spent = db_session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    total_actual_spent = float(total_actual_spent)

    # Budget Utilization Ratio
    utilization_ratio = round((total_actual_spent / total_budget_limit * 100), 1) if total_budget_limit > 0 else 0.0

    # Utilization Score (40 pts max)
    if utilization_ratio <= 75.0:
        utilization_score = 40.0
    elif utilization_ratio <= 100.0:
        utilization_score = max(15.0, 40.0 - (utilization_ratio - 75.0) * 1.0)
    else:
        utilization_score = max(0.0, 15.0 - (utilization_ratio - 100.0) * 0.5)

    # 2. Savings Adherence Score (30 pts max)
    goals = user.savings_goals.all()
    if goals:
        avg_progress = sum(g.percent_complete for g in goals) / len(goals)
        savings_adherence_score = round((avg_progress / 100.0) * 30.0, 1)
    else:
        savings_adherence_score = 15.0  # neutral

    # 3. Emergency Reserve Factor (30 pts max)
    ef = user.emergency_fund
    if ef and ef.monthly_expense_estimate and float(ef.monthly_expense_estimate) > 0:
        months_runway = float(ef.current_amount) / float(ef.monthly_expense_estimate)
        reserve_factor = min(30.0, round((months_runway / 6.0) * 30.0, 1))
    else:
        months_runway = 0.0
        reserve_factor = 0.0

    composite_score = round(min(100.0, max(0.0, utilization_score + savings_adherence_score + reserve_factor)))

    if composite_score >= 75:
        status = "Optimal"
        status_color = "#357963"
        status_tone = "mint"
        recommendation = "Excellent financial health! Your spending is well within allocations and runway reserves are solid."
    elif composite_score >= 50:
        status = "Warning"
        status_color = "#f6ae8e"
        status_tone = "coral"
        recommendation = "Moderate financial health. Keep discretionary expenses restrained to prevent exceeding your budget limit."
    else:
        status = "Critical"
        status_color = "#d9534f"
        status_tone = "danger"
        recommendation = "Budget pressure detected! Your actual expenses exceed safe boundaries. Pause non-essential outflows immediately."

    return {
        "score": composite_score,
        "status": status,
        "status_color": status_color,
        "status_tone": status_tone,
        "recommendation": recommendation,
        "utilization_ratio": utilization_ratio,
        "total_spent": total_actual_spent,
        "total_budget": total_budget_limit,
        "savings_adherence_score": savings_adherence_score,
        "emergency_reserve_factor": reserve_factor,
        "months_runway": round(months_runway, 1),
    }

def get_spending_trend_bars(user_id, db_session):
    """Return 12-month spending trend as normalized height values (0-100)"""
    from app.models.transaction import Transaction
    from sqlalchemy import func, extract
    
    now = get_ist_now()
    rows = db_session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user_id,
        Transaction.type == 'expense'
    ).group_by('year', 'month').all()
    
    monthly_totals = {(int(r.year), int(r.month)): float(r.total) for r in rows}
    
    bars = []
    max_val = max(monthly_totals.values()) if monthly_totals else 1.0
    
    for i in range(11, -1, -1):
        # Calculate month offset
        month_idx = (now.month - 1 - i) % 12 + 1
        year_idx = now.year - 1 if (now.month - 1 - i) < 0 else now.year
        
        total = monthly_totals.get((year_idx, month_idx), 0.0)
        height = round((total / max_val) * 90) if max_val > 0 else 20
        height = max(10, height)
        
        bars.append({
            'month': calendar.month_abbr[month_idx],
            'height': height,
            'isHighlighted': (month_idx == now.month and year_idx == now.year),
            'amount': total,
        })
    
    return bars
