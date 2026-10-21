from flask import Blueprint, request
from app import db
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.utils.auth import require_auth, get_current_user, success_response, error_response
from app.utils.timezone import get_ist_today, get_ist_now
from datetime import date, timedelta
import calendar

subscriptions_bp = Blueprint('subscriptions', __name__)

def _calculate_next_date(from_date, cycle):
    """Calculates subsequent billing date according to cycle."""
    c = (cycle or 'Monthly').strip().lower()
    y = from_date.year
    m = from_date.month
    d = from_date.day

    if c in ('annual', 'yearly'):
        try:
            return date(y + 1, m, d)
        except ValueError:
            return date(y + 1, m, 28)
    elif c in ('quarterly', 'quarter'):
        new_m = m + 3
        new_y = y
        if new_m > 12:
            new_m -= 12
            new_y += 1
        max_d = calendar.monthrange(new_y, new_m)[1]
        return date(new_y, new_m, min(d, max_d))
    elif c in ('weekly', 'week'):
        return from_date + timedelta(days=7)
    else:  # Monthly default
        new_m = m + 1
        new_y = y
        if new_m > 12:
            new_m = 1
            new_y += 1
        max_d = calendar.monthrange(new_y, new_m)[1]
        return date(new_y, new_m, min(d, max_d))

@subscriptions_bp.route('', methods=['GET'])
@require_auth
def list_subs():
    """
    List subscriptions with annual-to-monthly normalized burn.
    Sorted by next renewal date (closest upcoming first).
    """
    user = get_current_user()
    all_subs = Subscription.query.filter_by(user_id=user.id).all()

    # Sort active subscriptions by next_billing_date asc, nulls last; paused subs at the end
    today = get_ist_today()
    def sort_key(s):
        if not s.is_active:
            return (2, date.max, s.name)
        if s.next_billing_date:
            return (0 if s.next_billing_date >= today else 1, s.next_billing_date, s.name)
        return (1, date.max, s.name)

    all_subs.sort(key=sort_key)

    active_subs = [s for s in all_subs if s.is_active]
    monthly_burn = sum(s.monthly_burn for s in active_subs)
    annual_spend = monthly_burn * 12.0
    raw_total = sum(float(s.amount) for s in active_subs)

    # Find the nearest active upcoming renewal
    upcoming_candidates = [s for s in active_subs if s.next_billing_date and s.next_billing_date >= today]
    nearest_renewal = upcoming_candidates[0].to_dict() if upcoming_candidates else (active_subs[0].to_dict() if active_subs else None)

    return success_response({
        'items': [s.to_dict() for s in all_subs],
        'total': round(raw_total, 2),
        'total_formatted': f"₹{raw_total:,.0f}",
        'raw_total': round(raw_total, 2),
        'monthly_burn': round(monthly_burn, 2),
        'monthly_total': round(monthly_burn, 2),
        'monthly_formatted': f"₹{monthly_burn:,.0f}",
        'annual_total': round(annual_spend, 2),
        'annual_formatted': f"₹{annual_spend:,.0f}",
        'count': len(all_subs),
        'active_count': len(active_subs),
        'paused_count': len(all_subs) - len(active_subs),
        'upcoming_renewal': nearest_renewal,
    })

@subscriptions_bp.route('', methods=['POST'])
@require_auth
def create_sub():
    user = get_current_user()
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return error_response('Name is required', 'VALIDATION_ERROR')
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be positive', 'VALIDATION_ERROR')
    except (TypeError, ValueError):
        return error_response('Invalid amount', 'VALIDATION_ERROR')
    
    cycle = (data.get('cycle') or 'Monthly').strip().title()
    today = get_ist_today()

    next_date = None
    if data.get('next_billing_date'):
        try:
            next_date = date.fromisoformat(data['next_billing_date'])
        except ValueError:
            next_date = _calculate_next_date(today, cycle)
    else:
        next_date = _calculate_next_date(today, cycle)

    s = Subscription(
        user_id=user.id,
        name=name,
        amount=amount,
        cycle=cycle,
        next_billing_date=next_date,
        color=data.get('color', '#a9dced'),
        is_active=bool(data.get('is_active', True))
    )
    db.session.add(s)

    # Optional: Log initial payment transaction if requested
    if data.get('log_payment', False):
        tx = Transaction(
            user_id=user.id,
            type='expense',
            name=f"Subscription: {name}",
            amount=amount,
            category='Subscription',
            payment_method='UPI',
            date=get_ist_now(),
            color='violet',
            notes=f"Initial payment for {name} ({cycle})"
        )
        db.session.add(tx)

    db.session.commit()
    return success_response(s.to_dict(), status=201)

