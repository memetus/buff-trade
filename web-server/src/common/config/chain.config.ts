import { registerAs } from '@nestjs/config';

export default registerAs('chain', async () => {
  return {
    network: process.env.NETWORK_NAME,
    chain: process.env.CHAIN,
    endpoint: process.env.ENDPOINT,
    serviceKey: process.env.SERVICE_KEY,
  };
});
