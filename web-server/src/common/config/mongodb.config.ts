import { registerAs } from '@nestjs/config';

export default registerAs('mongodb', async () => {
  return {
    url: process.env.MONGODB_URL,
    user: process.env.MONGODB_USERNAME,
    pass: process.env.MONGODB_PASSWORD,
  };
});
