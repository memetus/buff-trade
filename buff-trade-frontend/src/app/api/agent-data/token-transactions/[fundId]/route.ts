import { NextRequest, NextResponse } from "next/server";
import { API_ENDPOINTS, buildUrl } from "@/shared/constants/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { fundId: string } }
) {
  try {
    const { fundId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    if (!fundId) {
      return NextResponse.json(
        { error: "Fund ID is required" },
        { status: 400 }
      );
    }

    // Call external API with pagination parameters
    const apiUrl = buildUrl(API_ENDPOINTS.TOKEN_TRANSACTIONS(fundId), {
      page,
      pageSize,
    });

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // API 응답 구조에 맞게 수정
    const transactions = data.transactions || data.results || data.data || [];
    const totalCount =
      data.totalTransactions || data.totalCount || data.total || 0;

    return NextResponse.json({
      success: true,
      results: transactions,
      totalCount: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    return NextResponse.json({ status: 500 });
  }
}
