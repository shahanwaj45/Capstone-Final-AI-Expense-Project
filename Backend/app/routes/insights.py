from flask import Blueprint, request
from datetime import datetime, timedelta
from app.utils.timezone import get_ist_now
from app import db
from app.models.ai_insight import AIInsight
from app.services.ai_service import generate_insight
from app.utils.auth import require_auth, get_current_user, success_response, error_response

insights_bp = Blueprint('insights', __name__)

INSIGHT_CACHE_HOURS = 24

def _get_or_generate_insight(user, force=False):
    """Return cached insight or generate new one."""
    latest = AIInsight.query.filter_by(user_id=user.id).order_by(AIInsight.created_at.desc()).first()
    
    cache_valid = (
        latest is not None and
        not force and
        (get_ist_now() - latest.created_at) < timedelta(hours=INSIGHT_CACHE_HOURS)
    )
    
    if cache_valid:
        return latest
    
    headline, description = generate_insight(user, db.session)
    now = get_ist_now()
    insight = AIInsight(
        user_id=user.id,
        headline=headline,
        description=description,
        source_period=now.strftime('%B %Y'),
    )
    db.session.add(insight)
    db.session.commit()
    return insight

@insights_bp.route('', methods=['GET'])
@require_auth
def get_insights():
    user = get_current_user()
    
    # Primary insight (auto-generated / cached)
    primary = _get_or_generate_insight(user)
    
    # Additional historical insights (last 3)
    historical = AIInsight.query.filter_by(user_id=user.id)\
        .order_by(AIInsight.created_at.desc())\
        .offset(1).limit(3).all()
    
    all_insights = [primary.to_dict()] + [i.to_dict() for i in historical]
    return success_response(all_insights)

@insights_bp.route('/generate', methods=['POST'])
@require_auth
def force_generate():
    user = get_current_user()
    insight = _get_or_generate_insight(user, force=True)
    return success_response(insight.to_dict())

@insights_bp.route('/<iid>/read', methods=['POST'])
@require_auth
def mark_read(iid):
    user = get_current_user()
    insight = AIInsight.query.filter_by(id=iid, user_id=user.id).first()
    if not insight:
        return error_response('Insight not found', 'NOT_FOUND', status=404)
    insight.is_read = True
    db.session.commit()
    return success_response(insight.to_dict())
