import uuid
from datetime import datetime
from app import db

CATEGORY_COLORS = {
    'Food': 'coral',
    'Travel': 'cyan',
    'Education': 'violet',
    'Entertainment': 'blue',
    'Bills': 'blue',
    'Health': 'mint',
    'Shopping': 'violet',
    'Subscription': 'violet',
    'Income': 'mint',
    'Allowance': 'mint',
    'Pocket Money': 'mint',
    'Salary': 'mint',
    'Freelance': 'mint',
    'Gift': 'mint',
    'Stipend': 'mint',
    'Investment': 'mint',
    'Refund': 'mint',
    'Other': 'gray',
}

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False, default='expense')  # 'expense' or 'income'
    name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    category = db.Column(db.String(100), nullable=False, default='Other')
    payment_method = db.Column(db.String(50), default='UPI')
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    color = db.Column(db.String(20), default='coral')
    notes = db.Column(db.Text)
    receipt_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='transactions')

    def to_dict(self):
        amount_val = float(self.amount)
        if self.type == 'expense':
            formatted_amount = f"−₹{amount_val:,.0f}"
        else:
            formatted_amount = f"+₹{amount_val:,.0f}"
        
        now = datetime.utcnow()
        t_date = self.date
        if t_date.date() == now.date():
            date_str = f"Today, {t_date.strftime('%I:%M %p')}"
        elif (now.date() - t_date.date()).days == 1:
            date_str = f"Yesterday, {t_date.strftime('%I:%M %p')}"
        else:
            date_str = t_date.strftime('%d %b, %I:%M %p')

        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'amount': formatted_amount,
            'amount_raw': float(self.amount),
            'category': self.category,
            'payment_method': self.payment_method,
            'date': date_str,
            'date_raw': self.date.isoformat(),
            'color': CATEGORY_COLORS.get(self.category, 'coral'),
            'notes': self.notes,
            'receipt_url': self.receipt_url,
        }
