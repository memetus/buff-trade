import { Injectable } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { gpt4oMini } from '../utils/model';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentState } from '../utils/state';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';

@Injectable()
export class MarketAgent {
  constructor(
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,
  ) {}

  private marketTool = tool(
    async ({ address }) => {
      const marketData = await this.coinPriceModel.findOne({ address });

      if (!marketData) {
        throw new Error('Market data not found');
      }

      const rawData = {
        symbol: marketData.symbol,
        address: marketData.address,
        price: parseFloat(marketData.priceUSD),
        high24: parseFloat(marketData.high24),
        low24: parseFloat(marketData.low24),
        volume24: parseFloat(marketData.volume24),
        volumeChange24: parseFloat(marketData.volumeChange24),
        change24: parseFloat(marketData.change24),
        change12: parseFloat(marketData.change12),
        change5m: parseFloat(marketData.change5m),
        buyCount24: marketData.buyCount24,
        sellCount24: marketData.sellCount24,
        uniqueBuys24: marketData.uniqueBuys24,
        uniqueSells24: marketData.uniqueSells24,
        marketCap: parseFloat(marketData.marketCap),
        liquidity: parseFloat(marketData.liquidity),
        holders: marketData.holders,
      };

      return JSON.stringify(rawData, null, 2);
    },
    {
      name: 'marketSearch',
      description: 'Search market data for a symbol',
      schema: z.object({
        address: z.string().describe('The address of the token to search for'),
      }),
    },
  );

  private marketAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.marketTool],
    stateModifier: new SystemMessage({
      content: `Analyze cryptocurrency market data and provide both raw data and technical analysis.

      Format your response as:
      {
        "rawData": {
          "symbol": "symbol",
          "address": "address",
          "price": number,
          "high24": number,
          "low24": number,
          "volume24": number,
          "volumeChange24": number,
          "change24": number,
          "change12": number,
          "change5m": number,
          "buyCount24": number,
          "sellCount24": number,
          "uniqueBuys24": number,
          "uniqueSells24": number,
          "marketCap": number,
          "liquidity": number,
          "holders": number
        },
        "analysis": {
          "trend": "up/down/stable",
          "strength": "strong/weak/neutral",
          "support": number,
          "resistance": number,
          "indicators": {
            "rsi": number,
            "macd": "bullish/bearish/neutral",
            "volume": "increasing/decreasing/stable",
            "buyPressure": "high/medium/low",
            "holderActivity": "high/medium/low"
          },
          "summary": "brief technical analysis"
        }
      }

      Keep response concise and complete in one message.`,
    }),
  });

  public marketAgentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      if (!state.address || state.address.length === 0) {
        return {
          messages: [
            new HumanMessage({
              content: 'No addresses provided for market analysis',
              name: 'marketAnalyst',
            }),
          ],
          address: state.address,
        };
      }

      const marketDataPromises = state.address.map(async (addr) => {
        try {
          return await this.marketTool.invoke({ address: addr });
        } catch (error) {
          console.error(
            `Error fetching market data for address ${addr}:`,
            error,
          );
          return null;
        }
      });

      const marketDataResults = await Promise.all(marketDataPromises);
      const validResults = marketDataResults.filter(
        (result) => result !== null,
      );

      return {
        messages: [
          new HumanMessage({
            content: JSON.stringify(validResults, null, 2),
            name: 'marketAnalyst',
          }),
        ],
        address: state.address,
      };
    } catch (error) {
      console.error('Market analysis error:', error);
      return {
        messages: [
          new HumanMessage({
            content: 'Analysis failed. Please try again.',
            name: 'marketAnalyst',
          }),
        ],
        address: state.address,
      };
    }
  };

  async getMarketAgent(address: string) {
    const result = await this.marketAgent.invoke({
      messages: [new HumanMessage({ content: address })],
    });

    console.log('result:', JSON.stringify(result, null, 2));

    return result.messages[result.messages.length - 1].content;
  }
}
