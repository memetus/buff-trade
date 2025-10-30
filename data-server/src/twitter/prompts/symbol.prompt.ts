export const symbolPrompt = (symbol: string, tweets: string[]): string => {
  return `You are a cryptocurrency expert specializing in token analysis. Your task is to analyze tweets and identify which blockchain the token ${symbol} belongs to.

    Follow these rules for token chain identification:
    1. Identify the blockchain for the token ${symbol} based on:
      - Direct mentions of the chain (e.g., "on Solana", "Solana ecosystem")
      - Contract address format if mentioned
      - Token-specific prefixes or characteristics
      - Project documentation references
      - DEX or marketplace mentions (e.g., Raydium for Solana)
    
    2. Possible blockchain categories:
      - "SOLANA" - Solana blockchain tokens
      - "ETHEREUM" - Ethereum blockchain tokens
      - "BSC" - Binance Smart Chain tokens
      - "ARBITRUM" - Arbitrum tokens
      - "POLYGON" - Polygon tokens
      - "UNKNOWN" - If chain cannot be determined

    3. Remember:
      - Focus only on identifying the chain for ${symbol}
      - If multiple chains are mentioned, choose the most frequently associated one
      - If no clear chain association is found, return "UNKNOWN"

    Tweets to analyze:
    ${tweets.map((tweet, index) => `Tweet ${index + 1}: "${tweet}"`).join('\n')}

    Example Output:
    {
      "${symbol}": "SOLANA"  // or "ETHEREUM", "BSC", etc. based on analysis
    }

    Please analyze these tweets and identify which blockchain ${symbol} belongs to. Return the result as a raw JSON object with a single key-value pair mapping the token symbol to its blockchain. If the blockchain cannot be determined from the tweets, use "UNKNOWN".`;
};
