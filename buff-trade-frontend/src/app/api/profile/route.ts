import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/constants/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl = `${API_BASE_URL}/profile`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        "❌ [API-PROXY] Profile error:",
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: "Profile request failed" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [API-PROXY] Profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
