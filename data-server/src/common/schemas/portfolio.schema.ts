import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type PortfolioDocument = Portfolio & mongoose.Document;

@Schema({ timestamps: true })
export class Portfolio {
  @Prop({ required: true, index: true })
  fundId: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  tokenAddress: string;

  @Prop({ required: true })
  currentAmount: number;

  @Prop({ required: true })
  allocation: number;

  @Prop({ required: true })
  lastPriceSol: number;

  @Prop({ required: true })
  totalBuyAmount: number;

  @Prop({ required: true })
  totalSellAmount: number;

  @Prop({ required: true })
  totalBuySolAmount: number;

  @Prop({ required: true })
  totalSellSolAmount: number;

  @Prop({ required: true })
  averageBuyPriceSol: number;

  @Prop({ required: true })
  averageSellPriceSol: number;

  @Prop({ required: true })
  realizedProfitSol: number;

  @Prop({ required: true })
  unRealizedProfitSol: number;

  @Prop({ required: true })
  totalPnl: number;

  @Prop({ required: true })
  nav: number;

  @Prop({ required: true, enum: ['HOLD', 'ALL_SELL'] })
  status: 'HOLD' | 'ALL_SELL';

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
