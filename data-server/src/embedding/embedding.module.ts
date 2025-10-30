import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { EmbeddingController } from './embedding.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';
import { TrendTokenSchema } from 'src/common/schemas/trend-token.schema';
import { KolPoolSchema } from 'src/common/schemas/kol-pool.schema';
import { KeywordSchema } from 'src/common/schemas/keyword.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CoinPrice', schema: CoinPriceSchema },
      { name: 'TrendToken', schema: TrendTokenSchema },
      { name: 'KolPool', schema: KolPoolSchema },
      { name: 'Keyword', schema: KeywordSchema },
    ]),
  ],
  controllers: [EmbeddingController],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
