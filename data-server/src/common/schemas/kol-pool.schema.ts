import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type KolPoolDocument = KolPool & mongoose.Document;

interface SymbolCount {
  symbol: string;
  mentions: number;
}

@Schema({ timestamps: true })
export class KolPool {
  @Prop()
  name: string;

  @Prop()
  uid: string;

  @Prop()
  description: string;

  @Prop()
  lastTweetId: string;

  @Prop({ type: Object })
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    like_count: number;
    media_count: number;
  };

  @Prop()
  kolKeywords: string[];

  @Prop()
  categories: string[];

  @Prop({ type: [{ symbol: String, mentions: Number }] })
  symbols: SymbolCount[];

  @Prop()
  cryptoKeywords: string[];

  @Prop()
  hashtags: string[];

  @Prop()
  mentions: string[];

  @Prop()
  urls: string[];

  @Prop()
  joinedAt: Date;

  @Prop()
  embedding: number[];

  @Prop()
  createdAt: Date;
}

export const KolPoolSchema = SchemaFactory.createForClass(KolPool);
