import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now, get_ist_today

class IncomeSource(db.Model):
    __tablename__ = 'income_sources'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    source = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    type = db.Column(db.String(20), default='fixed')  # fixed, variable, passive
    date_received = db.Column(db.Date, default=get_ist_today)
    color = db.Column(db.String(20), default='#7BE2BE')
    is_recurring = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='income_sources')

    def to_dict(self):
        return {
            'id': self.id,
            'source': self.source,
            'amount': f"₹{float(self.amount):,.0f}",
            'amount_raw': float(self.amount),
            'type': self.type,
            'date': self.date_received.strftime('%dth %b') if self.date_received else None,
            'color': self.color,
            'is_recurring': self.is_recurring,
        }
