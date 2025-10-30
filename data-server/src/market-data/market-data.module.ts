import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';
import { TrendTokenSchema } from 'src/common/schemas/trend-token.schema';
import { EmbeddingModule } from 'src/embedding/embedding.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CoinPrice', schema: CoinPriceSchema },
      { name: 'TrendToken', schema: TrendTokenSchema },
    ]),
    EmbeddingModule,
  ],
  controllers: [MarketDataController],
  providers: [MarketDataService],
})
export class MarketDataModule {}
