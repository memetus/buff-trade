import Reactotron from "reactotron-react-js";

// Reactotron 연결 상태 확인
const isReactotronConnected = () => {
  try {
    return Reactotron && typeof (Reactotron as any).log === "function";
  } catch {
    return false;
  }
};

// API 호출 로깅을 위한 유틸리티 함수들
export const logApiCall = (url: string, method: string = "GET", data?: any) => {
  if (process.env.NODE_ENV === "development" && isReactotronConnected()) {
    (Reactotron as any).log(`🌐 API Call: ${method} ${url}`, {
      url,
      method,
      data,
      timestamp: new Date().toISOString(),
    });
  }
};

export const logApiResponse = (
  url: string,
  status: number,
  data: any,
  duration?: number
) => {
  if (process.env.NODE_ENV === "development" && isReactotronConnected()) {
    const logLevel = status >= 400 ? "error" : status >= 300 ? "warn" : "log";
    (Reactotron as any)[logLevel](`📡 API Response: ${status} ${url}`, {
      url,
      status,
      data,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString(),
    });
  }
};

export const logApiError = (url: string, error: any) => {
  if (process.env.NODE_ENV === "development" && isReactotronConnected()) {
    (Reactotron as any).error(`❌ API Error: ${url}`, {
      url,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
