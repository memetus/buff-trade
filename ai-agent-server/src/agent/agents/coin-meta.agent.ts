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
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { openAiEmbeddings } from '../utils/model';
import { Collection } from 'mongoose';
import { CoinPrice } from 'src/common/schemas/coin-price.schema';

// 유틸리티 함수
const convertMessageContent = (content: any): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null && 'text' in item) {
          return (item as any).text || '';
        }
        return '';
      })
      .join('');
  }
  return '';
};

const SYSTEM_PROMPT = `You are an expert cryptocurrency analyst. Use the vectorSearch tool to analyze coins and provide investment recommendations.

TOOLS:
vectorSearch - Tool to search for cryptocurrency data in our database

IMPORTANT INSTRUCTION:
* ONLY analyze data that is DIRECTLY returned by the vectorSearch tool
* DO NOT include any information from outside the tool's results
* If the search returns limited or no data, acknowledge this limitation rather than making up information
* DO NOT reference any coins or projects that do not appear in the vectorSearch results
* DISREGARD any prior knowledge about cryptocurrencies that isn't explicitly returned by the tool

TEMPORAL RELEVANCE - CRITICAL PRIORITY:
* When user query contains terms like "recent", "latest", "new", "trend", "trending", "최근", "최신", "트렌드":
  - STRICTLY check the 'createdAt' field in ALL results
  - ONLY include coins with the MOST RECENT createdAt timestamps
  - EXPLICITLY EXCLUDE any coin with older timestamps
  - For "recent" queries: include ONLY coins from the past 7 days
  - For "trending" queries: include ONLY coins showing clear upward movement in recent data
  - EXPLAIN timestamp-based filtering in your analysis
  - If ALL results are older than required, ACKNOWLEDGE this limitation explicitly

ANALYSIS WORKFLOW:
1. Search for relevant coins using the user's query
2. IF query contains temporal terms (recent/trend/latest/etc.), FIRST filter by createdAt timestamp
3. STRICTLY analyze ONLY the search results considering:
  - Recency and creation date (for temporal queries)
  - Market capitalization (ONLY if provided in the results)
  - Price trends (ONLY if provided in the results)
  - Trading volume (ONLY if provided in the results)
  - Categories and themes (ONLY if provided in the results)
4. Provide investment insights based EXCLUSIVELY on the returned data

RESPONSE FORMAT:
Return a structured analysis in the following format:

1. COIN OVERVIEW
[List ONLY coins found in the search results with name, category, market cap tier, and creation date]

2. TEMPORAL ANALYSIS (if applicable)
[Explain how coins were filtered based on timestamps and recency requirements]

3. MARKET ANALYSIS
[For each coin analyze ONLY data points present in the search results:
- Current price and trends (if available)
- Trading volume (if available)
- Market position (if available)
- Recent performance (if available)]

4. RECOMMENDATIONS
[Provide specific investment suggestions based EXCLUSIVELY on the data returned by the tool]

5. RISKS
[List potential risk factors mentioned in the search results]

CRITICAL: Your analysis must be 100% grounded in the vectorSearch tool's results, with strict adherence to temporal requirements when specified in the user query. If the tool returns limited information or no data matching the temporal criteria, your analysis must clearly acknowledge these limitations.`;

// 타입 정의
interface VectorSearchResult {
  pageContent: string;
  metadata: {
    address?: string;
    symbol?: string;
    category?: string;
    marketCap?: number;
    createdAt?: string;
    price?: number;
    volume?: number;
    [key: string]: any;
  };
}

@Injectable()
export class CoinMetaAgent {
  constructor(
    @InjectModel('CoinPrice')
    private coinPriceModel: Model<CoinPrice>,
  ) {}

