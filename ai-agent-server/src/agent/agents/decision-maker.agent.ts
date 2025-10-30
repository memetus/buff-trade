import { Injectable } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { gpt4oMini } from '../utils/model';
import { AgentState } from '../utils/state';
import { RunnableConfig } from '@langchain/core/runnables';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrendToken } from 'src/common/schemas/trend-token.schema';
import { MessageContent, MessageContentText } from '@langchain/core/messages';
import { Portfolio } from 'src/common/schemas/portfolio.schema';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 타입 정의
interface CoinRecommendation {
  symbol: string;
  name: string;
  address: string;
  analysis: string;
  recommendation: 'buy' | 'sell' | 'hold';
  allocation: number;
  priority?: 'high' | 'medium' | 'low';
}

interface DecisionMakerResponse {
  coins: CoinRecommendation[];
}

const extractTextFromMessageContent = (content: MessageContent): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if ('type' in item && item.type === 'text') {
          return (item as MessageContentText).text;
        }
        return '';
      })
      .join('');
  }
  return '';
};

@Injectable()
export class DecisionMakerAgent {
  constructor(
    @InjectModel('TrendToken')
    private trendTokenModel: Model<TrendToken>,
    @InjectModel('Portfolio')
    private portfolioModel: Model<Portfolio>,
  ) {}

  // 🚀 NEW: 포트폴리오 직접 조회 도구
  private portfolioTool = tool(
    async ({ fundId }) => {
      try {
        const currentPortfolio = await this.portfolioModel
          .find({ fundId, status: 'HOLD' })
          .sort({ updatedAt: -1 })
          .lean();

        if (!currentPortfolio || currentPortfolio.length === 0) {
          return JSON.stringify({ portfolio: [] }, null, 2);
        }

        // 구조화된 포트폴리오 데이터 반환
        const portfolioData = currentPortfolio.map((position) => ({
          symbol: position.symbol,
          tokenAddress: position.tokenAddress,
          currentAmount: position.currentAmount,
          allocation: position.allocation,
          lastPriceSol: position.lastPriceSol,
          totalPnl: position.totalPnl,
          nav: position.nav,
          totalBuySolAmount: position.totalBuySolAmount,
          totalSellSolAmount: position.totalSellSolAmount,
          realizedProfitSol: position.realizedProfitSol,
          unRealizedProfitSol: position.unRealizedProfitSol,
        }));

        return JSON.stringify({ portfolio: portfolioData }, null, 2);
      } catch (error) {
        console.error('Error in decision maker portfolio tool:', error);
        return JSON.stringify(
          { error: 'Failed to fetch portfolio data' },
          null,
          2,
        );
      }
    },
    {
      name: 'getCurrentPortfolio',
      description: 'Get current portfolio positions for decision making',
      schema: z.object({
        fundId: z.string().describe('The fund ID'),
      }),
    },
  );

