// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenizedAsset
 * @dev ERC20 token representing a tokenized real-world asset
 * Implements asset-specific metadata, valuation, and a transfer fee mechanism.
 */
contract TokenizedAsset is ERC20, Ownable {
    // Asset details
    string public assetSymbol;
    string public assetName;
    string public assetType; // e.g., "stock", "bond", "commodity", "real_estate"
    uint256 public assetValue; // Value in USD cents (e.g., $10.50 = 1050)

    // Asset metadata
    string public description;
    string public issuer;
    uint256 public issuanceDate;
    uint256 public maturityDate; // 0 if no maturity

    // Asset performance
    int256 public yearToDateReturn; // Basis points (e.g., 5.25% = 525)
    uint256 public lastValuationDate;

    // Trading parameters
    bool public tradingEnabled;
    uint256 public tradingFee; // Basis points (max 500 = 5%)
    address public feeCollector;

    // Events
    event AssetRevalued(uint256 oldValue, uint256 newValue, uint256 timestamp);
    event TradingStatusChanged(bool enabled);
    event PerformanceUpdated(int256 ytdReturn, uint256 timestamp);
    event TradingFeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address newFeeCollector);

    /**
     * @dev Constructor
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _assetSymbol Underlying asset symbol
     * @param _assetName Underlying asset name
     * @param _assetType Type of asset
     * @param _initialSupply Initial token supply (in base units)
     * @param _initialValue Initial asset value in USD cents
     * @param _description Asset description
     * @param _issuer Asset issuer
     * @param _feeCollector Address to collect fees
     */
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _assetSymbol,
        string memory _assetName,
        string memory _assetType,
        uint256 _initialSupply,
        uint256 _initialValue,
        string memory _description,
        string memory _issuer,
        address _feeCollector
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_feeCollector != address(0), "Invalid fee collector");

        assetSymbol = _assetSymbol;
        assetName = _assetName;
        assetType = _assetType;
        assetValue = _initialValue;
        description = _description;
        issuer = _issuer;
        issuanceDate = block.timestamp;
        lastValuationDate = block.timestamp;
        tradingEnabled = false;
        tradingFee = 25; // Default 0.25% fee
        feeCollector = _feeCollector;

        // Mint initial supply to contract creator
        _mint(msg.sender, _initialSupply * (10 ** decimals()));
    }

    // --- Asset Management (Owner Only) ---

    /**
     * @dev Update asset value (Called by a trusted oracle)
     * @param _newValue New asset value in USD cents
     */
    function updateAssetValue(uint256 _newValue) external onlyOwner {
        require(_newValue > 0, "Asset value must be positive");
        uint256 oldValue = assetValue;
        assetValue = _newValue;
        lastValuationDate = block.timestamp;

        emit AssetRevalued(oldValue, _newValue, block.timestamp);
    }

    /**
     * @dev Update asset performance
     * @param _ytdReturn Year-to-date return in basis points
     */
    function updatePerformance(int256 _ytdReturn) external onlyOwner {
        yearToDateReturn = _ytdReturn;

        emit PerformanceUpdated(_ytdReturn, block.timestamp);
    }

    /**
     * @dev Enable or disable trading
     * @param _enabled Trading status
     */
    function setTradingEnabled(bool _enabled) external onlyOwner {
        tradingEnabled = _enabled;

        emit TradingStatusChanged(_enabled);
    }

    /**
     * @dev Set trading fee
     * @param _fee Trading fee in basis points (max 500)
     */
    function setTradingFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high (Max 5%)");
        tradingFee = _fee;
        emit TradingFeeUpdated(_fee);
    }

    /**
     * @dev Set fee collector
     * @param _feeCollector Fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    /**
     * @dev Update asset metadata
     * @param _description New description
     * @param _maturityDate New maturity date (0 if no maturity)
     */
    function updateMetadata(
        string memory _description,
        uint256 _maturityDate
    ) external onlyOwner {
        description = _description;
        maturityDate = _maturityDate;
    }

    /**
     * @dev Mint new tokens (Owner Only)
     * @param _to Recipient address
     * @param _amount Amount to mint (in base units)
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @dev Burn tokens (Allows any token holder to burn their own tokens)
     * @param _amount Amount to burn (in base units)
     */
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    // --- Core ERC20 Overrides ---

    /**
     * @dev Override _update (the OZ v5 ERC20 hook) to enforce trading rules and
     * collect fees on ordinary transfers. Mints (from == address(0)) and burns
     * (to == address(0)) always bypass trading rules and fees.
     *
     * NOTE: In OpenZeppelin Contracts v5, ERC20._transfer is no longer virtual;
     * _update is the correct extension point for customizing transfer behavior.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Mints and burns are never subject to trading rules or fees.
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        // Allow transfers by owner/fee collector regardless of trading status
        if (
            from == owner() ||
            to == owner() ||
            from == feeCollector ||
            to == feeCollector
        ) {
            super._update(from, to, amount);
            return;
        }

        // Enforce trading enabled for all other transfers
        require(tradingEnabled, "Trading is currently disabled for this asset");

        // Calculate fee if trading fee is set
        if (tradingFee > 0) {
            uint256 fee = (amount * tradingFee) / 10000;
            uint256 amountAfterFee = amount - fee;

            // 1. Transfer fee to fee collector
            super._update(from, feeCollector, fee);

            // 2. Transfer remaining amount to recipient
            super._update(from, to, amountAfterFee);
        } else {
            // No fee, standard transfer
            super._update(from, to, amount);
        }
    }

    // --- View Functions ---

    /**
     * @dev Get asset details
     */
    function getAssetDetails()
        external
        view
        returns (
            string memory _assetSymbol,
            string memory _assetName,
            string memory _assetType,
            uint256 _assetValue,
            string memory _description,
            string memory _issuer,
            uint256 _issuanceDate,
            uint256 _maturityDate,
            int256 _yearToDateReturn,
            uint256 _lastValuationDate,
            bool _tradingEnabled,
            uint256 _tradingFee,
            address _feeCollector
        )
    {
        return (
            assetSymbol,
            assetName,
            assetType,
            assetValue,
            description,
            issuer,
            issuanceDate,
            maturityDate,
            yearToDateReturn,
            lastValuationDate,
            tradingEnabled,
            tradingFee,
            feeCollector
        );
    }
}
