import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import * as dotenv from 'dotenv';

const envFile = `.env.${process.env.STAGE}`;
dotenv.config({ path: envFile });

export const gpt4o = new ChatOpenAI({
  modelName: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY!,
});

export const gpt4oMini = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  maxTokens: 4096,
  temperature: 1,
});

export const gpt4_1Mini = new ChatOpenAI({
  modelName: 'gpt-4.1-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 1,
});

export const openAiEmbeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
  batchSize: 2048,
  stripNewLines: true,
});
