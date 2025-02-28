// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Minimal Collection interface
interface IMinimalCollection {
    function initialize(string memory _name, string memory _contractURI, address _owner) external;
    function create(string calldata _content, address _recipient, bool _isGated) external;
}

contract CollectionFactory is Ownable {
    ////////////////////////////////
    // Constants
    ///////////////////////////////

    // Minimal collection implementation address
    address public immutable collectionImplementation;

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

    ////////////////////////////////
    // Constructor
    ///////////////////////////////
    constructor(
        address _collectionImplementation
    )
        Ownable(msg.sender)
    {
        collectionImplementation = _collectionImplementation;
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
        string memory _content,
        bool _isGated
    ) external returns (address) {
        address clone = Clones.clone(collectionImplementation);
        IMinimalCollection(clone).initialize(_name, _contractURI, msg.sender);
        IMinimalCollection(clone).create(_content, msg.sender, _isGated);
        emit CollectionCreatedWithPost(msg.sender, clone, 1);
        return clone;
    }
}
