"""Read-only integration layer for the BlockGuardian smart contracts."""

from src.blockchain.service import BlockchainService, get_blockchain_service

__all__ = ["BlockchainService", "get_blockchain_service"]
