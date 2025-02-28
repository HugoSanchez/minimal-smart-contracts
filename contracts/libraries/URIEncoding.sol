//SPDX-License-Identifier: MIT
pragma solidity >= 0.8.20;

import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

library URIEncoding {
    using Strings for uint256;

    function generateURI(
        string memory content,
        address creator,
        address collection,
        uint256 tokenId
    ) public pure returns (string memory) {
        string memory dynamicUrl = string(
            abi.encodePacked(
                "www.sugar.xyz/",
                Strings.toHexString(uint160(collection), 20),
                "/",
                Strings.toString(tokenId)
            )
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"description":"A fully onchain post you can read on ',
                            dynamicUrl,
                            '",',
                            '"author":"',
                            Strings.toHexString(uint160(creator), 20),
                            '",',
                            '"content":"',
                            content,
                            '"}'
                        )
                    )
                )
            )
        );
    }
}
