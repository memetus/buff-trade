import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fundId, tokenTicker, tokenAddress, type, solAmount, tokenAmount } =
      body;

    // 필수 필드 검증
    if (
      !fundId ||
      !tokenTicker ||
      !tokenAddress ||
      !type ||
      solAmount === undefined ||
      tokenAmount === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 트랜잭션 타입 검증
    if (type !== "buy" && type !== "sell") {
      return NextResponse.json(
        { error: "Invalid transaction type. Must be 'buy' or 'sell'" },
        { status: 400 }
      );
    }

    // 서버로 트랜잭션 정보 전송
    const serverUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/token/save-token-transaction`;

    // 인증 헤더 가져오기
    const authHeader = request.headers.get("authorization");

    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify({
        fundId,
        tokenTicker,
        tokenAddress,
        type,
        solAmount,
        tokenAmount,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [API] Server error:", response.status, errorText);

      // 401 에러인 경우 특별 처리
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed - invalid token" },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "Failed to save transaction" },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error saving transaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
