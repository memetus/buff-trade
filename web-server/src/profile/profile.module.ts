import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersSchema } from 'src/common/schemas/users.schema';
import { BondingCurveModule } from 'src/bonding-curve/bonding-curve.module';
import { FundDataSchema } from 'src/common/schemas/fund-data.schema';
import { CoinPriceSchema } from 'src/common/schemas/coin-price.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Users', schema: UsersSchema },
      { name: 'FundData', schema: FundDataSchema },
      { name: 'CoinPrice', schema: CoinPriceSchema },
    ]),
    BondingCurveModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
