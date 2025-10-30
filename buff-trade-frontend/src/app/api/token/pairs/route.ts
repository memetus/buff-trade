export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

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

    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(
        token
      )}`
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `DexScreener error ${res.status}` },
        { status: 502 }
      );
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch pairs" },
      { status: 500 }
    );
  }
}
