// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeFiIntegration
 * @dev Smart contract for DeFi integrations and yield strategies
 * Implements deposit, withdrawal, yield claiming, and strategy management.
 */
contract DeFiIntegration is Ownable, ReentrancyGuard {
    // Strategy structure
    struct Strategy {
        uint256 id;
        string name;
        string description;
        address protocolAddress;
        string protocolName;
        address assetAddress;
        string assetSymbol;
        uint256 apy; // Basis points (e.g., 5% = 500)
        uint256 risk; // 1-5 scale (1 = lowest, 5 = highest)
        uint256 lockPeriod; // In seconds
        uint256 minInvestment; // Minimum investment amount (in asset tokens)
        uint256 maxInvestment; // Maximum investment amount (0 = no limit)
        bool isActive;
    }

    // Investment structure
    struct Investment {
        uint256 id;
        address investor;
        uint256 strategyId;
        uint256 amount; // Amount of asset tokens deposited
        uint256 startTime;
        uint256 endTime; // 0 if ongoing
        uint256 initialValue; // In asset tokens
        uint256 currentValue; // In asset tokens (tracked by off-chain oracle/keeper)
        bool isActive;
    }

    // Yield claim structure
    struct YieldClaim {
        uint256 id;
        uint256 investmentId;
        address investor;
        uint256 amount; // Amount of asset tokens claimed
        uint256 timestamp;
    }

    // Strategy and investment storage
    mapping(uint256 => Strategy) public strategies;
    mapping(uint256 => Investment) public investments;
    mapping(uint256 => YieldClaim) public yieldClaims;
    mapping(address => uint256[]) public userInvestments;
    mapping(address => uint256[]) public userYieldClaims;

    // Counters
    uint256 private strategyIdCounter;
    uint256 private investmentIdCounter;
    uint256 private yieldClaimIdCounter;

    // Platform settings
    uint256 public platformFee; // Basis points (max 100 = 1%)
    address public feeCollector;
    bool public investmentsEnabled;

    // Events
    event StrategyCreated(
        uint256 indexed strategyId,
        string name,
        address assetAddress,
        uint256 apy,
        uint256 risk
    );
    event StrategyUpdated(
        uint256 indexed strategyId,
        string name,
        address assetAddress,
        uint256 apy,
        uint256 risk
    );
    event StrategyDeactivated(uint256 indexed strategyId);
    event InvestmentCreated(
        uint256 indexed investmentId,
        address indexed investor,
        uint256 strategyId,
        uint256 amount
    );
    event InvestmentUpdated(uint256 indexed investmentId, uint256 currentValue);
    event InvestmentClosed(uint256 indexed investmentId, uint256 finalValue);
    event YieldClaimed(
        uint256 indexed yieldClaimId,
        address indexed investor,
        uint256 investmentId,
        uint256 amount
    );
    event PlatformFeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address newFeeCollector);
    event InvestmentsStatusChanged(bool enabled);

    /**
     * @dev Constructor
     * @param _platformFee Initial platform fee in basis points (max 100)
     * @param _feeCollector Address to collect fees
     */
    constructor(
        uint256 _platformFee,
        address _feeCollector
    ) Ownable(msg.sender) {
        require(_platformFee <= 100, "Fee too high (Max 1%)");
        require(_feeCollector != address(0), "Invalid fee collector");

        platformFee = _platformFee;
        feeCollector = _feeCollector;
        investmentsEnabled = false;
        strategyIdCounter = 1;
        investmentIdCounter = 1;
        yieldClaimIdCounter = 1;
    }

    // --- Strategy Management (Owner Only) ---

    /**
     * @dev Create a new investment strategy
     * @param _name Strategy name
     * @param _description Strategy description
     * @param _protocolAddress Protocol contract address (e.g., Aave, Compound)
     * @param _protocolName Protocol name
     * @param _assetAddress Asset contract address (e.g., DAI, USDC)
     * @param _assetSymbol Asset symbol
     * @param _apy Expected APY in basis points
     * @param _risk Risk level (1-5)
     * @param _lockPeriod Lock period in seconds
     * @param _minInvestment Minimum investment amount (in asset tokens)
     * @param _maxInvestment Maximum investment amount (0 = no limit)
     * @return strategyId New strategy ID
     */
    function createStrategy(
        string memory _name,
        string memory _description,
        address _protocolAddress,
        string memory _protocolName,
        address _assetAddress,
        string memory _assetSymbol,
        uint256 _apy,
        uint256 _risk,
        uint256 _lockPeriod,
        uint256 _minInvestment,
        uint256 _maxInvestment
    ) external onlyOwner returns (uint256) {
        require(_risk >= 1 && _risk <= 5, "Invalid risk level (1-5)");
        require(_assetAddress != address(0), "Invalid asset address");
        require(_protocolAddress != address(0), "Invalid protocol address");
        require(
            _minInvestment <= _maxInvestment || _maxInvestment == 0,
            "Invalid min/max investment"
        );

        uint256 strategyId = strategyIdCounter++;

        strategies[strategyId] = Strategy({
            id: strategyId,
            name: _name,
            description: _description,
            protocolAddress: _protocolAddress,
            protocolName: _protocolName,
            assetAddress: _assetAddress,
            assetSymbol: _assetSymbol,
            apy: _apy,
            risk: _risk,
            lockPeriod: _lockPeriod,
            minInvestment: _minInvestment,
            maxInvestment: _maxInvestment,
            isActive: true
        });

        emit StrategyCreated(strategyId, _name, _assetAddress, _apy, _risk);

        return strategyId;
    }

    /**
     * @dev Update an existing strategy
     * @param _strategyId Strategy ID
     * @param _name Strategy name
     * @param _description Strategy description
     * @param _apy Expected APY in basis points
     * @param _risk Risk level (1-5)
     * @param _lockPeriod Lock period in seconds
     * @param _minInvestment Minimum investment amount
     * @param _maxInvestment Maximum investment amount (0 = no limit)
     */
    function updateStrategy(
        uint256 _strategyId,
        string memory _name,
        string memory _description,
        uint256 _apy,
        uint256 _risk,
        uint256 _lockPeriod,
        uint256 _minInvestment,
        uint256 _maxInvestment
    ) external onlyOwner {
        Strategy storage strategy = strategies[_strategyId];

        require(strategy.id != 0, "Strategy not found");
        require(strategy.isActive, "Strategy not active");
        require(_risk >= 1 && _risk <= 5, "Invalid risk level (1-5)");
        require(
            _minInvestment <= _maxInvestment || _maxInvestment == 0,
            "Invalid min/max investment"
        );

        strategy.name = _name;
        strategy.description = _description;
        strategy.apy = _apy;
        strategy.risk = _risk;
        strategy.lockPeriod = _lockPeriod;
        strategy.minInvestment = _minInvestment;
        strategy.maxInvestment = _maxInvestment;

        emit StrategyUpdated(
            _strategyId,
            _name,
            strategy.assetAddress,
            _apy,
            _risk
        );
    }

    /**
     * @dev Deactivate a strategy
     * @param _strategyId Strategy ID
     */
    function deactivateStrategy(uint256 _strategyId) external onlyOwner {
        Strategy storage strategy = strategies[_strategyId];

        require(strategy.id != 0, "Strategy not found");
        require(strategy.isActive, "Strategy already inactive");

        strategy.isActive = false;

        emit StrategyDeactivated(_strategyId);
    }

    // --- Investment Operations ---

    /**
     * @dev Create a new investment
     * @param _strategyId Strategy ID
     * @param _amount Investment amount (in asset tokens)
     * @return investmentId New investment ID
     */
    function createInvestment(
        uint256 _strategyId,
        uint256 _amount
    ) external nonReentrant returns (uint256) {
        require(investmentsEnabled, "Investments not enabled by platform");

        Strategy storage strategy = strategies[_strategyId];

        require(strategy.id != 0, "Strategy not found");
        require(strategy.isActive, "Strategy not active");
        require(
            _amount >= strategy.minInvestment,
            "Amount below minimum investment"
        );
        require(
            strategy.maxInvestment == 0 || _amount <= strategy.maxInvestment,
            "Amount above maximum investment"
        );

        // 1. Transfer tokens from investor to contract
        IERC20 token = IERC20(strategy.assetAddress);
        require(
            token.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );

        // 2. Calculate platform fee
        uint256 fee = (_amount * platformFee) / 10000;

        // 3. Transfer fee to fee collector
        if (fee > 0) {
            require(token.transfer(feeCollector, fee), "Fee transfer failed");
        }

        // 4. Calculate final investment amount
        uint256 investmentAmount = _amount - fee;

        // 5. Create investment record
        uint256 investmentId = investmentIdCounter++;

        investments[investmentId] = Investment({
            id: investmentId,
            investor: msg.sender,
            strategyId: _strategyId,
            amount: investmentAmount,
            startTime: block.timestamp,
            endTime: 0,
            initialValue: investmentAmount,
            currentValue: investmentAmount, // Initial value is the same as amount
            isActive: true
        });

        // 6. Add to user investments
        userInvestments[msg.sender].push(investmentId);

        // TODO: Integrate with the actual DeFi protocol (e.g., deposit tokens)
        // For this implementation, we assume the tokens are held in this contract
        // and the off-chain system handles the actual protocol interaction.

        emit InvestmentCreated(
            investmentId,
            msg.sender,
            _strategyId,
            investmentAmount
        );

        return investmentId;
    }

    /**
     * @dev Update investment value (Called by a trusted off-chain oracle/keeper)
     * This function is crucial for tracking the actual value of the investment
     * which might fluctuate due to yield generation or impermanent loss.
     * @param _investmentId Investment ID
     * @param _currentValue Current investment value (in asset tokens)
     */
    function updateInvestmentValue(
        uint256 _investmentId,
        uint256 _currentValue
    ) external onlyOwner {
        // Only owner (trusted keeper) can update
        Investment storage investment = investments[_investmentId];

        require(investment.id != 0, "Investment not found");
        require(investment.isActive, "Investment not active");
        require(_currentValue > 0, "Current value must be positive");

        investment.currentValue = _currentValue;

        emit InvestmentUpdated(_investmentId, _currentValue);
    }

    /**
     * @dev Close investment and withdraw funds
     * @param _investmentId Investment ID
     */
    function closeInvestment(uint256 _investmentId) external nonReentrant {
        Investment storage investment = investments[_investmentId];

        require(investment.id != 0, "Investment not found");
        require(investment.investor == msg.sender, "Not the investor");
        require(investment.isActive, "Investment already closed");

        Strategy storage strategy = strategies[investment.strategyId];

        // Check lock period
        require(
            block.timestamp >= investment.startTime + strategy.lockPeriod,
            "Investment is still locked"
        );

        // Final value is the current tracked value
        uint256 finalValue = investment.currentValue;

        // Update investment status
        investment.isActive = false;
        investment.endTime = block.timestamp;

        // Transfer tokens back to investor
        IERC20 token = IERC20(strategy.assetAddress);
        require(
            token.transfer(investment.investor, finalValue),
            "Token withdrawal failed"
        );

        emit InvestmentClosed(_investmentId, finalValue);
    }

    /**
     * @dev Claim yield from investment
     * This function allows claiming only the *profit* (currentValue - initialValue).
     * The principal remains in the investment until closeInvestment is called.
     * @param _investmentId Investment ID
     * @return yieldClaimId New yield claim ID
     */
    function claimYield(
        uint256 _investmentId
    ) external nonReentrant returns (uint256) {
        Investment storage investment = investments[_investmentId];

        require(investment.id != 0, "Investment not found");
        require(investment.investor == msg.sender, "Not the investor");
        require(investment.isActive, "Investment not active");

        // Calculate available yield (profit)
        require(
            investment.currentValue > investment.initialValue,
            "No yield available to claim"
        );
        uint256 availableYield =
            investment.currentValue - investment.initialValue;

        // Reset the initial value to the current value (reinvesting the principal)
        investment.initialValue = investment.currentValue;

        // Transfer yield to investor
        IERC20 token = IERC20(strategies[investment.strategyId].assetAddress);
        require(
            token.transfer(msg.sender, availableYield),
            "Yield transfer failed"
        );

        // Create yield claim record
        uint256 yieldClaimId = yieldClaimIdCounter++;

        yieldClaims[yieldClaimId] = YieldClaim({
            id: yieldClaimId,
            investmentId: _investmentId,
            investor: msg.sender,
            amount: availableYield,
            timestamp: block.timestamp
        });

        // Add to user yield claims
        userYieldClaims[msg.sender].push(yieldClaimId);

        emit YieldClaimed(
            yieldClaimId,
            msg.sender,
            _investmentId,
            availableYield
        );

        return yieldClaimId;
    }

    // --- Platform Settings (Owner Only) ---

    /**
     * @dev Set platform fee
     * @param _platformFee Platform fee in basis points (max 100)
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 100, "Fee too high (Max 1%)");
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
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
     * @dev Set investments status
     * @param _enabled Investments status
     */
    function setInvestmentsEnabled(bool _enabled) external onlyOwner {
        investmentsEnabled = _enabled;
        emit InvestmentsStatusChanged(_enabled);
    }

    // --- View Functions ---

    /**
     * @dev Get user investments
     * @param _user User address
     * @return investmentIds Array of investment IDs
     */
    function getUserInvestments(
        address _user
    ) external view returns (uint256[] memory) {
        return userInvestments[_user];
    }

    /**
     * @dev Get user yield claims
     * @param _user User address
     * @return yieldClaimIds Array of yield claim IDs
     */
    function getUserYieldClaims(
        address _user
    ) external view returns (uint256[] memory) {
        return userYieldClaims[_user];
    }

    /**
     * @dev Get active strategies
     * @param _startIndex Start index
     * @param _count Number of strategies to return
     * @return activeStrategies Array of active strategies
     */
    function getActiveStrategies(
        uint256 _startIndex,
        uint256 _count
    ) external view returns (Strategy[] memory) {
        // Count active strategies
        uint256 activeCount = 0;
        for (uint256 i = 1; i < strategyIdCounter; i++) {
            if (strategies[i].id != 0 && strategies[i].isActive) {
                activeCount++;
            }
        }

        if (_startIndex >= activeCount) {
            return new Strategy[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > activeCount) {
            endIndex = activeCount;
        }

        uint256 resultCount = endIndex - _startIndex;
        Strategy[] memory result = new Strategy[](resultCount);

        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (
            uint256 i = 1;
            i < strategyIdCounter && resultIndex < resultCount;
            i++
        ) {
            if (strategies[i].id != 0 && strategies[i].isActive) {
                if (currentIndex >= _startIndex && currentIndex < endIndex) {
                    result[resultIndex] = strategies[i];
                    resultIndex++;
                }
                currentIndex++;
            }
        }

        return result;
    }

    /**
     * @dev Get active investments for user
     * @param _user User address
     * @return activeInvestments Array of active investments
     */
    function getActiveInvestmentsForUser(
        address _user
    ) external view returns (Investment[] memory) {
        uint256[] memory userInvestmentIds = userInvestments[_user];

        // Count active investments
        uint256 activeCount = 0;
        for (uint256 i = 0; i < userInvestmentIds.length; i++) {
            if (
                investments[userInvestmentIds[i]].id != 0 &&
                investments[userInvestmentIds[i]].isActive
            ) {
                activeCount++;
            }
        }

        Investment[] memory result = new Investment[](activeCount);
        uint256 resultIndex = 0;

        for (
            uint256 i = 0;
            i < userInvestmentIds.length && resultIndex < activeCount;
            i++
        ) {
            uint256 investmentId = userInvestmentIds[i];
            if (
                investments[investmentId].id != 0 &&
                investments[investmentId].isActive
            ) {
                result[resultIndex] = investments[investmentId];
                resultIndex++;
            }
        }

        return result;
    }

    /**
     * @dev Total number of strategies ever created (active or not). Exposed
     * as a convenience read for dashboards/explorers.
     */
    function totalStrategies() external view returns (uint256) {
        return strategyIdCounter - 1;
    }

    /**
     * @dev Total number of investments ever created (active or not).
     * Exposed as a convenience read for dashboards/explorers.
     */
    function totalInvestments() external view returns (uint256) {
        return investmentIdCounter - 1;
    }
}
