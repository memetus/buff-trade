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
import { CONSTANTS } from 'src/common/config/constants';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SymbolAgent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,

    private readonly configService: ConfigService,
  ) {}

  private symbolTool = tool(
    async ({ symbol }) => {
      const url = `${this.configService.get('ai-agent.xEndpoint')}twitter/search-tweets`;
      const response = await axios.get(url, {
        params: {
          query: `$${symbol}`,
          limit: CONSTANTS.LIMIT.TWEETS,
        },
      });
      const tweets = response.data;

      // const tweets = await this.twitterService.searchTweets(
      //   `$${symbol}`,
      //   CONSTANTS.LIMIT.TWEETS,
      //   SearchMode.Latest,
      // );

      let totalSentimentScore = 0;
      let tweetCount = 0;

      for (const tweet of tweets) {
        totalSentimentScore += await this.analyzeTweetSentiment(tweet.text);
        tweetCount++;
      }

      const trendToken = await this.trendTokenModel.findOne({
        symbol: { $regex: symbol, $options: 'i' },
      });

      const address = trendToken?.address;
      const averageSentimentScore =
        tweetCount > 0 ? totalSentimentScore / tweetCount : 50;
      const sentiment =
        averageSentimentScore > 60
          ? 'positive'
          : averageSentimentScore < 40
            ? 'negative'
            : 'neutral';

      // 트윗 데이터는 제외하고 심볼 분석 결과만 반환
      const symbolAnalysis = {
        symbol: symbol,
        address: sentiment === 'positive' ? address : undefined,
        sentiment: sentiment,
        score: Math.round(averageSentimentScore),
        summary: `Analysis of ${symbol} based on ${tweetCount} tweets`,
        trend: 'stable',
        mentions: tweets.length,
      };

      return JSON.stringify(
        {
          analysisResults: symbolAnalysis,
        },
        null,
        2,
      );
    },
    {
      name: 'symbolSearch',
      description: 'Search recent tweets for a symbol',
      schema: z.object({
        symbol: z.string().describe('The symbol to search for (without $)'),
      }),
    },
  );

  private async analyzeTweetSentiment(tweetText: string) {
    try {
      const result = await gpt4oMini.invoke([
        new SystemMessage({
          content: `Analyze the sentiment of this tweet and return ONLY a JSON object with this structure:
          {
            "sentiment": "positive" | "negative" | "neutral",
            "reason": "brief explanation"
          }`,
        }),
        new HumanMessage({ content: tweetText }),
      ]);

      const content = result.content.toString();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private symbolAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.symbolTool],
    stateModifier: new SystemMessage({
      content: `Analyze cryptocurrency sentiment from tweets.

      Format your response as:
      // For single symbol
      {
        "symbol": "symbol",
        "address": "address",
        "sentiment": "positive/negative/neutral",
        "score": number (0-100),
        "summary": "brief analysis",
        "trend": "up/down/stable"
      }

      // For multiple symbols
      {
        "SYMBOL1": {
          "symbol": "SYMBOL1",
          "address": "address1",
          "sentiment": "positive/negative/neutral",
          "score": number (0-100),
          "summary": "brief analysis",
          "trend": "up/down/stable"
        },
        "SYMBOL2": {
          "symbol": "SYMBOL2",
          "address": "address2",
          "sentiment": "positive/negative/neutral",
          "score": number (0-100),
          "summary": "brief analysis",
          "trend": "up/down/stable"
        }
      }

      IMPORTANT: For BTC or Bitcoin symbol, always use this fixed address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"
      
      Keep response concise and complete in one message.`,
    }),
  });

  public symbolAgentNode = async (
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

      const result = await this.symbolAgent.invoke(
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
          // 단일 심볼의 분석 결과인 경우
          else if (parsedContent.symbol) {
            const cleanSymbol = parsedContent.symbol.replace('$', '');
            // sentiment가 positive인 경우에만 주소 조회
            if (parsedContent.sentiment === 'positive') {
              const trendToken = await this.trendTokenModel.findOne({
                symbol: { $regex: cleanSymbol, $options: 'i' },
              });

              if (trendToken?.address) {
                parsedContent.address = trendToken.address;
                addresses.push(trendToken.address);
              }
            }
            parsedContent.symbol = cleanSymbol;
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
            name: 'symbolAnalyst',
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
            name: 'symbolAnalyst',
          }),
        ],
        address: [],
      };
    }
  };

  async getSymbolAgent(symbol: string) {
    const result = await this.symbolAgent.invoke({
      messages: [new HumanMessage({ content: symbol })],
    });

    console.log('result:', JSON.stringify(result, null, 2));
    return result.messages[result.messages.length - 1].content;
  }
}
