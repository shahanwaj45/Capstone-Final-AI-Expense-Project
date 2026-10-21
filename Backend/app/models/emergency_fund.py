import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class EmergencyFund(db.Model):
    __tablename__ = 'emergency_fund'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, unique=True)
    current_amount = db.Column(db.Numeric(12, 2), default=0)
    monthly_expense_estimate = db.Column(db.Numeric(12, 2), default=30000)
    target_months = db.Column(db.Integer, default=6)
    created_at = db.Column(db.DateTime, default=get_ist_now)
    updated_at = db.Column(db.DateTime, default=get_ist_now, onupdate=get_ist_now)

    user = db.relationship('User', back_populates='emergency_fund')
    contributions = db.relationship('EmergencyFundContribution', back_populates='fund', lazy='dynamic', cascade='all, delete-orphan')

    @property
    def recommended_amount(self):
        t_months = self.target_months or 6
        return float(self.monthly_expense_estimate or 0) * t_months

    @property
    def months_covered(self):
        est = float(self.monthly_expense_estimate or 0)
        if est <= 0:
            return 0.0
        return round(float(self.current_amount or 0) / est, 1)

    @property
    def percent_complete(self):
        rec = self.recommended_amount
        if rec <= 0:
            return 0
        return min(100, round(float(self.current_amount or 0) / rec * 100))

    def to_dict(self):
        t_months = self.target_months or 6
        curr = float(self.current_amount or 0)
        est = float(self.monthly_expense_estimate or 0)
        rec = est * t_months
        runway = round(curr / est, 1) if est > 0 else 0.0
        shortfall = max(0.0, rec - curr)
        surplus = max(0.0, curr - rec)
        pct = min(100, round((curr / rec * 100))) if rec > 0 else 0

        return {
            'id': self.id,
            'current': curr,
            'current_amount': curr,
            'monthly_expense_estimate': est,
            'target_months': t_months,
            'recommended': rec,
            'recommended_amount': rec,
            'monthsCovered': runway,
            'runway_months': runway,
            'percentComplete': pct,
            'shortfall': shortfall,
            'surplus': surplus,
        }

class EmergencyFundContribution(db.Model):
    __tablename__ = 'emergency_fund_contributions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    fund_id = db.Column(db.String(36), db.ForeignKey('emergency_fund.id'), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    date = db.Column(db.DateTime, default=get_ist_now)

    fund = db.relationship('EmergencyFund', back_populates='contributions')

    def to_dict(self):
        return {
            'id': self.id,
            'amount': float(self.amount),
            'date': self.date.strftime('%d %b %Y'),
        }
