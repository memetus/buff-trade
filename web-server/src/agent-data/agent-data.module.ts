import { Module } from '@nestjs/common';
import { AgentDataService } from './agent-data.service';
import { AgentDataController } from './agent-data.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';
import { TradingResultSchema } from 'src/common/schemas/trading-result.schema';
import { PortfolioSchema } from 'src/common/schemas/portfolio.schema';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';
import { TokenSchema } from 'src/common/schemas/token.schema';
import { BondingCurveModule } from 'src/bonding-curve/bonding-curve.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FundData', schema: FundDataSchema },
      { name: 'TradingResult', schema: TradingResultSchema },
      { name: 'Portfolio', schema: PortfolioSchema },
      { name: 'CoinPrice', schema: CoinPriceSchema },
      { name: 'Token', schema: TokenSchema },
    ]),
    BondingCurveModule,
  ],
  controllers: [AgentDataController],
  providers: [AgentDataService],
})
export class AgentDataModule {}
