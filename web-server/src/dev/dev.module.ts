import { Module } from '@nestjs/common';
import { DevService } from './dev.service';
import { DevController } from './dev.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersSchema } from 'src/common/schemas/users.schema';
import { MulterModule } from '@nestjs/platform-express';
import { multerOptionsFactory } from 'src/common/middleware/multer-options.factory';
import { BondingCurveModule } from 'src/bonding-curve/bonding-curve.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Users', schema: UsersSchema }]),
    MulterModule.registerAsync({
      useFactory: () => multerOptionsFactory('Dev'),
    }),
    BondingCurveModule,
  ],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
