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
import { TradingResult } from 'src/common/schemas/trading-result.schema';

@Injectable()
export class TradingAgent {
  constructor(
    @InjectModel('TradingResult')
    private tradingResultModel: Model<TradingResult>,
  ) {}

  private tradingDataTool = tool(
    async ({ fundId }) => {
      try {
        const tradingInfo = await this.tradingResultModel
          .find({ fundId })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        if (!tradingInfo || tradingInfo.length === 0) {
          return JSON.stringify(
            { message: 'No trading history found' },
            null,
            2,
          );
        }

        const processedData = tradingInfo.map((trade) => ({
          symbol: trade.symbol,
          action: trade.recommendation === 'BUY' ? 'BUY' : 'SELL',
          amount: Math.abs(trade.tokenAmount),
          price: trade.priceSol,
          allocation: trade.allocation,
          timestamp: trade.createdAt,
          analysis: trade.analysis,
        }));

        return JSON.stringify(processedData, null, 2);
      } catch (error) {
        console.error('Error in tradingDataTool:', error);
        return JSON.stringify(
          { error: 'Failed to fetch trading data' },
          null,
          2,
        );
      }
    },
    {
      name: 'tradingData',
      description: 'Get and process trading data for a fund',
      schema: z.object({
        fundId: z.string().describe('The fund ID'),
      }),
    },
  );

  public tradingAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.tradingDataTool],
    stateModifier: new SystemMessage(
      `You are an expert trading analyst. Analyze the provided trading data and provide insights.

      ANALYSIS FRAMEWORK:
      1. Trading Pattern Analysis
        - Identify frequent trading pairs
        - Analyze holding periods
        - Evaluate entry/exit timing
        - Assess trading frequency

      2. Performance Metrics
        - Calculate average returns
        - Assess risk-adjusted performance
        - Evaluate allocation effectiveness
        - Measure recommendation accuracy

      3. Risk Assessment
        - Identify concentration risks
        - Evaluate diversification
        - Assess volatility patterns
        - Analyze drawdown periods

      4. Portfolio Optimization
        - Review position sizing
        - Assess allocation strategy
        - Evaluate rebalancing needs
        - Identify improvement areas

      RESPONSE FORMAT:
      1. TRADING PATTERNS
        [Pattern analysis and insights]

      2. PERFORMANCE METRICS
        [Key metrics and analysis]

      3. RISK ASSESSMENT
        [Risk factors and mitigation]

      4. RECOMMENDATIONS
        [Actionable improvement suggestions]

      Keep analysis concise and data-driven. Focus on actionable insights.
      IMPORTANT: Limit your response to 1000 characters or less.`,
    ),
  });

  tradingAgentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Analyze trading data for fund ID: ${state.fundId}.
          
          Focus on:
          1. Trading patterns and frequency
          2. Performance metrics and returns
          3. Risk factors and mitigation
          4. Portfolio optimization opportunities
          
          Provide concise, data-driven insights and actionable recommendations.
          IMPORTANT: Limit your response to 1000 characters or less.`,
        }),
      ];

      const result = await this.tradingAgent.invoke(
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

      return {
        messages: [
          new HumanMessage({
            content: content,
            name: 'tradingAnalyst',
          }),
        ],
      };
    } catch (error) {
      console.error('Error in tradingAgentNode:', error);
      return {
        messages: [
          new HumanMessage({
            content:
              'Error occurred during trading analysis. Please try again.',
            name: 'tradingAnalyst',
          }),
        ],
      };
    }
  };

  async getTradeAgent(fundId: string) {
    const result = await this.tradingAgent.invoke({
      messages: [{ role: 'user', content: fundId }],
    });

    console.log('result:', result);
    return result.messages[result.messages.length - 1].content;
  }
}
