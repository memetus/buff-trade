import { Module } from '@nestjs/common';
import { VirtualTradingService } from './virtual-trading.service';
import { VirtualTradingController } from './virtual-trading.controller';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentModule } from 'src/agent/agent.module';
import { TradingResultSchema } from 'src/common/schemas/trading-result.schema';
import { PortfolioSchema } from 'src/common/schemas/portfolio.schema';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';

@Module({
  imports: [
    AgentModule,
    MongooseModule.forFeature([
      { name: 'FundData', schema: FundDataSchema },
      { name: 'TradingResult', schema: TradingResultSchema },
      { name: 'Portfolio', schema: PortfolioSchema },
      { name: 'CoinPrice', schema: CoinPriceSchema },
    ]),
  ],
  controllers: [VirtualTradingController],
  providers: [VirtualTradingService],
})
export class VirtualTradingModule {}
