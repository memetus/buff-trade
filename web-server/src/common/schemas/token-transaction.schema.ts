import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TokenTransactionDocument = TokenTransaction & mongoose.Document;

@Schema({ timestamps: true, versionKey: '_v' })
export class TokenTransaction {
  @Prop({ required: true })
  fundId: string;

  @Prop({ required: true })
  walletAddress: string;

  @Prop({ required: true })
  tokenTicker: string;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  type: 'buy' | 'sell';

  @Prop({ required: true })
  solAmount: number;

  @Prop({ required: true })
  tokenAmount: number;

  @Prop()
  createdAt: Date;
}

export const TokenTransactionSchema =
  SchemaFactory.createForClass(TokenTransaction);
