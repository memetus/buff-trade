import React from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/token/[id]/page.module.scss";
import className from "classnames/bind";
import TradingViewChart from "@/components/common/chart/TradingViewChart";

const cx = className.bind(styles);

interface TokenDetailPageProps {
  params: {
    id: string;
  };
}

// 토큰별 설정 (실제로는 API나 데이터베이스에서 가져올 수 있음)
const TOKEN_CONFIG: Record<
  string,
  { symbol: string; decimals: number; name: string }
> = {
  "7Uuzh9JwqF8z3u6MWpQuQJbpD1u46xPDY6PGjwfwTh4o": {
    symbol: "HOMO",
    decimals: 6,
    name: "Homo Memetus",
  },
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    decimals: 9,
    name: "Solana",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin",
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: "BONK",
    decimals: 5,
    name: "Bonk",
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    symbol: "JUP",
    decimals: 6,
    name: "Jupiter",
  },
  "4tarS1kSfoYQUG3fZNHeGMXKEjbm1Aq67ub5x4nJhhsk": {
    symbol: "TEST",
    decimals: 6,
    name: "Test Token",
  },
};

const TokenDetailPage = ({ params }: TokenDetailPageProps) => {
  const router = useRouter();
  const tokenId = params.id;
  const [tokenInfo, setTokenInfo] = React.useState<{
    symbol: string;
    decimals: number;
    name: string;
  } | null>(null);

  React.useEffect(() => {
    // 토큰 정보 가져오기
    const info = TOKEN_CONFIG[tokenId] || {
      symbol: "UNKNOWN",
      decimals: 6,
      name: "Unknown Token",
    };
    setTokenInfo(info);
  }, [tokenId]);

  if (!tokenInfo) {
    return (
      <div className={cx("loading")}>
        <div>Loading token information...</div>
      </div>
    );
  }

  return (
    <div className={cx("token-detail-page")}>
      <div className={cx("token-header")}>
        <button className={cx("back-button")} onClick={() => router.back()}>
          ← Back
        </button>
        <h1 className={cx("token-name")}>{tokenInfo.name}</h1>
        <div className={cx("token-symbol")}>{tokenInfo.symbol}</div>
        <div className={cx("token-address")}>Address: {tokenId}</div>
      </div>

      <div className={cx("chart-container")}>
        <TradingViewChart
          symbol={tokenInfo.symbol}
          tokenMint={tokenId}
          height={500}
          showHeader={true}
        />
      </div>
    </div>
  );
};

export default TokenDetailPage;
