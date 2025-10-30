import { Module } from '@nestjs/common';
import { RealTradingService } from './real-trading.service';
import { RealTradingController } from './real-trading.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';
import { TradingResultSchema } from 'src/common/schemas/trading-result.schema';
import { AgentModule } from '../agent/agent.module';
import { SendaiService } from './service/sendai.service';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';
import { PortfolioSchema } from 'src/common/schemas/portfolio.schema';

@Module({
  imports: [
    AgentModule,
    MongooseModule.forFeature([
      { name: 'FundData', schema: FundDataSchema },
      { name: 'TradingResult', schema: TradingResultSchema },
      { name: 'CoinPrice', schema: CoinPriceSchema },
      { name: 'Portfolio', schema: PortfolioSchema },
    ]),
    AgentModule,
  ],
  controllers: [RealTradingController],
  providers: [RealTradingService, SendaiService],
})
export class RealTradingModule {}
