//SPDX-License-Identifier: MIT
pragma solidity >= 0.8.20;

import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

library URIEncoding {
    using Strings for uint256;

    function generateURI(
        string memory title,
        string memory content,
        address creator,
        address collection,
        uint256 tokenId
    ) public pure returns (string memory) {
        string memory svg = generateSVG(title);
        string memory dynamicUrl = string(
            abi.encodePacked(
                "www.sugar.xyz/",
                Strings.toHexString(uint160(collection), 20),
                "/",
                Strings.toString(tokenId)
            )
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                title,
                                '","description":"A fully onchain post you can read on ',
                                dynamicUrl,
                                '",',
                                '"author":"',
                                creator,
                                '",',
                                '"image":"',
                                svg,
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

    function generateSVG(
        string memory title
    ) internal pure returns (string memory) {
        // Define SVG parameters
        uint256 width = 400;
        uint256 height = 400;
        uint256 fontSize = 24;
        uint256 lineHeight = 30;
        uint256 padding = 40;
        uint256 footerFontSize = 12;
        uint256 maxWidth = width - (2 * padding);

        // Wrap text
        string[] memory lines = wrapText(title, maxWidth / (fontSize / 2)); // Approximate characters per line

        // Calculate text block height
        uint256 textHeight = lines.length * lineHeight;
        // Calculate footer position
        uint256 footerY = height - padding - (footerFontSize / 2);
        uint256 mainTextBottom = ((height - textHeight) / 2) +
            textHeight +
            lineHeight;
        if (footerY < mainTextBottom) {
            footerY = mainTextBottom + (footerFontSize / 2);
        }

        // Start SVG
        string memory svg = string(
            abi.encodePacked(
                '<svg xmlns="http://www.w3.org/2000/svg" width="',
                width.toString(),
                '" height="',
                height.toString(),
                '" viewBox="0 0 ',
                width.toString(),
                " ",
                height.toString(),
                '">',
                '<rect width="100%" height="100%" fill="#fafaf9"/>',
                "<style>.text { fill: #000; font-family: Courier New, monospace; font-size: ",
                fontSize.toString(),
                "px; }",
                ".footer { fill: #000; font-family: Courier New, monospace; font-size: ",
                footerFontSize.toString(),
                "px;}</style>"
            )
        );

        // Add text lines
        uint256 yPosition = (height - textHeight) / 2 + fontSize; // Center text block vertically
        for (uint i = 0; i < lines.length; i++) {
            svg = string(
                abi.encodePacked(
                    svg,
                    '<text x="50%" y="',
                    yPosition.toString(),
                    '" class="text" text-anchor="middle">',
                    escapeTitle(lines[i]),
                    "</text>"
                    '<text x="50%" y="',
                    footerY.toString(),
                    '" class="footer" text-anchor="middle">',
                    "Read it on sugar.xyz",
                    "</text>"
                )
            );
            yPosition += lineHeight;
        }

        // Close SVG
        svg = string(abi.encodePacked(svg, "</svg>"));

        string memory svgBase64 = Base64.encode(bytes(svg));
        return
            string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64));
    }

    function wrapText(
        string memory text,
        uint256 maxLineLength
    ) internal pure returns (string[] memory) {
        bytes memory textBytes = bytes(text);
        uint256 numLines = (textBytes.length + maxLineLength - 1) /
            maxLineLength; // Round up
        string[] memory lines = new string[](numLines);

        uint256 lineStart = 0;
        for (uint256 i = 0; i < numLines; i++) {
            uint256 lineEnd = lineStart + maxLineLength;
            if (lineEnd > textBytes.length) {
                lineEnd = textBytes.length;
            } else {
                // Find the last space before maxLineLength
                while (lineEnd > lineStart && textBytes[lineEnd - 1] != 0x20) {
                    lineEnd--;
                }
                if (lineEnd == lineStart) {
                    lineEnd = lineStart + maxLineLength; // Force break if no space found
                }
            }

            bytes memory lineBytes = new bytes(lineEnd - lineStart);
            for (uint256 j = 0; j < lineBytes.length; j++) {
                lineBytes[j] = textBytes[lineStart + j];
            }
            lines[i] = string(lineBytes);

            lineStart = lineEnd;
            if (lineStart >= textBytes.length) break;
        }

        return lines;
    }

    function escapeTitle(
        string memory _title
    ) internal pure returns (string memory) {
        bytes memory title = bytes(_title);
        bytes memory result = new bytes(title.length * 6);
        uint256 resultIndex = 0;

        for (uint256 i = 0; i < title.length; i++) {
            bytes1 char = title[i];
            if (char == "&") {
                for (uint j = 0; j < 5; j++)
                    result[resultIndex++] = bytes("&amp;")[j];
            } else if (char == "<") {
                for (uint j = 0; j < 4; j++)
                    result[resultIndex++] = bytes("&lt;")[j];
            } else if (char == ">") {
                for (uint j = 0; j < 4; j++)
                    result[resultIndex++] = bytes("&gt;")[j];
            } else if (char == '"') {
                for (uint j = 0; j < 6; j++)
                    result[resultIndex++] = bytes("&quot;")[j];
            } else if (char == "'") {
                for (uint j = 0; j < 6; j++)
                    result[resultIndex++] = bytes("&#39;")[j];
            } else {
                result[resultIndex++] = char;
            }
        }

        bytes memory finalResult = new bytes(resultIndex);
        for (uint256 i = 0; i < resultIndex; i++) {
            finalResult[i] = result[i];
        }

        return string(finalResult);
    }
}
