export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { API_ENDPOINTS } from "@/shared/constants/api";

export async function GET() {
  try {
    const response = await fetch(API_ENDPOINTS.TRANSACTION_TICKER, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            errorText ||
            `Failed to fetch transaction ticker (status ${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error while fetching transaction ticker" },
      { status: 500 }
    );
  }
}

