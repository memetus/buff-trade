import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS, API_BASE_URL } from "@/shared/constants/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const { fundId } = params;
    const apiUrl = API_ENDPOINTS.AGENT_CARD(fundId);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Agent card request failed",
          message: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Try to fetch pool addresses from agent-dashboard API
    try {
      const dashboardUrl = `${API_BASE_URL}/agent-data/agent-dashboard?page=1&pageSize=100`;
      const dashboardRes = await fetch(dashboardUrl);

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        const agent = dashboardData.results?.find(
          (a: any) => a.fundId === fundId
        );

        if (agent) {
          data.bondingCurvePool = agent.bondingCurvePool;
          data.dammV2Pool = agent.dammV2Pool;
          // Map to poolAddress for easier consumption (prefer bondingCurvePool, fallback to dammV2Pool)
          data.poolAddress = agent.bondingCurvePool || agent.dammV2Pool;
        }
      }
    } catch (dashboardError) {}

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
