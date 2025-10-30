import { registerAs } from '@nestjs/config';

export default registerAs('ai-agent', async () => {
  return {
    openai: process.env.OPENAI_API_KEY,
    payerKey: process.env.PAYER_KEY,
    partnerKey: process.env.PARTNER_KEY,
    endpointAiTrading: process.env.ENDPOINT_AI_TRADING,
    heliusApiKey: process.env.HELIUS_API_KEY,
  };
});
