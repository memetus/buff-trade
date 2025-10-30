import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS } from "@/shared/constants/api";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { poolAddress } = body;

    if (!poolAddress) {
      return NextResponse.json(
        { error: "Missing pool address" },
        { status: 400 }
      );
    }

    const res = await fetch(API_ENDPOINTS.CREATOR_CLAIM_TRADING_FEE, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ poolAddress }),
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Claim trading fee failed" },
      { status: 500 }
    );
  }
}
