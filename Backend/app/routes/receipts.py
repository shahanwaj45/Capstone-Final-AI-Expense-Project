import os
import uuid
from flask import Blueprint, request, current_app, send_from_directory
from app import db
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.services.ocr_service import scan_receipt
from app.utils.auth import require_auth, get_current_user, success_response, error_response
from datetime import datetime
from app.utils.timezone import get_ist_now
from werkzeug.utils import secure_filename

receipts_bp = Blueprint('receipts', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}

def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def _get_receipts_dir():
    receipt_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'receipts')
    os.makedirs(receipt_dir, exist_ok=True)
    return receipt_dir

@receipts_bp.route('/scan', methods=['POST'])
@require_auth
def scan():
    user = get_current_user()
    if 'file' not in request.files:
        return error_response('No file uploaded', 'VALIDATION_ERROR')
    
    f = request.files['file']
    if not f.filename:
        return error_response('No file selected', 'VALIDATION_ERROR')
    if not _allowed_file(f.filename):
        return error_response('Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP, PDF', 'VALIDATION_ERROR')
    
    # Check file size (max 10MB)
    f.seek(0, 2)
    size = f.tell()
    f.seek(0)
    if size > 10 * 1024 * 1024:
        return error_response('File too large. Maximum size is 10MB.', 'VALIDATION_ERROR')
    
    # Save to uploads/receipts dir with unique name
    ext = f.filename.rsplit('.', 1)[1].lower()
    unique_name = f"receipt_{uuid.uuid4().hex}_{int(get_ist_now().timestamp())}.{ext}"
    receipts_dir = _get_receipts_dir()
    file_path = os.path.join(receipts_dir, unique_name)
    f.save(file_path)
    
    # Analyze receipt with AI (Gemini Vision)
    extracted, err = scan_receipt(file_path)
    
    if err:
        if 'quota' in err.lower() or 'plan' in err.lower():
            # Graceful fallback: preserve uploaded image and provide an editable template
            receipt_url = f"/api/receipts/image/{unique_name}"
            source = request.form.get('source', 'upload')
            extracted = {
                'merchant': 'Uploaded Receipt',
                'amount': 0.0,
                'date': get_ist_now().strftime('%Y-%m-%d'),
                'category': 'Other'
            }
            return success_response({
                'extracted': extracted,
                'receipt_url': receipt_url,
                'receipt_filename': unique_name,
                'source': source,
                'saved': False,
                'transaction': None,
                'warning': err,
                'message': 'AI free-tier quota reached. Receipt image attached; please confirm the amount and category below.'
            })
            
        # Clean up file on general OCR failure
        try:
            os.remove(file_path)
        except Exception:
            pass
        return error_response(err, 'OCR_ERROR', status=422)
    
    receipt_url = f"/api/receipts/image/{unique_name}"
    source = request.form.get('source', 'upload')  # 'camera' or 'upload'
    auto_save_requested = request.form.get('auto_save', '').lower() in ('true', '1', 'yes')
    use_today = request.form.get('use_today', '').lower() in ('true', '1', 'yes')

    saved_tx = None
    if auto_save_requested and extracted:
        raw_amt = extracted.get('amount')
        try:
            amt = float(raw_amt) if raw_amt is not None else 0.0
        except (TypeError, ValueError):
            amt = 0.0

        if amt > 0:
            merchant_name = (extracted.get('merchant') or 'Camera receipt' if source == 'camera' else 'Scanned receipt').strip()
            cat = extracted.get('category') or 'Other'

            if use_today or not extracted.get('date'):
                tx_date = get_ist_now()
            else:
                try:
                    str_d = str(extracted['date']).strip()
                    if len(str_d) == 10:
                        parsed_d = datetime.strptime(str_d, '%Y-%m-%d')
                        tx_date = datetime.combine(parsed_d.date(), get_ist_now().time())
                    else:
                        tx_date = datetime.fromisoformat(str_d)
                except Exception:
                    tx_date = get_ist_now()

            notes_tag = "Camera receipt scan" if source == 'camera' else "Scanned receipt"
            saved_tx = Transaction(
                user_id=user.id,
                type='expense',
                name=merchant_name,
                amount=amt,
                category=cat,
                payment_method='UPI',
                date=tx_date,
                color=CATEGORY_COLORS.get(cat, 'coral'),
                notes=f"{notes_tag}: {merchant_name}",
                receipt_url=receipt_url,
            )
            db.session.add(saved_tx)
            db.session.commit()

    return success_response({
        'extracted': extracted,
        'receipt_url': receipt_url,
        'receipt_filename': unique_name,
        'source': source,
        'saved': saved_tx is not None,
        'transaction': saved_tx.to_dict() if saved_tx else None,
        'message': 'Receipt analyzed and automatically saved into expenses!' if saved_tx else 'Receipt scanned successfully. Please review and confirm before saving.'
    })

@receipts_bp.route('/image/<filename>', methods=['GET'])
def get_receipt_image(filename):
    """Serve uploaded/captured receipt image."""
    receipts_dir = _get_receipts_dir()
    safe_name = secure_filename(filename)
    if not os.path.isfile(os.path.join(receipts_dir, safe_name)):
        return error_response('Receipt image not found', 'NOT_FOUND', status=404)
    return send_from_directory(receipts_dir, safe_name)

@receipts_bp.route('/recent', methods=['GET'])
@require_auth
def get_recent_scans():
    """Get transactions created from scanned receipts, newest scans first."""
    user = get_current_user()
    limit = int(request.args.get('limit', 10))
    scans = Transaction.query.filter(
        Transaction.user_id == user.id,
        db.or_(
            Transaction.notes.ilike('%receipt%'),
            Transaction.receipt_url.isnot(None)
        )
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    return success_response({'items': [s.to_dict() for s in scans]})

@receipts_bp.route('/confirm', methods=['POST'])
@require_auth
def confirm():
    """Save a confirmed receipt extraction as a transaction."""
    user = get_current_user()
    data = request.get_json() or {}
    
    name = (data.get('name') or data.get('merchant') or 'Receipt expense').strip()
    category = data.get('category') or 'Other'
    
    try:
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return error_response('Amount must be > 0')
    except (TypeError, ValueError):
        return error_response('Invalid amount')
    
    # Date handling: if use_today is True or date_str is missing, use now
    use_today = data.get('use_today', False)
    date_str = data.get('date')
    
    if use_today or not date_str:
        tx_date = get_ist_now()
    else:
        try:
            str_d = str(date_str).strip()
            if len(str_d) == 10:
                parsed_d = datetime.strptime(str_d, '%Y-%m-%d')
                now = get_ist_now()
                tx_date = datetime.combine(parsed_d.date(), now.time())
            else:
                tx_date = datetime.fromisoformat(str_d)
        except Exception:
            tx_date = get_ist_now()
    
    receipt_url = data.get('receipt_url')
    source = data.get('source', 'upload')
    notes_prefix = "Camera receipt scan" if source == 'camera' else "Scanned receipt"
    notes = (data.get('notes') or f"{notes_prefix}: {name}").strip()
    payment_method = data.get('payment_method') or 'UPI'
    
    tx = Transaction(
        user_id=user.id,
        type='expense',
        name=name,
        amount=amount,
        category=category,
        payment_method=payment_method,
        date=tx_date,
        color=CATEGORY_COLORS.get(category, 'coral'),
        notes=notes,
        receipt_url=receipt_url,
    )
    db.session.add(tx)
    db.session.commit()
    
    return success_response(tx.to_dict(), message="Receipt transaction saved successfully", status=201)


