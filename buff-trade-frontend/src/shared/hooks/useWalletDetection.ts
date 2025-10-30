import { useCallback } from "react";

export const useWalletDetection = () => {
  // 모바일 환경 감지
  const isMobile = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  }, []);

  // 모바일 앱 설치 여부 확인
  const checkMobileAppInstalled = useCallback((walletName: string): boolean => {
    if (typeof window === "undefined") return false;

    // 모바일에서는 브라우저 확장 프로그램을 감지할 수 없으므로
    // 앱이 설치되어 있다고 가정하고 딥링크를 시도
    return true;
  }, []);

  const checkWalletInstalled = useCallback(
    (walletName: string): boolean => {
      if (typeof window === "undefined") return false;

      // 모바일 환경에서는 앱 설치 여부를 다르게 처리
      if (isMobile()) {
        return checkMobileAppInstalled(walletName);
      }

      switch (walletName.toLowerCase()) {
        case "phantom":
          return !!(window as any).solana?.isPhantom;
        case "solflare":
          return !!(window as any).solana?.isSolflare;
        case "backpack":
          return !!(window as any).solana?.isBackpack;
        case "coinbase wallet":
        case "coinbase":
          return (
            !!(window as any).coinbaseWallet || !!(window as any).coinbaseSolana
          );
        case "okx wallet":
        case "okx":
          return !!(window as any).okxwallet?.solana;
        case "trust":
          return !!(window as any).solana?.isTrust;
        case "ledger":
          return !!(window as any).solana?.isLedger;
        case "mathwallet":
        case "math":
          return !!(window as any).solana?.isMathWallet;
        default:
          return false;
      }
    },
    [isMobile, checkMobileAppInstalled]
  );

  // 모바일 앱 딥링크 URL 생성
  const getMobileDeepLink = useCallback((walletName: string): string => {
    const buffTradeUrl = "https://www.buff.trade/";

    switch (walletName.toLowerCase()) {
      case "phantom":
        return `https://phantom.app/ul/browse/${encodeURIComponent(
          buffTradeUrl
        )}`;
      case "solflare":
        return `solflare://browse?url=${encodeURIComponent(buffTradeUrl)}`;
      case "backpack":
        return `https://backpack.app/ul/browse/${encodeURIComponent(
          buffTradeUrl
        )}`;
      case "coinbase wallet":
      case "coinbase":
        return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(
          buffTradeUrl
        )}`;
      case "okx wallet":
      case "okx":
        return `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(
          buffTradeUrl
        )}`;
      case "trust":
        return `trust://open_url?url=${encodeURIComponent(buffTradeUrl)}`;
      case "mathwallet":
      case "math":
        return `mathwallet://open?url=${encodeURIComponent(buffTradeUrl)}`;
      default:
        return `https://phantom.app/ul/browse/${encodeURIComponent(
          buffTradeUrl
        )}`;
    }
  }, []);

  const getWalletDownloadUrl = useCallback((walletName: string): string => {
    switch (walletName.toLowerCase()) {
      case "phantom":
        return "https://phantom.app/download";
      case "solflare":
        return "https://solflare.com/download";
      case "backpack":
        return "https://backpack.app/download";
      case "coinbase wallet":
      case "coinbase":
        return "https://www.coinbase.com/wallet";
      case "okx wallet":
      case "okx":
        return "https://www.okx.com/web3";
      case "trust":
        return "https://trustwallet.com/download";
      case "ledger":
        return "https://www.ledger.com/ledger-live";
      case "mathwallet":
      case "math":
        return "https://mathwallet.org/";
      default:
        return "https://phantom.app/download";
    }
  }, []);

  const handleWalletClick = useCallback(
    (walletName: string) => {
      const isInstalled = checkWalletInstalled(walletName);

      if (!isInstalled) {
        const downloadUrl = getWalletDownloadUrl(walletName);

        // 바로 설치 페이지로 이동
        if (typeof window !== "undefined") {
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
        }
        return false; // 지갑이 설치되지 않음
      }

      // 모바일 환경에서는 딥링크를 시도
      if (isMobile()) {
        const deepLinkUrl = getMobileDeepLink(walletName);

        if (typeof window !== "undefined") {
          // 딥링크 시도
          const deepLinkWindow = window.open(
            deepLinkUrl,
            "_blank",
            "noopener,noreferrer"
          );

          // 딥링크가 실패할 경우를 대비해 fallback 타이머 설정
          setTimeout(() => {
            if (deepLinkWindow && !deepLinkWindow.closed) {
              deepLinkWindow.close();
            }
            // 앱이 설치되지 않은 경우 다운로드 페이지로 이동
            const downloadUrl = getWalletDownloadUrl(walletName);
            window.open(downloadUrl, "_blank", "noopener,noreferrer");
          }, 2000); // 2초 후 fallback
        }

        return true; // 모바일에서는 항상 true 반환 (딥링크 시도)
      }

      return true; // 데스크톱에서 지갑이 설치됨
    },
    [checkWalletInstalled, getWalletDownloadUrl, isMobile, getMobileDeepLink]
  );

  return {
    handleWalletClick,
    checkWalletInstalled,
    isMobile,
    getMobileDeepLink,
    getWalletDownloadUrl,
  };
};
