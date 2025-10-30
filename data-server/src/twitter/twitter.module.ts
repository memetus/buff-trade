import { Module } from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { TwitterController } from './twitter.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { KolPoolSchema } from 'src/common/schemas/kol-pool.schema';
import { EmbeddingModule } from 'src/embedding/embedding.module';
import { KeywordSchema } from 'src/common/schemas/keyword.schema';
import { TrendTokenSchema } from 'src/common/schemas/trend-token.schema';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'KolPool', schema: KolPoolSchema },
      { name: 'Keyword', schema: KeywordSchema },
      { name: 'TrendToken', schema: TrendTokenSchema },
      { name: 'CoinPrice', schema: CoinPriceSchema },
    ]),
    EmbeddingModule,
  ],
  controllers: [TwitterController],
  providers: [TwitterService],
})
export class TwitterModule {}
