"""
Tests for the /api/blockchain/* routes.

Since these endpoints are public reads with no app-specific state, tests
focus on: the routes exist and are wired correctly, and the "no blockchain
configured" case (the default in the test environment, and for anyone
running the backend without the `blockchain` docker-compose profile) returns
a clean, well-formed response instead of a 500.
"""

import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from src.blockchain.service import reset_blockchain_service
from src.main import create_app


@pytest.fixture(autouse=True)
def _isolate_blockchain_service(monkeypatch):
    """Ensure each test starts with a fresh, unconfigured BlockchainService
    singleton, regardless of what the environment or a previous test set."""
    monkeypatch.delenv("BLOCKCHAIN_RPC_URL", raising=False)
    monkeypatch.delenv("BLOCKCHAIN_DEPLOYMENTS_DIR", raising=False)
    reset_blockchain_service()
    yield
    reset_blockchain_service()


@pytest.fixture
def app() -> Any:
    app = create_app("testing")
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    return app


@pytest.fixture
def client(app: Any) -> Any:
    return app.test_client()


def test_status_endpoint_reports_not_connected_with_no_config(client: Any) -> None:
    response = client.get("/api/blockchain/status")
    assert response.status_code == 200
    data = response.get_json()
    assert data["connected"] is False
    assert data["contracts_deployed"] == []


def test_contracts_endpoint_returns_empty_addresses_with_no_config(
    client: Any,
) -> None:
    response = client.get("/api/blockchain/contracts")
    assert response.status_code == 200
    data = response.get_json()
    assert data["addresses"] == {}


def test_explorer_endpoint_returns_empty_summary_with_no_config(
    client: Any,
) -> None:
    response = client.get("/api/blockchain/explorer")
    assert response.status_code == 200
    data = response.get_json()
    assert data["connected"] is False
    assert data["contracts"] == {}


def test_blockchain_routes_are_public_no_auth_required(client: Any) -> None:
    # No Authorization header sent - should not 401, unlike the portfolio/user
    # endpoints which require a JWT.
    for path in (
        "/api/blockchain/status",
        "/api/blockchain/contracts",
        "/api/blockchain/explorer",
    ):
        response = client.get(path)
        assert response.status_code == 200
