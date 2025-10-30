import { Module } from '@nestjs/common';
import { TokenPoolService } from './token-pool.service';
import { TokenPoolController } from './token-pool.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TrendTokenSchema } from 'src/common/schemas/trend-token.schema';
import { PortfolioSchema } from 'src/common/schemas/portfolio.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'TrendToken', schema: TrendTokenSchema },
      { name: 'Portfolio', schema: PortfolioSchema },
    ]),
  ],
  controllers: [TokenPoolController],
  providers: [TokenPoolService],
})
export class TokenPoolModule {}
