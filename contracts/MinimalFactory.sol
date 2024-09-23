// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Profile Registry interface
interface IProfileRegistry {
    function registerProfile(address recipient, string calldata _handle, string calldata _description, string calldata _metadataURI) external;
}

// Minimal Collection interface
interface IMinimalCollection {
    function initialize(string memory _name, string memory _contractURI, address _owner) external;
    function create(string calldata _title, string calldata _content, address _recipient, bool _isGated) external;
}

contract CollectionFactory is Ownable {
    ////////////////////////////////
    // Constants
    ///////////////////////////////

    // Minimal collection implementation address
    address public immutable collectionImplementation;
    // Profile registry address
    address public immutable profileRegistry;


    ////////////////////////////////
    // Events
    ///////////////////////////////

    // Collection cloned
    event CollectionCreated(
        address indexed owner,
        address collection
    );

    // Collection cloned + first post minted
    event CollectionCreatedWithPost(
        address indexed owner,
        address collection,
        uint256 postId
    );

    // Profile registered + collection cloned + post minted.
    event ProfileAndCollectionCreated(
        address indexed owner,
        address collection,
        uint256 postId
    );

    ////////////////////////////////
    // Constructor
    ///////////////////////////////
    constructor(
        address _collectionImplementation,
        address _profileRegistry
    )
        Ownable(msg.sender)
    {
        collectionImplementation = _collectionImplementation;
        profileRegistry = _profileRegistry;
    }


    ////////////////////////////////
    // Core functions
    ///////////////////////////////

    // Simple create collection
    function createCollection(
        string memory _name,
        string memory _contractURI
    ) external returns (address) {
        address clone = Clones.clone(collectionImplementation);
        IMinimalCollection(clone).initialize(_name, _contractURI, msg.sender);
        emit CollectionCreated(msg.sender, clone);
        return clone;
    }

    // Create collection AND post
    function createCollectionAndPost(
        string memory _name,
        string memory _contractURI,
        string memory _title,
        string memory _content,
        bool _isGated
    ) external returns (address) {
        address clone = Clones.clone(collectionImplementation);
        IMinimalCollection(clone).initialize(_name, _contractURI, msg.sender);
        IMinimalCollection(clone).create(_title, _content, msg.sender, _isGated);
        emit CollectionCreatedWithPost(msg.sender, clone, 1);
        return clone;
    }

    // Register profile
    // AND create collection
    // AND create first post
    function createProfileCollectionAndPost(
        string memory _handle,
        string memory _description,
        string memory _profileMetadataURI,
        string memory _collectionName,
        string memory _collectionURI,
        string memory _postTitle,
        string memory _postContent,
        bool _isGated
    ) external returns (address) {
        // Register profile
        IProfileRegistry(profileRegistry).registerProfile(msg.sender, _handle, _description, _profileMetadataURI);
        // Create collection
        address clone = Clones.clone(collectionImplementation);
        IMinimalCollection(clone).initialize(_collectionName, _collectionURI, msg.sender);
        // Create first post
        IMinimalCollection(clone).create(_postTitle, _postContent, msg.sender, _isGated);
        // Emit and return
        emit ProfileAndCollectionCreated(msg.sender, clone, 1);
        return clone;
    }
}
