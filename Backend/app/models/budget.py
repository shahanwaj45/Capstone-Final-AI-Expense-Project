import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    limit_amount = db.Column(db.Numeric(12, 2), nullable=False)
    color = db.Column(db.String(20), default='#7BE2BE')
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='budgets')

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'limit_amount': float(self.limit_amount),
            'value': f"₹{float(self.limit_amount):,.0f}",
            'color': self.color,
            'month': self.month,
            'year': self.year,
        }
