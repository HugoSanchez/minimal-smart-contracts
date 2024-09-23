// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

import {URIEncoding} from "./libraries/URIEncoding.sol";


/**
 * @title  Collection Smart Contract
 * @author Hugo Sanchez
 * @notice This is the new collection implementation. It gives users
 *         more control over their work: they own the collection and tokens.
 *         It also allows for social features: members & moderators
 *         as well as read/write permissions for both the collection itself and its tokens.
 */


interface IMarketMaster {
    function executeBuy(uint256 amount, address referer, address creator) external payable;
}

contract MinimalCollection is

    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable

{

    // Collection name.
    string public name;
    // Collection URI.
    string public contractURI;
    // Factory address
    address public factory;
    // Counter for token ids.
    uint256 private _tokenIds;
    // Smart contract version.
    uint256 public constant version = 1;
    // Max supply integer for checks.
    uint256 public constant MAX_SUPPLY = 2**256 - 1;
    // Bytes for moderator role.
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    ////////////////////////////
    // MAPPINGS section.
    ////////////////////////////

    // Token id => URI
    mapping(uint256 => string) private _uris;
    // TokenID => Supply
    mapping(uint256 => uint256) public tokenSupply;
    // TokenID => Creator
    mapping(uint256 => address) public creator;
    // TokenID => Post title
    mapping(uint256 => string) public titles;
    // TokenID => Post content
    mapping(uint256 => string) public content;
    // TokenID => Timestamp
    mapping(uint256 => uint256) public createdAt;
    // TokenID => Boolean
    mapping(uint256 => bool) public isGated;

    ////////////////////////////
    // EVENTS section.
    ////////////////////////////

    event NewVersoCreated(address indexed account, uint256 indexed id, string metadataURI);
    event NewVersoCollected(address indexed account, uint256 indexed id, uint256 amount);
    event VersoDeleted(address indexed moderator, uint256 indexed tokenId);
    event URIUpdated(uint256 indexed tokenId, string newUri);
    event ContractURIUpdated(string newUri);

    ////////////////////////////
    // ERRORS section.
    ////////////////////////////

    error InvalidTokenId();
    error MaxSupplyReached();
    error InsufficientBalance();
    error URIAlreadySet();

    ////////////////////////////
    // MODIFIERS section.
    ////////////////////////////

    modifier onlyModeratorsOrFactory() {
        require(hasRole(MODERATOR_ROLE, msg.sender) || msg.sender == factory, "Only moderators allowed");
        _;
    }

    ////////////////////////////
    // INITIALIZER section.
    ////////////////////////////

    function initialize(
        string memory _name,
        string memory _contractURI,
        address _owner
    )
        public
        initializer
    {
        // Set contract name
        name = _name;
        // Set contract metadata URI
        contractURI = _contractURI;
        // Set up factory
        factory = msg.sender;
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(MODERATOR_ROLE, _owner);
        _setRoleAdmin(MODERATOR_ROLE, MODERATOR_ROLE);
        // Initialize ERC1155
        __ERC1155_init(_name);
    }

    ////////////////////////////
    // BASIC SET / GET section.
    ////////////////////////////

    function uri(uint256 tokenId) override public view returns (string memory) {
        if (tokenId < _tokenIds) revert InvalidTokenId();
        return URIEncoding.generateURI(titles[tokenId], content[tokenId], creator[tokenId], address(this), tokenId);
    }

    function setContractURI(string calldata _contractURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        contractURI = _contractURI;
        emit ContractURIUpdated(_contractURI);
    }

    function updateContent(uint256 tokenId, string memory newContent) public {
        require(tokenId < _tokenIds, "Token does not exist");
        require(creator[tokenId] == msg.sender, "Only the owner can update the content");
        require(block.timestamp <= createdAt[tokenId] + 48 hours, "Update window has expired");
        content[tokenId] = newContent;
    }

    ////////////////////////////
    // CORE functionality
    ////////////////////////////

    /**
     * @dev Creates a new token.
     *
     * @param _title The title of the token.
     * @param _content The content of the token.
     * @param _recipient The recipient of the token.
     * @param _isGated Whether the token is gated.
     */
    function create(
        string calldata _title,
        string calldata _content,
        address _recipient,
        bool _isGated
    )
        external
        onlyModeratorsOrFactory()
    {
        if (_tokenIds >= MAX_SUPPLY) revert MaxSupplyReached();
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        tokenSupply[newTokenId] = 1;
        creator[newTokenId] = _recipient;
        titles[newTokenId] = _title;
        content[newTokenId] = _content;
        createdAt[newTokenId] = block.timestamp;
        isGated[newTokenId] = _isGated;
        _mint(_recipient, newTokenId, 1, "");
        string memory _url = URIEncoding.generateURI(_title, _content, msg.sender, address(this), newTokenId);
        emit NewVersoCreated(_recipient, newTokenId, _url);
    }


    /**
     * @dev Collects a token.
     *
     * @param id The ID of the token.
     * @param amount The amount of tokens to collect.
     * @param recipient The recipient of the tokens.
     * @param referer The referer of the tokens.
     * @param markerAddress The address of the market master.
     */
    function collect(
        uint256 id,
        uint256 amount,
        address recipient,
        address referer,
        address markerAddress
    )
        external
        payable
        nonReentrant
    {
        if (id > _tokenIds || id == 0) revert InvalidTokenId();
        if (tokenSupply[id] + amount > MAX_SUPPLY) revert MaxSupplyReached();

        IMarketMaster(markerAddress).executeBuy{value: msg.value}(amount, referer, creator[id]);
        _mint(recipient, id, amount, "");
        tokenSupply[id] += amount;
        emit NewVersoCollected(recipient, id, amount);
    }

    /**
     * @dev Burns tokens.
     *
     * @param tokenId The ID of the token to burn.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 tokenId, uint256 amount) external nonReentrant {
        if (balanceOf(msg.sender, tokenId) < amount) revert InsufficientBalance();
        _burn(msg.sender, tokenId, amount);
        tokenSupply[tokenId] -= amount;
    }

    ////////////////////////////
    // SAFETY functions
    ////////////////////////////

     function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
