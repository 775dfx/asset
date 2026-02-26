// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GameAssetVault {
    mapping(address => string[]) public userAssets;

    function saveAsset(string memory cid) public {
        userAssets[msg.sender].push(cid);
    }

    function getAssets(address user) public view returns (string[] memory) {
        return userAssets[user];
    }
}