  private readonly SYSTEM_PROMPT = `You are a cryptocurrency investment expert with deep knowledge of market analysis and portfolio management. Your PRIMARY TASK is to manage portfolio allocation and risk exposure across different cryptocurrency tokens.

CRITICAL: You have access to a getCurrentPortfolio tool that shows the EXACT current portfolio state. ALWAYS use this tool first to understand current positions before making any recommendations.

CRITICAL ALLOCATION RULES:
1. For SELL recommendations - Set allocation based on severity:
   a. Complete Sell (allocation = 0): PnL < -80%, fundamental collapse, regulatory risk
   b. Major Reduction (allocation = current/3): PnL < -50%, significant underperformance  
   c. Minor Reduction (allocation = current*0.7): Overconcentration, profit-taking

2. For HOLD recommendations: Keep current allocation unchanged or minor adjustments

3. For BUY recommendations: Set desired target allocation percentage

4. Total allocation across ALL coins (including held positions) must equal 100%

SELL ALLOCATION EXAMPLES:
- FIAT with -97.36% PnL → allocation: 0 (complete sell due to severe loss)
- WAGMI with -17.08% PnL → allocation: 2 (reduce from 5% to 2%, minor reduction)
- Overconcentrated Bonk 35% → allocation: 25 (reduce concentration risk)

MANDATORY: When recommending SELL, the new allocation MUST be LOWER than current allocation to trigger actual selling action.

PORTFOLIO ALLOCATION RULES (MANDATORY):
1. Maximum allocation per token: 25%
2. Minimum allocation per token: 3%
3. Target portfolio size: 5-8 different tokens for optimal diversification
4. Maximum exposure to high-risk tokens: 50% of total portfolio
5. Minimum exposure to stable tokens: 25% of total portfolio
6. Maximum exposure to single sector: 40% of total portfolio
7. MANDATORY: Always maintain at least 5 different token positions

PORTFOLIO ADJUSTMENT RULES (MANDATORY):
1. DIVERSIFICATION PRIORITY: Always aim for 5-8 token positions
2. When balance is insufficient for new investments:
   - FIRST: Sell tokens with PnL < -80% to free up capital
   - SECOND: Reduce overallocated tokens (>25%) to fund new positions
   - THIRD: Partially reduce positions in tokens with PnL < -30%
   - Prioritize maintaining diversification over concentration
   - Balance risk across multiple positions rather than few large ones
   - Ensure minimum 5 token diversification at all times

2. Capital Reallocation Strategy:
   - Calculate total SOL needed for new BUY recommendations
   - Identify which current positions to SELL to fund new positions
   - Provide specific SOL amounts for each SELL recommendation
   - Ensure SELL amounts cover BUY requirements with 10% buffer
   - Example: "Sell FIAT (allocation: 0%) to free ~0.15 SOL for toly purchase"

2. Sell Priority Order:
   a. Tokens with negative sentiment and declining metrics
   b. Tokens exceeding maximum allocation limits
   c. Tokens with deteriorating fundamentals
   d. Tokens with high correlation to underperforming assets
   e. Tokens with excessive risk exposure

3. Diversification Strategy:
   - MANDATORY: Include 5-8 different tokens in every recommendation
   - Allocate 3-25% per token to ensure proper diversification
   - Balance between trending tokens (30-40%) and stable positions (60-70%)
   - Include both whale-recommended and fundamental analysis-based tokens
   - Ensure geographic and sector diversification across meme/utility/DeFi tokens

For each token, provide a detailed analysis of approximately 800 characters, including:

1. Performance Metrics (MANDATORY):
   - Current price and 24h/12h/5m price changes
   - Trading volume and liquidity metrics
   - Market capitalization and circulating supply
   - Buy/sell pressure indicators
   - Holder activity metrics

2. Technical Analysis (MANDATORY):
   - Trend strength and direction (RSI, MACD)
   - Support and resistance levels
   - Volume-price relationship
   - Market sentiment indicators
   - Relative strength against market

3. Fundamental Analysis (MANDATORY):
   - Project development status
   - Community engagement metrics
   - Team and partnership updates
   - Market positioning and competition
   - Risk factors and mitigation strategies

4. Risk Assessment (MANDATORY):
   - Volatility indicators
   - Liquidity risk
   - Market correlation
   - Concentration risk
   - Regulatory considerations

For BUY recommendations:
- Provide specific price targets and entry points
- Include volume and momentum indicators
- Detail accumulation patterns
- Show technical breakout points
- Present risk-reward ratios
- Justify allocation percentage based on risk profile
- Consider current portfolio balance and reallocation needs

For SELL recommendations:
- Specify price targets and exit points
- Include distribution patterns
- Detail technical breakdown points
- Show volume and liquidity deterioration
- Present risk escalation factors
- Explain reallocation strategy
- Indicate priority level for selling (high/medium/low)

Example BUY analysis:
"FWOG shows strong accumulation with 45% price increase in 24h (from $0.12 to $0.174). Trading volume surged 300% to $2.5M, indicating strong buying pressure. RSI at 65 shows healthy momentum without overbought conditions. Support established at $0.15 with resistance at $0.20. Market cap of $17.4M with 100M circulating supply suggests room for growth. Community engagement increased 200% with active development updates. Risk-reward ratio of 1:3 with stop loss at $0.14. Recommended allocation: 15% of portfolio due to moderate risk profile and strong fundamentals. Requires reallocation from underperforming assets."

Example SELL analysis:
"nomnom shows distribution pattern with 25% price decline in 24h (from $0.08 to $0.06). Trading volume dropped 50% to $500K, indicating weakening interest. RSI at 35 shows bearish momentum. Support broken at $0.07 with next support at $0.05. Market cap of $6M with high concentration risk (top 10 holders control 60%). Development activity slowed by 40% in past month. Risk of further decline to $0.04 with stop loss at $0.065. HIGH PRIORITY SELL: Recommended reduction from 20% to 5% allocation, with freed capital reallocated to more stable assets. This position should be reduced first when portfolio rebalancing is needed."

RESPONSE FORMAT:
You must respond with a valid JSON object in the following format:
{
  "coins": [
    {
      "symbol": "string",
      "address": "string",
      "allocation": number,
      "analysis": "string",
      "sentiment": "positive/negative/neutral",
      "recommendation": "buy/sell/hold",
      "priority": "high/medium/low"
    }
  ]
}

Do not include any markdown formatting, code blocks, or additional text outside of the JSON structure.
Ensure all string values are properly escaped and the JSON is valid.
The total allocation across all coins must equal 100%.`;

