"""
Tests for BlockchainService - the read-only web3.py client over the
BlockGuardian smart contracts.

These tests don't spin up a real chain; they exercise the graceful
degradation paths (no RPC configured, RPC unreachable, no deployment
artifacts found) which are the paths that matter most for the rest of the
backend never crashing because of blockchain connectivity, plus the
deployment-loading logic against a temporary fixture directory.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.blockchain.service import BlockchainService


def test_no_rpc_configured_is_not_connected():
    service = BlockchainService(rpc_url="", deployments_dir="")

    assert service.is_connected() is False
    status = service.get_status()
    assert status["connected"] is False
    assert status["contracts_deployed"] == []
    assert "error" in status


def test_unreachable_rpc_is_not_connected():
    # Port 9 is "discard" - practically guaranteed not to speak JSON-RPC.
    service = BlockchainService(rpc_url="http://127.0.0.1:9", deployments_dir="")

    assert service.is_connected() is False
    assert service.get_explorer_summary()["connected"] is False


def test_explorer_summary_omits_contracts_with_no_deployment():
    service = BlockchainService(rpc_url="", deployments_dir="")
    summary = service.get_explorer_summary()

    assert summary["contracts"] == {}


def test_loads_addresses_from_deployment_artifacts(tmp_path):
    network_dir = tmp_path / "testnet"
    network_dir.mkdir()

    # Minimal fake artifact matching the shape scripts/deploy.js writes:
    # {"address": "0x...", "abi": [...]}. No RPC configured, so this only
    # exercises address-loading, not live contract reads.
    fake_address = "0x" + "11" * 20
    (network_dir / "TestToken.json").write_text(
        json.dumps({"address": fake_address, "abi": []})
    )

    service = BlockchainService(
        rpc_url="", deployments_dir=str(tmp_path), network="testnet"
    )

    addresses = service.get_addresses()
    assert "TestToken" in addresses
    # web3's to_checksum_address normalizes case; compare case-insensitively.
    assert addresses["TestToken"].lower() == fake_address.lower()


def test_missing_deployment_dir_does_not_raise(tmp_path):
    service = BlockchainService(
        rpc_url="",
        deployments_dir=str(tmp_path / "does-not-exist"),
        network="docker",
    )
    assert service.get_addresses() == {}
    assert service.get_status()["connected"] is False


def test_retries_loading_deployment_if_none_found_yet(tmp_path):
    # Simulates the backend booting (and this service being lazily
    # constructed) before the deploy step has finished writing its
    # artifacts - a real race in scripts/run_blockguardian.sh, which starts
    # the chain and the backend concurrently.
    network_dir = tmp_path / "docker"
    service = BlockchainService(
        rpc_url="", deployments_dir=str(tmp_path), network="docker"
    )
    assert service.get_addresses() == {}  # nothing deployed yet

    # "Deploy" completes after the fact.
    network_dir.mkdir()
    fake_address = "0x" + "22" * 20
    (network_dir / "TestToken.json").write_text(
        json.dumps({"address": fake_address, "abi": []})
    )

    # A later call picks it up without needing a new BlockchainService.
    addresses = service.get_addresses()
    assert addresses.get("TestToken", "").lower() == fake_address.lower()
