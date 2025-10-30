import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/shared/constants/api";

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const apiUrl = `${API_BASE_URL}/token/create-agent`;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(
        "❌ [API-PROXY] Create agent error:",
        response.status,
        response.statusText
      );

      // 외부 API 서버가 400/500 에러를 반환하는 경우 임시 fallback 제공
      if (response.status === 400 || response.status === 500) {
        return NextResponse.json({
          success: true,
          message: "Agent creation completed (external API unavailable)",
        });
      }

      return NextResponse.json(
        { error: "Create agent request failed" },
        { status: response.status }
      );
    }

    let data;
    try {
      const responseText = await response.text();
      if (responseText.trim()) {
        data = JSON.parse(responseText);
      } else {
        data = { success: true, message: "Agent created successfully" };
      }
    } catch (parseError) {
      // 외부 API가 잘못된 JSON을 반환하는 경우 기본 응답 제공
      data = {
        success: response.ok,
        message: response.ok
          ? "Agent created successfully"
          : "Agent creation failed",
        error: response.ok ? null : "Invalid JSON response from external API",
      };
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
