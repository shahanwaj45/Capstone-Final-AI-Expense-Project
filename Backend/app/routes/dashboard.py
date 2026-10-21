from flask import Blueprint
from flask_jwt_extended import get_jwt
from datetime import datetime
from sqlalchemy import func
from app import db
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.ai_insight import AIInsight
from app.utils.auth import require_auth, require_role, get_current_user, success_response, error_response
from app.utils.calculations import (
    calculate_financial_health, get_spending_trend_bars,
    get_current_month_range, format_inr
)

dashboard_bp = Blueprint('dashboard', __name__)

def _get_monthly_metrics(user):
    start, end = get_current_month_range()
    
    total_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    total_expense = float(total_expense)
    
    total_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'income',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    total_income = float(total_income)
    
    return total_expense, total_income, start, end

def _get_recent_transactions(user_id, limit=5):
    txns = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.desc()).limit(limit).all()
    return [t.to_dict() for t in txns]

def _get_budget_data(user, total_expense, start, end):
    budgets = Budget.query.filter_by(
        user_id=user.id,
        month=start.month,
        year=start.year
    ).all()
    
    if not budgets:
        budgets = Budget.query.filter_by(user_id=user.id).order_by(Budget.created_at.desc()).limit(6).all()
    
    categories = []
    total_budget = 0
    
    for b in budgets:
        # Get actual spending per category
        cat_spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'expense',
            Transaction.category == b.category,
            Transaction.date >= start,
            Transaction.date < end
        ).scalar() or 0
        cat_spent = float(cat_spent)
        cat_limit = float(b.limit_amount)
        cat_pct = round((cat_spent / cat_limit) * 100) if cat_limit > 0 else 0
        total_budget += cat_limit
        
        categories.append({
            'id': b.id,
            'label': b.category,
            'category': b.category,
            'value': format_inr(cat_spent),
            'limit': cat_limit,
            'limit_amount': cat_limit,
            'spent': cat_spent,
            'spent_formatted': format_inr(cat_spent),
            'remaining': max(0.0, cat_limit - cat_spent),
            'percent_used': cat_pct,
            'color': b.color,
        })
    
    budget_used_pct = round((total_expense / total_budget * 100)) if total_budget > 0 else 0
    return categories, budget_used_pct

def _get_ai_insight(user_id):
    insight = AIInsight.query.filter_by(user_id=user_id).order_by(AIInsight.created_at.desc()).first()
    if insight:
        return insight.to_dict()
    return {
        'headline': 'Your financial data is being analysed.',
        'description': 'AI insights will appear here once enough data is collected. Keep adding transactions!',
        'timestamp': 'Just now'
    }

@dashboard_bp.route('/student', methods=['GET'])
@require_auth
@require_role('student')
def student_dashboard():
    user = get_current_user()
    total_expense, total_income, start, end = _get_monthly_metrics(user)
    
    monthly_allowance = float(user.monthly_allowance) if user.monthly_allowance else 30000
    total_funds = monthly_allowance + total_income
    remaining = total_funds - total_expense
    progress_pct = round((total_expense / total_funds) * 100) if total_funds > 0 else 0
    progress_pct = max(0, min(100, progress_pct))
    
    # Safe to spend per day calculated in Indian Standard Time (IST)
    import calendar
    from app.utils.timezone import get_ist_now
    ist_now = get_ist_now()
    days_in_month = calendar.monthrange(ist_now.year, ist_now.month)[1]
    today = ist_now.day
    days_remaining = max(1, days_in_month - today + 1)
    safe_per_day = round(remaining / days_remaining) if remaining > 0 else 0
    
    health_score = calculate_financial_health(user, db.session)
    trend_bars = get_spending_trend_bars(user.id, db.session)
    categories, budget_used_pct = _get_budget_data(user, total_expense, start, end)
    
    # Savings goal (primary)
    primary_goal = user.savings_goals.first()
    savings_goal_data = primary_goal.to_dict() if primary_goal else None
    
    # Emergency fund
    ef = user.emergency_fund
    ef_data = ef.to_dict() if ef else None
    
    recent = _get_recent_transactions(user.id, limit=5)
    ai_insight = _get_ai_insight(user.id)
    
    return success_response({
        'heroMetric': {
            'label': 'Pocket money remaining',
            'value': format_inr(remaining),
            'progressLabel': f'{progress_pct}% of monthly pocket money used',
            'progressPercent': f'{progress_pct}%',
            'progressValue': progress_pct,
            'subtitle': f'{format_inr(safe_per_day)} safe to spend each day',
        },
        'statMetrics': [
            {'label': 'Total spending', 'value': format_inr(total_expense), 'delta': '8.4%', 'positive': False, 'tone': 'coral'},
            {'label': 'Financial health', 'value': f'{health_score} / 100', 'delta': 'Good' if health_score >= 70 else 'Fair', 'positive': health_score >= 70, 'tone': 'mint'},
        ],
        'trendBars': trend_bars,
        'budgetCategories': categories,
        'budgetUsedPercent': budget_used_pct,
        'savingsGoal': savings_goal_data,
        'emergencyFund': ef_data,
        'recentTransactions': recent,
        'aiInsight': ai_insight,
    })

@dashboard_bp.route('/professional', methods=['GET'])
@require_auth
@require_role('professional')
def professional_dashboard():
    user = get_current_user()
    total_expense, total_income, start, end = _get_monthly_metrics(user)
    
    # Add income from income_sources table too
    from app.models.income_source import IncomeSource
    from sqlalchemy import func as sqlfunc
    
    income_src_total = db.session.query(sqlfunc.sum(IncomeSource.amount)).filter(
        IncomeSource.user_id == user.id,
        IncomeSource.date_received >= start.date(),
        IncomeSource.date_received < end.date()
    ).scalar() or 0
    total_income = float(total_income) + float(income_src_total)
    
    savings_amount = max(0, total_income - total_expense)
    savings_rate = round((savings_amount / total_income * 100)) if total_income > 0 else 0
    
    health_score = calculate_financial_health(user, db.session)
    trend_bars = get_spending_trend_bars(user.id, db.session)
    categories, budget_used_pct = _get_budget_data(user, total_expense, start, end)
    
    primary_goal = user.savings_goals.first()
    ef = user.emergency_fund
    recent = _get_recent_transactions(user.id, limit=5)
    ai_insight = _get_ai_insight(user.id)
    
    return success_response({
        'heroMetric': {
            'label': 'Monthly savings',
            'value': format_inr(savings_amount),
            'progressLabel': f'{savings_rate}% savings rate',
            'progressPercent': f'{savings_rate}%',
            'progressValue': savings_rate,
            'subtitle': 'Based on this month\'s income and expenses',
        },
        'statMetrics': [
            {'label': 'Total expenses', 'value': format_inr(total_expense), 'delta': '8.4%', 'positive': False, 'tone': 'coral'},
            {'label': 'Financial health score', 'value': f'{health_score} / 100', 'delta': 'Good' if health_score >= 70 else 'Fair', 'positive': health_score >= 70, 'tone': 'mint'},
        ],
        'trendBars': trend_bars,
        'budgetCategories': categories,
        'budgetUsedPercent': budget_used_pct,
        'savingsGoal': primary_goal.to_dict() if primary_goal else None,
        'emergencyFund': ef.to_dict() if ef else None,
        'recentTransactions': recent,
        'aiInsight': ai_insight,
        'totalIncome': format_inr(total_income),
    })
