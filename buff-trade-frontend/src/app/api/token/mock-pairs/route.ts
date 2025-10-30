import { NextRequest, NextResponse } from "next/server";

// Mock pair 데이터를 생성하는 함수
function generateMockPair(tokenMint: string) {
  // 토큰 주소 기반으로 일관된 데이터 생성
  const seed = tokenMint.split("").reduce((a, b) => a + b.charCodeAt(0), 0);

  // Mock pair 정보
  const pair = {
    chainId: "solana",
    dexId: "mock-dex",
    url: `https://mock-dex.com/pair/${tokenMint}`,
    pairAddress: `${tokenMint.slice(0, 8)}...${tokenMint.slice(-8)}`, // 짧은 주소
    baseToken: {
      address: tokenMint,
      name: `Mock Token ${seed % 1000}`,
      symbol: `MOCK${seed % 100}`,
      decimals: 9,
    },
    quoteToken: {
      address: "So11111111111111111111111111111111111111112", // SOL
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    priceNative: `${(0.0001 + (seed % 1000) / 1000000).toFixed(8)}`,
    priceUsd: `${(0.0001 + (seed % 1000) / 1000000).toFixed(8)}`,
    txns: {
      m5: {
        buys: Math.floor(Math.random() * 10),
        sells: Math.floor(Math.random() * 10),
      },
      h1: {
        buys: Math.floor(Math.random() * 50),
        sells: Math.floor(Math.random() * 50),
      },
      h6: {
        buys: Math.floor(Math.random() * 200),
        sells: Math.floor(Math.random() * 200),
      },
      h24: {
        buys: Math.floor(Math.random() * 500),
        sells: Math.floor(Math.random() * 500),
      },
    },
    volume: {
      h24: Math.random() * 10000,
      h6: Math.random() * 2000,
      h1: Math.random() * 500,
      m5: Math.random() * 100,
    },
    priceChange: {
      m5: (Math.random() - 0.5) * 20, // -10% ~ +10%
      h1: (Math.random() - 0.5) * 40, // -20% ~ +20%
      h6: (Math.random() - 0.5) * 60, // -30% ~ +30%
      h24: (Math.random() - 0.5) * 100, // -50% ~ +50%
    },
    liquidity: {
      usd: Math.random() * 50000 + 10000, // $10k ~ $60k
      base: Math.random() * 1000000 + 100000,
      quote: Math.random() * 100 + 10,
    },
    fdv: Math.random() * 1000000 + 100000, // $100k ~ $1.1M
    marketCap: Math.random() * 500000 + 50000, // $50k ~ $550k
    pairCreatedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // 최근 7일 내
  };

  return pair;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token parameter" },
        { status: 400 }
      );
    }

    // Mock pair 데이터 생성
    const pair = generateMockPair(token);

    return NextResponse.json({
      schemaVersion: "1.0.0",
      pairs: [pair],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate mock pair" },
      { status: 500 }
    );
  }
}
