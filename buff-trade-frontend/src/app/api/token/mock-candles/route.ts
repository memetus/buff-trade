import { NextRequest, NextResponse } from "next/server";

// Mock 차트 데이터를 생성하는 함수
function generateMockCandles(
  tokenMint: string,
  interval: string = "15m",
  limit: number = 200
) {
  const candles = [];
  const now = Date.now();
  const intervalMs = interval === "15m" ? 15 * 60 * 1000 : 60 * 1000; // 15분 또는 1분

  // 초기 가격 (create token 시 설정된 가격)
  let basePrice = 0.001; // $0.001로 시작

  // 토큰별로 다른 초기 가격 설정 (토큰 주소 기반)
  const seed = tokenMint.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  basePrice = 0.0001 + (seed % 1000) / 1000000; // $0.0001 ~ $0.0011 사이

  // 해커톤 시연용: 더 극적인 가격 변동을 위한 설정
  const isDemoMode = true; // 시연 모드
  const demoVolatility = isDemoMode ? 0.15 : 0.05; // 15% 변동성

  for (let i = limit - 1; i >= 0; i--) {
    const time = now - i * intervalMs;

    // 가격 변동 시뮬레이션 (랜덤 워크)
    const volatility = demoVolatility; // 시연용 변동성
    const randomChange = (Math.random() - 0.5) * volatility;
    basePrice = basePrice * (1 + randomChange);

    // 시연용: 가끔 큰 변동 추가 (펌프/덤프 효과)
    if (isDemoMode && Math.random() < 0.1) {
      // 10% 확률로 큰 변동
      const bigMove = (Math.random() - 0.5) * 0.5; // ±25% 변동
      basePrice = basePrice * (1 + bigMove);
    }

    // 최소 가격 보장
    basePrice = Math.max(basePrice, 0.00001);

    // OHLC 데이터 생성
    const open = basePrice;
    const high = basePrice * (1 + Math.random() * 0.02); // 최대 2% 상승
    const low = basePrice * (1 - Math.random() * 0.02); // 최대 2% 하락
    const close = low + Math.random() * (high - low);

    candles.push({
      t: time,
      o: parseFloat(open.toFixed(8)),
      h: parseFloat(high.toFixed(8)),
      l: parseFloat(low.toFixed(8)),
      c: parseFloat(close.toFixed(8)),
    });

    // 다음 캔들을 위한 가격 업데이트
    basePrice = close;
  }

  return candles;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const interval = searchParams.get("interval") || "15m";
    const limit = parseInt(searchParams.get("limit") || "200");

    if (!token) {
      return NextResponse.json(
        { error: "Missing token parameter" },
        { status: 400 }
      );
    }

    // Mock 데이터 생성
    const candles = generateMockCandles(token, interval, limit);

    return NextResponse.json(candles);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate mock candles" },
      { status: 500 }
    );
  }
}
