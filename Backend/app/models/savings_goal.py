import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class SavingsGoal(db.Model):
    __tablename__ = 'savings_goals'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    target_amount = db.Column(db.Numeric(12, 2), nullable=False)
    current_amount = db.Column(db.Numeric(12, 2), default=0)
    deadline = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='savings_goals')

    @property
    def percent_complete(self):
        if float(self.target_amount) == 0:
            return 0
        return min(100, round(float(self.current_amount) / float(self.target_amount) * 100))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'current': float(self.current_amount),
            'target': float(self.target_amount),
            'current_amount': float(self.current_amount),
            'target_amount': float(self.target_amount),
            'percentComplete': self.percent_complete,
            'deadline': self.deadline.isoformat() if self.deadline else None,
        }
