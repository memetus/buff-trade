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

    // Build query parameters
    const queryParams = new URLSearchParams({
      page,
      pageSize,
    });

    // Forward the request to the external API
    const response = await fetch(
      buildUrl(API_ENDPOINTS.TOP_PORTFOLIOS(fundId), {
        page,
        pageSize,
      }),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `External API error: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch top portfolios" },
      { status: 500 }
    );
  }
}
