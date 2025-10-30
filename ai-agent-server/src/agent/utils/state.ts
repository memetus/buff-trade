import { END, Annotation } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // The agent node that last performed work
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),

  fundId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  address: Annotation<string[]>({
    reducer: (x, y) => {
      if (!y) return x;
      const uniqueAddress = new Set([...x, ...y]);
      return Array.from(uniqueAddress);
    },
    default: () => [],
  }),
});
