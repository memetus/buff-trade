import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get("pair");
    const interval = searchParams.get("interval") || "15m";
    const limit = searchParams.get("limit") || "200";

    if (!pair) {
      return NextResponse.json(
        { error: "Missing pair parameter" },
        { status: 400 }
      );
    }

    // DexScreener chart bars
    const url = `https://api.dexscreener.com/latest/dex/charts?pairAddress=${encodeURIComponent(
      pair
    )}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(
      limit
    )}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `DexScreener error ${res.status}` },
        { status: 502 }
      );
    }
    const json = await res.json();
    const bars = json?.pairs?.[0]?.charts || [];
    return NextResponse.json(bars);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch candles" },
      { status: 500 }
    );
  }
}
