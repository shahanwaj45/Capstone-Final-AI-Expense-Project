from flask import Blueprint, request
from app import db
from app.models.savings_goal import SavingsGoal
from app.utils.auth import require_auth, get_current_user, success_response, error_response

savings_bp = Blueprint('savings', __name__)

@savings_bp.route('', methods=['GET'])
@require_auth
def list_goals():
    user = get_current_user()
    goals = SavingsGoal.query.filter_by(user_id=user.id).order_by(SavingsGoal.created_at.asc()).all()
    return success_response([g.to_dict() for g in goals])

@savings_bp.route('', methods=['POST'])
@require_auth
def create_goal():
    user = get_current_user()
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return error_response('Goal name is required', 'VALIDATION_ERROR')
    try:
        target = float(data.get('target_amount', 0))
        if target <= 0:
            return error_response('Target amount must be > 0', 'VALIDATION_ERROR')
    except (TypeError, ValueError):
        return error_response('Invalid target amount', 'VALIDATION_ERROR')
    
    g = SavingsGoal(
        user_id=user.id,
        name=name,
        target_amount=target,
        current_amount=float(data.get('current_amount', 0)),
    )
    if data.get('deadline'):
        from datetime import date
        try:
            g.deadline = date.fromisoformat(data['deadline'])
        except ValueError:
            pass
    db.session.add(g)
    db.session.commit()
    return success_response(g.to_dict(), status=201)

@savings_bp.route('/<gid>', methods=['GET'])
@require_auth
def get_goal(gid):
    user = get_current_user()
    g = SavingsGoal.query.filter_by(id=gid, user_id=user.id).first()
    if not g:
        return error_response('Goal not found', 'NOT_FOUND', status=404)
    return success_response(g.to_dict())

@savings_bp.route('/<gid>', methods=['PATCH', 'PUT'])
@require_auth
def update_goal(gid):
    user = get_current_user()
    g = SavingsGoal.query.filter_by(id=gid, user_id=user.id).first()
    if not g:
        return error_response('Goal not found', 'NOT_FOUND', status=404)
    data = request.get_json()
    if 'name' in data:
        g.name = data['name'].strip()
    if 'target_amount' in data:
        g.target_amount = float(data['target_amount'])
    if 'current_amount' in data:
        g.current_amount = float(data['current_amount'])
    db.session.commit()
    return success_response(g.to_dict())

@savings_bp.route('/<gid>', methods=['DELETE'])
@require_auth
def delete_goal(gid):
    user = get_current_user()
    g = SavingsGoal.query.filter_by(id=gid, user_id=user.id).first()
    if not g:
        return error_response('Goal not found', 'NOT_FOUND', status=404)
    db.session.delete(g)
    db.session.commit()
    return success_response(message='Goal deleted')

@savings_bp.route('/<gid>/contribute', methods=['POST'])
@require_auth
def contribute_to_goal(gid):
    user = get_current_user()
    g = SavingsGoal.query.filter_by(id=gid, user_id=user.id).first()
    if not g:
        return error_response('Goal not found', 'NOT_FOUND', status=404)
    data = request.get_json()
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be > 0', 'VALIDATION_ERROR')
    except (TypeError, ValueError):
        return error_response('Invalid amount', 'VALIDATION_ERROR')
    g.current_amount = float(g.current_amount) + amount
    db.session.commit()
    return success_response(g.to_dict())
