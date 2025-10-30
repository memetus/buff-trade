export const getNetworkConfig = () => {
  // Production version - Use mainnet for all environments
  const network = "mainnet-beta";

  const getEndpoint = () => {
    return process.env.NEXT_PUBLIC_HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com";
  };

  const getGenesisHash = () => {
    return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"; // Mainnet Genesis Hash
  };

  return {
    network,
    endpoint: getEndpoint(),
    genesisHash: getGenesisHash(),
    isDevnet: false,
    isMainnet: true,
  };
};
