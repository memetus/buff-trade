import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as basicAuth from 'express-basic-auth';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { SentryInterceptor } from './common/interceptor/sentry.interceptor';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          level: process.env.STAGE === 'prod' ? 'info' : 'debug',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.printf(({ timestamp, level, message }) => {
              const colorize = winston.format.colorize();
              return `${colorize.colorize(level, `${timestamp} ${level}:`)} ${message}`;
            }),
          ),
        }),
      ],
    }),
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      // class-transformer 적용
      transform: true,
    }),
  );

  app.use(
    ['/docs', '/docs-json'],
    basicAuth({
      challenge: true,
      users: {
        [configService.get('swagger.user')]:
          configService.get('swagger.password'),
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Home Memetus web-server API')
    .setDescription('API description')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
    },
  };
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, customOptions);

  // Sentry
  Sentry.init({ dsn: configService.get('sentry.dsn') });
  app.useGlobalInterceptors(new SentryInterceptor(configService));

  const port = configService.get('PORT') || 8080;
  await app.listen(port);
  console.log(
    `memetus-webserver is running on port ${port}, STAGE:${process.env.STAGE}`,
  );
}
bootstrap();
