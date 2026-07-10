/* Minimal ABIs for the Loxley contracts (match contracts/Sherwood.sol +
   contracts/Arrow.sol). Once `forge build` runs, these can be swapped for the
   generated artifacts in out/ — keep the shapes in sync until then. */

const repoTuple = {
  type: "tuple",
  components: [
    { name: "repoFullName", type: "string" },
    { name: "language", type: "string" },
    { name: "arrow", type: "address" },
    { name: "owner", type: "address" },
    { name: "registeredAt", type: "uint64" },
  ],
};

export const sherwoodAbi = [
  {
    type: "function", name: "registerRepo", stateMutability: "nonpayable",
    inputs: [
      { name: "repoFullName", type: "string" },
      { name: "language", type: "string" },
      { name: "arrowName", type: "string" },
      { name: "arrowSymbol", type: "string" },
      { name: "initialSupply", type: "uint256" },
    ],
    outputs: [{ name: "arrow", type: "address" }],
  },
  { type: "function", name: "repoCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function", name: "isRegistered", stateMutability: "view",
    inputs: [{ name: "repoFullName", type: "string" }], outputs: [{ type: "bool" }],
  },
  {
    type: "function", name: "getRepos", stateMutability: "view",
    inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [{ name: "page", type: "tuple[]", components: repoTuple.components }],
  },
  {
    type: "event", name: "RepoRegistered",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "repoFullName", type: "string", indexed: false },
      { name: "language", type: "string", indexed: false },
      { name: "arrow", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "registeredAt", type: "uint64", indexed: false },
    ],
  },
];

export const arrowAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "repoFullName", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "language", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "repoOwner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalTribute", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "bountyOf", stateMutability: "view", inputs: [{ name: "holder", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "tribute", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "bounty", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ type: "bool" }] },
  {
    type: "event", name: "TributePaid",
    inputs: [{ name: "from", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }],
  },
  {
    type: "event", name: "BountyCollected",
    inputs: [{ name: "holder", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }],
  },
];
