from flask import Blueprint, request
from datetime import datetime
from sqlalchemy import func
from app import db
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.utils.auth import require_auth, get_current_user, success_response
from app.utils.calculations import (
    get_spending_trend_bars,
    get_canonical_month_range,
    calculate_budget_health
)

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/trend', methods=['GET'])
@analytics_bp.route('/spending-trend', methods=['GET'])
@require_auth
def trend():
    user = get_current_user()
    bars = get_spending_trend_bars(user.id, db.session)
    return success_response(bars)

@analytics_bp.route('/categories', methods=['GET'])
@require_auth
def categories():
    """Returns canonical category spending for selected or current month with normalized 100.0% percentages"""
    user = get_current_user()
    month = request.args.get('month')
    year = request.args.get('year')
    start, end = get_canonical_month_range(year, month)
    
    rows = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end,
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()
    
    total_spent = sum(float(r.total) for r in rows)
    
    result = []
    if total_spent > 0:
        raw_pcts = []
        for r in rows:
            cat_tot = float(r.total)
            pct = round((cat_tot / total_spent) * 100.0, 1)
            raw_pcts.append(pct)
            result.append({
                'category': r.category or 'Other',
                'label': r.category or 'Other',
                'total': cat_tot,
                'amount': cat_tot,
                'formatted': f"₹{cat_tot:,.0f}",
                'percentage': pct,
                'color': CATEGORY_COLORS.get(r.category, '#a29bf4')
            })
            
        # Ensure percentages sum to exactly 100.0%
        pct_diff = round(100.0 - sum(raw_pcts), 1)
        if pct_diff != 0 and len(result) > 0:
            result[0]['percentage'] = round(result[0]['percentage'] + pct_diff, 1)
    else:
        for r in rows:
            result.append({
                'category': r.category or 'Other',
                'label': r.category or 'Other',
                'total': float(r.total),
                'amount': float(r.total),
                'formatted': f"₹{float(r.total):,.0f}",
                'percentage': 0.0,
                'color': CATEGORY_COLORS.get(r.category, '#a29bf4')
            })

    return success_response(result)

@analytics_bp.route('/summary', methods=['GET'])
@require_auth
def summary():
    """Returns total spent, total income, and net balance using canonical date boundaries"""
    user = get_current_user()
    month = request.args.get('month')
    year = request.args.get('year')
    start, end = get_canonical_month_range(year, month)
    
    total_spent = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    
    # Query income transactions
    total_income = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'income',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0
    
    # If no explicit income transaction for professional, check income_sources
    from app.models.income_source import IncomeSource
    income_src_total = db.session.query(func.sum(IncomeSource.amount)).filter(
        IncomeSource.user_id == user.id,
        IncomeSource.date_received >= start.date(),
        IncomeSource.date_received < end.date()
    ).scalar() or 0
    
    combined_income = float(total_income) + float(income_src_total)
    if combined_income == 0 and user.monthly_allowance:
        combined_income = float(user.monthly_allowance)
        
    return success_response({
        'total_spent': float(total_spent),
        'total_income': combined_income,
        'net': combined_income - float(total_spent),
        'month': start.month,
        'year': start.year
    })

@analytics_bp.route('/health', methods=['GET'])
@require_auth
def health_score():
    """Returns the composite Budget Health Score and breakdown (TASK 5)"""
    user = get_current_user()
    month = request.args.get('month')
    year = request.args.get('year')
    health = calculate_budget_health(user, db.session, month=month, year=year)
    return success_response(health)