@subscriptions_bp.route('/<sid>', methods=['PUT', 'PATCH'])
@require_auth
def update_sub(sid):
    user = get_current_user()
    s = Subscription.query.filter_by(id=sid, user_id=user.id).first()
    if not s:
        return error_response('Subscription not found', 'NOT_FOUND', status=404)
    data = request.get_json() or {}
    
    if 'name' in data and data['name'].strip():
        s.name = data['name'].strip()
    if 'amount' in data:
        try:
            amt = float(data['amount'])
            if amt > 0:
                s.amount = amt
        except (TypeError, ValueError):
            pass
    if 'cycle' in data and data['cycle'].strip():
        s.cycle = data['cycle'].strip().title()
    if 'next_billing_date' in data:
        if data['next_billing_date']:
            try:
                s.next_billing_date = date.fromisoformat(data['next_billing_date'])
            except ValueError:
                pass
        else:
            s.next_billing_date = None
    if 'color' in data:
        s.color = data['color']
    if 'is_active' in data:
        s.is_active = bool(data['is_active'])
        
    db.session.commit()
    return success_response(s.to_dict())

@subscriptions_bp.route('/<sid>/toggle', methods=['POST'])
@require_auth
def toggle_sub(sid):
    """Toggle active/pause state of a subscription."""
    user = get_current_user()
    s = Subscription.query.filter_by(id=sid, user_id=user.id).first()
    if not s:
        return error_response('Subscription not found', 'NOT_FOUND', status=404)
    s.is_active = not s.is_active
    db.session.commit()
    return success_response(s.to_dict())

@subscriptions_bp.route('/<sid>/renew', methods=['POST'])
@require_auth
def renew_sub(sid):
    """
    Log renewal payment as a transaction and advance next_billing_date
    to the next cycle.
    """
    user = get_current_user()
    s = Subscription.query.filter_by(id=sid, user_id=user.id).first()
    if not s:
        return error_response('Subscription not found', 'NOT_FOUND', status=404)

    today = get_ist_today()
    base_date = s.next_billing_date if (s.next_billing_date and s.next_billing_date >= today) else today
    new_next_date = _calculate_next_date(base_date, s.cycle)
    s.next_billing_date = new_next_date

    tx = Transaction(
        user_id=user.id,
        type='expense',
        name=f"Subscription: {s.name}",
        amount=float(s.amount),
        category='Subscription',
        payment_method='UPI',
        date=get_ist_now(),
        color='violet',
        notes=f"Renewal payment logged for {s.name} ({s.cycle})"
    )
    db.session.add(tx)
    db.session.commit()

    return success_response({
        'subscription': s.to_dict(),
        'transaction': tx.to_dict(),
        'message': f"Payment for {s.name} (₹{float(s.amount):,.0f}) logged! Next renewal set to {new_next_date.strftime('%d %b %Y')}."
    })

@subscriptions_bp.route('/<sid>', methods=['DELETE'])
@require_auth
def delete_sub(sid):
    user = get_current_user()
    s = Subscription.query.filter_by(id=sid, user_id=user.id).first()
    if not s:
        return error_response('Subscription not found', 'NOT_FOUND', status=404)
    db.session.delete(s)
    db.session.commit()
    return success_response(message=f"Subscription '{s.name}' removed.")

