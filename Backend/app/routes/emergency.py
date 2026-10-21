from flask import Blueprint, request
from app import db
from app.models.emergency_fund import EmergencyFund, EmergencyFundContribution
from app.utils.auth import require_auth, get_current_user, success_response, error_response

emergency_bp = Blueprint('emergency', __name__)

def _get_or_create_fund(user):
    ef = user.emergency_fund
    if not ef:
        ef = EmergencyFund(user_id=user.id, current_amount=0.0, monthly_expense_estimate=30000.0, target_months=6)
        db.session.add(ef)
        db.session.commit()
    return ef

@emergency_bp.route('', methods=['GET'])
@require_auth
def get_fund():
    user = get_current_user()
    ef = _get_or_create_fund(user)
    fund_dict = ef.to_dict()
    contributions = ef.contributions.order_by(EmergencyFundContribution.date.desc()).limit(12).all()
    contrib_list = [c.to_dict() for c in contributions]
    
    response_data = dict(fund_dict)
    response_data['fund'] = fund_dict
    response_data['contributions'] = contrib_list
    return success_response(response_data)

@emergency_bp.route('', methods=['PUT', 'PATCH'])
@require_auth
def update_fund():
    user = get_current_user()
    ef = _get_or_create_fund(user)
    data = request.get_json() or {}
    
    if 'current_amount' in data:
        ef.current_amount = max(0.0, float(data['current_amount']))
    elif 'current' in data:
        ef.current_amount = max(0.0, float(data['current']))
        
    if 'monthly_expense_estimate' in data:
        ef.monthly_expense_estimate = max(0.0, float(data['monthly_expense_estimate']))
        
    if 'target_months' in data:
        ef.target_months = max(1, int(data['target_months']))

    db.session.commit()
    return success_response(ef.to_dict())

@emergency_bp.route('/contribute', methods=['POST'])
@require_auth
def contribute():
    user = get_current_user()
    ef = _get_or_create_fund(user)
    data = request.get_json() or {}
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be > 0')
    except (TypeError, ValueError):
        return error_response('Invalid amount')
        
    ef.current_amount = float(ef.current_amount) + amount
    contrib = EmergencyFundContribution(fund_id=ef.id, amount=amount)
    db.session.add(contrib)
    db.session.commit()
    return success_response(ef.to_dict())

@emergency_bp.route('/withdraw', methods=['POST'])
@require_auth
def withdraw():
    user = get_current_user()
    ef = _get_or_create_fund(user)
    data = request.get_json() or {}
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be > 0')
        if amount > float(ef.current_amount):
            return error_response(f'Withdrawal amount exceeds available balance of ₹{float(ef.current_amount):,.0f}')
    except (TypeError, ValueError):
        return error_response('Invalid amount')
        
    ef.current_amount = float(ef.current_amount) - amount
    contrib = EmergencyFundContribution(fund_id=ef.id, amount=-amount)
    db.session.add(contrib)
    db.session.commit()
    return success_response(ef.to_dict())

@emergency_bp.route('/history', methods=['GET'])
@require_auth
def history():
    user = get_current_user()
    ef = user.emergency_fund
    if not ef:
        return success_response([])
    contributions = ef.contributions.order_by(EmergencyFundContribution.date.desc()).limit(12).all()
    return success_response([c.to_dict() for c in contributions])
