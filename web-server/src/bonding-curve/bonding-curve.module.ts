import { Module } from '@nestjs/common';
import { BondingCurveService } from './bonding-curve.service';
import { BondingCurveController } from './bonding-curve.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CoinPrice', schema: CoinPriceSchema },
      { name: 'FundData', schema: FundDataSchema },
    ]),
  ],
  controllers: [BondingCurveController],
  providers: [BondingCurveService],
  exports: [BondingCurveService],
})
export class BondingCurveModule {}
