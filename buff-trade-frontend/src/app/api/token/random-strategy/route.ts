import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 외부 API 호출
    const response = await fetch(
      "https://dev-buff-main-webserver.bufftrade.store/token/random-strategy",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching random strategy:", error);

    // Fallback response
    const fallbackStrategies = [
      "Invest in tokens or projects that are shilled by @your_x_handle. Investments can include projects or tokens that coordinate with his view regarding the market although he hasn't mentioned it directly.",
      "Focus on early-stage DeFi protocols with strong fundamentals and active development teams. Look for projects with innovative tokenomics and sustainable revenue models.",
      "Target meme tokens with strong community backing and viral potential. Prioritize tokens with clear utility and real-world applications beyond just speculation.",
      "Invest in AI and machine learning projects that are building the infrastructure for the next generation of decentralized applications.",
      "Focus on gaming and NFT projects that are creating immersive virtual worlds and have strong player engagement metrics.",
      "Target infrastructure projects that are building the foundational layer for Web3, including blockchain scaling solutions and cross-chain interoperability protocols.",
      "Invest in privacy-focused projects that are developing tools for anonymous transactions and data protection in the decentralized ecosystem.",
      "Focus on sustainability and green energy projects that are using blockchain technology to create positive environmental impact.",
    ];

    const randomStrategy =
      fallbackStrategies[Math.floor(Math.random() * fallbackStrategies.length)];

    return NextResponse.json({
      _id: "fallback-" + Date.now(),
      strategy: randomStrategy,
    });
  }
}
