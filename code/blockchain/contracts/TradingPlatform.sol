// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TradingPlatform
 * @dev Smart contract for secure trading of tokenized assets
 * Implements a simple order book (limit orders only) and trade execution.
 */
contract TradingPlatform is Ownable, ReentrancyGuard {
    // Maximum number of candidate orders scanned per createOrder() call when
    // attempting to match a newly-placed order. Bounds worst-case gas usage
    // as the order book grows; an order that isn't fully matched within this
    // scan simply remains open and can still be matched by future orders.
    uint256 public constant MAX_MATCH_SCAN = 100;

    // Order structure
    struct Order {
        uint256 id;
        address maker;
        address tokenAddress;
        uint256 amount; // Remaining amount to be filled
        uint256 price; // Price per token in USD cents
        bool isBuyOrder;
        uint256 timestamp;
        bool isActive;
    }

    // Trade structure
    struct Trade {
        uint256 id;
        uint256 buyOrderId;
        uint256 sellOrderId;
        address buyer;
        address seller;
        address tokenAddress;
        uint256 amount;
        uint256 price; // Execution price in USD cents
        uint256 timestamp;
    }

    // Platform settings
    uint256 public tradingFee; // Basis points (e.g., 0.25% = 25)
    address public feeCollector;
    bool public tradingEnabled;

    // Order and trade storage
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Trade) public trades;
    mapping(address => uint256[]) public userBuyOrders;
    mapping(address => uint256[]) public userSellOrders;
    mapping(address => uint256[]) public userTrades;

    // Counters
    uint256 private orderIdCounter;
    uint256 private tradeIdCounter;

    // Whitelisted tokens
    mapping(address => bool) public whitelistedTokens;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenAddress,
        uint256 amount,
        uint256 price,
        bool isBuyOrder
    );
    event OrderCancelled(uint256 indexed orderId);
    event OrderFilled(
        uint256 indexed orderId,
        uint256 indexed tradeId,
        uint256 filledAmount
    );
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed buyer,
        address indexed seller,
        address tokenAddress,
        uint256 amount,
        uint256 price
    );
    event TokenWhitelisted(address indexed tokenAddress);
    event TokenRemovedFromWhitelist(address indexed tokenAddress);
    event TradingStatusChanged(bool enabled);
    event TradingFeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address newFeeCollector);

    /**
     * @dev Constructor
     * @param _tradingFee Initial trading fee in basis points (max 100)
     * @param _feeCollector Address to collect fees
     */
    constructor(
        uint256 _tradingFee,
        address _feeCollector
    ) Ownable(msg.sender) {
        require(_tradingFee <= 100, "Fee too high (Max 1%)");
        require(_feeCollector != address(0), "Invalid fee collector");

        tradingFee = _tradingFee;
        feeCollector = _feeCollector;
        tradingEnabled = false;
        orderIdCounter = 1;
        tradeIdCounter = 1;
    }

    // --- Trading Operations ---

    /**
     * @dev Create a new order
     * @param _tokenAddress Token contract address
     * @param _amount Token amount
     * @param _price Price per token in USD cents
     * @param _isBuyOrder Whether order is buy or sell
     * @return orderId New order ID
     */
    function createOrder(
        address _tokenAddress,
        uint256 _amount,
        uint256 _price,
        bool _isBuyOrder
    ) external nonReentrant returns (uint256) {
        require(tradingEnabled, "Trading not enabled");
        require(whitelistedTokens[_tokenAddress], "Token not whitelisted");
        require(_amount > 0, "Amount must be greater than 0");
        require(_price > 0, "Price must be greater than 0");

        // For sell orders, check token balance and approval
        if (!_isBuyOrder) {
            IERC20 token = IERC20(_tokenAddress);
            // The contract must have approval to move the tokens from the seller
            require(
                token.allowance(msg.sender, address(this)) >= _amount,
                "Insufficient token allowance for sell order"
            );
        }
        // NOTE: For buy orders, the collateral (e.g., stablecoin) is assumed to be handled
        // by a separate mechanism or is implicit (e.g., ETH/WETH).
        // For simplicity, we assume the price is in USD cents and the collateral is available
        // or handled off-chain.

        // Create order
        uint256 orderId = orderIdCounter++;

        orders[orderId] = Order({
            id: orderId,
            maker: msg.sender,
            tokenAddress: _tokenAddress,
            amount: _amount,
            price: _price,
            isBuyOrder: _isBuyOrder,
            timestamp: block.timestamp,
            isActive: true
        });

        // Add to user orders
        if (_isBuyOrder) {
            userBuyOrders[msg.sender].push(orderId);
        } else {
            userSellOrders[msg.sender].push(orderId);
        }

        emit OrderCreated(
            orderId,
            msg.sender,
            _tokenAddress,
            _amount,
            _price,
            _isBuyOrder
        );

        // Try to match order immediately
        matchOrder(orderId);

        return orderId;
    }

    /**
     * @dev Cancel an order
     * @param _orderId Order ID
     */
    function cancelOrder(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];

        require(order.id != 0, "Order not found");
        require(order.maker == msg.sender, "Not order maker");
        require(order.isActive, "Order not active");

        order.isActive = false;

        // TODO: Handle token/collateral refund if necessary (e.g., if buy order locked collateral)

        emit OrderCancelled(_orderId);
    }

    /**
     * @dev Match order with existing orders
     * @param _orderId Order ID
     */
    function matchOrder(uint256 _orderId) internal {
        Order storage order = orders[_orderId];

        if (!order.isActive) {
            return;
        }

        // Iterate through existing orders to find a match, bounded by
        // MAX_MATCH_SCAN so a large order book can't push this call's gas
        // cost past the block gas limit. Any remainder that isn't matched
        // within the scan simply stays open on the book.
        uint256 scanned = 0;
        for (
            uint256 i = 1;
            i < orderIdCounter && scanned < MAX_MATCH_SCAN;
            i++
        ) {
            if (i == _orderId) {
                continue;
            }
            scanned++;

            Order storage matchingOrder = orders[i];

            if (!matchingOrder.isActive) {
                continue;
            }

            if (matchingOrder.tokenAddress != order.tokenAddress) {
                continue;
            }

            if (matchingOrder.isBuyOrder == order.isBuyOrder) {
                continue;
            }

            // Check price match
            bool priceMatches = false;

            if (order.isBuyOrder) {
                // Buy order matches if its price >= sell order price
                priceMatches = order.price >= matchingOrder.price;
            } else {
                // Sell order matches if its price <= buy order price
                priceMatches = order.price <= matchingOrder.price;
            }

            if (!priceMatches) {
                continue;
            }

            // Execute trade
            // The order with the lower price (sell order) dictates the trade price
            if (order.isBuyOrder) {
                executeTrade(_orderId, i, matchingOrder.price);
            } else {
                executeTrade(i, _orderId, order.price);
            }

            // If the original order is fully filled, stop matching
            if (!order.isActive) {
                break;
            }
        }
    }

    /**
     * @dev Execute trade between buy and sell orders
     * @param _buyOrderId Buy order ID
     * @param _sellOrderId Sell order ID
     * @param _tradePrice Execution price
     */
    function executeTrade(
        uint256 _buyOrderId,
        uint256 _sellOrderId,
        uint256 _tradePrice
    ) internal {
        Order storage buyOrder = orders[_buyOrderId];
        Order storage sellOrder = orders[_sellOrderId];

        require(buyOrder.isActive && sellOrder.isActive, "Orders not active");
        require(
            buyOrder.isBuyOrder && !sellOrder.isBuyOrder,
            "Invalid order types"
        );
        require(
            buyOrder.tokenAddress == sellOrder.tokenAddress,
            "Token mismatch"
        );

        // Determine trade amount
        uint256 tradeAmount =
            buyOrder.amount < sellOrder.amount
                ? buyOrder.amount
                : sellOrder.amount;

        // --- Token Transfer Logic ---

        // 1. Transfer tokens from seller to buyer
        IERC20 token = IERC20(buyOrder.tokenAddress);
        require(
            token.transferFrom(sellOrder.maker, buyOrder.maker, tradeAmount),
            "Token transfer failed"
        );

        // 2. Transfer collateral (e.g., stablecoin) from buyer to seller
        // KNOWN LIMITATION (not fixed here - needs a product/design decision,
        // see AUDIT_FIXES.md): the asset token moves from seller to buyer
        // above, but no payment/quote token ever moves from buyer to seller.
        // As written, sellers give up their tokens for free. Do not use this
        // contract to settle real trades until a quote-token escrow (e.g.
        // seller-side buy-order collateral locked in a stablecoin) is added
        // and audited.

        // 3. Collect fee (paid by the seller for simplicity)
        // In a real system, fees are usually deducted from the collateral or the asset.
        // We assume the fee is deducted from the seller's collateral/stablecoin.
        // Since we don't have the collateral token address, we'll skip the actual transfer
        // and assume the fee is tracked off-chain or paid in the asset token.
        // For a more complete implementation, a collateral token would be needed.

        // --- Update Orders and Record Trade ---

        // Update order amounts
        buyOrder.amount = buyOrder.amount - tradeAmount;
        sellOrder.amount = sellOrder.amount - tradeAmount;

        // Deactivate filled orders
        if (buyOrder.amount == 0) {
            buyOrder.isActive = false;
        }

        if (sellOrder.amount == 0) {
            sellOrder.isActive = false;
        }

        // Create trade record
        uint256 tradeId = tradeIdCounter++;

        trades[tradeId] = Trade({
            id: tradeId,
            buyOrderId: _buyOrderId,
            sellOrderId: _sellOrderId,
            buyer: buyOrder.maker,
            seller: sellOrder.maker,
            tokenAddress: buyOrder.tokenAddress,
            amount: tradeAmount,
            price: _tradePrice,
            timestamp: block.timestamp
        });

        // Add to user trades
        userTrades[buyOrder.maker].push(tradeId);
        userTrades[sellOrder.maker].push(tradeId);

        // Emit events
        emit OrderFilled(_buyOrderId, tradeId, tradeAmount);
        emit OrderFilled(_sellOrderId, tradeId, tradeAmount);
        emit TradeExecuted(
            tradeId,
            buyOrder.maker,
            sellOrder.maker,
            buyOrder.tokenAddress,
            tradeAmount,
            _tradePrice
        );
    }

    // --- Platform Settings (Owner Only) ---

    /**
     * @dev Whitelist token
     * @param _tokenAddress Token contract address
     */
    function whitelistToken(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        require(!whitelistedTokens[_tokenAddress], "Token already whitelisted");

        whitelistedTokens[_tokenAddress] = true;

        emit TokenWhitelisted(_tokenAddress);
    }

    /**
     * @dev Remove token from whitelist
     * @param _tokenAddress Token contract address
     */
    function removeTokenFromWhitelist(
        address _tokenAddress
    ) external onlyOwner {
        require(whitelistedTokens[_tokenAddress], "Token not whitelisted");

        whitelistedTokens[_tokenAddress] = false;

        emit TokenRemovedFromWhitelist(_tokenAddress);
    }

    /**
     * @dev Set trading status
     * @param _enabled Trading status
     */
    function setTradingEnabled(bool _enabled) external onlyOwner {
        tradingEnabled = _enabled;

        emit TradingStatusChanged(_enabled);
    }

    /**
     * @dev Set trading fee
     * @param _tradingFee Trading fee in basis points (max 100)
     */
    function setTradingFee(uint256 _tradingFee) external onlyOwner {
        require(_tradingFee <= 100, "Fee too high (Max 1%)");
        tradingFee = _tradingFee;
        emit TradingFeeUpdated(_tradingFee);
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

    // --- View Functions ---

    /**
     * @dev Get user buy orders
     */
    function getUserBuyOrders(
        address _user
    ) external view returns (uint256[] memory) {
        return userBuyOrders[_user];
    }

    /**
     * @dev Get user sell orders
     */
    function getUserSellOrders(
        address _user
    ) external view returns (uint256[] memory) {
        return userSellOrders[_user];
    }

    /**
     * @dev Get user trades
     */
    function getUserTrades(
        address _user
    ) external view returns (uint256[] memory) {
        return userTrades[_user];
    }

    /**
     * @dev Get active orders for token
     */
    function getActiveOrders(
        address _tokenAddress,
        bool _isBuyOrder,
        uint256 _startIndex,
        uint256 _count
    ) external view returns (Order[] memory) {
        // Count active orders
        uint256 activeCount = 0;
        for (uint256 i = 1; i < orderIdCounter; i++) {
            Order storage order = orders[i];
            if (
                order.isActive &&
                order.tokenAddress == _tokenAddress &&
                order.isBuyOrder == _isBuyOrder
            ) {
                activeCount++;
            }
        }

        if (_startIndex >= activeCount) {
            return new Order[](0);
        }

        uint256 endIndex = _startIndex + _count;
        if (endIndex > activeCount) {
            endIndex = activeCount;
        }

        uint256 resultCount = endIndex - _startIndex;
        Order[] memory result = new Order[](resultCount);

        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (
            uint256 i = 1;
            i < orderIdCounter && resultIndex < resultCount;
            i++
        ) {
            Order storage order = orders[i];
            if (
                order.isActive &&
                order.tokenAddress == _tokenAddress &&
                order.isBuyOrder == _isBuyOrder
            ) {
                if (currentIndex >= _startIndex && currentIndex < endIndex) {
                    result[resultIndex] = order;
                    resultIndex++;
                }
                currentIndex++;
            }
        }

        return result;
    }

    /**
     * @dev Total number of orders ever created (active or not). Exposed as a
     * convenience read for dashboards/explorers.
     */
    function totalOrders() external view returns (uint256) {
        return orderIdCounter - 1;
    }

    /**
     * @dev Total number of trades ever executed. Exposed as a convenience
     * read for dashboards/explorers.
     */
    function totalTrades() external view returns (uint256) {
        return tradeIdCounter - 1;
    }
}
