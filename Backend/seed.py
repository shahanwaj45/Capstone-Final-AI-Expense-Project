"""
Seed script: Complete database wipe and dual-persona seed generation.
Implements:
- Clean database wipe (db.drop_all(), db.create_all())
- Persona A: student@test.com / student123 (Role: student, collegiate datasets)
- Persona B: prof@test.com / prof123 (Role: professional, corporate datasets)
- 6+ consecutive calendar months of historical data (N >= 6) for Tier 3 OLS Regression.
"""
import os
import sys
import calendar
from datetime import datetime, date, timedelta
from app.utils.timezone import get_ist_now

from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction, CATEGORY_COLORS
from app.models.budget import Budget
from app.models.savings_goal import SavingsGoal
from app.models.emergency_fund import EmergencyFund, EmergencyFundContribution
from app.models.subscription import Subscription
from app.models.income_source import IncomeSource
from app.models.project import Project, ProjectExpense
from app.models.semester_budget import SemesterBudget
from app.models.ai_insight import AIInsight
from app.models.notification import Notification

app = create_app('development')

STUDENT_EMAIL = 'student@test.com'
STUDENT_PASS = 'student123'
PROFESSIONAL_EMAIL = 'prof@test.com'
PROFESSIONAL_PASS = 'prof123'

def reset_database():
    """Completely wipe and recreate all database tables."""
    print("[DB] Dropping all tables...")
    db.drop_all()
    print("[DB] Creating all tables afresh...")
    db.create_all()
    print("[DB] Zero-state database initialized successfully.")

def get_historical_months(num_months=7):
    """
    Returns a list of (year, month) tuples starting from num_months ago up to current month.
    Ensures at least 6 consecutive historical months (N >= 6) for OLS Linear Regression.
    """
    now = get_ist_now()
    months = []
    for i in range(num_months - 1, -1, -1):
        # Subtract months
        total_months = now.year * 12 + (now.month - 1) - i
        y = total_months // 12
        m = (total_months % 12) + 1
        months.append((y, m))
    return months

