from flask import Blueprint, request
from app import db
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.services.voice_service import process_voice_text
from app.utils.auth import require_auth, get_current_user, success_response, error_response
from datetime import datetime
from app.utils.timezone import get_ist_now

voice_bp = Blueprint('voice', __name__)

@voice_bp.route('/parse', methods=['POST'])
@require_auth
def parse():
    """Parse transcribed voice text into expense fields."""
    data = request.get_json()
    text = data.get('text', '').strip() if data else ''
    
    if not text:
        return error_response('No text provided', 'VALIDATION_ERROR')
    
    parsed, err = process_voice_text(text)
    if err:
        return error_response(err, 'VOICE_PARSE_ERROR', status=422)
    
    return success_response({
        'parsed': parsed,
        'original_text': text,
        'message': 'Review the extracted expense before saving.'
    })

@voice_bp.route('/confirm', methods=['POST'])
@require_auth
def confirm():
    """Save a confirmed voice expense as a transaction."""
    user = get_current_user()
    data = request.get_json()
    
    name = data.get('name', 'Voice expense').strip()
    category = data.get('category', 'Other')
    
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be > 0')
    except (TypeError, ValueError):
        return error_response('Invalid amount')
    
    tx = Transaction(
        user_id=user.id,
        type='expense',
        name=name,
        amount=amount,
        category=category,
        payment_method=data.get('payment_method', 'Other'),
        date=get_ist_now(),
        color=CATEGORY_COLORS.get(category, 'coral'),
        notes=f"Voice expense: {data.get('original_text', '')}",
    )
    db.session.add(tx)
    db.session.commit()
    
    return success_response(tx.to_dict(), status=201)
