// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Arrow} from "./Arrow.sol";

/**
 * @title Sherwood
 * @notice The on-chain registry + factory at the heart of Loxley. Sherwood is
 *         the forest that holds every registered repo (the "quiver" of Arrows).
 *
 *         `registerRepo` does two things at once:
 *           1. records a GitHub repo on-chain (owner, name, language, timestamp)
 *           2. mints a fresh Arrow for it, with the whole initial supply going
 *              to whoever registered it.
 *
 *         An off-chain indexer listens for `RepoRegistered` events and enriches
 *         each entry with live GitHub metadata (stars, etc.) for the UI.
 *
 * @dev    MVP / alpha. Not audited. Testnet only. See README.
 */
contract Sherwood {
    struct Repo {
        string repoFullName;
        string language;
        address arrow; // the Arrow (token) for this repo
        address owner;
        uint64 registeredAt;
    }

    Repo[] public repos;
    mapping(string => uint256) private repoIndexByName; // name => index+1 (0 = unregistered)

    event RepoRegistered(
        uint256 indexed id,
        string repoFullName,
        string language,
        address indexed arrow,
        address indexed owner,
        uint64 registeredAt
    );

    /// @notice Register a repo and mint its Arrow in one transaction.
    /// @param repoFullName  GitHub "owner/name", e.g. "octocat/hello-world"
    /// @param language      primary language, for display/indexing
    /// @param arrowName     ERC-20 name, e.g. "Hello World Arrow"
    /// @param arrowSymbol   ERC-20 symbol, e.g. "HELLO"
    /// @param initialSupply total Arrow supply, minted to msg.sender
    function registerRepo(
        string calldata repoFullName,
        string calldata language,
        string calldata arrowName,
        string calldata arrowSymbol,
        uint256 initialSupply
    ) external returns (address arrow) {
        require(bytes(repoFullName).length > 0, "Empty repo name");
        require(initialSupply > 0, "Supply must be > 0");
        require(repoIndexByName[repoFullName] == 0, "Already registered");

        Arrow newArrow = new Arrow(
            repoFullName,
            language,
            arrowName,
            arrowSymbol,
            initialSupply,
            msg.sender
        );

        uint64 ts = uint64(block.timestamp);
        repos.push(
            Repo({
                repoFullName: repoFullName,
                language: language,
                arrow: address(newArrow),
                owner: msg.sender,
                registeredAt: ts
            })
        );
        repoIndexByName[repoFullName] = repos.length; // index + 1

        emit RepoRegistered(repos.length - 1, repoFullName, language, address(newArrow), msg.sender, ts);
        return address(newArrow);
    }

    function repoCount() external view returns (uint256) {
        return repos.length;
    }

    function isRegistered(string calldata repoFullName) external view returns (bool) {
        return repoIndexByName[repoFullName] != 0;
    }

    /// @notice Paginated read so a frontend can page through the quiver.
    function getRepos(uint256 offset, uint256 limit) external view returns (Repo[] memory page) {
        uint256 total = repos.length;
        if (offset >= total) return new Repo[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        page = new Repo[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = repos[i];
        }
    }
}
