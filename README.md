# Smart Contract for a minimal onchain publishing platform

Here are the smart contracts for a minimal onchain publishing platform which consist of:

- A profile registry
- An ERC1155 collection smart contract
- A factory for creating new profiles and collections
- A simple market for fee redirection

Every user owns an ERC1155 smart contract where they will mint all posts. Posts are fully onchain saved as HTML on Ethereum. The factory smart contracts allows to cheaply deploy a new collection smart contract. It's also built in a way that a user can:

- create a new profile
- create a new collection
- create a new post

all in a single transaction.

```shell
npm install
npx hardhat test
```