  async decisionMaker(
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ): Promise<{ messages: HumanMessage[] }> {
    try {
      // 🚀 NEW: 직접 현재 포트폴리오 조회
      let currentPortfolio = null;
      try {
        const portfolioResult = await this.portfolioTool.invoke({
          fundId: state.fundId,
        });
        const portfolioData = JSON.parse(portfolioResult);
        currentPortfolio = portfolioData.portfolio;
      } catch (e) {
        console.warn('portfolio direct lookup failed:', e);
      }

      // Fallback: Portfolio Analyst 메시지에서 구조화된 데이터 추출
      if (!currentPortfolio || currentPortfolio.length === 0) {
        const portfolioMessage = state.messages.find(
          (msg) => msg.name === 'portfolioAnalyst',
        );
        if (portfolioMessage && typeof portfolioMessage.content === 'string') {
          try {
            // RAW DATA 섹션에서 portfolio JSON 추출
            const portfolioMatch = portfolioMessage.content.match(
              /```json\s*([\s\S]*?)\s*```/,
            );
            if (portfolioMatch) {
              const portfolioData = JSON.parse(portfolioMatch[1]);
              if (portfolioData.portfolio) {
                currentPortfolio = portfolioData.portfolio;
              }
            }
          } catch (e) {
            console.warn('portfolio data parsing error:', e);
          }
        }
      }

      // 🚀 NEW: 구조화된 컨텍스트 생성
      const structuredContext = {
        currentPortfolio: currentPortfolio,
        analysisResults: {},
      };

      // 각 Agent별 분석 결과 구조화
      state.messages.forEach((msg) => {
        if (msg.name && msg.name !== 'portfolioAnalyst') {
          structuredContext.analysisResults[msg.name] = msg.content;
        }
      });

      // 🚀 NEW: 포트폴리오 중심의 프롬프트 생성
      const contextualPrompt =
        currentPortfolio && currentPortfolio.length > 0
          ? `
CURRENT PORTFOLIO STATUS:
${JSON.stringify(currentPortfolio, null, 2)}

CRITICAL INSTRUCTIONS:
1. You MUST consider the current portfolio positions above
2. MANDATORY: Recommend exactly 5-8 different tokens (including existing + new)
3. For tokens with negative PnL below -80%: PRIORITIZE SELLING
4. For underperforming tokens: REDUCE allocation but maintain some diversification
5. DIVERSIFICATION REQUIREMENT: Include both existing profitable tokens AND new opportunities
6. Allocation range: 3-25% per token to ensure proper spread
7. Balance: Keep profitable positions while adding trending/whale-recommended tokens
8. MANDATORY: Address ALL current tokens: ${currentPortfolio.map((p) => p.symbol).join(', ')}

ANALYSIS DATA:
${JSON.stringify(structuredContext.analysisResults, null, 2)}

MANDATORY REQUIREMENTS:
- MUST recommend exactly 5-8 different tokens total
- Address ALL current portfolio tokens explicitly
- Include 2-3 new trending/whale tokens alongside existing positions
- Provide SELL recommendations for tokens with PnL < -80%
- Balance between risk and diversification (don't over-concentrate)
- Total allocation must equal exactly 100% across 5-8 tokens
`
          : state.messages
              .map(
                (msg) => `${msg.name ? `[${msg.name}]: ` : ''}${msg.content}`,
              )
              .join('\n\n');

      // 메시지 생성
      const messages = [
        new SystemMessage(this.SYSTEM_PROMPT),
        new HumanMessage(contextualPrompt),
      ];

      // 모델 호출
      const response = await gpt4oMini.invoke(messages, config);

      try {
        // 응답 내용을 문자열로 변환
        const contentString = extractTextFromMessageContent(response.content);

        if (!contentString) {
          throw new Error('Empty response from model');
        }

        // 마크다운 코드 블록 제거
        const cleanContent = contentString
          .replace(/```json\n?|\n?```/g, '')
          .trim();

        const parsedResponse = JSON.parse(
          cleanContent,
        ) as DecisionMakerResponse;

        // 각 코인의 심볼과 이름을 coinMetaModel에서 검색하여 업데이트
        for (const coin of parsedResponse.coins) {
          if (!coin.address) {
            console.warn(
              `no address found for coin: ${coin.symbol || 'unknown'}`,
            );
            continue;
          }

          try {
            const coinMeta = await this.trendTokenModel.findOne({
              address: coin.address,
            });
            if (coinMeta) {
              coin.symbol = coinMeta.symbol;
              coin.name = coinMeta.name;
            } else {
              console.warn(`metadata not found for coin: ${coin.address}`);
            }
          } catch (dbError) {
            console.error(`coin metadata lookup error: ${dbError.message}`);
          }
        }

        return {
          messages: [
            new HumanMessage({
              content: JSON.stringify(parsedResponse, null, 2),
              name: 'decisionMaker',
            }),
          ],
        };
      } catch (parseError) {
        console.error('Response parsing error:', parseError);
        throw new Error(`response parsing error: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Decision maker error:', error);

      const errorMessage = {
        error: 'Failed to perform decision maker',
        details: error.message,
        timestamp: new Date().toISOString(),
      };

      return {
        messages: [
          new HumanMessage({
            content: JSON.stringify(errorMessage, null, 2),
            name: 'decisionMaker',
          }),
        ],
      };
    }
  }
}
