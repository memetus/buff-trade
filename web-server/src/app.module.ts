import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongodbConfig from './common/config/mongodb.config';
import swaggerConfig from './common/config/swagger.config';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { HttpExceptionFilter } from './common/filter/http-exception.filter';
import { APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import sentryConfig from './common/config/sentry.config';
import jwtConfig from './common/config/jwt.config';
import s3Config from './common/config/s3.config';
import chainConfig from './common/config/chain.config';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';
import aiAgentConfig from './common/config/ai-agent.config';
import { AgentDataModule } from './agent-data/agent-data.module';
import { BondingCurveModule } from './bonding-curve/bonding-curve.module';
import { DevModule } from './dev/dev.module';
import { TokenModule } from './token/token.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.STAGE}`,
      load: [
        mongodbConfig,
        swaggerConfig,
        sentryConfig,
        jwtConfig,
        s3Config,
        chainConfig,
        aiAgentConfig,
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.url'),
        user: configService.get<string>('mongodb.user'),
        pass: configService.get<string>('mongodb.pass'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    UsersModule,
    TokenModule,
    AgentDataModule,
    ProfileModule,
    DevModule,
    BondingCurveModule,
    HealthModule,
  ],
  providers: [
    Logger,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
