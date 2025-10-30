import { registerAs } from '@nestjs/config';

export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  webhookUrl: process.env.SLACK_WEBHOOK,
}));
