import calendar
from datetime import datetime, date, timedelta
from flask import Blueprint, request
from sqlalchemy import func
from app import db
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.subscription import Subscription
from app.models.savings_goal import SavingsGoal
from app.models.ai_insight import AIInsight
from app.models.notification import Notification
from app.utils.auth import require_auth, get_current_user, success_response, error_response
from app.utils.calculations import get_canonical_month_range
from app.utils.timezone import get_ist_now, get_ist_today

notifications_bp = Blueprint('notifications', __name__)

def _sync_user_notifications(user):
    """
    Evaluates real-time financial triggers across budgets, subscriptions,
    savings goals, safe-to-spend, emergency reserves, and AI insights.
    Persists alerts into the database so user read/dismiss state is maintained.
    """
    now = get_ist_now()
    today = get_ist_today()
    start, end = get_canonical_month_range(now.year, now.month)

    # ── 1. Category Budget Triggers (>= 80% warning, >= 100% exceeded) ──
    budgets = Budget.query.filter_by(user_id=user.id, month=now.month, year=now.year).all()
    if not budgets:
        budgets = Budget.query.filter_by(user_id=user.id).order_by(Budget.created_at.desc()).limit(6).all()

    for b in budgets:
        cat_limit = float(b.limit_amount or 0)
        if cat_limit <= 0:
            continue

        cat_spent = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user.id,
            Transaction.type == 'expense',
            Transaction.category == b.category,
            Transaction.date >= start,
            Transaction.date < end
        ).scalar() or 0.0
        cat_spent = float(cat_spent)

        pct_used = (cat_spent / cat_limit) * 100.0
        if pct_used >= 100.0:
            notif_id = f"budget-exceeded-{b.id}-{now.year}-{now.month}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='budget_alert',
                    severity='critical',
                    title=f"Budget Exceeded: {b.category}",
                    message=f"You have reached {pct_used:.0f}% of your ₹{cat_limit:,.0f} limit in {b.category} (Spent ₹{cat_spent:,.0f}).",
                    action_link=f"/{user.role}/budget",
                    created_at=now
                ))
        elif pct_used >= 80.0:
            notif_id = f"budget-warning-{b.id}-{now.year}-{now.month}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='budget_alert',
                    severity='warning',
                    title=f"Budget Nearing Limit: {b.category}",
                    message=f"You have utilized {pct_used:.0f}% of your allocated ₹{cat_limit:,.0f} limit in {b.category}.",
                    action_link=f"/{user.role}/budget",
                    created_at=now
                ))

    # ── 2. Safe-to-Spend / Allowance Pace Triggers ──
    total_expense = db.session.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == user.id,
        Transaction.type == 'expense',
        Transaction.date >= start,
        Transaction.date < end
    ).scalar() or 0.0
    total_expense = float(total_expense)
    allowance = float(user.monthly_allowance or 15000.0)
    remaining = max(0.0, allowance - total_expense)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining = max(1, days_in_month - now.day + 1)
    safe_per_day = round(remaining / days_remaining) if remaining > 0 else 0

    if user.role == 'student':
        if safe_per_day <= 150:
            notif_id = f"safe-spend-{user.id}-{now.year}-{now.month}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                severity = "critical" if safe_per_day <= 80 else "warning"
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='student_pace',
                    severity=severity,
                    title="Low Daily Safe-to-Spend Pace",
                    message=f"Your safe spending allowance is ₹{safe_per_day:,.0f}/day with {days_remaining} days left in this month. Restrain discretionary spending.",
                    action_link="/student/budget",
                    created_at=now
                ))
    else:
        if total_expense >= allowance * 0.85:
            notif_id = f"prof-burn-rate-{user.id}-{now.year}-{now.month}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='budget_alert',
                    severity='warning',
                    title="High Monthly Outflow Velocity",
                    message=f"Total monthly spend of ₹{total_expense:,.0f} has crossed 85% of your baseline allocation.",
                    action_link="/professional/budget",
                    created_at=now
                ))

    # ── 3. Subscription Renewal Triggers ──
    subscriptions = Subscription.query.filter_by(user_id=user.id, is_active=True).all()
    for s in subscriptions:
        if not s.next_billing_date:
            continue
        days_until = (s.next_billing_date - today).days
        if 0 <= days_until <= 7:
            when_desc = "today" if days_until == 0 else ("tomorrow" if days_until == 1 else f"in {days_until} days")
            notif_id = f"sub-renewal-{s.id}-{s.next_billing_date.isoformat()}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='subscription_renewal',
                    severity='info',
                    title=f"Upcoming Renewal: {s.name}",
                    message=f"₹{float(s.amount):,.0f} will renew {when_desc} ({s.next_billing_date.strftime('%d %b')}).",
                    action_link="/professional/subscriptions" if user.role == "professional" else "/student/subscriptions",
                    created_at=now
                ))
        elif days_until < 0:
            notif_id = f"sub-overdue-{s.id}-{s.next_billing_date.isoformat()}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='subscription_renewal',
                    severity='warning',
                    title=f"Renewal Due: {s.name}",
                    message=f"Billing date of {s.next_billing_date.strftime('%d %b')} has arrived. Confirm your payment to update cycle.",
                    action_link="/professional/subscriptions" if user.role == "professional" else "/student/subscriptions",
                    created_at=now
                ))

    # ── 4. Savings Goal Milestones ──
    goals = SavingsGoal.query.filter_by(user_id=user.id).all()
    for g in goals:
        pct = g.percent_complete
        if pct >= 100:
            notif_id = f"savings-goal-100-{g.id}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='savings_milestone',
                    severity='info',
                    title=f"Goal Achieved: {g.name}!",
                    message=f"Congratulations! You reached 100% of your ₹{float(g.target_amount):,.0f} target for {g.name}.",
                    action_link=f"/{user.role}/savings-goals",
                    created_at=now
                ))
        elif pct >= 65:
            notif_id = f"savings-goal-65-{g.id}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='savings_milestone',
                    severity='info',
                    title=f"Goal Milestone: {g.name}",
                    message=f"You're {pct:.0f}% of the way to your target! ₹{max(0.0, float(g.target_amount) - float(g.current_amount)):,.0f} remaining.",
                    action_link=f"/{user.role}/savings-goals",
                    created_at=now
                ))

    # ── 5. Emergency Fund Runway Alert ──
    ef = user.emergency_fund
    if ef and ef.monthly_expense_estimate and float(ef.monthly_expense_estimate) > 0:
        months_covered = float(ef.current_amount) / float(ef.monthly_expense_estimate)
        if months_covered < 6.0 and float(ef.current_amount) > 0:
            notif_id = f"emergency-fund-low-{user.id}-{now.year}-{now.month}"
            if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
                severity = 'critical' if months_covered < 3.0 else 'warning'
                db.session.add(Notification(
                    id=notif_id,
                    user_id=user.id,
                    type='emergency_fund',
                    severity=severity,
                    title="Emergency Runway Below Target",
                    message=f"Your current reserve provides {months_covered:.1f} months of expenses. Recommended baseline is 6 months runway.",
                    action_link=f"/{user.role}/emergency-fund",
                    created_at=now
                ))

    # ── 6. AI Intelligence Alert ──
    latest_insight = AIInsight.query.filter_by(user_id=user.id).order_by(AIInsight.created_at.desc()).first()
    if latest_insight:
        notif_id = f"ai-insight-alert-{latest_insight.id}"
        if not Notification.query.filter_by(id=notif_id, user_id=user.id).first():
            db.session.add(Notification(
                id=notif_id,
                user_id=user.id,
                type='ai_insight',
                severity='info',
                title="AI Financial Intelligence",
                message=latest_insight.headline,
                action_link=f"/{user.role}/ai-insights",
                created_at=latest_insight.created_at or now
            ))

    # ── 7. System Orientation / Welcome ──
    welcome_id = f"welcome-{user.id}"
    if not Notification.query.filter_by(id=welcome_id, user_id=user.id).first():
        db.session.add(Notification(
            id=welcome_id,
            user_id=user.id,
            type='system',
            severity='info',
            title="Financial Workspace Active",
            message=f"Welcome {user.name}! Your transactions, budgets, and predictive alerts are synchronized with Indian Standard Time (IST).",
            action_link=f"/{user.role}",
            created_at=now
        ))

    db.session.commit()

