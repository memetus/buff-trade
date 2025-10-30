import { registerAs } from '@nestjs/config';

export default registerAs('aws-s3', () => ({
  accessKey: process.env.AWS_S3_ACCESS_KEY,
  secretKey: process.env.AWS_S3_SECRET_KEY,
  region: process.env.AWS_S3_REGION,
  bucket: process.env.AWS_S3_BUCKET,
}));
