/**
 * localStorage 키 상수 정의
 */

export const STORAGE_KEYS = {
  // 사용자 토큰 관련
  USER_TOKENS: "user_tokens",

  // 지갑 관련
  WALLET_NAME: "wallet_name",
  WALLET_AVATAR: "wallet_avatar",

  // 토큰 생성 관련
  AGENT_TOKEN_ID: "agentTokenId",
  FUND_ID: "fundId",
} as const;

// localStorage 헬퍼 함수들
export const storage = {
  get: (key: string) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  set: (key: string, value: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
    }
  },

  remove: (key: string) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
    }
  },

  getJSON: (key: string) => {
    const value = storage.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  },

  setJSON: (key: string, value: any) => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch (error) {
    }
  },
};
