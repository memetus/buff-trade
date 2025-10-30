import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TradingResultDocument = TradingResult & mongoose.Document;

@Schema({ timestamps: true })
export class TradingResult {
  @Prop({ required: true })
  fundId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true, enum: ['BUY', 'SELL'] })
  recommendation: 'BUY' | 'SELL';

  @Prop({ required: true })
  analysis: string;

  @Prop({ required: true })
  allocation: number;

  @Prop({ required: true })
  txHash: string;

  @Prop({ required: true })
  tokenAmount: number;

  @Prop({ required: true })
  solAmount: number;

  @Prop({ required: true })
  priceSol: number;

  @Prop({ required: true })
  createdAt: Date;
}

export const TradingResultSchema = SchemaFactory.createForClass(TradingResult);
