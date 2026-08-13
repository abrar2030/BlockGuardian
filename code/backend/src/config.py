"""
Production-ready configuration system for BlockGuardian Backend
Implements enterprise-grade configuration management with environment-specific settings
"""

import os
import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet


@dataclass
class DatabaseConfig:
    """Database configuration settings"""

    uri: str
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False
    echo_pool: bool = False


@dataclass
class SecurityConfig:
    """Security configuration settings"""

    secret_key: str
    jwt_secret_key: str
    jwt_access_token_expires: timedelta
    jwt_refresh_token_expires: timedelta
    encryption_key: bytes
    password_hash_rounds: int = 12
    max_login_attempts: int = 5
    lockout_duration: timedelta = timedelta(minutes=30)
    session_timeout: timedelta = timedelta(hours=8)


@dataclass
class RedisConfig:
    """Redis configuration for caching and sessions"""

    url: str
    max_connections: int = 50
    socket_timeout: int = 30
    socket_connect_timeout: int = 30
    retry_on_timeout: bool = True


@dataclass
class ExternalAPIConfig:
    """External API configuration"""

    infura_api_key: str
    etherscan_api_key: str
    coinmarketcap_api_key: str
    alpha_vantage_api_key: str
    polygon_api_key: str
    rate_limit_per_minute: int = 60


@dataclass
class BlockchainConfig:
    """Blockchain network configurations"""

    networks: Dict[str, Dict[str, Any]]
    default_network: str = "ethereum"
    gas_limit: int = 500000
    gas_price_gwei: int = 20
    confirmation_blocks: int = 12
    # RPC endpoint + deployment-artifact location for BlockGuardian's own
    # deployed contracts (see code/blockchain), as opposed to the public
    # chain RPC endpoints above. Consumed by src.blockchain.BlockchainService.
    contracts_rpc_url: str = ""
    contracts_network: str = "docker"
    contracts_deployments_dir: str = ""


@dataclass
class ComplianceConfig:
    """Compliance and regulatory settings"""

    kyc_enabled: bool = True
    aml_enabled: bool = True
    audit_log_retention_days: int = 2555  # 7 years
    transaction_reporting_enabled: bool = True
    data_retention_days: int = 2555
    gdpr_compliance: bool = True


@dataclass
class MonitoringConfig:
    """Monitoring and observability settings"""

    log_level: str = "INFO"
    log_format: str = "json"
    metrics_enabled: bool = True
    tracing_enabled: bool = True
    health_check_interval: int = 30
    alert_webhook_url: Optional[str] = None


