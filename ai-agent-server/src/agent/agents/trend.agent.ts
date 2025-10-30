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
export class TrendAgent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,
    private readonly configService: ConfigService,
  ) {}

  private trendTool = tool(
    async () => {
      try {
        const apiKey = this.configService.get('ai-agent.elfaApiKey');
        const timeWindow = '4h';
        const page = 1;
        const pageSize = 10;
        const minMentions = 5;

        const url = `https://api.elfa.ai/v2/aggregations/trending-cas/twitter?timeWindow=${timeWindow}&page=${page}&pageSize=${pageSize}&minMentions=${minMentions}`;

        const response = await axios.get(url, {
          headers: {
            accept: 'application/json',
            'x-elfa-api-key': apiKey,
          },
          timeout: 10000,
        });

        const data = response.data;
        const rawTokens = data?.data?.data || [];
        const tokensArray = Array.isArray(rawTokens) ? rawTokens : [];

        const analysisResults = {
          source: 'ElfaAI',
          timeWindow: timeWindow,
          trendingTokens: tokensArray
            .filter((token: any) => token.chain === 'solana')
            .map((token: any) => ({
              contractAddress: token.contractAddress,
              chain: token.chain,
              mentionCount: token.mentionCount || 0,
            })),
          timestamp: new Date().toISOString(),
        };

        return JSON.stringify(analysisResults, null, 2);
      } catch (error) {
        return JSON.stringify(
          {
            error: 'Failed to fetch trending tokens from ElfaAI',
            message: error.message,
            fallback: {
              source: 'ElfaAI_Error',
              timeWindow: '4h',
              trendingTokens: [],
              timestamp: new Date().toISOString(),
            },
          },
          null,
          2,
        );
      }
    },
    {
      name: 'trendSearch',
      description:
        'Search trending tokens from ElfaAI API with fixed parameters (4h window, 10 tokens, min 2 mentions)',
      schema: z.object({}),
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public trendAgentNode = async (_state: typeof AgentState.State) => {
    try {
      const trendToolResult = await this.trendTool.invoke({});
      const addresses: string[] = [];
      let analysisContent = 'No trending tokens found';

      try {
        const trendData = JSON.parse(trendToolResult);

        if (
          trendData.trendingTokens &&
          Array.isArray(trendData.trendingTokens)
        ) {
          trendData.trendingTokens.forEach((token: any) => {
            if (token.contractAddress && token.chain === 'solana') {
              addresses.push(token.contractAddress);
            }
          });

          analysisContent = JSON.stringify(
            {
              keyword: 'trending tokens',
              timeWindow: trendData.timeWindow,
              totalTokens: addresses.length,
              trendingTokens: trendData.trendingTokens,
              timestamp: trendData.timestamp,
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
            name: 'trendAnalyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      return {
        messages: [
          new HumanMessage({
            content: 'Analysis failed. Please try again.',
            name: 'trendAnalyst',
          }),
        ],
        address: [],
      };
    }
  };

  async getTrendAgent() {
    return await this.trendTool.invoke({});
  }
}
