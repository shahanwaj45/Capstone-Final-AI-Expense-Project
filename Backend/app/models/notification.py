import uuid
from datetime import datetime
from app import db
from app.utils.timezone import get_ist_now

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.String(64), primary_key=True, default=lambda: f"notif_{uuid.uuid4().hex[:16]}")
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='system')  # budget_alert, subscription_renewal, savings_milestone, emergency_fund, ai_insight, system
    severity = db.Column(db.String(20), default='info')  # info, warning, critical
    action_link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    is_dismissed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='notifications')

    def to_dict(self):
        now = get_ist_now()
        created = self.created_at or now

        # Compute relative date tag in IST
        diff = now.date() - created.date()
        if diff.days == 0:
            time_tag = f"Today, {created.strftime('%I:%M %p')}"
        elif diff.days == 1:
            time_tag = f"Yesterday, {created.strftime('%I:%M %p')}"
        else:
            time_tag = created.strftime('%d %b, %I:%M %p')

        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'severity': self.severity,
            'action_link': self.action_link,
            'is_read': bool(self.is_read),
            'is_dismissed': bool(self.is_dismissed),
            'timestamp': time_tag,
            'created_at': created.isoformat(),
        }
