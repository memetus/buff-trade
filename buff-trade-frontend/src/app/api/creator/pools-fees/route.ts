import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS } from "@/shared/constants/api";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const creatorAddress = searchParams.get("creator");

    if (!creatorAddress) {
      return NextResponse.json(
        { error: "Missing creator address" },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${API_ENDPOINTS.CREATOR_POOLS_FEES}/${creatorAddress}`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      }
    );

    const text = await res.text();

    // Try to parse and log structured data
    try {
      const jsonData = JSON.parse(text);
    } catch (e) {}

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    console.error("Pools fees fetch failed:", e);
    return NextResponse.json(
      { error: "Pools fees fetch failed" },
      { status: 500 }
    );
  }
}
