from flask import Blueprint, request
from datetime import datetime
from app.utils.timezone import get_ist_now
from sqlalchemy import func
from app import db
from app.models.semester_budget import SemesterBudget
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.utils.auth import require_auth, get_current_user, success_response, error_response
import calendar

semester_bp = Blueprint('semester', __name__)

@semester_bp.route('', methods=['GET'])
@require_auth
def get_semester():
    """
    Get full semester budget breakdown and analytics.
    Supports ?term=spring (Jan-Jun), ?term=fall (Jul-Dec), or auto (defaults to active term).
    """
    user = get_current_user()
    now = get_ist_now()
    year = int(request.args.get('year', now.year))
    term_param = request.args.get('term', '').lower()

    if term_param in ('spring', 'winter', 'h1', 'even'):
        term = 'spring'
        month_range = range(1, 7)
        term_label = f"Spring Semester (Jan – Jun {year})"
    elif term_param in ('fall', 'monsoon', 'autumn', 'h2', 'odd'):
        term = 'fall'
        month_range = range(7, 13)
        term_label = f"Fall / Monsoon Semester (Jul – Dec {year})"
    else:
        # Auto detect based on current month
        if now.month <= 6:
            term = 'spring'
            month_range = range(1, 7)
            term_label = f"Spring Semester (Jan – Jun {year})"
        else:
            term = 'fall'
            month_range = range(7, 13)
            term_label = f"Fall / Monsoon Semester (Jul – Dec {year})"

    budgets = {sb.month: sb for sb in SemesterBudget.query.filter_by(user_id=user.id, year=year).all()}
    default_monthly_budget = float(user.monthly_allowance) if (user.monthly_allowance and float(user.monthly_allowance) > 0) else 15000.0

    term_start = datetime(year, month_range.start, 1)
    last_m = month_range.stop - 1
    term_end = datetime(year + 1, 1, 1) if last_m == 12 else datetime(year, last_m + 1, 1)

    result_months = []
    total_term_budget = 0.0
    total_term_spent = 0.0

    for month in month_range:
        sb = budgets.get(month)
        m_start = datetime(year, month, 1)
        m_end = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

        spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'expense',
            Transaction.date >= m_start,
            Transaction.date < m_end
        ).scalar() or 0
        spent = float(spent)
        total_term_spent += spent

        if sb:
            b_val = float(sb.budget)
            total_term_budget += b_val
            # Update status if needed
            if month < now.month and year <= now.year:
                sb.status = 'complete'
            elif month == now.month and year == now.year:
                sb.status = 'active'
            else:
                sb.status = 'upcoming'
            result_months.append(sb.to_dict(spent=spent))
        else:
            total_term_budget += default_monthly_budget
            status = 'upcoming'
            if month < now.month and year <= now.year:
                status = 'complete'
            elif month == now.month and year == now.year:
                status = 'active'

            pct = round(spent / default_monthly_budget * 100) if default_monthly_budget > 0 else 0
            result_months.append({
                'id': f"temp-{year}-{month}",
                'month': calendar.month_name[month],
                'month_short': calendar.month_abbr[month],
                'month_num': month,
                'year': year,
                'budget': default_monthly_budget,
                'budget_formatted': f"₹{default_monthly_budget:,.0f}",
                'spent': spent,
                'spent_formatted': f"₹{spent:,.0f}",
                'remaining': max(0.0, default_monthly_budget - spent),
                'remaining_formatted': f"₹{max(0.0, default_monthly_budget - spent):,.0f}",
                'is_over': spent > default_monthly_budget,
                'over_amount': max(0.0, spent - default_monthly_budget),
                'status': status,
                'percent': pct,
            })

    # Fetch Category Breakdown across this entire semester
    cat_rows = db.session.query(
        Transaction.category,
        func.sum(Transaction.amount).label('total')
    ).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= term_start,
        Transaction.date < term_end
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    category_breakdown = []
    for r in cat_rows:
        cat_spent = float(r.total)
        category_breakdown.append({
            'category': r.category or 'Other',
            'amount': cat_spent,
            'formatted': f"₹{cat_spent:,.0f}",
            'percentage': round((cat_spent / total_term_spent * 100), 1) if total_term_spent > 0 else 0,
            'color': CATEGORY_COLORS.get(r.category, 'coral')
        })

    remaining_budget = max(0.0, total_term_budget - total_term_spent)
    percent_used = round(total_term_spent / total_term_budget * 100) if total_term_budget > 0 else 0

    if percent_used <= 70:
        pace_status = "On Track"
        pace_tone = "mint"
    elif percent_used <= 95:
        pace_status = "Pacing Normal"
        pace_tone = "cyan"
    elif percent_used <= 100:
        pace_status = "Caution"
        pace_tone = "coral"
    else:
        pace_status = "Over Budget"
        pace_tone = "danger"

    return success_response({
        'months': result_months,
        'items': result_months,
        'term': term,
        'term_label': term_label,
        'year': year,
        'total_budget': total_term_budget,
        'total_budget_formatted': f"₹{total_term_budget:,.0f}",
        'total_spent': total_term_spent,
        'total_spent_formatted': f"₹{total_term_spent:,.0f}",
        'remaining_budget': remaining_budget,
        'remaining_budget_formatted': f"₹{remaining_budget:,.0f}",
        'percent_used': percent_used,
        'pace_status': pace_status,
        'pace_tone': pace_tone,
        'categories': category_breakdown,
    })

