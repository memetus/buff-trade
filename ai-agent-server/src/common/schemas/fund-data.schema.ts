import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type FundDataDocument = FundData & mongoose.Document;

@Schema({ timestamps: true })
export class FundData {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  creator: string;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  bondingCurvePool: string;

  @Prop()
  tokenId: string;

  @Prop({ required: true })
  initialFundAmount: number;

  @Prop({ required: true })
  solBalance: number;

  @Prop({ required: true })
  strategyPrompt: string;

  @Prop({ required: true })
  isRealTrading: boolean;

  @Prop({ required: true })
  isSurvived: boolean;

  @Prop({ required: true })
  generation: number;

  @Prop({ default: [] })
  offspring: string[];

  @Prop({ required: true })
  totalPnl: number;

  @Prop({ required: true })
  nav: number;

  @Prop({ required: true })
  realizedProfit: number;

  @Prop({ required: true })
  unRealizedProfit: number;

  @Prop({ default: true })
  isRunning: boolean;

  @Prop({ default: false })
  isMigrated: boolean;

  @Prop()
  migratedAt: Date;

  @Prop({ default: '' })
  dammV2Pool: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;

  @Prop({
    type: [
      {
        value: { type: Number, required: true },
        timestamp: { type: Date, required: true },
      },
    ],
    default: [],
  })
  totalPnLHistory: Array<{
    value: number;
    timestamp: Date;
  }>;
}

export const FundDataSchema = SchemaFactory.createForClass(FundData);
