import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app, db

app = create_app(os.environ.get('FLASK_ENV', 'development'))

if __name__ == '__main__':
    with app.app_context():
        # Import all models so SQLAlchemy knows about them
        from app.models.user import User
        from app.models.transaction import Transaction
        from app.models.budget import Budget
        from app.models.savings_goal import SavingsGoal
        from app.models.emergency_fund import EmergencyFund, EmergencyFundContribution
        from app.models.subscription import Subscription
        from app.models.income_source import IncomeSource
        from app.models.project import Project, ProjectExpense
        from app.models.semester_budget import SemesterBudget
        from app.models.ai_insight import AIInsight
        from app.models.notification import Notification
        
        db.create_all()
        print("Database tables created.")
    
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Flask backend on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
