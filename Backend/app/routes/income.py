from flask import Blueprint, request
from app import db
from app.models.income_source import IncomeSource
from app.models.transaction import Transaction
from app.utils.auth import require_auth, require_role, get_current_user, success_response, error_response
from datetime import datetime, date
from app.utils.timezone import get_ist_now, get_ist_today

income_bp = Blueprint('income', __name__)

@income_bp.route('', methods=['GET'])
@require_auth
@require_role('professional')
def list_income():
    user = get_current_user()
    now = get_ist_today()
    month = int(request.args.get('month', now.month))
    year = int(request.args.get('year', now.year))
    
    sources = IncomeSource.query.filter_by(user_id=user.id).order_by(IncomeSource.created_at.desc()).all()
    total = sum(float(s.amount) for s in sources if s.date_received and s.date_received.month == month and s.date_received.year == year)
    primary = sum(float(s.amount) for s in sources if s.type == 'fixed' and s.date_received and s.date_received.month == month and s.date_received.year == year)
    side = sum(float(s.amount) for s in sources if s.type in ('variable', 'passive') and s.date_received and s.date_received.month == month and s.date_received.year == year)
    
    return success_response({
        'items': [s.to_dict() for s in sources],
        'total': total,
        'total_formatted': f"₹{total:,.0f}",
        'primary_income': primary,
        'side_income': side,
    })

@income_bp.route('', methods=['POST'])
@require_auth
@require_role('professional')
def create_income():
    user = get_current_user()
    data = request.get_json()
    source = data.get('source', '').strip()
    if not source:
        return error_response('Source name required', 'VALIDATION_ERROR')
    try:
        amount = float(data.get('amount', 0))
    except (TypeError, ValueError):
        return error_response('Invalid amount')
    
    date_received = get_ist_today()
    if data.get('date_received'):
        try:
            date_received = date.fromisoformat(data['date_received'])
        except ValueError:
            pass
    
    s = IncomeSource(
        user_id=user.id,
        source=source,
        amount=amount,
        type=data.get('type', 'fixed'),
        date_received=date_received,
        color=data.get('color', '#7BE2BE'),
        is_recurring=bool(data.get('is_recurring', False)),
    )
    db.session.add(s)

    # Also record in transactions table so it shows across transaction history
    tx = Transaction(
        user_id=user.id,
        type='income',
        name=source,
        amount=amount,
        category='Income',
        payment_method='Bank Transfer',
        date=datetime.combine(date_received, get_ist_now().time()),
        color='mint',
        notes=f"Income source: {data.get('type', 'fixed')}"
    )
    db.session.add(tx)
    db.session.commit()
    return success_response(s.to_dict(), status=201)

@income_bp.route('/<iid>', methods=['PATCH', 'PUT'])
@require_auth
@require_role('professional')
def update_income(iid):
    user = get_current_user()
    s = IncomeSource.query.filter_by(id=iid, user_id=user.id).first()
    if not s:
        return error_response('Income source not found', 'NOT_FOUND', status=404)
    data = request.get_json()
    if 'source' in data:
        s.source = data['source']
    if 'amount' in data:
        s.amount = float(data['amount'])
    if 'type' in data:
        s.type = data['type']
    db.session.commit()
    return success_response(s.to_dict())

@income_bp.route('/<iid>', methods=['DELETE'])
@require_auth
@require_role('professional')
def delete_income(iid):
    user = get_current_user()
    s = IncomeSource.query.filter_by(id=iid, user_id=user.id).first()
    if not s:
        return error_response('Income source not found', 'NOT_FOUND', status=404)
    db.session.delete(s)
    db.session.commit()
    return success_response(message='Income source deleted')
