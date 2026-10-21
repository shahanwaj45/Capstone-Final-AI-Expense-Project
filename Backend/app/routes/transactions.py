from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from datetime import datetime
from app import db
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.utils.auth import require_auth, get_current_user, success_response, error_response

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('', methods=['GET'])
@require_auth
def list_transactions():
    user = get_current_user()
    
    query = Transaction.query.filter_by(user_id=user.id)
    
    # Filters
    search = request.args.get('search', '').strip()
    if search:
        query = query.filter(
            db.or_(
                Transaction.name.ilike(f'%{search}%'),
                Transaction.notes.ilike(f'%{search}%'),
                Transaction.category.ilike(f'%{search}%')
            )
        )
    
    tx_type = request.args.get('type', '')
    if tx_type in ('expense', 'income'):
        query = query.filter_by(type=tx_type)
    
    category = request.args.get('category', '')
    if category:
        query = query.filter_by(category=category)
    
    # Pagination
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 50))
    sort_by = request.args.get('sort_by', 'date')
    
    if sort_by == 'created_at':
        order_clause = [Transaction.created_at.desc()]
    else:
        order_clause = [Transaction.date.desc(), Transaction.created_at.desc()]
    
    paginated = query.order_by(*order_clause).paginate(page=page, per_page=limit, error_out=False)
    
    return success_response({
        'items': [t.to_dict() for t in paginated.items],
        'page': page,
        'limit': limit,
        'total': paginated.total,
        'pages': paginated.pages
    })

@transactions_bp.route('', methods=['POST'])
@require_auth
def create_transaction():
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return error_response('Request body required')
    
    name = data.get('name', '').strip()
    amount_raw = data.get('amount')
    category = data.get('category', 'Other')
    tx_type = data.get('type', 'expense')
    payment_method = data.get('payment_method', 'UPI')
    notes = data.get('notes', '')
    
    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    if amount_raw is None:
        errors['amount'] = 'Amount is required'
    else:
        try:
            amount = float(amount_raw)
            if amount <= 0:
                errors['amount'] = 'Amount must be greater than zero'
        except (TypeError, ValueError):
            errors['amount'] = 'Amount must be a valid number'
    
    if errors:
        return error_response('Validation failed', 'VALIDATION_ERROR', fields=errors)
    
    # Parse date
    date_str = data.get('date')
    if date_str:
        try:
            tx_date = datetime.fromisoformat(date_str)
            if tx_date.tzinfo is not None:
                from app.utils.timezone import to_ist
                tx_date = to_ist(tx_date)
        except ValueError:
            from app.utils.timezone import get_ist_now
            tx_date = get_ist_now()
    else:
        from app.utils.timezone import get_ist_now
        tx_date = get_ist_now()
    
    tx = Transaction(
        user_id=user.id,
        type=tx_type,
        name=name,
        amount=amount,
        category=category,
        payment_method=payment_method,
        date=tx_date,
        color=CATEGORY_COLORS.get(category, 'coral'),
        notes=notes,
    )
    db.session.add(tx)
    db.session.commit()
    
    return success_response(tx.to_dict(), status=201)

@transactions_bp.route('/<tx_id>', methods=['GET'])
@require_auth
def get_transaction(tx_id):
    user = get_current_user()
    tx = Transaction.query.filter_by(id=tx_id, user_id=user.id).first()
    if not tx:
        return error_response('Transaction not found', 'NOT_FOUND', status=404)
    return success_response(tx.to_dict())

@transactions_bp.route('/<tx_id>', methods=['PATCH', 'PUT'])
@require_auth
def update_transaction(tx_id):
    user = get_current_user()
    tx = Transaction.query.filter_by(id=tx_id, user_id=user.id).first()
    if not tx:
        return error_response('Transaction not found', 'NOT_FOUND', status=404)
    
    data = request.get_json()
    if 'name' in data:
        tx.name = data['name'].strip()
    if 'amount' in data:
        try:
            amt = float(data['amount'])
            if amt <= 0:
                return error_response('Amount must be > 0', 'VALIDATION_ERROR')
            tx.amount = amt
        except (TypeError, ValueError):
            return error_response('Invalid amount', 'VALIDATION_ERROR')
    if 'category' in data:
        tx.category = data['category']
        tx.color = CATEGORY_COLORS.get(data['category'], 'coral')
    if 'payment_method' in data:
        tx.payment_method = data['payment_method']
    if 'notes' in data:
        tx.notes = data['notes']
    if 'type' in data and data['type'] in ('expense', 'income'):
        tx.type = data['type']
    
    db.session.commit()
    return success_response(tx.to_dict())

@transactions_bp.route('/<tx_id>', methods=['DELETE'])
@require_auth
def delete_transaction(tx_id):
    user = get_current_user()
    tx = Transaction.query.filter_by(id=tx_id, user_id=user.id).first()
    if not tx:
        return error_response('Transaction not found', 'NOT_FOUND', status=404)
    
    db.session.delete(tx)
    db.session.commit()
    return success_response(message='Transaction deleted')
