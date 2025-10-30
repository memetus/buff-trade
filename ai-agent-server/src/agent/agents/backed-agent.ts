import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { AgentState } from '../utils/state';
import { gpt4oMini } from '../utils/model';
import { TrendToken } from 'src/common/schemas/trend-token.schema';

@Injectable()
export class BackedAgent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,
  ) {}

  private backedDataTool = tool(
    async ({}) => {
      try {
        const tokenData = await this.trendTokenModel
          .find({ categories: { $in: ['backed finance'] } })
          .lean();

        if (!tokenData || tokenData.length === 0) {
          return JSON.stringify(
            { message: 'No backed token data found' },
            null,
            2,
          );
        }

        const processedData = tokenData.map((token) => ({
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          marketCap: token.marketCap,
          txnCount24: token.txnCount24,
          description: token.description,
          exchanges: token.exchanges,
          socialLinks: token.socialLinks,
          categories: token.categories,
          createdAt: token.createdAt,
        }));

        return JSON.stringify(processedData, null, 2);
      } catch (error) {
        console.error('Error in backedDataTool:', error);
        return JSON.stringify(
          { error: 'Failed to fetch backed token data' },
          null,
          2,
        );
      }
    },
    {
      name: 'backedTokenData',
      description:
        'Get and process backed financial token metadata for analysis',
      schema: z.object({}),
    },
  );

  public backedAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.backedDataTool],
    stateModifier: new SystemMessage(
      `You are an expert backed financial token analyst specializing in metadata analysis.

      AVAILABLE DATA FIELDS FOR ANALYSIS:
      - symbol: Token trading symbol
      - name: Full token name
      - address: Token contract address
      - marketCap: Market capitalization value
      - txnCount24: 24-hour transaction count
      - description: Token description text
      - exchanges: List of trading exchanges (name, id)
      - socialLinks: Social media links (discord, github, instagram, linkedin, reddit, telegram, twitter, website, whitepaper, youtube)
      - categories: Token categories array
      - embedding: Token embedding vector
      - createdAt: Token creation timestamp

      ANALYSIS FRAMEWORK:

      1. TOKEN IDENTITY
        - Analyze symbol and name for clarity
        - Evaluate address validity
        - Review description content

      2. MARKET METRICS
        - Assess marketCap size and category
        - Analyze txnCount24 for trading activity
        - Compare metrics across tokens

      3. EXCHANGE PRESENCE
        - Review exchange listings
        - Analyze exchange diversity
        - Assess market accessibility

      4. SOCIAL FOOTPRINT
        - Evaluate socialLinks completeness
        - Assess community presence
        - Review official channels

      5. CATEGORIZATION
        - Analyze categories classification
        - Validate backed finance category
        - Review category alignment

      RESPONSE FORMAT:
      1. MARKET OVERVIEW
        [Analysis of marketCap and txnCount24]

      2. EXCHANGE ANALYSIS  
        [Review of exchange listings and accessibility]

      3. SOCIAL PRESENCE
        [Assessment of socialLinks and community]

      4. CATEGORY INSIGHTS
        [Analysis of categories and classification]

      5. RECOMMENDATIONS
        [Actionable insights based on available data]

      Focus only on analyzing the provided data fields. Do not speculate about unavailable information.
      IMPORTANT: Keep analysis concise and under 1000 characters.`,
    ),
  });

  backedAgentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Analyze backed financial token metadata from the database.
          
          Focus on:
          1. Token fundamentals and identity verification
          2. Market metrics and trading volume analysis
          3. Ecosystem integration and exchange presence
          4. Social media and community indicators
          5. Risk assessment and security evaluation
          6. Categorization and competitive positioning
          
          Provide comprehensive metadata analysis with actionable insights.
          IMPORTANT: Limit your response to 1000 characters or less.`,
        }),
      ];

      const result = await this.backedAgent.invoke(
        {
          ...state,
          messages: augmentedMessages,
        },
        config,
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const content =
        typeof lastMessage.content === 'string'
          ? lastMessage.content
          : Array.isArray(lastMessage.content)
            ? lastMessage.content
                .map((item) =>
                  typeof item === 'string'
                    ? item
                    : typeof item === 'object' &&
                        item !== null &&
                        'text' in item
                      ? (item as any).text
                      : '',
                )
                .join('')
            : '';

      // tokenData에서 addresses 추출
      const addresses: string[] = [];
      try {
        const tokenData = await this.trendTokenModel
          .find({ categories: { $in: ['backed finance'] } })
          .sort({ createdAt: -1 })
          .lean();

        if (tokenData && tokenData.length > 0) {
          tokenData.forEach((token) => {
            if (token.address) {
              addresses.push(token.address);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching token addresses:', error);
      }

      return {
        messages: [
          new HumanMessage({
            content: content,
            name: 'backedTokenAnalyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      console.error('Error in tradingAgentNode:', error);
      return {
        messages: [
          new HumanMessage({
            content:
              'Error occurred during backed token metadata analysis. Please try again.',
            name: 'backedTokenAnalyst',
          }),
        ],
        address: [],
      };
    }
  };

  async getBackedTokenAnalysis() {
    const result = await this.backedAgent.invoke({
      messages: [
        { role: 'user', content: 'Analyze backed financial token metadata' },
      ],
    });

    console.log('result:', result);
    return result.messages[result.messages.length - 1].content;
  }
}
