// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Arrow
 * @notice An "Arrow" is Loxley's fractional-ownership token for a single
 *         open-source repository. Anyone can pay `tribute()` (send ETH) to a
 *         repo; the tribute is split pro-rata to everyone holding its Arrow at
 *         that moment, and holders collect their `bounty()` whenever they like.
 *
 *         This is the cashflow-generating asset: a repo becomes a thing money
 *         flows into, and Arrow holders have a real, on-chain claim on that
 *         money in proportion to how much of the repo they hold.
 *
 *         Distribution uses the well-known pull-based magnified-dividend pattern,
 *         so `tribute()` is O(1) no matter how many holders there are, and Arrow
 *         transfers correctly carry unclaimed bounties with them.
 *
 * @dev    MVP / alpha. Not audited. Testnet only. See README.
 */
contract Arrow is ERC20, ReentrancyGuard {
    string public repoFullName; // e.g. "octocat/hello-world"
    string public language;     // e.g. "TypeScript"
    address public repoOwner;   // the address that registered/tokenized the repo
    address public immutable sherwood; // the registry that minted this Arrow

    // --- bounty accounting (magnified-dividend pattern) ---
    uint256 internal constant MAGNITUDE = 2 ** 128;
    uint256 internal magnifiedTributePerShare;
    mapping(address => int256) internal magnifiedCorrections;
    mapping(address => uint256) internal collectedBounties;

    uint256 public totalTribute; // lifetime ETH paid to this repo, for display

    event TributePaid(address indexed from, uint256 amount);
    event BountyCollected(address indexed holder, uint256 amount);

    constructor(
        string memory _repoFullName,
        string memory _language,
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _repoOwner
    ) ERC20(_name, _symbol) {
        repoFullName = _repoFullName;
        language = _language;
        repoOwner = _repoOwner;
        sherwood = msg.sender;
        _mint(_repoOwner, _initialSupply);
    }

    /// @notice Pay tribute to this repo. The ETH is split among current Arrow holders.
    function tribute() external payable {
        require(msg.value > 0, "Nothing sent");
        require(totalSupply() > 0, "No holders");
        magnifiedTributePerShare += (msg.value * MAGNITUDE) / totalSupply();
        totalTribute += msg.value;
        emit TributePaid(msg.sender, msg.value);
    }

    /// @notice Total ETH ever allocated to `holder` across all tributes.
    function accumulativeBountyOf(address holder) public view returns (uint256) {
        int256 mag = int256(magnifiedTributePerShare * balanceOf(holder)) + magnifiedCorrections[holder];
        return uint256(mag) / MAGNITUDE;
    }

    /// @notice ETH `holder` can collect right now.
    function bountyOf(address holder) public view returns (uint256) {
        return accumulativeBountyOf(holder) - collectedBounties[holder];
    }

    /// @notice Collect your accumulated bounty.
    function bounty() external nonReentrant {
        uint256 amount = bountyOf(msg.sender);
        require(amount > 0, "Nothing to collect");
        collectedBounties[msg.sender] += amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit BountyCollected(msg.sender, amount);
    }

    /// @dev Keep bounty entitlements correct when Arrows move between holders.
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        int256 correction = int256(magnifiedTributePerShare * value);
        if (from != address(0)) magnifiedCorrections[from] += correction;
        if (to != address(0)) magnifiedCorrections[to] -= correction;
    }
}
