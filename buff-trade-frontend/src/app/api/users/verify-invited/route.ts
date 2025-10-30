import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiUrl =
      "https://dev-buff-main-webserver.bufftrade.store/users/verify-invited";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      parsedBody = responseText;
    }

    if (!response.ok) {
      return NextResponse.json(
        parsedBody || { error: "Invite verification request failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(parsedBody);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
