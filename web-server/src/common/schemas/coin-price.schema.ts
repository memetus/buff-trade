import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
export type CoinPriceDocument = CoinPrice & mongoose.Document;

@Schema({ timestamps: { createdAt: false, updatedAt: true } })
export class CoinPrice {
  @Prop()
  address: string;

  @Prop()
  name: string;

  @Prop()
  symbol: string;

  @Prop()
  imageThumbUrl: string;

  @Prop({ index: true })
  category: string[];

  @Prop()
  priceUSD: string;

  @Prop()
  priceSol: number;

  @Prop()
  buyCount1: number;

  @Prop()
  buyCount4: number;

  @Prop()
  buyCount5m: number;

  @Prop()
  buyCount12: number;

  @Prop()
  buyCount24: number;

  @Prop()
  change1: string;

  @Prop()
  change4: string;

  @Prop()
  change5m: string;

  @Prop()
  change12: string;

  @Prop()
  change24: string;

  @Prop()
  high1: string;

  @Prop()
  high4: string;

  @Prop()
  high5m: string;

  @Prop()
  high12: string;

  @Prop()
  high24: string;

  @Prop()
  holders: number;

  @Prop()
  lastTransaction: number;

  @Prop()
  liquidity: string;

  @Prop()
  low1: string;

  @Prop()
  low4: string;

  @Prop()
  low5m: string;

  @Prop()
  low12: string;

  @Prop()
  low24: string;

  @Prop()
  marketCap: string;

  @Prop()
  sellCount1: number;

  @Prop()
  sellCount4: number;

  @Prop()
  sellCount5m: number;

  @Prop()
  sellCount12: number;

  @Prop()
  sellCount24: number;

  @Prop()
  txnCount1: number;

  @Prop()
  txnCount4: number;

  @Prop()
  txnCount5m: number;

  @Prop()
  txnCount12: number;

  @Prop()
  txnCount24: number;

  @Prop()
  uniqueBuys1: number;

  @Prop()
  uniqueBuys4: number;

  @Prop()
  uniqueBuys5m: number;

  @Prop()
  uniqueBuys12: number;

  @Prop()
  uniqueBuys24: number;

  @Prop()
  uniqueSells1: number;

  @Prop()
  uniqueSells4: number;

  @Prop()
  uniqueSells5m: number;

  @Prop()
  uniqueSells12: number;

  @Prop()
  uniqueSells24: number;

  @Prop()
  uniqueTransactions1: number;

  @Prop()
  uniqueTransactions4: number;

  @Prop()
  uniqueTransactions5m: number;

  @Prop()
  uniqueTransactions12: number;

  @Prop()
  uniqueTransactions24: number;

  @Prop()
  volume1: string;

  @Prop()
  volume4: string;

  @Prop()
  volume5m: string;

  @Prop()
  volume12: string;

  @Prop()
  volume24: string;

  @Prop()
  volumeChange1: string;

  @Prop()
  volumeChange4: string;

  @Prop()
  volumeChange5m: string;

  @Prop()
  volumeChange12: string;

  @Prop()
  volumeChange24: string;

  @Prop()
  walletAgeAvg: string;

  @Prop()
  walletAgeStd: string;

  @Prop()
  swapPct1dOldWallet: string;

  @Prop()
  swapPct7dOldWallet: string;

  @Prop()
  createdAt: Date;

  @Prop()
  token_launch_age: string;

  @Prop({ type: [Number] })
  embedding?: number[];
}

export const CoinPriceSchema = SchemaFactory.createForClass(CoinPrice);