@semester_bp.route('', methods=['POST'])
@require_auth
def upsert_semester():
    """Upsert monthly budget for a specific semester month."""
    user = get_current_user()
    data = request.get_json() or {}
    now = get_ist_now()
    month = int(data.get('month', now.month))
    year = int(data.get('year', now.year))
    
    try:
        budget = float(data.get('budget', 15000))
        if budget < 0:
            return error_response('Budget amount must be non-negative', 'VALIDATION_ERROR')
    except (TypeError, ValueError):
        return error_response('Invalid budget amount', 'VALIDATION_ERROR')
    
    status = 'upcoming'
    if month < now.month and year <= now.year:
        status = 'complete'
    elif month == now.month and year == now.year:
        status = 'active'

    sb = SemesterBudget.query.filter_by(user_id=user.id, month=month, year=year).first()
    if not sb:
        sb = SemesterBudget(user_id=user.id, month=month, year=year, budget=budget, status=status)
        db.session.add(sb)
    else:
        sb.budget = budget
        sb.status = status

    db.session.commit()
    return success_response(sb.to_dict())

@semester_bp.route('/set-term', methods=['POST'])
@require_auth
def set_entire_term():
    """Set uniform monthly budget for all 6 months of a semester term."""
    user = get_current_user()
    data = request.get_json() or {}
    now = get_ist_now()
    year = int(data.get('year', now.year))
    term = data.get('term', 'fall' if now.month > 6 else 'spring').lower()
    
    try:
        monthly_budget = float(data.get('monthly_budget', 15000))
        if monthly_budget < 0:
            return error_response('Monthly budget must be positive', 'VALIDATION_ERROR')
    except (TypeError, ValueError):
        return error_response('Invalid monthly budget', 'VALIDATION_ERROR')

    month_range = range(1, 7) if term == 'spring' else range(7, 13)
    created_or_updated = []

    for m in month_range:
        status = 'upcoming'
        if m < now.month and year <= now.year:
            status = 'complete'
        elif m == now.month and year == now.year:
            status = 'active'

        sb = SemesterBudget.query.filter_by(user_id=user.id, month=m, year=year).first()
        if not sb:
            sb = SemesterBudget(user_id=user.id, month=m, year=year, budget=monthly_budget, status=status)
            db.session.add(sb)
        else:
            sb.budget = monthly_budget
            sb.status = status
        created_or_updated.append(sb)

    db.session.commit()
    return success_response({
        'term': term,
        'year': year,
        'monthly_budget': monthly_budget,
        'total_term_budget': monthly_budget * 6,
        'months_updated': len(created_or_updated),
        'message': f"All 6 months of {term.title()} semester set to ₹{monthly_budget:,.0f}/month (₹{monthly_budget * 6:,.0f} total)!"
    })

