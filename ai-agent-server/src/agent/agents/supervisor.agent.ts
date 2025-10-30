import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { END } from '@langchain/langgraph';
import { gpt4oMini } from '../utils/model';
import z from 'zod';
import { Injectable } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { AgentState } from '../utils/state';

// 상수 정의
export const MEMBERS = [
  'coinMetaAnalyst',
  'trendAnalyst',
  'kolAnalyst',
  'kolPoolAnalyst',
  'tradingAnalyst',
  'symbolAnalyst',
  'marketAnalyst',
  'portfolioAnalyst',
  'decisionMaker',
  'backedAnalyst',
  'dex3Analyst',
] as const;

export type Member = (typeof MEMBERS)[number];
export type NextAction = Member | typeof END;

// 시스템 프롬프트 상수
const SYSTEM_PROMPT = `You are a supervisor tasked with managing a conversation between the following workers: {members}. 
Your role is to coordinate a workflow for cryptocurrency investment analysis.

ROUTING LOGIC:

1. INITIAL ROUTING - Analyze the query and choose the appropriate first agent in this EXACT order:
   - If query contains "@username" → kolAnalyst (HIGHEST PRIORITY)
   - If query contains "elfa" → trendAnalyst (SECOND HIGHEST PRIORITY)
   - If query contains "dex3 or whale" → dex3Analyst (THIRD HIGHEST PRIORITY)
   - If query contains "kol" or "influencer" → kolPoolAnalyst
   - If query contains "$" followed by letters/numbers (e.g., "$BTC", "$TRUMP") → symbolAnalyst
   - If query contains "sentiment" or "mentions" or "trend" AND does NOT contain "$" followed by letters/numbers AND is NOT about token categories → trendAnalyst
   - If query contains "backed finance" → backedAnalyst
   - Otherwise → coinMetaAnalyst

2. SEQUENCE RULES:
   - After kolAnalyst, kolPoolAnalyst, symbolAnalyst, or trendAnalyst → portfolioAnalyst
   - After backedAnalyst → portfolioAnalyst
   - After dex3Analyst → portfolioAnalyst
   - After coinMetaAnalyst → portfolioAnalyst
   - After portfolioAnalyst → marketAnalyst
   - After marketAnalyst → tradingAnalyst
   - After tradingAnalyst → decisionMaker
   - After decisionMaker → __end__

3. IMPORTANT NOTES:
   - Check for "@username" FIRST when determining the next agent
   - If "@username" is present, ALWAYS choose kolAnalyst regardless of other keywords
   - Check for "$" symbol next when determining if a query contains a token symbol
   - If query is about token categories (e.g., DeFi, NFT, Gaming, AI, etc.) even with sentiment keywords → coinMetaAnalyst
   - Examples:
     * "@elonmusk Bitcoin analysis" → kolAnalyst (contains "@username")
     * "$BTC Twitter Sentiment Strategy" → symbolAnalyst (contains "$BTC")
     * "DeFi sentiment analysis" → coinMetaAnalyst (about DeFi category)
   - SEQUENCE IS CRITICAL: Always follow the exact order of agents
   - After initial analysis agents (kolAnalyst, kolPoolAnalyst, symbolAnalyst, trendAnalyst), go to portfolioAnalyst
   - After coinMetaAnalyst, go to portfolioAnalyst

4. CRITICAL RULES:
   - ALWAYS follow the exact sequence
   - NEVER skip any required agents
   - portfolioAnalyst MUST be called after initial analysis agents OR coinMetaAnalyst
   - decisionMaker MUST come last before ending
   - "@username" detection takes HIGHEST PRIORITY over all other rules

Your task is to determine the next agent in the sequence based on the current agent and query.
Respond with ONLY the next agent name.`;

// 라우팅 옵션
const ROUTING_OPTIONS = [END, ...MEMBERS] as const;

// 라우팅 툴 정의
export const routingTool = {
  name: 'route',
  description: 'Select the next role.',
  schema: z.object({
    next: z.enum(ROUTING_OPTIONS),
  }),
};

// 프롬프트 템플릿 생성
const createPromptTemplate = () =>
  ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    new MessagesPlaceholder('messages'),
    [
      'human',
      'Given the conversation above, who should act next? Or should we FINISH? Select one of: {options}',
    ],
  ]);

// 포맷된 프롬프트 생성
export const createFormattedPrompt = () =>
  createPromptTemplate().partial({
    options: ROUTING_OPTIONS.join(', '),
    members: MEMBERS.join(', '),
  });

// 슈퍼바이저 체인 생성
export const createSupervisorChain = async () => {
  try {
    const formattedPrompt = await createFormattedPrompt();
    return formattedPrompt
      .pipe(
        gpt4oMini.bindTools([routingTool], {
          tool_choice: 'route',
        }),
      )
      .pipe((x) => {
        if (!x.tool_calls?.[0]?.args) {
          throw new Error('Invalid routing response');
        }
        return x.tool_calls[0].args;
      });
  } catch (error) {
    console.error('Error creating supervisor chain:', error);
    throw error;
  }
};

@Injectable()
export class SupervisorAgent {
  private supervisorAgent = createReactAgent({
    llm: gpt4oMini,
    tools: [],
    stateModifier: new SystemMessage(SYSTEM_PROMPT),
  });

  public supervisorAgentNode = async (
    state: typeof AgentState.State,
    config?: RunnableConfig,
  ) => {
    try {
      const augmentedMessages = [
        ...state.messages,
        new HumanMessage({
          content: `Current agent: ${state.next}
                    Query: ${state.query || ''}

                    Determine the next agent in the sequence.`,
        }),
      ];

      const result = await this.supervisorAgent.invoke(
        {
          ...state,
          messages: augmentedMessages,
        },
        config,
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const nextAgent = lastMessage.content.toString().trim();

      return {
        messages: [
          new HumanMessage({
            content: nextAgent,
            name: 'supervisor',
          }),
        ],
        next: nextAgent,
      };
    } catch (error) {
      return {
        messages: [
          new HumanMessage({
            content: '__end__',
            name: 'supervisor',
          }),
        ],
        next: '__end__',
      };
    }
  };
}
