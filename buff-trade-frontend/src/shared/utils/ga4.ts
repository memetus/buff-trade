/**
 * Google Analytics 4 Event Tracking Utilities
 * GTM Container ID: GTM-58XM6J8X
 * GA4 Measurement ID: G-BQJSZMD9MV
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// GA4 이벤트 발화 함수
export const trackGA4Event = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      ...parameters,
      // 기본 파라미터
      event_category: "user_interaction",
      event_label: eventName,
    });
  }
};

// GTM dataLayer 푸시 함수
export const pushToDataLayer = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...parameters,
    });
  }
};

// 리텐션 분석용 - 지갑 연결 성공
export const trackConnectWalletSuccess = (
  user_id: string,
  wallet_provider: string
) => {
  trackGA4Event("connect_wallet_success", {
    user_id,
    wallet_provider,
  });

  pushToDataLayer("connect_wallet_success", {
    user_id,
    wallet_provider,
  });
};

// Buy 관련 이벤트들
export const trackBuyClick = (volume?: number) => {
  trackGA4Event("buy_click", volume ? { volume } : {});
  pushToDataLayer("buy_click", volume ? { volume } : {});
};

export const trackBuySuccess = (volume?: number) => {
  trackGA4Event("buy_success", volume ? { volume } : {});
  pushToDataLayer("buy_success", volume ? { volume } : {});
};

export const trackBuyFail = (volume?: number) => {
  trackGA4Event("buy_fail", volume ? { volume } : {});
  pushToDataLayer("buy_fail", volume ? { volume } : {});
};

// Invite 관련 이벤트들
export const trackInviteModalView = () => {
  trackGA4Event("invite_modal_view");
  pushToDataLayer("invite_modal_view");
};

export const trackInviteCodeSubmit = (valid: boolean) => {
  trackGA4Event("invite_code_submit", {
    valid,
  });

  pushToDataLayer("invite_code_submit", {
    valid,
  });
};

// 가상 Page Path 설정 (SPA 라우팅용)
export const setVirtualPagePath = (symbol: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-BQJSZMD9MV", {
      page_path: `/token/${symbol}`,
      page_title: `Token ${symbol}`,
    });
  }
};

// 사용자 ID 설정
export const setUserId = (user_id: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-BQJSZMD9MV", {
      user_id,
    });
  }
};

// 테스트용 이벤트 (개발 시 확인용)
export const testGA4Event = () => {
  if (typeof window !== "undefined") {
    // 테스트 이벤트 발화
    trackGA4Event("test_event", { test: true, timestamp: Date.now() });
    pushToDataLayer("test_event", { test: true, timestamp: Date.now() });
  }
};
