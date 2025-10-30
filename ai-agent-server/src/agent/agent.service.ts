import { Injectable } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import { AgentState } from './utils/state';
import { START } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { InjectModel } from '@nestjs/mongoose';
import { FundData } from 'src/common/schemas/fund-data.schema';
import { createSupervisorChain, MEMBERS } from './agents/supervisor.agent';

import { TradingAgent } from './agents/trading.agent';
import { PortfolioAgent } from './agents/portfolio.agent';
import { CoinMetaAgent } from './agents/coin-meta.agent';
import { SymbolAgent } from './agents/symbol.agent';
import { MarketAgent } from './agents/market.agent';
import { KolAgent } from './agents/kol.agent';
import { TrendAgent } from './agents/trend.agent';
import { KolPoolAgent } from './agents/kol-pool.agent';
import { Model } from 'mongoose';
import { DecisionMakerAgent } from './agents/decision-maker.agent';
import { BackedAgent } from './agents/backed-agent';
import { Dex3Agent } from './agents/dex3.agent';

@Injectable()
export class AgentService {
  constructor(
    @InjectModel('FundData')
    private fundDataModel: Model<FundData>,

    private readonly kolAgent: KolAgent,
    private readonly kolPoolAgent: KolPoolAgent,
    private readonly trendAgent: TrendAgent,
    private readonly symbolAgent: SymbolAgent,
    private readonly coinMetaAgent: CoinMetaAgent,
    private readonly marketAgent: MarketAgent,
    private readonly tradingAgent: TradingAgent,
    private readonly portfolioAgent: PortfolioAgent,
    private readonly decisionMakerAgent: DecisionMakerAgent,
    private readonly backedAgent: BackedAgent,
    private readonly dex3Agent: Dex3Agent,
  ) {}

  async getRecommendation(fundId: string) {
    try {
      const fundDataInfo = await this.fundDataModel.findById(fundId).lean();
      const query = fundDataInfo.strategyPrompt;

      const supervisorChain = await createSupervisorChain();
      const workflow = new StateGraph(AgentState)
        .addNode(
          'coinMetaAnalyst',
          this.coinMetaAgent.coinMetaNode.bind(this.coinMetaAgent),
        )
        .addNode(
          'trendAnalyst',
          this.trendAgent.trendAgentNode.bind(this.trendAgent),
        )
        .addNode('kolAnalyst', this.kolAgent.kolAgentNode.bind(this.kolAgent))
        .addNode(
          'kolPoolAnalyst',
          this.kolPoolAgent.kolPoolNode.bind(this.kolPoolAgent),
        )
        .addNode(
          'symbolAnalyst',
          this.symbolAgent.symbolAgentNode.bind(this.symbolAgent),
        )
        .addNode(
          'tradingAnalyst',
          this.tradingAgent.tradingAgentNode.bind(this.tradingAgent),
        )
        .addNode(
          'marketAnalyst',
          this.marketAgent.marketAgentNode.bind(this.marketAgent),
        )
        .addNode(
          'portfolioAnalyst',
          this.portfolioAgent.portfolioAgentNode.bind(this.portfolioAgent),
        )
        .addNode(
          'decisionMaker',
          this.decisionMakerAgent.decisionMaker.bind(this.decisionMakerAgent),
        )
        .addNode(
          'backedAnalyst',
          this.backedAgent.backedAgentNode.bind(this.backedAgent),
        )
        .addNode(
          'dex3Analyst',
          this.dex3Agent.dex3AgentNode.bind(this.dex3Agent),
        )
        .addNode('supervisor', supervisorChain);

      MEMBERS.forEach((member) => workflow.addEdge(member, 'supervisor'));
      workflow.addConditionalEdges(
        'supervisor',
        (x: typeof AgentState.State) => x.next,
      );
      workflow.addEdge(START, 'supervisor');

      const graph = workflow.compile();
      const streamResults = graph.stream(
        {
          messages: [new HumanMessage({ content: query })],
          fundId,
          query: query,
        },
        { recursionLimit: 25 },
      );

      const allOutputs = [];
      for await (const output of await streamResults) {
        if (!output?.__end__) {
          console.log(output);
          console.log('----');
          allOutputs.push(output);
        }
      }

      if (allOutputs.length < 2) return null;

      const secondLastOutput = allOutputs[allOutputs.length - 2];
      const nodeName = Object.keys(secondLastOutput)[0];
      const nodeOutput = secondLastOutput[nodeName];

      if (!nodeName || !nodeOutput?.messages?.length) return null;

      const finalAnswer = nodeOutput.messages
        .slice()
        .reverse()
        .find((msg) => msg.content)?.content;

      console.log(finalAnswer);

      return finalAnswer ? JSON.parse(finalAnswer) : null;
    } catch (error) {
      if (error.message?.includes('maximum context length')) {
        return {
          coins: [
            {
              name: 'Error',
              symbol: 'ERROR',
              address: '',
              analysis:
                'Token length limit exceeded. Please try with a shorter query.',
              recommendation: 'hold',
              allocation: 100,
            },
          ],
        };
      }
      throw error;
    }
  }

  async getRecommendedTokens(content: string | any): Promise<string[]> {
    const allRecommendedTokens = [];

    try {
      const contentStr = String(content);
      let kolData = [];

      try {
        kolData = JSON.parse(contentStr);

        if (!Array.isArray(kolData)) {
          console.warn('Parsed data is not an array, setting to empty array');
          kolData = [];
        }
      } catch (error) {
        console.error('Error parsing JSON response:', error);
        kolData = [];
      }

      // 모든 추천 토큰 수집
      kolData.forEach((kol) => {
        if (kol.recommendedTokens && Array.isArray(kol.recommendedTokens)) {
          kol.recommendedTokens.forEach((token) => {
            if (!allRecommendedTokens.includes(token)) {
              allRecommendedTokens.push(token);
            }
          });
        }
      });

      return allRecommendedTokens;
    } catch (error) {
      console.error('Error in getRecommendedTokens:', error);
      return [];
    }
  }
}
