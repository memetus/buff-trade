import { registerAs } from '@nestjs/config';

export default registerAs('ai-agent', async () => {
  return {
    openai: process.env.OPENAI_API_KEY,

    xUsername: process.env.TWITTER_USERNAME,
    xPassword: process.env.TWITTER_PASSWORD,
    xEmail: process.env.TWITTER_EMAIL,
    xEndpoint: process.env.X_ENDPOINT,

    walletKey: process.env.WALLET_KEY,
    solanaRpcUrl: process.env.SOLANA_RPC_URL,

    okxApiKey: process.env.OKX_API_KEY,
    okxSecretKey: process.env.OKX_SECRET_KEY,
    okxProjectId: process.env.OKX_PROJECT_ID,
    okxApiPassPhrase: process.env.OKX_API_PASSPHRASE,

    heliusApiKey: process.env.HELIUS_API_KEY,
    elfaApiKey: process.env.ELFA_API_KEY,
  };
});
