import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TokenDocument = Token & mongoose.Document;

@Schema({ timestamps: true, versionKey: '_v' })
export class Token {
  @Prop({ required: true })
  creator: string;

  @Prop({ required: false, default: '' })
  tokenAddress: string;

  @Prop({ required: false, default: '' })
  bondingCurvePool: string;

  @Prop({ required: false, default: '' })
  fundId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  ticker: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  strategyPrompt: string;

  @Prop({ required: true })
  isMigration: boolean;

  @Prop({ required: false, default: '' })
  website: string;

  @Prop({ required: false, default: '' })
  twitter: string;

  @Prop({ required: false, default: '' })
  telegram: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