@notifications_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """Returns all active notifications for current user with dynamic evaluations."""
    user = get_current_user()
    try:
        _sync_user_notifications(user)
    except Exception as e:
        db.session.rollback()

    notifs = Notification.query.filter_by(user_id=user.id, is_dismissed=False).order_by(Notification.created_at.desc()).all()
    unread_count = sum(1 for n in notifs if not n.is_read)

    items = [n.to_dict() for n in notifs]
    return success_response({
        'items': items,
        'notifications': items,
        'unread_count': unread_count,
        'total': len(items),
    })

@notifications_bp.route('/<nid>/read', methods=['POST'])
@require_auth
def mark_read(nid):
    """Marks a single notification as read."""
    user = get_current_user()
    n = Notification.query.filter_by(id=nid, user_id=user.id).first()
    if not n:
        return error_response('Notification not found', 'NOT_FOUND', status=404)
    n.is_read = True
    db.session.commit()
    return success_response(n.to_dict())

@notifications_bp.route('/read-all', methods=['POST'])
@require_auth
def mark_all_read():
    """Marks all user notifications as read."""
    user = get_current_user()
    Notification.query.filter_by(user_id=user.id, is_read=False, is_dismissed=False).update({'is_read': True})
    db.session.commit()
    return success_response(message="All notifications marked as read.")

@notifications_bp.route('/<nid>', methods=['DELETE'])
@require_auth
def delete_notification(nid):
    """Dismisses a single notification and prevents resurrection."""
    user = get_current_user()
    n = Notification.query.filter_by(id=nid, user_id=user.id).first()
    if not n:
        return error_response('Notification not found', 'NOT_FOUND', status=404)
    n.is_dismissed = True
    db.session.commit()
    return success_response(message="Notification dismissed.")

@notifications_bp.route('/clear', methods=['DELETE', 'POST'])
@require_auth
def clear_read_notifications():
    """Dismisses all read notifications for current user."""
    user = get_current_user()
    Notification.query.filter_by(user_id=user.id, is_read=True).update({'is_dismissed': True})
    db.session.commit()
    return success_response(message="Read notifications cleared.")
