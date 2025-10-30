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

    const res = await fetch(API_ENDPOINTS.PROFILE_TOKEN, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });

    const text = await res.text();

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
    return NextResponse.json(
      {
        error: "Profile token fetch failed",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
