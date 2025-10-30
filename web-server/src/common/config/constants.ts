export const CONSTANTS = {
  get SOLANA_ENDPOINT() {
    return process.env.CHAIN === 'mainnet' ? 'mainnet-beta' : 'devnet';
  },
  get HELIUS_API_BASE_URL() {
    return process.env.CHAIN === 'mainnet'
      ? 'https://api.helius.xyz'
      : 'https://api-devnet.helius-rpc.com';
  },

  // SOLANA_ENDPOINT: 'devnet',
  // HELIUS_API_BASE_URL: 'https://api-devnet.helius-rpc.com',

  MIGRATION_THRESHOLD: 85,
  DAMM_CONFIG_ADDRESS: 'Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp', // FixedBps100
};
