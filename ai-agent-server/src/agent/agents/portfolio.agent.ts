import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { Injectable } from '@nestjs/common';
import { AgentState } from '../utils/state';
import { gpt4oMini } from '../utils/model';
import { Portfolio } from 'src/common/schemas/portfolio.schema';

const SYSTEM_PROMPT = `You are an expert portfolio analyst. Analyze the provided portfolio data and provide insights.

ANALYSIS FRAMEWORK:
1. Portfolio Composition
  - Current allocations
  - Position sizes
  - Diversification level
  - Concentration risks

2. Performance Analysis
  - Individual position performance
  - Portfolio returns
  - Risk-adjusted metrics
  - Benchmark comparison

3. Risk Assessment
  - Market risk exposure
  - Liquidity risks
  - Concentration risks
  - Correlation analysis

4. Optimization Opportunities
  - Rebalancing needs
  - Allocation adjustments
  - Risk management
  - Growth opportunities

RESPONSE FORMAT:
1. PORTFOLIO OVERVIEW
  [Current portfolio composition and key metrics]

2. PERFORMANCE ANALYSIS
  [Performance metrics and insights]

3. RISK ASSESSMENT
  [Risk factors and mitigation]

4. RECOMMENDATIONS
  [Actionable improvement suggestions]

Keep analysis concise and data-driven. Focus on actionable insights.
IMPORTANT: Limit your response to 1000 characters or less.`;

@Injectable()
export class PortfolioAgent {
  constructor(
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,

    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,
  ) {}

  private portfolioTool = tool(
    async ({ fundId }) => {
      try {
        const portfolioInfo = await this.portfolioModel
          .find({ fundId, status: 'HOLD' })
          .sort({ createdAt: -1 })
          .lean();

        if (!portfolioInfo) {
          return JSON.stringify(
            { message: 'No portfolio data found' },
            null,
            2,
          );
        }

        return JSON.stringify(portfolioInfo, null, 2);

        // return 'test';
      } catch (error) {
        console.error('Error in portfolioTool:', error);
        return JSON.stringify(
          { error: 'Failed to fetch portfolio data' },
          null,
          2,
        );
      }
    },
    {
      name: 'portfolioData',
      description: 'Get and process portfolio data for a fund',
      schema: z.object({
        fundId: z.string().describe('The fund ID'),
      }),
    },
  );

  private portfolioAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.portfolioTool],
    stateModifier: new SystemMessage(SYSTEM_PROMPT),
  });

  public portfolioAgentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Analyze portfolio data for fund ID: ${state.fundId}.
          
          Required data:
          1. Current portfolio positions with allocations
          2. Token addresses and symbols
          3. Current balances and amounts
          4. Trading history if available
          
          Analysis focus:
          1. Portfolio composition and diversification
          2. Performance metrics and returns
          3. Risk factors and mitigation
          4. Optimization opportunities
          
          Format response as:
          1. RAW DATA
            [Raw portfolio data in JSON format]
          
          2. ANALYSIS
            [Data-driven insights and recommendations]
          
          Keep analysis concise and actionable.`,
        }),
      ];

      const result = await this.portfolioAgent.invoke(
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

      // 포트폴리오의 토큰 주소 추출
      const addresses: string[] = [];
      try {
        const portfolioInfo = await this.portfolioModel.find({
          fundId: state.fundId,
          status: 'HOLD',
        });

        portfolioInfo.forEach((holding) => {
          addresses.push(holding.tokenAddress);
        });
      } catch (error) {
        console.error('Error extracting portfolio addresses:', error);
      }

      return {
        messages: [
          new HumanMessage({
            content: content,
            name: 'portfolioAnalyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      console.error('Error in portfolioAgentNode:', error);
      return {
        messages: [
          new HumanMessage({
            content:
              'Error occurred during portfolio analysis. Please try again.',
            name: 'portfolioAnalyst',
          }),
        ],
      };
    }
  };
}
