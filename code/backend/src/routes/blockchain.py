"""
Blockchain API routes for BlockGuardian Backend.

Exposes read-only on-chain data (connection status, deployed contract
addresses, and an aggregate "explorer" summary) via the BlockchainService.
Public endpoints (no JWT) since they only ever return public on-chain state,
never anything user-specific - the same data anyone could read directly off
the chain with any RPC client.
"""

from typing import Any

from flask import Blueprint, jsonify
from src.blockchain import get_blockchain_service
from src.security.rate_limiting import RateLimitScope, rate_limit

blockchain_bp = Blueprint("blockchain", __name__)


@blockchain_bp.route("/status", methods=["GET"])
@rate_limit(limit=60, window=60, scope=RateLimitScope.PER_IP)
def get_status() -> Any:
    """Connection + deployment status for the configured blockchain network."""
    service = get_blockchain_service()
    return jsonify(service.get_status()), 200


@blockchain_bp.route("/contracts", methods=["GET"])
@rate_limit(limit=60, window=60, scope=RateLimitScope.PER_IP)
def get_contracts() -> Any:
    """Deployed contract addresses, keyed by contract name."""
    service = get_blockchain_service()
    return (
        jsonify(
            {
                "network": service.network,
                "addresses": service.get_addresses(),
            }
        ),
        200,
    )


@blockchain_bp.route("/explorer", methods=["GET"])
@rate_limit(limit=30, window=60, scope=RateLimitScope.PER_IP)
def get_explorer_summary() -> Any:
    """
    Aggregate, read-only snapshot of on-chain activity across all deployed
    contracts (token supply, portfolio/order/trade/strategy counts, trading
    status, etc.) - intended to power a "Blockchain Explorer" style view.
    """
    service = get_blockchain_service()
    return jsonify(service.get_explorer_summary()), 200
