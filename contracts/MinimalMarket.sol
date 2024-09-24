// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 < 0.9.0;


import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title  VERSO Market Smart Contract
 * @author Hugo Sanchez
 * @notice This smart contract allows users to "list" their tokens for selling.
 *         It centralizes all of the buying/seliing logic allowing collection smart
 *         contracts to be much leaner and focus on member management & permissions.
 */

contract MinimalMarket is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable
{

    /////////////////////////////
    // Constants
    /////////////////////////////

    // Fees
    address public protocolFeeDestination; // 0x0000000000000000000000000000000000000000;
    uint256 public protocolFeeDivider;
    uint256 public basePrice;

    ////////////////////////////////
    // Initialize
    ///////////////////////////////
     function initialize(
            address _owner,
            address _feeDestination
        ) public initializer {
            // Initialize ownable
            __Ownable_init(_owner);
            // Initiate UUPS
            __UUPSUpgradeable_init();
            // Initiate pausable
            __Pausable_init_unchained();
            // Set platform fee destination
            protocolFeeDestination = _feeDestination;
            // Set fee divider
            protocolFeeDivider = 10;
            // Set token price
            basePrice = 0.00042 ether;
    }

    ////////////////////////////////
    // Basic functions get/set
    ///////////////////////////////

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setFeeDestination(address _feeDestination) public onlyOwner() {
        protocolFeeDestination = _feeDestination;
    }

    function setProtocolFeePercent(uint256 _feeDivider) public onlyOwner() {
        protocolFeeDivider = _feeDivider;
    }

    ////////////////////////////////
    // Executes
    ///////////////////////////////

    /**
     * Public function to execute buy (collection is the caller (msg.sender))
     */
    function executeBuy(uint _amount, address _referer, address _creator)
        public
        payable
        whenNotPaused()
    {
        _executeRegularBuy(_referer, _creator, _amount);
    }

    /**
     * Executes trade.
     * Platform takes 10%. Referer takes 10%;
     * @param _referer: user who recomends gets a cut
     * @param _amount: amount to sell
     */
    function _executeRegularBuy(
        address _referer,
        address _creator,
        uint _amount
    )
        private
    {
        uint totalPrice = basePrice * _amount;
        require(msg.value > totalPrice, "Insufficient funds");
        uint protocolFee = totalPrice / 10;
        uint refererFee = totalPrice / 10;
        uint creatorFee = totalPrice - protocolFee - refererFee;
        (bool success1, ) = protocolFeeDestination.call{value: protocolFee}("");
        (bool success2, ) = _creator.call{value: creatorFee}("");
        (bool success3, ) = _referer.call{value: refererFee}("");
        require(success1 && success2 && success3, "Error executing regular buy");
    }

    ////////////////////////////
    // Others: Mandatory
    ////////////////////////////

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner()
        override
    {}

}
