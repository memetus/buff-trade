import { Injectable } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { gpt4oMini } from '../utils/model';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentState } from '../utils/state';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrendToken } from 'src/common/schemas/trend-token.schema';
import { RunnableConfig } from '@langchain/core/runnables';
import { KolPool } from 'src/common/schemas/kol-pool.schema';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { openAiEmbeddings } from '../utils/model';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KolPoolAgent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,
    @InjectModel('KolPool')
    private kolPoolModel: Model<KolPool>,

    private readonly configService: ConfigService,
  ) {}

  private async analyzeTweetSentiment(
    tweet: string,
  ): Promise<{ sentiment: string; score: number }> {
    const systemMessage = new SystemMessage({
      content: `You are a cryptocurrency sentiment analysis expert. Analyze the following tweet and determine if it expresses positive, negative, or neutral sentiment about cryptocurrency.

      Return your analysis in EXACTLY this JSON format with no additional text:
      {
        "sentiment": "positive/negative/neutral",
        "score": number (0-100)
      }

      
      IMPORTANT: For BTC or Bitcoin symbol, always use this fixed address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"

      Consider:
      - Overall tone and emotion
      - Specific cryptocurrency mentions
      - Market sentiment indicators
      - Emoji usage
      - Context of the message
      - Focus on the author's sentiment, not community reactions`,
    });

    const humanMessage = new HumanMessage({
      content: tweet,
    });

    try {
      const result = await gpt4oMini.invoke([systemMessage, humanMessage]);
      const content =
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);

      // JSON 형식 추출
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', content);
        return { sentiment: 'neutral', score: 50 };
      }

      const jsonContent = jsonMatch[0].replace(/```json\n|\n```/g, '').trim();
      const parsed = JSON.parse(jsonContent);

      // 기본값 검증
      if (!parsed.sentiment || !parsed.score) {
        console.error('Invalid JSON structure:', parsed);
        return { sentiment: 'neutral', score: 50 };
      }

      // 감정 값 검증
      const validSentiments = ['positive', 'negative', 'neutral'];
      if (!validSentiments.includes(parsed.sentiment.toLowerCase())) {
        console.error('Invalid sentiment value:', parsed.sentiment);
        return { sentiment: 'neutral', score: 50 };
      }

      // 점수 범위 검증
      const score = Math.min(100, Math.max(0, Number(parsed.score)));
      if (isNaN(score)) {
        console.error('Invalid score value:', parsed.score);
        return { sentiment: 'neutral', score: 50 };
      }

      return {
        sentiment: parsed.sentiment.toLowerCase(),
        score: score,
      };
    } catch (error) {
      console.error('Error analyzing tweet sentiment:', error);
      return { sentiment: 'neutral', score: 50 };
    }
  }

  private kolPoolTool = tool(
    async ({ query }) => {
      try {
        // 벡터 검색 수행
        const vectorStore = new MongoDBAtlasVectorSearch(openAiEmbeddings, {
          collection: this.kolPoolModel.collection,
          indexName: 'vector_index',
          textKey: 'pageContent',
          embeddingKey: 'embedding',
        });

        const retriever = vectorStore.asRetriever({
          k: 3,
          searchType: 'mmr',
          searchKwargs: {
            fetchK: 15,
            lambda: 1,
          },
        });

        const results = await retriever.invoke(query);
        if (!results || results.length === 0) {
          throw new Error('No results found');
        }

        // 각 KOL의 트윗 데이터 수집

        const kolTweets = await Promise.all(
          results.map(async (result) => {
            const kolName = result.metadata.name;
            const tweets = [];
            try {
              // Use external API endpoint as Twitter service is blocked by Cloudflare
              const url = `${this.configService.get('ai-agent.xEndpoint')}twitter/get-tweets`;
              const response = await axios.get(url, {
                params: {
                  username: kolName,
                  limit: 30,
                },
                timeout: 10000, // 10 second timeout
              });

              if (response.data && Array.isArray(response.data)) {
                tweets.push(...response.data);
              }

              // Fallback to local Twitter service if external API fails
              // const tweetResults = await this.twitterService.getTweets(
              //   kolName,
              //   30,
              // );
              // tweets.push(...tweetResults);
            } catch (error) {
              console.error(
                `Failed to fetch tweets for ${kolName}:`,
                error.message,
              );
              // Continue with empty tweets array for this KOL
            }
            return {
              kolName,
              tweets,
              metadata: result.metadata,
            };
          }),
        );

        // 트윗에서 심볼 추출 및 분석
        const symbolAnalysis: Record<string, any> = {};
        const addresses: string[] = [];

        // 모든 트윗에서 심볼 추출 및 감정 분석
        for (const kol of kolTweets) {
          for (const tweet of kol.tweets) {
            // 트윗에서 $로 시작하는 심볼 추출
            const symbols = tweet.text.match(/\$[A-Za-z0-9]+/g) || [];
            for (const symbol of symbols) {
              const cleanSymbol = symbol.replace('$', '');
              if (!symbolAnalysis[cleanSymbol]) {
                symbolAnalysis[cleanSymbol] = {
                  symbol: cleanSymbol,
                  mentions: 0,
                  totalSentimentScore: 0,
                  tweets: [],
                };
              }
              symbolAnalysis[cleanSymbol].mentions += 1;
              symbolAnalysis[cleanSymbol].tweets.push(tweet.text);
            }
          }
        }

        // 각 심볼에 대한 감정 분석 수행
        for (const [symbol, data] of Object.entries(symbolAnalysis)) {
          const tweets = (data as any).tweets;
          const totalMentions = (data as any).mentions;

          // LLM을 사용하여 트윗 감정 분석
          let totalSentimentScore = 0;
          for (const tweet of tweets) {
            const { score } = await this.analyzeTweetSentiment(tweet);
            totalSentimentScore += score;
          }

          // 감정 점수 계산 (0-100)
          const sentimentScore =
            totalMentions > 0
              ? Math.round(totalSentimentScore / totalMentions)
              : 50;

          // 감정 결정
          let sentiment = 'neutral';
          if (sentimentScore >= 70) {
            sentiment = 'positive';
          } else if (sentimentScore <= 30) {
            sentiment = 'negative';
          }

          // 분석 결과 업데이트
          symbolAnalysis[symbol] = {
            symbol: symbol,
            sentiment: sentiment,
            score: sentimentScore,
            summary: `${totalMentions} mentions with average sentiment score ${Math.round(sentimentScore)}`,
            trend:
              sentimentScore > 50
                ? 'up'
                : sentimentScore < 50
                  ? 'down'
                  : 'stable',
            mentions: totalMentions,
          };

          // sentiment가 positive인 경우에만 주소 조회
          if (sentiment === 'positive') {
            const trendToken = await this.trendTokenModel.findOne({
              symbol: { $regex: symbol, $options: 'i' },
            });

            if (trendToken?.address) {
              (symbolAnalysis[symbol] as any).address = trendToken.address;
              addresses.push(trendToken.address);
            }
          }
        }

        return JSON.stringify(
          {
            query: query,
            analysisResults: symbolAnalysis,
            addresses: addresses,
          },
          null,
          2,
        );
      } catch (error) {
        // 에러 로깅 제거
        throw error;
      }
    },
    {
      name: 'kolPoolSearch',
      description:
        'Search KOL pool and search recent tweets for all matching KOLs',
      schema: z.object({
        query: z.string().describe('The query to search for KOL'),
      }),
    },
  );

  private kolPoolAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.kolPoolTool],
    stateModifier: new SystemMessage({
      content: `You are a KOL Pool analyst responsible for analyzing multiple KOLs' tweets and providing sentiment analysis for mentioned tokens.

      Format your response as:
      // For single symbol
      {
        "symbol": "symbol",
        "sentiment": "positive/negative/neutral",
        "score": number (0-100),
        "summary": "brief analysis",
        "trend": "up/down/stable"
      }

      // For multiple symbols
      {
        "SYMBOL1": {
          "symbol": "SYMBOL1",
          "sentiment": "positive/negative/neutral",
          "score": number (0-100),
          "summary": "brief analysis",
          "trend": "up/down/stable"
        },
        "SYMBOL2": {
          "symbol": "SYMBOL2",
          "sentiment": "positive/negative/neutral",
          "score": number (0-100),
          "summary": "brief analysis",
          "trend": "up/down/stable"
        }
      }

      Keep response concise and complete in one message.`,
    }),
  });

  public kolPoolNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Analyze sentiment for: ${state.query}`,
        }),
      ];

      const result = await this.kolPoolAgent.invoke(
        {
          ...state,
          messages: augmentedMessages,
        },
        config,
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const addresses: string[] = [];
      let updatedContent = lastMessage.content;
      try {
        const content =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        // 코드 블록 제거 및 JSON 추출
        const jsonContent = content.replace(/```json\n|\n```/g, '').trim();
        const parsedContent = JSON.parse(jsonContent);

        // 여러 심볼의 분석 결과가 있는 경우
        if (
          typeof parsedContent === 'object' &&
          !Array.isArray(parsedContent)
        ) {
          // 객체의 키가 심볼인 경우 (여러 심볼)
          if (
            Object.keys(parsedContent).every(
              (key) => typeof parsedContent[key] === 'object',
            )
          ) {
            // 각 심볼에 대해 주소 조회
            for (const [symbol, data] of Object.entries(parsedContent)) {
              const cleanSymbol = symbol.replace('$', '');
              // sentiment가 positive인 경우에만 주소 조회
              if ((data as any).sentiment === 'positive') {
                const trendToken = await this.trendTokenModel.findOne({
                  symbol: { $regex: cleanSymbol, $options: 'i' },
                });

                if (trendToken?.address) {
                  (data as any).address = trendToken.address;
                  addresses.push(trendToken.address);
                }
              }
              // 심볼에서 $ 제거
              (data as any).symbol = cleanSymbol;
            }
            // 주소가 추가된 내용으로 업데이트
            updatedContent = JSON.stringify(parsedContent, null, 2);
          }
        }
      } catch (e) {
        // 에러 로깅 제거
      }

      return {
        messages: [
          new HumanMessage({
            content: updatedContent,
            name: 'kolPoolAnalyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      // 에러 로깅 제거
      return {
        messages: [
          new HumanMessage({
            content: 'Analysis failed. Please try again.',
            name: 'kolPoolAnalyst',
          }),
        ],
        address: [],
      };
    }
  };

  async getKolPoolAgent(handle: string) {
    const result = await this.kolPoolAgent.invoke({
      messages: [new HumanMessage({ content: handle })],
    });

    console.log('result:', JSON.stringify(result, null, 2));
    return result.messages[result.messages.length - 1].content;
  }
}
