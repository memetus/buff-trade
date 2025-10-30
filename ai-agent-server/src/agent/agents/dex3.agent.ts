import { Injectable } from '@nestjs/common';

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentState } from '../utils/state';
import { HumanMessage } from '@langchain/core/messages';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrendToken } from 'src/common/schemas/trend-token.schema';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Dex3Agent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,
    private readonly configService: ConfigService,
  ) {}

  private dex3Tool = tool(
    async () => {
      try {
        const data = {
          type: 'whale',
          limit: 5,
          buysOnly: true,
        };

        const url = `https://api.dex3.ai/deep-signals`;
        const response = await axios.post(url, data);

        const rawTokens = response.data?.data?.data || [];
        const tokensArray = Array.isArray(rawTokens) ? rawTokens : [];

        const uniqueTokensSet = new Set();
        tokensArray.forEach((token: any) => {
          if (token.token) {
            uniqueTokensSet.add(token.token);
          }
        });

        const analysisResults = {
          source: 'Dex3AI',
          trendingTokens: Array.from(uniqueTokensSet),
        };

        return JSON.stringify(analysisResults, null, 2);
      } catch (error) {
        return JSON.stringify(
          {
            error: 'Failed to fetch trending tokens from Dex3AI',
            message: error.message,
            fallback: {
              source: 'Dex3AI_Error',
              trendingTokens: [],
            },
          },
          null,
          2,
        );
      }
    },
    {
      name: 'dex3Search',
      description:
        'return list of tokens that are trending for whale wallet from dex3 API',
      schema: z.object({}),
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public dex3AgentNode = async (_state: typeof AgentState.State) => {
    try {
      const trendToolResult = await this.dex3Tool.invoke({});
      const addresses: string[] = [];
      let analysisContent = 'No trending tokens found';

      try {
        const trendData = JSON.parse(trendToolResult);

        if (
          trendData.trendingTokens &&
          Array.isArray(trendData.trendingTokens)
        ) {
          const addressSet = new Set<string>();
          trendData.trendingTokens.forEach((token: any) => {
            if (typeof token === 'string') {
              addressSet.add(token);
            }
          });
          addresses.push(...Array.from(addressSet));

          analysisContent = JSON.stringify(
            {
              keyword: 'whale tokens list',
              totalTokens: addresses.length,
              trendingTokens: trendData.trendingTokens,
            },
            null,
            2,
          );
        } else if (trendData.error) {
          analysisContent = JSON.stringify(
            {
              error: trendData.error,
              message: trendData.message,
              fallback: trendData.fallback,
            },
            null,
            2,
          );
        }
      } catch (e) {
        analysisContent = 'Failed to parse trend analysis result';
      }

      return {
        messages: [
          new HumanMessage({
            content: analysisContent,
            name: 'Dex3Analyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      return {
        messages: [
          new HumanMessage({
            content: 'Analysis failed. Please try again.',
            name: 'Dex3Analyst',
          }),
        ],
        address: [],
      };
    }
  };

  async getDex3Agent() {
    const result = await this.dex3Tool.invoke({
      messages: [{ role: 'user', content: 'Analyze whale tokens list' }],
    });
    console.log('result:', result);
    return result;
  }
}
