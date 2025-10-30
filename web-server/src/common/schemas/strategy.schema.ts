import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type StrategyDocument = Strategy & mongoose.Document;

@Schema({ timestamps: true, versionKey: '_v' })
export class Strategy {
  @Prop()
  randomStrategy: string[];
}

export const StrategySchema = SchemaFactory.createForClass(Strategy);