def seed_persona_student():
    """
    Persona A (student@test.com / student123 | Role: student)
    - Monthly Allowance: Rs. 11,500
    - Tables: users, transactions, budgets, savings_goals, semester_budgets, projects
    - Explicitly empty subscriptions and income_sources to maintain collegiate identity.
    """
    print(f"[SEED] Generating Persona A: Student ({STUDENT_EMAIL})...")
    student = User(
        id='persona-student-001',
        email=STUDENT_EMAIL,
        name='Aarav Rao',
        initials='AR',
        role='student',
        monthly_allowance=11500.0,
    )
    student.set_password(STUDENT_PASS)
    db.session.add(student)
    db.session.flush()

    historical_months = get_historical_months(7)
    now = get_ist_now()

    # Realistic collegiate monthly expense patterns
    # (name, category, amount, day_of_month, payment_method)
    student_pattern = [
        ("Campus Canteen Breakfast", "Food", 85.0, 2, "UPI"),
        ("Metro Pass Monthly Recharge", "Transit", 650.0, 3, "UPI"),
        ("Engineering Mathematics Textbook", "Academic Books", 750.0, 5, "UPI"),
        ("Chai & Samosa with Study Group", "Food", 110.0, 7, "Cash"),
        ("Printouts & Lab Manual Xerox", "Academic Books", 180.0, 9, "Cash"),
        ("South Indian Thali Lunch", "Food", 140.0, 11, "UPI"),
        ("Shared Auto to College", "Transit", 60.0, 13, "Cash"),
        ("Library Notebooks & Pens", "Academic Books", 220.0, 15, "UPI"),
        ("Campus Canteen Lunch", "Food", 120.0, 17, "UPI"),
        ("Weekend Movie & Snacks", "Entertainment", 450.0, 19, "UPI"),
        ("Shared Cab with Roommates", "Transit", 180.0, 21, "UPI"),
        ("Hostel Late-Night Maggi & Chai", "Food", 95.0, 23, "Cash"),
        ("Assignment Binding & Plotter Print", "Academic Books", 240.0, 25, "UPI"),
        ("College Fest Pass / Group Outing", "Entertainment", 500.0, 27, "UPI"),
    ]

    for y, m in historical_months:
        days_in_m = calendar.monthrange(y, m)[1]
        is_current_month = (y == now.year and m == now.month)
        
        # Allowance inflow on 1st of month
        allowance_dt = datetime(y, m, 1, 9, 0, 0)
        db.session.add(Transaction(
            user_id=student.id,
            type='income',
            name='Monthly Allowance',
            amount=11500.0,
            category='Allowance',
            payment_method='Bank',
            date=allowance_dt,
            color='#7BE2BE'
        ))

        # Seed monthly expense transactions
        for name, cat, base_amt, day, pmethod in student_pattern:
            if is_current_month and day > now.day:
                continue
            actual_day = min(day, days_in_m)
            # Slight non-random variation per month
            month_multiplier = 1.0 + ((m % 4) * 0.03) - 0.04
            amt = round(base_amt * month_multiplier, 0)
            
            tx_dt = datetime(y, m, actual_day, 13, (day * 3) % 60, 0)
            db.session.add(Transaction(
                user_id=student.id,
                type='expense',
                name=name,
                amount=amt,
                category=cat,
                payment_method=pmethod,
                date=tx_dt,
                color=CATEGORY_COLORS.get(cat, '#a9dced')
            ))

    # Budgets for student
    student_budgets = [
        ("Food", 4500.0, "#7BE2BE"),
        ("Academic Books", 2800.0, "#a9dced"),
        ("Transit", 1800.0, "#a29bf4"),
        ("Entertainment", 1500.0, "#f6ae8e"),
    ]
    for cat, limit, color in student_budgets:
        db.session.add(Budget(
            user_id=student.id,
            category=cat,
            limit_amount=limit,
            color=color,
            month=now.month,
            year=now.year
        ))

    # Savings Goals
    student_goals = [
        ("New Coding Laptop", 65000.0, 38500.0),
        ("Tech Certification", 15000.0, 9200.0),
    ]
    for name, target, current in student_goals:
        db.session.add(SavingsGoal(
            user_id=student.id,
            name=name,
            target_amount=target,
            current_amount=current
        ))

    # Semester Budgets (All 6 months of current collegiate semester)
    term_months = range(7, 13) if now.month > 6 else range(1, 7)
    for m in term_months:
        if m < now.month:
            status = "complete"
        elif m == now.month:
            status = "active"
        else:
            status = "upcoming"
        db.session.add(SemesterBudget(
            user_id=student.id,
            month=m,
            year=now.year,
            budget=11500.0,
            status=status
        ))


    # Projects: IoT Capstone and Robotics Kit
    p1 = Project(user_id=student.id, name="IoT Capstone Project", budget=12000.0)
    db.session.add(p1)
    db.session.flush()
    p1_expenses = [
        ("Raspberry Pi 4 & Sensor Pack", 4800.0),
        ("Custom PCB Fabrication & Assembly", 2200.0),
        ("3D Printed Enclosure & Connectors", 1100.0),
        ("Cloud Server Testing Credits", 950.0),
    ]
    for ename, eamt in p1_expenses:
        db.session.add(ProjectExpense(project_id=p1.id, name=ename, amount=eamt))

    p2 = Project(user_id=student.id, name="Robotics Kit Split", budget=8000.0)
    db.session.add(p2)
    db.session.flush()
    p2_expenses = [
        ("Motor Drivers & Steppers", 2600.0),
        ("LiPo Battery Packs & Charger", 1950.0),
        ("Aluminum Chassis Kit", 1750.0),
    ]
    for ename, eamt in p2_expenses:
        db.session.add(ProjectExpense(project_id=p2.id, name=ename, amount=eamt))

    # Collegiate Subscriptions
    student_subs = [
        ("Spotify Student Plan", 59.0, "Monthly", now.date() + timedelta(days=2)),
        ("LeetCode Prep Annual", 1499.0, "Yearly", now.date() + timedelta(days=5)),
        ("GitHub Copilot Student", 490.0, "Monthly", now.date() + timedelta(days=18)),
    ]
    for sname, samt, scycle, sdate in student_subs:
        db.session.add(Subscription(
            user_id=student.id,
            name=sname,
            amount=samt,
            cycle=scycle,
            next_billing_date=sdate,
            is_active=True
        ))

    # Primary Student AI Insight
    db.session.add(AIInsight(
        user_id=student.id,
        headline="Transit spending is well optimized this semester.",
        description="Your monthly transit expenditure is ₹1,120 against an allocated ₹1,800 limit. Channeling the remaining ₹680 surplus into your Coding Laptop savings goal will accelerate target achievement by 2 months.",
        source_period=now.strftime('%B %Y')
    ))

    print("[SEED] Persona A seeded with 7 consecutive months of collegiate data.")

