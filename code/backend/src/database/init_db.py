"""
Database initialization script for BlockGuardian Backend
Sets up database schema, creates initial data, and configures indexes
"""

import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from sqlalchemy import text
from src.config import get_config
from src.logging_config import get_logger
from src.models.ai_models import AIModel, ModelStatus, ModelType
from src.models.base import Base, db_manager
from src.models.portfolio import Asset, AssetType, Portfolio, PortfolioType, RiskLevel
from src.models.user import AMLRiskLevel, KYCStatus, User, UserRole, UserStatus, db
from src.security.auth import auth_manager

logger = get_logger(__name__)


def create_database_schema() -> Any:
    """Create all database tables"""
    try:
        Base.metadata.create_all(db_manager.engine)
        logging.info("Database schema created successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to create database schema: {str(e)}")
        return False


def create_indexes() -> None:
    """Create additional database indexes for performance"""
    try:
        with db_manager.engine.connect() as conn:
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_users_email_status ON users(email, status)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_portfolios_owner_active ON portfolios(owner_id, is_active)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_portfolios_type_status ON portfolios(portfolio_type, is_active)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date ON transactions(portfolio_id, created_at)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_transactions_status_type ON transactions(status, transaction_type)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_assets_symbol_active ON assets(symbol, is_active)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_assets_type_tradeable ON assets(asset_type, is_tradeable)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_active ON portfolio_holdings(portfolio_id, is_active)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_holdings_asset_active ON portfolio_holdings(asset_id, is_active)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_ai_models_type_status ON ai_models(model_type, status)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_predictions_model_timestamp ON model_predictions(model_id, prediction_timestamp)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_fraud_user_timestamp ON fraud_detections(user_id, created_at)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_fraud_risk_level ON fraud_detections(risk_level)"
                )
            )
            conn.commit()
        logging.info("Database indexes created successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to create database indexes: {str(e)}")
        return False


def create_admin_user() -> Any:
    """Create default admin user"""
    try:
        session = db_manager.get_session()
        admin_user = (
            session.query(User).filter(User.email == "admin@blockguardian.com").first()
        )
        if not admin_user:
            admin_user = User(
                email="admin@blockguardian.com",
                username="admin",
                first_name="System",
                last_name="Administrator",
                status=UserStatus.ACTIVE,
                role=UserRole.ADMIN,
                kyc_status=KYCStatus.APPROVED,
                aml_risk_level=AMLRiskLevel.LOW,
                country="US",
            )
            admin_user.set_password("AdminPassword123!")
            admin_user.kyc_approved_at = datetime.now(timezone.utc)
            admin_user.kyc_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            session.add(admin_user)
            session.commit()
            logging.info("Admin user created successfully")
        else:
            logging.info("Admin user already exists")
        session.close()
        return True
    except Exception as e:
        logging.error(f"Failed to create admin user: {str(e)}")
        return False


