from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    
    from app.config import config
    app.config.from_object(config.get(config_name, config['default']))
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'receipts'), exist_ok=True)
    
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}}, supports_credentials=True)

    with app.app_context():
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            if 'transactions' in inspector.get_table_names():
                cols = [c['name'] for c in inspector.get_columns('transactions')]
                if 'receipt_url' not in cols:
                    with db.engine.connect() as conn:
                        conn.execute(text("ALTER TABLE transactions ADD COLUMN receipt_url VARCHAR(500)"))
                        conn.commit()
        except Exception:
            pass
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.transactions import transactions_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.budgets import budgets_bp
    from app.routes.savings import savings_bp
    from app.routes.emergency import emergency_bp
    from app.routes.subscriptions import subscriptions_bp
    from app.routes.income import income_bp
    from app.routes.projects import projects_bp
    from app.routes.semester import semester_bp
    from app.routes.analytics import analytics_bp
    from app.routes.insights import insights_bp
    from app.routes.predictions import predictions_bp
    from app.routes.receipts import receipts_bp
    from app.routes.voice import voice_bp
    from app.routes.reports import reports_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(transactions_bp, url_prefix='/api/transactions')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(budgets_bp, url_prefix='/api/budgets')
    app.register_blueprint(savings_bp, url_prefix='/api/savings-goals')
    app.register_blueprint(emergency_bp, url_prefix='/api/emergency-fund')
    app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')
    app.register_blueprint(income_bp, url_prefix='/api/income')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(semester_bp, url_prefix='/api/semester-budget')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(insights_bp, url_prefix='/api/insights')
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(receipts_bp, url_prefix='/api/receipts')
    app.register_blueprint(voice_bp, url_prefix='/api/voice')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    
    # Health check
    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'version': '1.0.0'}
    
    return app
