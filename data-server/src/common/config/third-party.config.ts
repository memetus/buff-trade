import { registerAs } from '@nestjs/config';

export default registerAs('thirdParty', async () => {
  return {
    xUsername: process.env.TWITTER_USERNAME,
    xPassword: process.env.TWITTER_PASSWORD,
    xEmail: process.env.TWITTER_EMAIL,
    xApiKey: process.env.TWITTER_API_KEY,
    xApiSecret: process.env.TWITTER_API_SECRET_KEY,
    xAccessToken: process.env.TWITTER_ACCESS_TOKEN,
    xAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,

    dataServiceKey: process.env.DATA_SERVICE_KEY,

    openaiApiKey: process.env.OPENAI_API_KEY,
  };
});
