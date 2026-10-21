import uuid
import json
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class AIInsight(db.Model):
    __tablename__ = 'ai_insights'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    headline = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    source_period = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='ai_insights')

    def to_dict(self):
        now = get_ist_now()
        diff = now - self.created_at
        if diff.seconds < 60:
            ts = 'Just now'
        elif diff.seconds < 3600:
            ts = f"{diff.seconds // 60} minutes ago"
        elif diff.days == 0:
            ts = f"{diff.seconds // 3600} hours ago"
        elif diff.days == 1:
            ts = 'Yesterday'
        else:
            ts = f"{diff.days} days ago"

        summary_text = self.description
        health_score = 78
        risk_level = "low"
        savings_potential = 1500
        spending_anomalies = []
        actionable_steps = []
        category_leaks = []

        try:
            if self.description and (self.description.strip().startswith('{') or '```json' in self.description):
                clean_text = self.description.strip()
                if clean_text.startswith('```json'):
                    clean_text = clean_text[7:]
                if clean_text.endswith('```'):
                    clean_text = clean_text[:-3]
                parsed = json.loads(clean_text.strip())
                if isinstance(parsed, dict):
                    summary_text = parsed.get('summary', parsed.get('description', self.description))
                    health_score = parsed.get('financial_health_score', parsed.get('health_score', 78))
                    risk_level = parsed.get('risk_level', 'moderate' if health_score < 70 else 'low')
                    savings_potential = parsed.get('savings_potential_inr', parsed.get('projected_savings_inr', 1500))
                    spending_anomalies = parsed.get('spending_anomalies', [])
                    actionable_steps = parsed.get('actionable_steps', [])
                    category_leaks = parsed.get('category_leaks', [])
        except Exception:
            pass

        # Fallback rich structure if description was plain text
        if not actionable_steps:
            actionable_steps = [
                {
                    "step": 1,
                    "title": "Review discretionary spending",
                    "action": "Set a weekly allocation for dining and entertainment to prevent budget drift.",
                    "potential_savings_inr": 1200
                },
                {
                    "step": 2,
                    "title": "Automate savings transfer",
                    "action": "Move 10% of unspent allowance into your Emergency Fund on the 1st of every month.",
                    "potential_savings_inr": 2000
                },
                {
                    "step": 3,
                    "title": "Audit active recurring subscriptions",
                    "action": "Examine digital memberships and cancel any unused services.",
                    "potential_savings_inr": 500
                }
            ]

        if not spending_anomalies:
            spending_anomalies = [
                {
                    "category": "Food & Dining",
                    "detail": "Frequent small transactions contribute to higher total category spend.",
                    "severity": "warning"
                },
                {
                    "category": "Subscriptions",
                    "detail": "Keep an eye on auto-renewal dates to avoid surprise recurring charges.",
                    "severity": "info"
                }
            ]

        return {
            'id': self.id,
            'headline': self.headline,
            'description': summary_text,
            'summary': summary_text,
            'financial_health_score': health_score,
            'risk_level': risk_level,
            'savings_potential_inr': savings_potential,
            'spending_anomalies': spending_anomalies,
            'actionable_steps': actionable_steps,
            'category_leaks': category_leaks,
            'timestamp': ts,
            'is_read': self.is_read,
            'source_period': self.source_period,
        }
