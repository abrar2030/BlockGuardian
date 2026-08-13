// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PortfolioManager
 * @dev Smart contract for managing investment portfolios on-chain
 * Implements portfolio creation, asset allocation, transaction recording, and manager roles.
 */
contract PortfolioManager is Ownable, ReentrancyGuard {
    // Portfolio structure
    struct Portfolio {
        address owner; // The address that created the portfolio
        string name;
        string description;
        uint256 creationDate;
        uint256 lastRebalanceDate;
        bool isActive;
        address[] allowedManagers;
    }

    // Asset allocation structure
    struct AssetAllocation {
        address tokenAddress;
        string symbol;
        uint256 targetAllocation; // Basis points (e.g., 10% = 1000)
        uint256 currentAllocation; // Basis points (updated off-chain or by oracle)
        bool isActive;
    }

    // Transaction structure
    struct Transaction {
        uint256 timestamp;
        address tokenAddress;
        string symbol;
        uint256 amount;
        uint256 price; // Price per token in USD cents
        bool isBuy; // true for buy, false for sell
        string transactionType; // "rebalance", "deposit", "withdrawal", "manual"
    }

    // Portfolio mapping
    mapping(uint256 => Portfolio) public portfolios;
    mapping(uint256 => mapping(address => AssetAllocation))
        public assetAllocations;
    mapping(uint256 => address[]) public portfolioAssets;
    mapping(uint256 => Transaction[]) public portfolioTransactions;

    // User portfolios
    mapping(address => uint256[]) public userPortfolios;

    // Portfolio counter
    uint256 private portfolioCounter;

    // Events
    event PortfolioCreated(
        uint256 indexed portfolioId,
        address indexed owner,
        string name
    );
    event PortfolioUpdated(
        uint256 indexed portfolioId,
        string name,
        string description
    );
    event AssetAdded(
        uint256 indexed portfolioId,
        address tokenAddress,
        string symbol,
        uint256 targetAllocation
    );
    event AssetRemoved(
        uint256 indexed portfolioId,
        address tokenAddress,
        string symbol
    );
    event AllocationUpdated(
        uint256 indexed portfolioId,
        address tokenAddress,
        uint256 targetAllocation
    );
    event CurrentAllocationUpdated(
        uint256 indexed portfolioId,
        address tokenAddress,
        uint256 currentAllocation
    );
    event PortfolioRebalanced(uint256 indexed portfolioId, uint256 timestamp);
    event TransactionRecorded(
        uint256 indexed portfolioId,
        address tokenAddress,
        uint256 amount,
        bool isBuy
    );
    event ManagerAdded(uint256 indexed portfolioId, address manager);
    event ManagerRemoved(uint256 indexed portfolioId, address manager);

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        portfolioCounter = 1; // Start from 1
    }

    // --- Internal/Utility Functions ---

    /**
     * @dev Check if address is portfolio owner
     */
    function isPortfolioOwner(
        uint256 _portfolioId,
        address _address
    ) public view returns (bool) {
        return portfolios[_portfolioId].owner == _address;
    }

    /**
     * @dev Check if address is portfolio manager
     */
    function isPortfolioManager(
        uint256 _portfolioId,
        address _address
    ) public view returns (bool) {
        address[] memory managers = portfolios[_portfolioId].allowedManagers;
        for (uint256 i = 0; i < managers.length; i++) {
            if (managers[i] == _address) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Check if address is portfolio owner or manager
     */
    function isPortfolioOwnerOrManager(
        uint256 _portfolioId,
        address _address
    ) public view returns (bool) {
        return
            isPortfolioOwner(_portfolioId, _address) ||
            isPortfolioManager(_portfolioId, _address);
    }

    // --- Portfolio Management (Owner/Manager Only) ---

    /**
     * @dev Create a new portfolio
     * @param _name Portfolio name
     * @param _description Portfolio description
     * @return portfolioId New portfolio ID
     */
    function createPortfolio(
        string memory _name,
        string memory _description
    ) external returns (uint256) {
        uint256 portfolioId = portfolioCounter++;

        portfolios[portfolioId] = Portfolio({
            owner: msg.sender,
            name: _name,
            description: _description,
            creationDate: block.timestamp,
            lastRebalanceDate: block.timestamp,
            isActive: true,
            allowedManagers: new address[](0)
        });

        userPortfolios[msg.sender].push(portfolioId);

        emit PortfolioCreated(portfolioId, msg.sender, _name);

        return portfolioId;
    }

    /**
     * @dev Update portfolio details
     */
    function updatePortfolio(
        uint256 _portfolioId,
        string memory _name,
        string memory _description
    ) external {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");

        portfolios[_portfolioId].name = _name;
        portfolios[_portfolioId].description = _description;

        emit PortfolioUpdated(_portfolioId, _name, _description);
    }

    /**
     * @dev Add asset to portfolio
     */
    function addAsset(
        uint256 _portfolioId,
        address _tokenAddress,
        string memory _symbol,
        uint256 _targetAllocation
    ) external {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(
            _targetAllocation <= 10000,
            "Allocation too high (Max 10000 BP)"
        );
        require(_tokenAddress != address(0), "Invalid token address");
        require(
            assetAllocations[_portfolioId][_tokenAddress].tokenAddress ==
                address(0),
            "Asset already exists"
        );

        // Check total target allocation does not exceed 100%
        uint256 currentTotalTarget = _targetAllocation;
        for (uint256 i = 0; i < portfolioAssets[_portfolioId].length; i++) {
            address existingToken = portfolioAssets[_portfolioId][i];
            if (assetAllocations[_portfolioId][existingToken].isActive) {
                currentTotalTarget += assetAllocations[_portfolioId][
                    existingToken
                ].targetAllocation;
            }
        }
        require(
            currentTotalTarget <= 10000,
            "Total target allocation exceeds 100%"
        );

        // Add asset to portfolio
        assetAllocations[_portfolioId][_tokenAddress] = AssetAllocation({
            tokenAddress: _tokenAddress,
            symbol: _symbol,
            targetAllocation: _targetAllocation,
            currentAllocation: 0, // Initial current allocation is 0
            isActive: true
        });

        portfolioAssets[_portfolioId].push(_tokenAddress);

        emit AssetAdded(
            _portfolioId,
            _tokenAddress,
            _symbol,
            _targetAllocation
        );
    }

    /**
     * @dev Remove asset from portfolio
     */
    function removeAsset(uint256 _portfolioId, address _tokenAddress) external {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(
            assetAllocations[_portfolioId][_tokenAddress].tokenAddress !=
                address(0),
            "Asset not found"
        );
        require(
            assetAllocations[_portfolioId][_tokenAddress].isActive,
            "Asset already inactive"
        );

        // Deactivate asset
        assetAllocations[_portfolioId][_tokenAddress].isActive = false;

        emit AssetRemoved(
            _portfolioId,
            _tokenAddress,
            assetAllocations[_portfolioId][_tokenAddress].symbol
        );
    }

    /**
     * @dev Update asset target allocation
     */
    function updateTargetAllocation(
        uint256 _portfolioId,
        address _tokenAddress,
        uint256 _targetAllocation
    ) external {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(
            assetAllocations[_portfolioId][_tokenAddress].isActive,
            "Asset not active"
        );
        require(
            _targetAllocation <= 10000,
            "Allocation too high (Max 10000 BP)"
        );

        // Check total target allocation does not exceed 100%
        uint256 currentTotalTarget = _targetAllocation;
        for (uint256 i = 0; i < portfolioAssets[_portfolioId].length; i++) {
            address existingToken = portfolioAssets[_portfolioId][i];
            if (
                assetAllocations[_portfolioId][existingToken].isActive &&
                existingToken != _tokenAddress
            ) {
                currentTotalTarget += assetAllocations[_portfolioId][
                    existingToken
                ].targetAllocation;
            }
        }
        require(
            currentTotalTarget <= 10000,
            "Total target allocation exceeds 100%"
        );

        assetAllocations[_portfolioId][_tokenAddress].targetAllocation =
            _targetAllocation;

        emit AllocationUpdated(_portfolioId, _tokenAddress, _targetAllocation);
    }

    /**
     * @dev Update asset current allocation (Called by a trusted off-chain oracle/keeper)
     */
    function updateCurrentAllocation(
        uint256 _portfolioId,
        address[] memory _tokenAddresses,
        uint256[] memory _currentAllocations
    ) external onlyOwner {
        // Only owner (trusted keeper) can update current allocation
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(
            _tokenAddresses.length == _currentAllocations.length,
            "Array length mismatch"
        );

        uint256 totalAllocation = 0;

        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            require(
                assetAllocations[_portfolioId][_tokenAddresses[i]].isActive,
                "Asset not active"
            );
            assetAllocations[_portfolioId][_tokenAddresses[i]]
                .currentAllocation = _currentAllocations[i];
            totalAllocation += _currentAllocations[i];

            emit CurrentAllocationUpdated(
                _portfolioId,
                _tokenAddresses[i],
                _currentAllocations[i]
            );
        }

        // Note: Total current allocation can exceed 10000 due to market movements, but should be monitored off-chain.
        // We enforce a soft limit here, but a hard revert might be too restrictive.
        // require(totalAllocation <= 15000, 'Total current allocation significantly exceeds 150%');
    }

    /**
     * @dev Record portfolio rebalance
     */
    function recordRebalance(
        uint256 _portfolioId,
        address[] memory _tokenAddresses,
        string[] memory _symbols,
        uint256[] memory _amounts,
        uint256[] memory _prices,
        bool[] memory _isBuys
    ) external nonReentrant {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(
            _tokenAddresses.length == _symbols.length &&
                _tokenAddresses.length == _amounts.length &&
                _tokenAddresses.length == _prices.length &&
                _tokenAddresses.length == _isBuys.length,
            "Array length mismatch"
        );

        // Record transactions
        for (uint256 i = 0; i < _tokenAddresses.length; i++) {
            Transaction memory transaction = Transaction({
                timestamp: block.timestamp,
                tokenAddress: _tokenAddresses[i],
                symbol: _symbols[i],
                amount: _amounts[i],
                price: _prices[i],
                isBuy: _isBuys[i],
                transactionType: "rebalance"
            });

            portfolioTransactions[_portfolioId].push(transaction);

            emit TransactionRecorded(
                _portfolioId,
                _tokenAddresses[i],
                _amounts[i],
                _isBuys[i]
            );
        }

        // Update rebalance date
        portfolios[_portfolioId].lastRebalanceDate = block.timestamp;

        emit PortfolioRebalanced(_portfolioId, block.timestamp);
    }

    /**
     * @dev Record single transaction (deposit, withdrawal, manual trade)
     */
    function recordTransaction(
        uint256 _portfolioId,
        address _tokenAddress,
        string memory _symbol,
        uint256 _amount,
        uint256 _price,
        bool _isBuy,
        string memory _transactionType
    ) external nonReentrant {
        require(
            isPortfolioOwnerOrManager(_portfolioId, msg.sender),
            "Not authorized"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");

        Transaction memory transaction = Transaction({
            timestamp: block.timestamp,
            tokenAddress: _tokenAddress,
            symbol: _symbol,
            amount: _amount,
            price: _price,
            isBuy: _isBuy,
            transactionType: _transactionType
        });

        portfolioTransactions[_portfolioId].push(transaction);

        emit TransactionRecorded(_portfolioId, _tokenAddress, _amount, _isBuy);
    }

    /**
     * @dev Add portfolio manager (Portfolio Owner Only)
     */
    function addManager(uint256 _portfolioId, address _manager) external {
        require(
            portfolios[_portfolioId].owner == msg.sender,
            "Not portfolio owner"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");
        require(_manager != address(0), "Invalid address");

        // Check if manager already exists
        address[] storage managers = portfolios[_portfolioId].allowedManagers;
        for (uint256 i = 0; i < managers.length; i++) {
            if (managers[i] == _manager) {
                revert("Manager already exists");
            }
        }

        managers.push(_manager);

        emit ManagerAdded(_portfolioId, _manager);
    }

    /**
     * @dev Remove portfolio manager (Portfolio Owner Only)
     */
    function removeManager(uint256 _portfolioId, address _manager) external {
        require(
            portfolios[_portfolioId].owner == msg.sender,
            "Not portfolio owner"
        );
        require(portfolios[_portfolioId].isActive, "Portfolio not active");

        address[] storage managers = portfolios[_portfolioId].allowedManagers;
        bool found = false;
        uint256 index = 0;

        for (uint256 i = 0; i < managers.length; i++) {
            if (managers[i] == _manager) {
                found = true;
                index = i;
                break;
            }
        }

        require(found, "Manager not found");

        // Remove manager by replacing with last element and popping
        uint256 lastIndex = managers.length - 1;
        if (index != lastIndex) {
            managers[index] = managers[lastIndex];
        }
        managers.pop();

        emit ManagerRemoved(_portfolioId, _manager);
    }

    /**
     * @dev Deactivate portfolio (Portfolio Owner Only)
     */
    function deactivatePortfolio(uint256 _portfolioId) external {
        require(
            portfolios[_portfolioId].owner == msg.sender,
            "Not portfolio owner"
        );
        require(
            portfolios[_portfolioId].isActive,
            "Portfolio already inactive"
        );

        portfolios[_portfolioId].isActive = false;
    }

    /**
     * @dev Reactivate portfolio (Portfolio Owner Only)
     */
    function reactivatePortfolio(uint256 _portfolioId) external {
        require(
            portfolios[_portfolioId].owner == msg.sender,
            "Not portfolio owner"
        );
        require(!portfolios[_portfolioId].isActive, "Portfolio already active");

        portfolios[_portfolioId].isActive = true;
    }

    // --- View Functions ---

    /**
     * @dev Get portfolio assets
     */
    function getPortfolioAssets(
        uint256 _portfolioId
    ) external view returns (address[] memory) {
        return portfolioAssets[_portfolioId];
    }

    /**
     * @dev Get portfolio managers
     */
    function getPortfolioManagers(
        uint256 _portfolioId
    ) external view returns (address[] memory) {
        return portfolios[_portfolioId].allowedManagers;
    }

    /**
     * @dev Get user portfolios
     */
    function getUserPortfolios(
        address _user
    ) external view returns (uint256[] memory) {
        return userPortfolios[_user];
    }

    /**
     * @dev Get portfolio transaction count
     */
    function getPortfolioTransactionCount(
        uint256 _portfolioId
    ) external view returns (uint256) {
        return portfolioTransactions[_portfolioId].length;
    }

    /**
     * @dev Get portfolio transactions
     */
    function getPortfolioTransactions(
        uint256 _portfolioId,
        uint256 _startIndex,
        uint256 _count
    ) external view returns (Transaction[] memory) {
        uint256 totalCount = portfolioTransactions[_portfolioId].length;

        if (_startIndex >= totalCount) {
            return new Transaction[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }

        uint256 resultCount = endIndex - _startIndex;
        Transaction[] memory result = new Transaction[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = portfolioTransactions[_portfolioId][_startIndex + i];
        }

        return result;
    }

    /**
     * @dev Total number of portfolios ever created (active or not).
     * Exposed as a convenience read for dashboards/explorers - the
     * underlying counter is otherwise private.
     */
    function totalPortfolios() external view returns (uint256) {
        return portfolioCounter - 1;
    }
}
