import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS, buildUrl } from "@/shared/constants/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const { fundId } = params;
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "10";

    const response = await fetch(
      buildUrl(API_ENDPOINTS.AGENT_ACTIVITY(fundId), {
        page,
        pageSize,
      }),
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `External error ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
