"""
BlockchainService: thin, read-only client over the on-chain BlockGuardian
smart contracts defined in code/blockchain/contracts.

Design notes
------------
- Connects lazily and never raises during construction or Flask app boot.
  If the RPC node isn't reachable (e.g. the `blockchain` docker-compose
  profile isn't running, or no .env is configured), every method degrades
  to a clear "not connected" / None result instead of crashing the rest of
  the backend. Blockchain integration is optional infrastructure here, not
  a hard dependency for the rest of the app to function.
- Loads contract addresses + ABIs from the JSON files exported by
  code/blockchain/scripts/deploy.js (one file per contract, plus a
  deployment.json summary) rather than hardcoding ABIs in Python - the
  Solidity source (compiled by Hardhat) is the single source of truth.
- Read-only by design: this service only ever calls view/pure functions.
  It does not hold private keys and cannot submit transactions. Adding
  write access (e.g. a custodial signer) is a separate, deliberate design
  decision - see code/blockchain/AUDIT_FIXES.md for context on why that
  wasn't done implicitly here.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Matches the contract names deploy.js exports artifacts for.
CONTRACT_NAMES = [
    "TestToken",
    "TokenizedAsset",
    "PortfolioManager",
    "TradingPlatform",
    "DeFiIntegration",
]


class BlockchainService:
    """Read-only client for the BlockGuardian smart contracts."""

    def __init__(
        self,
        rpc_url: Optional[str] = None,
        deployments_dir: Optional[str] = None,
        network: Optional[str] = None,
    ) -> None:
        self.rpc_url = rpc_url or os.environ.get("BLOCKCHAIN_RPC_URL", "")
        self.network = network or os.environ.get("BLOCKCHAIN_NETWORK", "docker")
        deployments_dir = deployments_dir or os.environ.get(
            "BLOCKCHAIN_DEPLOYMENTS_DIR", ""
        )
        self.deployments_dir = Path(deployments_dir) if deployments_dir else None

        self._w3 = None
        self._contracts: Dict[str, Any] = {}
        self._addresses: Dict[str, str] = {}
        self._init_error: Optional[str] = None

        if self.rpc_url:
            try:
                # Imported lazily so the rest of the backend can boot even
                # if the `web3` package somehow isn't installed.
                from web3 import Web3

                self._w3 = Web3(
                    Web3.HTTPProvider(self.rpc_url, request_kwargs={"timeout": 5})
                )
            except Exception as exc:  # pragma: no cover - defensive
                self._init_error = f"Failed to initialize Web3 provider: {exc}"
                logger.warning(self._init_error)
        else:
            self._init_error = "BLOCKCHAIN_RPC_URL is not configured"

        self._load_deployment()

    def _load_deployment(self) -> None:
        """Load contract addresses + ABIs exported by scripts/deploy.js."""
        if self.deployments_dir is None:
            return

        network_dir = self.deployments_dir / self.network
        if not network_dir.is_dir():
            logger.info(
                "No deployment artifacts found at %s (network=%s); "
                "blockchain reads will report as unavailable.",
                network_dir,
                self.network,
            )
            return

        from web3 import Web3

        for name in CONTRACT_NAMES:
            artifact_path = network_dir / f"{name}.json"
            if not artifact_path.is_file():
                continue
            try:
                data = json.loads(artifact_path.read_text())
                address = Web3.to_checksum_address(data["address"])
                self._addresses[name] = address
                if self._w3 is not None:
                    self._contracts[name] = self._w3.eth.contract(
                        address=address, abi=data["abi"]
                    )
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning(
                    "Failed to load deployment artifact for %s at %s: %s",
                    name,
                    artifact_path,
                    exc,
                )

    def is_connected(self) -> bool:
        if self._w3 is None:
            return False
        try:
            return bool(self._w3.is_connected())
        except Exception:
            return False

    def _ensure_deployment_loaded(self) -> None:
        # If we don't have any addresses yet, it may just be that deployment
        # hadn't finished writing its artifacts when this service was first
        # constructed (it's built lazily on first use, and nothing enforces
        # that contracts are deployed before the backend starts - see e.g.
        # scripts/run_blockguardian.sh, which starts the chain and the
        # backend concurrently). Retry the (cheap, local file) load rather
        # than caching "no contracts" forever. Once addresses are found,
        # there's no need to keep re-scanning.
        if not self._addresses:
            self._load_deployment()

    def get_addresses(self) -> Dict[str, str]:
        """Deployed contract addresses, keyed by contract name."""
        self._ensure_deployment_loaded()
        return dict(self._addresses)

    def get_status(self) -> Dict[str, Any]:
        """Connection + deployment status, for a health/status endpoint."""
        self._ensure_deployment_loaded()
        connected = self.is_connected()
        status: Dict[str, Any] = {
            "connected": connected,
            "network": self.network,
            "rpc_url": self.rpc_url or None,
            "contracts_deployed": sorted(self._addresses.keys()),
        }
        if connected:
            try:
                status["chain_id"] = self._w3.eth.chain_id
                status["latest_block"] = self._w3.eth.block_number
            except Exception as exc:  # pragma: no cover - defensive
                status["error"] = str(exc)
        elif self._init_error:
            status["error"] = self._init_error
        return status

    def _call(self, contract_name: str, fn_name: str, *args: Any) -> Any:
        """Call a view/pure contract function, returning None on any failure
        (node unreachable, function reverted, contract not deployed, etc.)
        rather than raising - callers build a best-effort summary out of
        whatever succeeds."""
        contract = self._contracts.get(contract_name)
        if contract is None:
            return None
        try:
            return getattr(contract.functions, fn_name)(*args).call()
        except Exception as exc:
            logger.warning("Read call %s.%s() failed: %s", contract_name, fn_name, exc)
            return None

    @staticmethod
    def _stringify(value: Any) -> Optional[str]:
        # uint256 values can exceed the safe integer range for JSON/JS
        # consumers, so token amounts and similar large figures are
        # returned as strings rather than native numbers.
        return None if value is None else str(value)

    def get_explorer_summary(self) -> Dict[str, Any]:
        """
        Aggregate, read-only snapshot of on-chain state across all deployed
        contracts - intended to power a "Blockchain Explorer" style view.
        Any figure that couldn't be read (contract not deployed, node
        unreachable, etc.) is simply omitted/None rather than raising.
        """
        self._ensure_deployment_loaded()
        summary: Dict[str, Any] = {
            "connected": self.is_connected(),
            "network": self.network,
            "contracts": {},
        }

        if "TestToken" in self._addresses:
            summary["contracts"]["testToken"] = {
                "address": self._addresses["TestToken"],
                "name": self._call("TestToken", "name"),
                "symbol": self._call("TestToken", "symbol"),
                "totalSupply": self._stringify(self._call("TestToken", "totalSupply")),
            }

        if "TokenizedAsset" in self._addresses:
            summary["contracts"]["tokenizedAsset"] = {
                "address": self._addresses["TokenizedAsset"],
                "assetSymbol": self._call("TokenizedAsset", "assetSymbol"),
                "assetName": self._call("TokenizedAsset", "assetName"),
                "assetValueCents": self._call("TokenizedAsset", "assetValue"),
                "tradingEnabled": self._call("TokenizedAsset", "tradingEnabled"),
                "totalSupply": self._stringify(
                    self._call("TokenizedAsset", "totalSupply")
                ),
            }

        if "PortfolioManager" in self._addresses:
            summary["contracts"]["portfolioManager"] = {
                "address": self._addresses["PortfolioManager"],
                "totalPortfolios": self._call("PortfolioManager", "totalPortfolios"),
            }

        if "TradingPlatform" in self._addresses:
            summary["contracts"]["tradingPlatform"] = {
                "address": self._addresses["TradingPlatform"],
                "totalOrders": self._call("TradingPlatform", "totalOrders"),
                "totalTrades": self._call("TradingPlatform", "totalTrades"),
                "tradingEnabled": self._call("TradingPlatform", "tradingEnabled"),
            }

        if "DeFiIntegration" in self._addresses:
            summary["contracts"]["defiIntegration"] = {
                "address": self._addresses["DeFiIntegration"],
                "totalStrategies": self._call("DeFiIntegration", "totalStrategies"),
                "totalInvestments": self._call("DeFiIntegration", "totalInvestments"),
            }

        return summary


_service: Optional[BlockchainService] = None


def get_blockchain_service() -> BlockchainService:
    """Process-wide singleton, lazily constructed on first use so importing
    this module never triggers a network connection attempt."""
    global _service
    if _service is None:
        _service = BlockchainService()
    return _service


def reset_blockchain_service() -> None:
    """Test helper: clears the singleton so the next get_blockchain_service()
    call re-reads environment variables and reconnects."""
    global _service
    _service = None
