import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type FundDataDocument = FundData & mongoose.Document;

@Schema({ timestamps: true })
export class FundData {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  initialFundAmount: number;

  @Prop({ required: true })
  solBalance: number;

  @Prop({ required: true })
  strategyPrompt: string;

  @Prop({ required: true })
  realTrading: boolean;

  @Prop({ required: true })
  isSurvived: boolean;

  @Prop({ required: true })
  generation: boolean;

  @Prop({ required: true })
  createdAt: Date;
}

export const FundDataSchema = SchemaFactory.createForClass(FundData);
