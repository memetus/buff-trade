import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/constants/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const { fundId } = params;
    const apiUrl = `${API_BASE_URL}/agent-data/agent-metadata/${fundId}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Agent metadata request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API-PROXY] Agent metadata error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
