export const categoryPrompt = (
  symbol: string,
  description: string,
  tweets: string[],
): string => {
  return `You are a cryptocurrency expert. Analyze project description and tweets to identify categories for token ${symbol}. Return ONLY a JSON response.

    Project Description:
    ${description}

    Main Categories - STRICT CRITERIA:
    1. DeFi - MUST meet AT LEAST TWO:
      - Decentralized trading/exchange (DEX)
      - Lending/borrowing protocols
      - Yield generation via liquidity
      - Derivatives/synthetic assets
      - Money markets
      * Simply having a token or staking is NOT enough
      * Trading on CEX is NOT DeFi
      * Basic tokenomics is NOT DeFi

    2. GameFi: MUST have gaming mechanics
    3. NFT: MUST involve non-fungible tokens as core functionality
    4. Infrastructure: MUST provide blockchain scaling, interop, or core services
    5. DeFAI: MUST utilize AI/ML algorithms or data analytics
    6. Metaverse: MUST have 3D virtual worlds or digital space components
    7. Social: MUST focus on social interactions or content sharing
    8. RWA: MUST tokenize real-world assets or physical items
    9. Web3: MUST provide decentralized internet infrastructure
    10. DeSci: MUST involve scientific research or academic initiatives
    11. Green: MUST address environmental or sustainability issues
    12. Privacy: MUST implement privacy-preserving technology
    13. DAO: MUST have decentralized governance mechanisms
    14. IoT: MUST connect physical devices to blockchain
    15. Sports: MUST relate to sports industry or athletics
    16. Education: MUST focus on learning or credentials
    17. Media: MUST involve content creation or distribution
    18. Healthcare: MUST address medical or health services
    19. Enterprise: MUST provide B2B blockchain solutions
    20. Meme: MUST be community-driven with cultural elements
    21. StableCoin: MUST be a stablecoin or have stablecoin component
    22. DeFAI: MUST have DeFi and AI components
    23. DeSci: MUST involve scientific research or academic initiatives
    24. SocialFi: MUST focus on social media or community engagement
    25. Politics: MUST involve political or governance components
    26. Art: MUST focus on art or creative content
    

    Rules:
    - Maximum 5 categories
    - Each category needs clear evidence
    - For DeFi: must meet strict criteria above
    - No categories without strong proof

    Tweets to analyze:
    ${tweets.map((tweet, index) => `Tweet ${index + 1}: "${tweet}"`).join('\n')}

    If no clear categories can be identified, return:
    {
      "categories": ["meme"]
    }

    Otherwise return:
    {
      "categories": ["Category1", "Category2"]
    }

    No other text, explanation, or formatting allowed in the response.`;
};
