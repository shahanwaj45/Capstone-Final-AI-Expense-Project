import pytest
from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.savings_goal import SavingsGoal
from app.models.emergency_fund import EmergencyFund
from app.models.subscription import Subscription
from app.models.income_source import IncomeSource
from datetime import datetime, timezone, date
from app.utils.timezone import get_ist_now

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        now = get_ist_now()
        
        # Create test student
        student = User(
            id='test-student-1',
            email='student@test.com',
            name='Test Student',
            initials='TS',
            role='student',
            monthly_allowance=30000.0
        )
        student.set_password('student123')
        db.session.add(student)

        # Create test professional
        prof = User(
            id='test-prof-1',
            email='prof@test.com',
            name='Test Professional',
            initials='TP',
            role='professional',
            monthly_allowance=103200.0
        )
        prof.set_password('prof123')
        db.session.add(prof)

        # Add test transactions for student
        db.session.add(Transaction(
            user_id='test-student-1',
            name='Lunch at Cafe',
            amount=250.0,
            type='expense',
            category='Food',
            payment_method='UPI',
            date=now
        ))
        db.session.add(Transaction(
            user_id='test-student-1',
            name='Monthly Allowance',
            amount=30000.0,
            type='income',
            category='Allowance',
            payment_method='Bank',
            date=now
        ))

        # Add budget for student
        db.session.add(Budget(
            user_id='test-student-1',
            category='Food',
            limit_amount=5000.0,
            month=now.month,
            year=now.year,
            color='#7BE2BE'
        ))

        # Add savings goal for student
        db.session.add(SavingsGoal(
            user_id='test-student-1',
            name='New Laptop',
            target_amount=50000.0,
            current_amount=34000.0
        ))

        # Add emergency fund for student
        db.session.add(EmergencyFund(
            user_id='test-student-1',
            monthly_expense_estimate=10000.0,
            current_amount=15000.0
        ))

        # Add subscription for professional
        db.session.add(Subscription(
            user_id='test-prof-1',
            name='Netflix',
            amount=649.0,
            cycle='Monthly',
            color='#e98b68'
        ))

        # Add income for professional
        db.session.add(IncomeSource(
            user_id='test-prof-1',
            source='Salary',
            amount=85000.0,
            type='fixed',
            date_received=now.date(),
            color='#7BE2BE'
        ))

        db.session.commit()

        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def student_auth_headers(client):
    res = client.post('/api/auth/login', json={
        'email': 'student@test.com',
        'password': 'student123'
    })
    token = res.get_json()['data']['token']
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def prof_auth_headers(client):
    res = client.post('/api/auth/login', json={
        'email': 'prof@test.com',
        'password': 'prof123'
    })
    token = res.get_json()['data']['token']
    return {'Authorization': f'Bearer {token}'}
