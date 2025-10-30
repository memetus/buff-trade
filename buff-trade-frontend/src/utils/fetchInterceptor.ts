import { logApiCall, logApiResponse, logApiError } from "./apiLogger";
import Reactotron from "reactotron-react-js";

// 원본 fetch 함수 저장 (클라이언트 사이드에서만)
const originalFetch = typeof window !== "undefined" ? window.fetch : undefined;

// fetch 인터셉터 설정
export const setupFetchInterceptor = () => {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined" || !originalFetch) return;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    const method = init?.method || "GET";
    const startTime = Date.now();

    // API 호출 로깅
    logApiCall(url, method, {
      headers: init?.headers,
      body: init?.body,
    });

    try {
      const response = await originalFetch!(input, init);
      const duration = Date.now() - startTime;

      // 응답 로깅
      if (response.ok) {
        // 응답 데이터를 복제해서 로깅 (원본 응답은 그대로 유지)
        const clonedResponse = response.clone();
        try {
          const data = await clonedResponse.json();
          logApiResponse(url, response.status, data, duration);

          // 특별한 데이터 구조 분석 및 로깅
          analyzeApiData(url, data);
        } catch {
          // JSON이 아닌 경우 텍스트로 로깅
          const text = await clonedResponse.text();
          logApiResponse(url, response.status, { text }, duration);
        }
      } else {
        logApiResponse(url, response.status, null, duration);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logApiError(url, error);
      throw error;
    }
  };
};

// Reactotron 연결 상태 확인
const isReactotronConnected = () => {
  try {
    return Reactotron && typeof (Reactotron as any).log === "function";
  } catch {
    return false;
  }
};

// API 데이터 분석 및 상세 로깅
const analyzeApiData = (url: string, data: any) => {
  if (process.env.NODE_ENV !== "development") return;

  // Reactotron 연결 상태 확인
  if (!isReactotronConnected()) {
    return;
  }

  // agent-dashboard API 분석
  if (url.includes("/api/agent-dashboard")) {
    (Reactotron as any).log("📊 Agent Dashboard Data Analysis", {
      url,
      totalCount: data.totalCount,
      resultsCount: data.results?.length || 0,
      sampleToken: data.results?.[0],
      hasMarketCap: data.results?.[0]?.marketCap !== undefined,
      hasLatestTrade: data.results?.[0]?.latestTrade !== undefined,
      hasTopPortfolio: data.results?.[0]?.topPortfolio !== undefined,
      marketCapRange: data.results
        ? {
            min: Math.min(...data.results.map((t: any) => t.marketCap || 0)),
            max: Math.max(...data.results.map((t: any) => t.marketCap || 0)),
            avg:
              data.results.reduce(
                (sum: number, t: any) => sum + (t.marketCap || 0),
                0
              ) / data.results.length,
          }
        : null,
    });
  }

  // token-transactions API 분석
  if (url.includes("/api/agent-data/token-transactions")) {
    (Reactotron as any).log("💸 Token Transactions Data Analysis", {
      url,
      success: data.success,
      totalCount: data.totalCount,
      resultsCount: data.results?.length || 0,
      page: data.page,
      pageSize: data.pageSize,
      sampleTransaction: data.results?.[0],
    });
  }

  // token-holders API 분석
  if (url.includes("/api/agent-data/token-holders")) {
    (Reactotron as any).log("👥 Token Holders Data Analysis", {
      url,
      success: data.success,
      totalCount: data.totalCount,
      resultsCount: data.results?.length || 0,
      sampleHolder: data.results?.[0],
    });
  }

  // 기타 API들에 대한 일반적인 분석
  if (
    !url.includes("/api/agent-dashboard") &&
    !url.includes("/api/agent-data/token-transactions") &&
    !url.includes("/api/agent-data/token-holders") &&
    !url.includes("/api/top-portfolios")
  ) {
    (Reactotron as any).log("🔍 Other API Data Analysis", {
      url,
      dataKeys: Object.keys(data),
      dataType: typeof data,
      isArray: Array.isArray(data),
      hasResults: data.results !== undefined,
      resultsCount: data.results?.length || 0,
    });
  }
};

// 인터셉터 해제 (필요시)
export const removeFetchInterceptor = () => {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window === "undefined" || !originalFetch) return;
  window.fetch = originalFetch;
};