def create_sample_assets() -> None:
    """Create sample assets for testing"""
    try:
        session = db_manager.get_session()
        sample_assets = [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "asset_type": AssetType.STOCK,
                "sector": "Technology",
                "industry": "Consumer Electronics",
                "country": "US",
                "currency": "USD",
                "exchange": "NASDAQ",
                "current_price": Decimal("150.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "GOOGL",
                "name": "Alphabet Inc.",
                "asset_type": AssetType.STOCK,
                "sector": "Technology",
                "industry": "Internet Services",
                "country": "US",
                "currency": "USD",
                "exchange": "NASDAQ",
                "current_price": Decimal("2500.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "MSFT",
                "name": "Microsoft Corporation",
                "asset_type": AssetType.STOCK,
                "sector": "Technology",
                "industry": "Software",
                "country": "US",
                "currency": "USD",
                "exchange": "NASDAQ",
                "current_price": Decimal("300.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "BTC",
                "name": "Bitcoin",
                "asset_type": AssetType.CRYPTOCURRENCY,
                "sector": "Cryptocurrency",
                "industry": "Digital Currency",
                "country": "Global",
                "currency": "USD",
                "exchange": "Multiple",
                "current_price": Decimal("45000.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "ETH",
                "name": "Ethereum",
                "asset_type": AssetType.CRYPTOCURRENCY,
                "sector": "Cryptocurrency",
                "industry": "Smart Contracts",
                "country": "Global",
                "currency": "USD",
                "exchange": "Multiple",
                "current_price": Decimal("3000.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "SPY",
                "name": "SPDR S&P 500 ETF Trust",
                "asset_type": AssetType.ETF,
                "sector": "Diversified",
                "industry": "Index Fund",
                "country": "US",
                "currency": "USD",
                "exchange": "NYSE",
                "current_price": Decimal("400.00"),
                "is_tradeable": True,
            },
            {
                "symbol": "GLD",
                "name": "SPDR Gold Shares",
                "asset_type": AssetType.COMMODITY,
                "sector": "Precious Metals",
                "industry": "Gold",
                "country": "Global",
                "currency": "USD",
                "exchange": "NYSE",
                "current_price": Decimal("180.00"),
                "is_tradeable": True,
            },
        ]
        for asset_data in sample_assets:
            existing_asset = (
                session.query(Asset)
                .filter(Asset.symbol == asset_data["symbol"])
                .first()
            )
            if not existing_asset:
                asset = Asset(**asset_data)
                session.add(asset)
        session.commit()
        session.close()
        logging.info("Sample assets created successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to create sample assets: {str(e)}")
        return False


def create_sample_ai_models() -> Any:
    """Create sample AI models for testing"""
    try:
        session = db_manager.get_session()
        sample_models = [
            {
                "name": "Fraud Detection Model v1.0",
                "model_type": ModelType.FRAUD_DETECTION,
                "version": "1.0",
                "description": "Machine learning model for detecting fraudulent transactions",
                "status": ModelStatus.DEPLOYED,
                "accuracy": 0.95,
                "precision": 0.93,
                "recall": 0.97,
                "f1_score": 0.95,
                "auc_score": 0.98,
                "hyperparameters": {
                    "algorithm": "random_forest",
                    "n_estimators": 100,
                    "max_depth": 10,
                    "min_samples_split": 5,
                },
                "feature_columns": [
                    "transaction_amount",
                    "transaction_frequency",
                    "account_age",
                    "device_fingerprint",
                    "location_risk",
                    "time_of_day",
                ],
                "target_column": "is_fraud",
                "deployed_at": datetime.now(timezone.utc),
            },
            {
                "name": "Risk Assessment Model v1.0",
                "model_type": ModelType.RISK_ASSESSMENT,
                "version": "1.0",
                "description": "Model for assessing user and portfolio risk levels",
                "status": ModelStatus.DEPLOYED,
                "accuracy": 0.88,
                "precision": 0.85,
                "recall": 0.9,
                "f1_score": 0.87,
                "auc_score": 0.92,
                "hyperparameters": {
                    "algorithm": "gradient_boosting",
                    "n_estimators": 200,
                    "learning_rate": 0.1,
                    "max_depth": 8,
                },
                "feature_columns": [
                    "portfolio_value",
                    "asset_allocation",
                    "transaction_history",
                    "credit_score",
                    "income_level",
                    "employment_status",
                ],
                "target_column": "risk_level",
                "deployed_at": datetime.now(timezone.utc),
            },
            {
                "name": "Market Prediction Model v1.0",
                "model_type": ModelType.MARKET_PREDICTION,
                "version": "1.0",
                "description": "LSTM model for predicting asset price movements",
                "status": ModelStatus.TESTING,
                "accuracy": 0.72,
                "precision": 0.7,
                "recall": 0.75,
                "f1_score": 0.72,
                "auc_score": 0.78,
                "hyperparameters": {
                    "algorithm": "lstm",
                    "sequence_length": 60,
                    "hidden_units": 128,
                    "dropout_rate": 0.2,
                    "learning_rate": 0.001,
                },
                "feature_columns": [
                    "open_price",
                    "high_price",
                    "low_price",
                    "close_price",
                    "volume",
                    "technical_indicators",
                    "market_sentiment",
                ],
                "target_column": "future_price",
            },
        ]
        for model_data in sample_models:
            existing_model = (
                session.query(AIModel)
                .filter(
                    AIModel.name == model_data["name"],
                    AIModel.version == model_data["version"],
                )
                .first()
            )
            if not existing_model:
                model = AIModel(**model_data)
                session.add(model)
        session.commit()
        session.close()
        logging.info("Sample AI models created successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to create sample AI models: {str(e)}")
        return False


def create_demo_user() -> Any:
    """Create demo user for testing"""
    try:
        session = db_manager.get_session()
        demo_user = (
            session.query(User).filter(User.email == "demo@blockguardian.com").first()
        )
        if not demo_user:
            demo_user = User(
                email="demo@blockguardian.com",
                username="demo_user",
                first_name="Demo",
                last_name="User",
                status=UserStatus.ACTIVE,
                role=UserRole.USER,
                kyc_status=KYCStatus.APPROVED,
                aml_risk_level=AMLRiskLevel.LOW,
                country="US",
                city="New York",
                state="NY",
            )
            demo_user.set_password("DemoPassword123!")
            demo_user.kyc_approved_at = datetime.now(timezone.utc)
            demo_user.kyc_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            session.add(demo_user)
            session.commit()
            demo_portfolio = Portfolio(
                name="Demo Portfolio",
                description="Sample portfolio for demonstration",
                owner_id=demo_user.id,
                portfolio_type=PortfolioType.PERSONAL,
                base_currency="USD",
                risk_level=RiskLevel.MODERATE,
                investment_objective="Long-term growth with moderate risk",
                cash_balance=Decimal("10000.00"),
                total_value=Decimal("10000.00"),
            )
            session.add(demo_portfolio)
            session.commit()
            logging.info("Demo user and portfolio created successfully")
        else:
            logging.info("Demo user already exists")
        session.close()
        return True
    except Exception as e:
        logging.error(f"Failed to create demo user: {str(e)}")
        return False


def initialize_database() -> None:
    """Main function to initialize the database"""
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
    )
    logging.info("Starting database initialization...")
    from flask import Flask

    app = Flask(__name__)
    config = get_config("development")
    app.config.from_object(config)
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'app.db')}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    with app.app_context():
        db.init_app(app)
        db_manager.init_app(app)
        auth_manager.init_app(app)
        if not create_database_schema():
            logging.error("Database initialization failed")
            return False
        if not create_indexes():
            logging.warning("Some indexes may not have been created")
        if not create_admin_user():
            logging.warning("Admin user creation failed")
        if not create_sample_assets():
            logging.warning("Sample assets creation failed")
        if not create_sample_ai_models():
            logging.warning("Sample AI models creation failed")
        if not create_demo_user():
            logging.warning("Demo user creation failed")
        logging.info("Database initialization completed successfully")
        return True


if __name__ == "__main__":
    success = initialize_database()
    if success:
        logger.info("Database initialized successfully!")
    else:
        logger.info("Database initialization failed!")
        sys.exit(1)