class Config:
    """Base configuration class with common settings"""

    # Application settings
    APP_NAME = "BlockGuardian Backend"
    APP_VERSION = "1.0.0"
    DEBUG = False
    TESTING = False

    # Security settings
    SECRET_KEY = os.environ.get("SECRET_KEY") or secrets.token_urlsafe(32)
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or secrets.token_urlsafe(32)
    # ENCRYPTION_KEY generation with proper type handling
    _enc_key_env = os.environ.get("ENCRYPTION_KEY")
    ENCRYPTION_KEY: bytes = (
        _enc_key_env.encode()
        if isinstance(_enc_key_env, str)
        else _enc_key_env if isinstance(_enc_key_env, bytes) else Fernet.generate_key()
    )

    # CORS settings
    CORS_ORIGINS = ["*"]  # Configure specific origins in production
    CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_HEADERS = ["Content-Type", "Authorization"]

    # Rate limiting
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
    RATELIMIT_DEFAULT = "100 per hour"

    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")

    @property
    def database(self) -> DatabaseConfig:
        """Database configuration"""
        return DatabaseConfig(
            uri=os.environ.get(
                "DATABASE_URL",
                "postgresql://postgres:postgres@localhost:5432/blockguardian",
            ),
            pool_size=int(os.environ.get("DB_POOL_SIZE", "20")),
            max_overflow=int(os.environ.get("DB_MAX_OVERFLOW", "30")),
            pool_timeout=int(os.environ.get("DB_POOL_TIMEOUT", "30")),
            pool_recycle=int(os.environ.get("DB_POOL_RECYCLE", "3600")),
            echo=os.environ.get("DB_ECHO", "false").lower() == "true",
        )

    @property
    def security(self) -> SecurityConfig:
        """Security configuration"""
        return SecurityConfig(
            secret_key=self.SECRET_KEY,
            jwt_secret_key=self.JWT_SECRET_KEY,
            jwt_access_token_expires=timedelta(
                hours=int(os.environ.get("JWT_ACCESS_EXPIRES_HOURS", "1"))
            ),
            jwt_refresh_token_expires=timedelta(
                days=int(os.environ.get("JWT_REFRESH_EXPIRES_DAYS", "30"))
            ),
            password_hash_rounds=int(os.environ.get("PASSWORD_HASH_ROUNDS", "12")),
            max_login_attempts=int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5")),
            lockout_duration=timedelta(
                minutes=int(os.environ.get("LOCKOUT_DURATION_MINUTES", "30"))
            ),
            session_timeout=timedelta(
                hours=int(os.environ.get("SESSION_TIMEOUT_HOURS", "8"))
            ),
            encryption_key=self.ENCRYPTION_KEY,
        )

    @property
    def redis(self) -> RedisConfig:
        """Redis configuration"""
        return RedisConfig(
            url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            max_connections=int(os.environ.get("REDIS_MAX_CONNECTIONS", "50")),
            socket_timeout=int(os.environ.get("REDIS_SOCKET_TIMEOUT", "30")),
            socket_connect_timeout=int(os.environ.get("REDIS_CONNECT_TIMEOUT", "30")),
        )

    @property
    def external_apis(self) -> ExternalAPIConfig:
        """External API configuration"""
        return ExternalAPIConfig(
            infura_api_key=os.environ.get("INFURA_API_KEY", ""),
            etherscan_api_key=os.environ.get("ETHERSCAN_API_KEY", ""),
            coinmarketcap_api_key=os.environ.get("COINMARKETCAP_API_KEY", ""),
            alpha_vantage_api_key=os.environ.get("ALPHA_VANTAGE_API_KEY", ""),
            polygon_api_key=os.environ.get("POLYGON_API_KEY", ""),
            rate_limit_per_minute=int(
                os.environ.get("API_RATE_LIMIT_PER_MINUTE", "60")
            ),
        )

    @property
    def blockchain(self) -> BlockchainConfig:
        """Blockchain configuration"""
        networks = {
            "ethereum": {
                "id": 1,
                "name": "Ethereum Mainnet",
                "rpc_url": f"https://mainnet.infura.io/v3/{self.external_apis.infura_api_key}",
                "explorer_url": "https://etherscan.io",
                "native_currency": "ETH",
            },
            "polygon": {
                "id": 137,
                "name": "Polygon Mainnet",
                "rpc_url": "https://polygon-rpc.com",
                "explorer_url": "https://polygonscan.com",
                "native_currency": "MATIC",
            },
            "arbitrum": {
                "id": 42161,
                "name": "Arbitrum One",
                "rpc_url": "https://arb1.arbitrum.io/rpc",
                "explorer_url": "https://arbiscan.io",
                "native_currency": "ETH",
            },
            "optimism": {
                "id": 10,
                "name": "Optimism",
                "rpc_url": "https://mainnet.optimism.io",
                "explorer_url": "https://optimistic.etherscan.io",
                "native_currency": "ETH",
            },
            "bsc": {
                "id": 56,
                "name": "BNB Smart Chain",
                "rpc_url": "https://bsc-dataseed.binance.org",
                "explorer_url": "https://bscscan.com",
                "native_currency": "BNB",
            },
        }

        return BlockchainConfig(
            networks=networks,
            default_network=os.environ.get("DEFAULT_BLOCKCHAIN_NETWORK", "ethereum"),
            gas_limit=int(os.environ.get("GAS_LIMIT", "500000")),
            gas_price_gwei=int(os.environ.get("GAS_PRICE_GWEI", "20")),
            confirmation_blocks=int(os.environ.get("CONFIRMATION_BLOCKS", "12")),
            contracts_rpc_url=os.environ.get("BLOCKCHAIN_RPC_URL", ""),
            contracts_network=os.environ.get("BLOCKCHAIN_NETWORK", "docker"),
            contracts_deployments_dir=os.environ.get("BLOCKCHAIN_DEPLOYMENTS_DIR", ""),
        )

    @property
    def compliance(self) -> ComplianceConfig:
        """Compliance configuration"""
        return ComplianceConfig(
            kyc_enabled=os.environ.get("KYC_ENABLED", "true").lower() == "true",
            aml_enabled=os.environ.get("AML_ENABLED", "true").lower() == "true",
            audit_log_retention_days=int(
                os.environ.get("AUDIT_LOG_RETENTION_DAYS", "2555")
            ),
            transaction_reporting_enabled=os.environ.get(
                "TRANSACTION_REPORTING_ENABLED", "true"
            ).lower()
            == "true",
            data_retention_days=int(os.environ.get("DATA_RETENTION_DAYS", "2555")),
            gdpr_compliance=os.environ.get("GDPR_COMPLIANCE", "true").lower() == "true",
        )

    @property
    def monitoring(self) -> MonitoringConfig:
        """Monitoring configuration"""
        return MonitoringConfig(
            log_level=os.environ.get("LOG_LEVEL", "INFO"),
            log_format=os.environ.get("LOG_FORMAT", "json"),
            metrics_enabled=os.environ.get("METRICS_ENABLED", "true").lower() == "true",
            tracing_enabled=os.environ.get("TRACING_ENABLED", "true").lower() == "true",
            health_check_interval=int(os.environ.get("HEALTH_CHECK_INTERVAL", "30")),
            alert_webhook_url=os.environ.get("ALERT_WEBHOOK_URL"),
        )


class DevelopmentConfig(Config):
    """Development environment configuration"""

    DEBUG = True
    TESTING = False

    @property
    def database(self) -> DatabaseConfig:
        """Development database configuration"""
        config = super().database
        config.uri = os.environ.get(
            "DATABASE_URL",
            f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}",
        )
        config.echo = True
        return config


class TestingConfig(Config):
    """Testing environment configuration"""

    DEBUG = False
    TESTING = True
    WTF_CSRF_ENABLED = False

    @property
    def database(self) -> DatabaseConfig:
        """Testing database configuration"""
        config = super().database
        config.uri = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")
        return config


class ProductionConfig(Config):
    """Production environment configuration"""

    DEBUG = False
    TESTING = False

    # Production-specific CORS settings
    CORS_ORIGINS = (
        os.environ.get("CORS_ORIGINS", "").split(",")
        if os.environ.get("CORS_ORIGINS")
        else ["https://blockguardian.com"]
    )

    @property
    def monitoring(self) -> MonitoringConfig:
        """Production monitoring configuration"""
        config = super().monitoring
        config.log_level = "WARNING"
        return config


# Configuration mapping
config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config(config_name: Optional[str] = None) -> Config:
    """Get configuration instance based on environment"""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    config_class = config_map.get(config_name, DevelopmentConfig)
    return config_class()


# Global configuration instance
current_config = get_config()
