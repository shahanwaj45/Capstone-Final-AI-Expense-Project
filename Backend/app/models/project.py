import uuid
from datetime import datetime
from app import db

from app.utils.timezone import get_ist_now

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    budget = db.Column(db.Numeric(12, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    user = db.relationship('User', back_populates='projects')
    expenses = db.relationship('ProjectExpense', back_populates='project', lazy='dynamic', cascade='all, delete-orphan')

    @property
    def spent(self):
        return sum(float(e.amount) for e in self.expenses)

    @property
    def items_count(self):
        return self.expenses.count()

    def to_dict(self):
        budget_val = float(self.budget)
        spent_val = self.spent
        pct = round(spent_val / budget_val * 100) if budget_val > 0 else 0
        return {
            'id': self.id,
            'name': self.name,
            'budget': budget_val,
            'spent': spent_val,
            'items': self.items_count,
            'percent': pct,
            'remaining': budget_val - spent_val,
        }

class ProjectExpense(db.Model):
    __tablename__ = 'project_expenses'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    date = db.Column(db.DateTime, default=get_ist_now)

    project = db.relationship('Project', back_populates='expenses')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'amount': float(self.amount),
            'date': self.date.isoformat() if self.date else None,
        }
