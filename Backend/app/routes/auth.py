import re
from datetime import datetime, timezone
from app.utils.timezone import get_ist_now
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt_identity
from sqlalchemy import func
from app import db
from app.models.user import User
from app.models.emergency_fund import EmergencyFund
from app.models.budget import Budget
from app.models.semester_budget import SemesterBudget
from app.models.ai_insight import AIInsight
from app.utils.auth import require_auth, get_current_user, success_response, error_response

auth_bp = Blueprint('auth', __name__)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

@auth_bp.route('/check-email', methods=['GET'])
def check_email():
    """Real-time endpoint to verify if an email is available for registration"""
    email = request.args.get('email', '').strip().lower()
    if not email:
        return error_response('Email parameter is required', 'VALIDATION_ERROR', status=400)
    
    if not EMAIL_REGEX.match(email):
        return error_response('Invalid email format', 'VALIDATION_ERROR', fields={'email': 'Invalid email format'}, status=400)
    
    existing = User.query.filter(func.lower(User.email) == email).first()
    return success_response({
        'email': email,
        'available': existing is None
    })

@auth_bp.route('/register', methods=['POST'])
@auth_bp.route('/signup', methods=['POST'])
def register():
    """Register a new user account with full initialization logic"""
    data = request.get_json()
    if not data:
        return error_response('Request body required', 'INVALID_REQUEST', status=400)
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'student').strip().lower()
    
    # Field validation
    fields_errors = {}
    if not name:
        fields_errors['name'] = 'Full name is required'
    elif len(name) < 2:
        fields_errors['name'] = 'Name must be at least 2 characters long'
    elif len(name) > 100:
        fields_errors['name'] = 'Name cannot exceed 100 characters'
        
    if not email:
        fields_errors['email'] = 'Email address is required'
    elif not EMAIL_REGEX.match(email):
        fields_errors['email'] = 'Please enter a valid email address'
        
    if not password:
        fields_errors['password'] = 'Password is required'
    elif len(password) < 6:
        fields_errors['password'] = 'Password must be at least 6 characters long'
    elif len(password) > 128:
        fields_errors['password'] = 'Password cannot exceed 128 characters'
        
    if role not in ('student', 'professional'):
        fields_errors['role'] = "Role must be either 'student' or 'professional'"
        
    if fields_errors:
        return error_response(
            'Validation failed: Please check the highlighted fields',
            'VALIDATION_ERROR',
            fields=fields_errors,
            status=400
        )
    
    # Check if email is already taken
    existing = User.query.filter(func.lower(User.email) == email).first()
    if existing:
        return error_response(
            'An account with this email is already registered',
            'CONFLICT',
            fields={'email': 'Email is already registered'},
            status=409
        )
        
    # Determine initial allowance / income
    custom_allowance = data.get('monthly_allowance')
    if custom_allowance is not None:
        try:
            monthly_allowance = max(0.0, float(custom_allowance))
        except (TypeError, ValueError):
            monthly_allowance = 30000.0 if role == 'student' else 85000.0
    else:
        monthly_allowance = 30000.0 if role == 'student' else 85000.0
        
    try:
        # Create user record
        user = User(
            name=name,
            email=email,
            initials=User.generate_initials(name),
            role=role,
            monthly_allowance=monthly_allowance
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()  # Populates user.id
        
        # Initialize emergency fund
        ef_estimate = 15000.0 if role == 'student' else 35000.0
        emergency_fund = EmergencyFund(
            user_id=user.id,
            current_amount=0.0,
            monthly_expense_estimate=ef_estimate
        )
        db.session.add(emergency_fund)
        
        now = get_ist_now()
        
        # Initialize starter budgets for the current month
        if role == 'student':
            starter_budgets = [
                ('Food', 6000.0, '#7BE2BE'),
                ('Travel', 2500.0, '#a9dced'),
                ('Education', 3500.0, '#a29bf4'),
                ('Entertainment', 2000.0, '#f6ae8e'),
            ]
            # Initialize current semester budget for student
            semester_budget = SemesterBudget(
                user_id=user.id,
                month=now.month,
                year=now.year,
                budget=monthly_allowance,
                status='active'
            )
            db.session.add(semester_budget)
        else:
            starter_budgets = [
                ('Food', 20000.0, '#7BE2BE'),
                ('Bills', 15000.0, '#a29bf4'),
                ('Travel', 10000.0, '#f6ae8e'),
                ('Entertainment', 5000.0, '#a9dced'),
                ('Other', 5000.0, '#ed9b76'),
            ]
            
        for category, limit, color in starter_budgets:
            b = Budget(
                user_id=user.id,
                category=category,
                limit_amount=limit,
                color=color,
                month=now.month,
                year=now.year
            )
            db.session.add(b)
            
        # Initialize welcome AI insight
        welcome_insight = AIInsight(
            user_id=user.id,
            headline=f"Welcome to your financial workspace, {user.name}!",
            description="Your account has been fully configured. Start logging transactions, tracking category limits, or scanning receipts with AI to gain actionable financial intelligence.",
            source_period=now.strftime('%B %Y')
        )
        db.session.add(welcome_insight)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response(f'Failed to register account: {str(e)}', 'DATABASE_ERROR', status=500)
        
    additional_claims = {
        'role': user.role,
        'email': user.email,
        'name': user.name
    }
    token = create_access_token(identity=user.id, additional_claims=additional_claims)
    
    return success_response({
        'token': token,
        'user': user.to_dict()
    }, message='Account created successfully', status=201)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate an existing user and return a JWT access token"""
    data = request.get_json()
    if not data:
        return error_response('Request body required', 'INVALID_REQUEST', status=400)
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return error_response(
            'Email and password are required',
            'VALIDATION_ERROR',
            fields={
                'email': 'Email is required' if not email else None,
                'password': 'Password is required' if not password else None
            },
            status=400
        )
    
    user = User.query.filter(func.lower(User.email) == email).first()
    
    if not user or not user.check_password(password):
        return error_response('Invalid email or password', 'INVALID_CREDENTIALS', status=401)
    
    additional_claims = {
        'role': user.role,
        'email': user.email,
        'name': user.name
    }
    token = create_access_token(identity=user.id, additional_claims=additional_claims)
    
    return success_response({
        'token': token,
        'user': user.to_dict()
    }, message='Logged in successfully')

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout current user session"""
    return success_response(message='Logged out successfully')

@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    """Get authenticated user profile"""
    user = get_current_user()
    if not user:
        return error_response('User not found', 'NOT_FOUND', status=404)
    return success_response(user.to_dict())

@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change current user's password"""
    user = get_current_user()
    data = request.get_json() or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return error_response('Current password and new password are required', 'VALIDATION_ERROR', status=400)
    
    if not user.check_password(current_password):
        return error_response('Current password is incorrect', 'INVALID_CREDENTIALS', status=400)
    
    if len(new_password) < 6:
        return error_response('New password must be at least 6 characters long', 'VALIDATION_ERROR', status=400)
        
    user.set_password(new_password)
    db.session.commit()
    return success_response(message='Password updated successfully')
