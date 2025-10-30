import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { MulterModule } from '@nestjs/platform-express';
import { multerOptionsFactory } from 'src/common/middleware/multer-options.factory';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenSchema } from 'src/common/schemas/token.schema';
import { TokenGateway } from './token.gateway';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';
import { UsersSchema } from 'src/common/schemas/users.schema';
import { TokenTransactionSchema } from 'src/common/schemas/token-transaction.schema';
import { TradingResultSchema } from 'src/common/schemas/trading-result.schema';
import { StrategySchema } from 'src/common/schemas/strategy.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Token', schema: TokenSchema },
      { name: 'FundData', schema: FundDataSchema },
      { name: 'Users', schema: UsersSchema },
      { name: 'TokenTransaction', schema: TokenTransactionSchema },
      { name: 'TradingResult', schema: TradingResultSchema },
      { name: 'Strategy', schema: StrategySchema },
    ]),
    MulterModule.registerAsync({
      useFactory: () => multerOptionsFactory('Token'),
    }),
  ],
  controllers: [TokenController],
  providers: [TokenService, TokenGateway],
})
export class TokenModule {}
