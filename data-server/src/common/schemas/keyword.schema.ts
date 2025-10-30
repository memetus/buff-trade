import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type KeywordDocument = Keyword & mongoose.Document;

interface SymbolCount {
  symbol: string;
  mentions: number;
}

@Schema({ timestamps: true })
export class Keyword {
  @Prop({ type: [{ symbol: String, mentions: Number }] })
  symbols: SymbolCount[];

  @Prop()
  cryptoKeywords: string[];

  @Prop()
  hashtags: string[];

  @Prop()
  createdAt: Date;
}

export const KeywordSchema = SchemaFactory.createForClass(Keyword);
