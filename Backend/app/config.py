import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///expense_tracker.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'webp'}
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
    AI_PROVIDER = os.environ.get('AI_PROVIDER', 'gemini')
    AI_MODEL = os.environ.get('AI_MODEL', 'gemini-3.8-flash')
    cors_env = os.environ.get('CORS_ORIGINS', '')
    if cors_env:
        CORS_ORIGINS = [orig.strip() for orig in cors_env.split(',') if orig.strip()]
    else:
        CORS_ORIGINS = [
            r'http://localhost(:\d+)?',
            r'http://127\.0\.0\.1(:\d+)?',
            r'http://192\.168\.\d+\.\d+(:\d+)?',
            r'http://10\.\d+\.\d+\.\d+(:\d+)?',
            r'https?://.*',
        ]

class DevelopmentConfig(Config):
    DEBUG = True

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