  // 유틸리티 함수
  private async langChainVectorSearch(
    query: string,
    collection: Collection,
  ): Promise<VectorSearchResult[]> {
    try {
      const vectorStore = new MongoDBAtlasVectorSearch(openAiEmbeddings, {
        collection,
        indexName: 'vector_index',
        textKey: 'pageContent',
        embeddingKey: 'embedding',
      });

      const retriever = vectorStore.asRetriever({
        k: 10,
        searchType: 'mmr',
        searchKwargs: {
          fetchK: 1000,
          lambda: 0.8,
        },
      });

      return await retriever.invoke(query);
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }

  // 툴 정의
  private coinMetaTool = tool(
    async ({ query }: { query: string }) => {
      try {
        const collection = this.coinPriceModel.collection;
        const results = await this.langChainVectorSearch(query, collection);

        if (!results || results.length === 0) {
          return JSON.stringify({ message: 'No results found' }, null, 2);
        }

        // 결과를 JSON 형식으로 변환
        const formattedResults = results.map((result) => ({
          pageContent: result.pageContent,
          metadata: {
            address: result.metadata.address,
            symbol: result.metadata.symbol,
            category: result.metadata.category,
            createdAt: result.metadata.createdAt,
            priceUSD: result.metadata.priceUSD,
            high24: result.metadata.high24,
            low24: result.metadata.low24,
            volume24: result.metadata.volume24,
            volumeChange24: result.metadata.volumeChange24,
            change24: result.metadata.change24,
            change12: result.metadata.change12,
            change5m: result.metadata.change5m,
            buyCount24: result.metadata.buyCount24,
            sellCount24: result.metadata.sellCount24,
            uniqueBuys24: result.metadata.uniqueBuys24,
            uniqueSells24: result.metadata.uniqueSells24,
            marketCap: result.metadata.marketCap,
            liquidity: result.metadata.liquidity,
            holders: result.metadata.holders,
          },
        }));

        return JSON.stringify(formattedResults, null, 2);
      } catch (error) {
        console.error('Coin data tool error:', error);
        return JSON.stringify({ error: 'Failed to fetch coin data' }, null, 2);
      }
    },
    {
      name: 'coinMetaDataTool',
      description: 'Perform a vector search for coin metadata',
      schema: z.object({
        query: z.string().describe('The search query'),
      }),
    },
  );

  // 에이전트 정의
  public coinMetaAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [this.coinMetaTool],
    stateModifier: new SystemMessage(SYSTEM_PROMPT),
  });

  // 노드 함수
  public coinMetaNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Please analyze the coin data for query: ${state.query}.
          
          Focus on:
          1. Coin overview and categorization
          2. Temporal relevance and recency
          3. Market analysis and trends
          4. Investment recommendations
          5. Risk assessment
          
          Provide concise, data-driven insights and actionable recommendations.
          IMPORTANT: Limit your response to 1000 characters or less.`,
        }),
      ];

      const result = await this.coinMetaAgent.invoke(
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

      // 주소 정보 추출 및 쿼리 적합성 분석
      const addresses: string[] = [];
      try {
        const toolMessage = result.messages.find(
          (msg) => msg.name === 'coinMetaDataTool',
        );
        if (toolMessage && typeof toolMessage.content === 'string') {
          const parsedResult = JSON.parse(toolMessage.content);
          if (Array.isArray(parsedResult)) {
            // 쿼리 분석을 위한 시스템 메시지
            const queryAnalysisPrompt = new SystemMessage(`
              Analyze if each token is relevant to the user query: "${state.query}"
              
              Consider:
              1. Token category match with query (STRICT MATCHING)
              2. Recent performance and trends
              3. Market metrics and activity
              4. Temporal relevance
              
              Return JSON with the following structure:
              {
                "relevanceScore": number (0-100),
                "explanation": string,
                "categoryMatch": {
                  "exact": boolean,
                  "partial": boolean,
                  "categories": string[]
                },
                "hasRecentActivity": boolean,
                "marketMetrics": {
                  "volume": boolean,
                  "priceChange": boolean,
                  "liquidity": boolean
                }
              }
            `);

            // 각 토큰에 대한 적합성 분석
            for (const item of parsedResult) {
              if (item.metadata?.address) {
                const tokenAnalysis = await gpt4oMini.invoke([
                  queryAnalysisPrompt,
                  new HumanMessage(JSON.stringify(item.metadata)),
                ]);

                try {
                  const rawContent = convertMessageContent(
                    tokenAnalysis.content,
                  );
                  const jsonMatch = rawContent.match(
                    /```(?:json)?\s*([\s\S]*?)\s*```/,
                  );
                  const jsonContent = jsonMatch
                    ? jsonMatch[1].trim()
                    : rawContent;
                  const analysis = JSON.parse(jsonContent);

                  // 적합성 판단 기준
                  const shouldInclude =
                    analysis.relevanceScore >= 60 || // 기본 점수 기준
                    (analysis.categoryMatch.exact &&
                      analysis.hasRecentActivity) || // 정확한 카테고리 매칭 + 활동
                    (analysis.marketMetrics.volume &&
                      analysis.marketMetrics.priceChange &&
                      analysis.marketMetrics.liquidity); // 모든 시장 지표 양호

                  if (shouldInclude) {
                    addresses.push(item.metadata.address);
                  }
                } catch (e) {
                  // 분석 실패 시 기본적으로 포함하지 않음
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error extracting addresses:', e);
      }

      return {
        messages: [
          new HumanMessage({
            content: content,
            name: 'coinMetaAnalyst',
          }),
        ],
        address: addresses,
      };
    } catch (error) {
      console.error('Coin meta node error:', error);
      return {
        messages: [
          new HumanMessage({
            content:
              'Error occurred during coin meta analysis. Please try again.',
            name: 'coinMetaAnalyst',
          }),
        ],
        address: [],
      };
    }
  };
}
