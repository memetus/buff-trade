import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TrendTokenDocument = TrendToken & mongoose.Document;

interface Exchange {
  name: string;
  id: string;
}

interface SocialLinks {
  discord?: string;
  github?: string;
  instagram?: string;
  linkedin?: string;
  reddit?: string;
  telegram?: string;
  twitter?: string;
  website?: string;
  whitepaper?: string;
  youtube?: string;
}

@Schema()
export class TrendToken {
  @Prop()
  marketCap: string;

  @Prop()
  txnCount24: number;

  @Prop()
  address: string;

  @Prop()
  name: string;

  @Prop()
  symbol: string;

  @Prop()
  createdAt: Date;

  @Prop()
  tokenCreatorAddress: string;

  @Prop()
  description: string;

  @Prop({ type: [{ name: String, id: String }] })
  exchanges: Exchange[];

  @Prop({ type: mongoose.Schema.Types.Mixed })
  socialLinks: SocialLinks;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [Number] })
  embedding?: number[];
}

export const TrendTokenSchema = SchemaFactory.createForClass(TrendToken);
