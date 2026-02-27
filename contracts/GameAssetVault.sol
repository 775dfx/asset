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

    function deleteAsset(string memory cid) public returns (bool) {
        string[] storage assets = userAssets[msg.sender];
        uint256 length = assets.length;
        for (uint256 i = 0; i < length; i++) {
            if (keccak256(bytes(assets[i])) == keccak256(bytes(cid))) {
                for (uint256 j = i; j < length - 1; j++) {
                    assets[j] = assets[j + 1];
                }
                assets.pop();
                return true;
            }
        }
        return false;
    }
}