def seed_persona_professional():
    """
    Persona B (prof@test.com / prof123 | Role: professional)
    - Monthly Inflow: Fixed Salary (Rs. 85,000), Freelance (Rs. 25,000), Dividends (Rs. 5,000) mapped in income_sources
    - Tables: users, transactions, budgets, subscriptions, emergency_funds, income_sources, savings_goals
    - Explicitly exclude collegiate tables (semester_budgets, projects).
    """
    print(f"[SEED] Generating Persona B: Professional ({PROFESSIONAL_EMAIL})...")
    prof = User(
        id='persona-prof-001',
        email=PROFESSIONAL_EMAIL,
        name='Vikram Malhotra',
        initials='VM',
        role='professional',
        monthly_allowance=115000.0,
    )
    prof.set_password(PROFESSIONAL_PASS)
    db.session.add(prof)
    db.session.flush()

    historical_months = get_historical_months(7)
    now = get_ist_now()

    # Recurring Income Sources mapped in income_sources table
    income_items = [
        ("Fixed Salary", 85000.0, "fixed", "#7BE2BE"),
        ("Freelance Consulting", 25000.0, "variable", "#a29bf4"),
        ("Passive Dividends", 5000.0, "passive", "#a9dced"),
    ]
    for src, amt, stype, color in income_items:
        db.session.add(IncomeSource(
            user_id=prof.id,
            source=src,
            amount=amt,
            type=stype,
            color=color,
            date_received=date(now.year, now.month, 1),
            is_recurring=True
        ))

    # Professional Monthly Expenses Pattern
    prof_pattern = [
        ("Mortgage / Apartment Maintenance", "Housing", 32000.0, 2, "NetBanking"),
        ("Gourmet Groceries & Organic Pantry", "Groceries", 7200.0, 4, "Card"),
        ("Shell Fuel Station Fill-up", "Travel", 3800.0, 6, "Card"),
        ("High-Speed Fiber & Cloud Utilities", "Bills", 2400.0, 8, "UPI"),
        ("Fine Dining & Weekend Bistro", "Food", 3200.0, 10, "Card"),
        ("Organic Supermarket Weekly Stock", "Groceries", 5400.0, 13, "Card"),
        ("Electricity & Smart Meter Bill", "Bills", 3100.0, 16, "UPI"),
        ("Mutual Fund Systematic Investment Plan", "Investments", 15000.0, 18, "NetBanking"),
        ("Cab to Airport & Travel", "Travel", 1650.0, 20, "UPI"),
        ("Dinner with Corporate Clients", "Food", 2900.0, 23, "Card"),
        ("Mid-month Household Supplies", "Groceries", 3600.0, 26, "UPI"),
    ]

    for y, m in historical_months:
        days_in_m = calendar.monthrange(y, m)[1]
        is_current_month = (y == now.year and m == now.month)

        # Monthly income transactions for financial velocity & history
        db.session.add(Transaction(
            user_id=prof.id,
            type='income',
            name='Tech Lead Salary Inflow',
            amount=85000.0,
            category='Salary',
            payment_method='Bank',
            date=datetime(y, m, 1, 9, 30, 0),
            color='#7BE2BE'
        ))
        db.session.add(Transaction(
            user_id=prof.id,
            type='income',
            name='Freelance Advisory Retainer',
            amount=25000.0,
            category='Freelance',
            payment_method='Bank',
            date=datetime(y, m, 5, 11, 0, 0),
            color='#a29bf4'
        ))
        db.session.add(Transaction(
            user_id=prof.id,
            type='income',
            name='Index Fund Quarterly Dividend',
            amount=5000.0,
            category='Dividends',
            payment_method='Bank',
            date=datetime(y, m, 10, 14, 0, 0),
            color='#a9dced'
        ))

        # Monthly expense transactions
        for name, cat, base_amt, day, pmethod in prof_pattern:
            if is_current_month and day > now.day:
                continue
            actual_day = min(day, days_in_m)
            # Consistent, realistic expenditure with gentle trend
            growth_trend = 1.0 + ((m % 5) * 0.02) - 0.03
            amt = round(base_amt * growth_trend, 0)
            
            tx_dt = datetime(y, m, actual_day, 19, (day * 4) % 60, 0)
            db.session.add(Transaction(
                user_id=prof.id,
                type='expense',
                name=name,
                amount=amt,
                category=cat,
                payment_method=pmethod,
                date=tx_dt,
                color=CATEGORY_COLORS.get(cat, '#7BE2BE')
            ))

    # Budgets for Professional
    prof_budgets = [
        ("Housing", 35000.0, "#7BE2BE"),
        ("Groceries", 18000.0, "#a9dced"),
        ("Investments", 25000.0, "#695db3"),
        ("Bills", 8000.0, "#f6ae8e"),
        ("Travel", 8000.0, "#a29bf4"),
        ("Food", 10000.0, "#ffb0c8"),
    ]
    for cat, limit, color in prof_budgets:
        db.session.add(Budget(
            user_id=prof.id,
            category=cat,
            limit_amount=limit,
            color=color,
            month=now.month,
            year=now.year
        ))

    # Subscriptions (AWS Cloud, GitHub Copilot, Netflix, Spotify, Gym)
    next_month = now.month % 12 + 1
    next_year = now.year if next_month > 1 else now.year + 1
    subs = [
        ("AWS Cloud Infrastructure", 1850.0, "Monthly", date(now.year, now.month, min(now.day + 2, 28)), "#f6ae8e"),
        ("GitHub Copilot Enterprise", 950.0, "Monthly", date(next_year, next_month, 10), "#695db3"),
        ("Netflix Premium 4K", 649.0, "Monthly", date(next_year, next_month, 14), "#e98b68"),
        ("Spotify Premium Family", 179.0, "Monthly", date(next_year, next_month, 22), "#4caf89"),
        ("Cult Fit Platinum Gym", 2500.0, "Monthly", date(now.year, now.month, min(now.day + 1, 28)), "#55a9bc"),
    ]
    for name, amt, cycle, next_bill, color in subs:
        db.session.add(Subscription(
            user_id=prof.id,
            name=name,
            amount=amt,
            cycle=cycle,
            next_billing_date=next_bill,
            color=color,
            is_active=True
        ))

    # Emergency Fund: monthly_expense_estimate: 45000, current_amount: 180000, target_months: 6
    ef = EmergencyFund(
        user_id=prof.id,
        current_amount=180000.0,
        monthly_expense_estimate=45000.0
    )
    db.session.add(ef)
    db.session.flush()

    # Historical contributions to the emergency fund
    for days_ago, amt in [(120, 45000.0), (90, 45000.0), (60, 45000.0), (30, 45000.0)]:
        db.session.add(EmergencyFundContribution(
            fund_id=ef.id,
            amount=amt,
            date=now - timedelta(days=days_ago)
        ))

    # Savings Goal: High-yield Index Portfolio
    db.session.add(SavingsGoal(
        user_id=prof.id,
        name="Long-Term Index Portfolio",
        target_amount=1000000.0,
        current_amount=480000.0
    ))

    # Primary Professional AI Insight
    db.session.add(AIInsight(
        user_id=prof.id,
        headline="Emergency reserve at 4.0 months runway.",
        description="Your emergency fund balance stands at ₹180,000 against a 6-month safety target of ₹270,000 (₹45,000/mo estimate). Allocating ₹30,000 from this month's freelance surplus will fully achieve your target runway in 3 months.",
        source_period=now.strftime('%B %Y')
    ))

    print("[SEED] Persona B seeded with 7 consecutive months of corporate data.")

def main():
    print("=" * 60)
    print("AI Expense Tracker — Clean Database Wipe & Seed Generator")
    print("=" * 60)
    with app.app_context():
        reset_database()
        seed_persona_student()
        seed_persona_professional()
        db.session.commit()
        print("\n" + "=" * 60)
        print("SEEDING COMPLETE!")
        print(f"Persona A (Student):      {STUDENT_EMAIL} / {STUDENT_PASS}")
        print(f"Persona B (Professional): {PROFESSIONAL_EMAIL} / {PROFESSIONAL_PASS}")
        print("Historical depth: 7 consecutive calendar months seeded.")
        print("=" * 60)

if __name__ == '__main__':
    main()
