"""
BlockGuardian Backend - Production-Ready Financial Services Platform
Enterprise-grade backend with comprehensive security, compliance, and scalability features
"""

import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

import redis
from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from src.config import current_config, get_config
from src.models.base import db_manager
from src.models.user import db
from src.routes.auth import auth_bp
from src.routes.blockchain import blockchain_bp
from src.routes.portfolio import portfolio_bp
from src.security.audit import audit_logger
from src.security.auth import auth_manager
from src.security.rate_limiting import rate_limiter


def create_app(config_name: Any = None) -> Any:
    """Application factory pattern for creating Flask app"""
    app = Flask(
        __name__, static_folder=os.path.join(os.path.dirname(__file__), "static")
    )
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")
    config = get_config(config_name)
    app.config.from_object(config)
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = config.database.uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    setup_logging(app)
    initialize_extensions(app)
    register_blueprints(app)
    register_error_handlers(app)
    register_middleware(app)

    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint for monitoring"""
        try:
            from sqlalchemy import text

            session = db_manager.get_session()
            session.execute(text("SELECT 1"))
            session.close()
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
        redis_status = "healthy"
        try:
            if hasattr(current_config, "REDIS_URL") and current_config.REDIS_URL:
                redis_client = redis.Redis.from_url(current_config.REDIS_URL)
                redis_client.ping()
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"
        status = {
            "status": "healthy" if db_status == "healthy" else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "environment": config_name,
            "services": {"database": db_status, "redis": redis_status},
        }
        return (jsonify(status), 200 if status["status"] == "healthy" else 503)

    @app.route("/api/info", methods=["GET"])
    def api_info():
        """API information endpoint"""
        return (
            jsonify(
                {
                    "name": "BlockGuardian Backend API",
                    "version": "1.0.0",
                    "description": "Enterprise-grade financial services platform",
                    "environment": config_name,
                    "features": [
                        "User Authentication & Authorization",
                        "Multi-Factor Authentication",
                        "Portfolio Management",
                        "Asset Trading",
                        "KYC/AML Compliance",
                        "Audit Logging",
                        "Rate Limiting",
                        "Data Encryption",
                    ],
                    "endpoints": {
                        "auth": "/api/auth",
                        "portfolios": "/api/portfolios",
                        "blockchain": "/api/blockchain",
                        "health": "/health",
                        "docs": "/api/docs",
                    },
                }
            ),
            200,
        )

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve(path):
        static_folder_path = app.static_folder
        if static_folder_path is None:
            return ("Static folder not configured", 404)
        if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
            return send_from_directory(static_folder_path, path)
        else:
            index_path = os.path.join(static_folder_path, "index.html")
            if os.path.exists(index_path):
                return send_from_directory(static_folder_path, "index.html")
            else:
                return ("index.html not found", 404)

    app.logger.info(f"BlockGuardian Backend initialized in {config_name} mode")
    return app


def setup_logging(app: Any) -> Any:
    """Configure application logging"""
    import logging.handlers as log_handlers

    if app.config.get("DEBUG"):
        log_level = logging.DEBUG
    else:
        log_level = logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    app.logger.setLevel(log_level)
    if not app.config.get("DEBUG"):
        os.makedirs("logs", exist_ok=True)
        file_handler = log_handlers.RotatingFileHandler(
            "logs/blockguardian.log", maxBytes=10485760, backupCount=10
        )
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s [%(pathname)s:%(lineno)d]: %(message)s"
            )
        )
        app.logger.addHandler(file_handler)
    app.logger.info("Logging configured successfully")


def initialize_extensions(app: Any) -> None:
    """Initialize Flask extensions"""
    cors_origins = app.config.get("CORS_ORIGINS", ["*"])
    CORS(
        app,
        origins=cors_origins,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        supports_credentials=True if cors_origins != ["*"] else False,
    )
    db.init_app(app)
    # Initialize db_manager using Flask-SQLAlchemy's engine so both share one connection
    with app.app_context():
        db_manager.init_app_with_db(app, db)
    auth_manager.init_app(app)
    try:
        rate_limiter.init_app(app)
    except Exception as e:
        app.logger.warning(f"Rate limiter initialization failed: {str(e)}")
    try:
        audit_logger.init_app(app)
    except Exception as e:
        app.logger.warning(f"Audit logger initialization failed: {str(e)}")
    with app.app_context():
        try:
            # Ensure AuditLog model is registered before creating tables
            from src.security.audit import get_audit_log_model

            get_audit_log_model()
            # Import compliance transaction models to register their tables
            try:
                from src.models.base import Base

                Base.metadata.create_all(db.engine)
            except Exception:
                pass
            # Create all tables - db_manager.init_app_with_db already created Base tables,
            # but we also need Flask-SQLAlchemy models (like AuditLog) created
            db.create_all()
            app.logger.info("Database tables created successfully")
        except Exception as e:
            app.logger.error(f"Failed to create database tables: {str(e)}")
    app.logger.info("Extensions initialized successfully")


def register_blueprints(app: Any) -> None:
    """Register application blueprints"""
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(portfolio_bp, url_prefix="/api/portfolios")
    app.register_blueprint(blockchain_bp, url_prefix="/api/blockchain")
    app.logger.info("Blueprints registered successfully")


def register_error_handlers(app: Any) -> None:
    """Register global error handlers"""

    @app.errorhandler(400)
    def bad_request(error):
        """Handle bad request errors"""
        return (
            jsonify(
                {
                    "error": "Bad Request",
                    "message": "The request could not be understood by the server",
                    "status_code": 400,
                }
            ),
            400,
        )

    @app.errorhandler(401)
    def unauthorized(error):
        """Handle unauthorized errors"""
        return (
            jsonify(
                {
                    "error": "Unauthorized",
                    "message": "Authentication is required to access this resource",
                    "status_code": 401,
                }
            ),
            401,
        )

    @app.errorhandler(403)
    def forbidden(error):
        """Handle forbidden errors"""
        return (
            jsonify(
                {
                    "error": "Forbidden",
                    "message": "You do not have permission to access this resource",
                    "status_code": 403,
                }
            ),
            403,
        )

    @app.errorhandler(404)
    def not_found(error):
        """Handle not found errors"""
        return (
            jsonify(
                {
                    "error": "Not Found",
                    "message": "The requested resource was not found",
                    "status_code": 404,
                }
            ),
            404,
        )

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle rate limit exceeded errors"""
        return (
            jsonify(
                {
                    "error": "Rate Limit Exceeded",
                    "message": "Too many requests. Please try again later.",
                    "status_code": 429,
                }
            ),
            429,
        )

    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle internal server errors"""
        app.logger.error(f"Internal server error: {str(error)}")
        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "status_code": 500,
                }
            ),
            500,
        )

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle all HTTP exceptions"""
        return (
            jsonify(
                {
                    "error": error.name,
                    "message": error.description,
                    "status_code": error.code,
                }
            ),
            error.code,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle unexpected errors"""
        app.logger.error(f"Unexpected error: {str(error)}", exc_info=True)
        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "status_code": 500,
                }
            ),
            500,
        )

    app.logger.info("Error handlers registered successfully")


def register_middleware(app: Any) -> None:
    """Register application middleware"""

    @app.before_request
    def before_request():
        """Execute before each request"""
        if request.endpoint in ["health_check", "serve", "static"]:
            return
        app.logger.debug(f"Request: {request.method} {request.url}")
        g.request_start_time = datetime.now(timezone.utc)

    @app.after_request
    def after_request(response):
        """Execute after each request"""
        if request.endpoint in ["health_check", "serve", "static"]:
            return response
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["X-API-Version"] = "1.0.0"
        app.logger.debug(
            f"Response: {response.status_code} for {request.method} {request.url}"
        )
        return response

    @app.teardown_appcontext
    def close_db_session(error):
        """Close database session after request"""
        try:
            db_manager.close_session()
        except Exception as e:
            app.logger.error(f"Error closing database session: {str(e)}")

    app.logger.info("Middleware registered successfully")


app = create_app()
if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=debug_mode,
        threaded=True,
    )
