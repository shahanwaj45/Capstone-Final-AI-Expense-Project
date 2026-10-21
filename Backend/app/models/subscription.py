import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    cycle = db.Column(db.String(20), default='Monthly')
    next_billing_date = db.Column(db.Date)
    color = db.Column(db.String(20), default='#7BE2BE')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='subscriptions')

    @property
    def monthly_burn(self):
        amt = float(self.amount or 0)
        c = (self.cycle or 'Monthly').strip().lower()
        if c in ('annual', 'yearly'):
            return round(amt / 12.0, 2)
        elif c in ('quarterly', 'quarter'):
            return round(amt / 3.0, 2)
        elif c in ('weekly', 'week'):
            return round(amt * 4.33, 2)
        return round(amt, 2)

    @property
    def annual_spend(self):
        return round(self.monthly_burn * 12.0, 2)

    @property
    def days_until_renewal(self):
        if not self.next_billing_date:
            return None
        from app.utils.timezone import get_ist_today
        today = get_ist_today()
        return (self.next_billing_date - today).days

    def to_dict(self):
        m_burn = self.monthly_burn
        a_spend = self.annual_spend
        days = self.days_until_renewal
        return {
            'id': self.id,
            'name': self.name,
            'amount': f"₹{float(self.amount):,.0f}",
            'amount_raw': float(self.amount),
            'cycle': self.cycle,
            'monthly_burn': m_burn,
            'monthly_burn_formatted': f"₹{m_burn:,.0f}",
            'annual_spend': a_spend,
            'annual_spend_formatted': f"₹{a_spend:,.0f}",
            'next': self.next_billing_date.strftime('%d %b') if self.next_billing_date else None,
            'next_billing_date': self.next_billing_date.isoformat() if self.next_billing_date else None,
            'days_until_renewal': days,
            'is_overdue': bool(days is not None and days < 0),
            'color': self.color,
            'active': self.is_active,
            'is_active': self.is_active,
        }

