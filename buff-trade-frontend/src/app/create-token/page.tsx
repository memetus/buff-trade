"use client";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.scss";
import Header from "@/components/layout/header/Header";
import ActivityTicker from "@/components/layout/activityTicker/ActivityTicker";
import classNames from "classnames/bind";
import { useBondingCurve } from "@/shared/hooks/useBondingCurve";
import { Keypair } from "@solana/web3.js";
import {
  ActivationType,
  BaseFeeMode,
  buildCurve,
  BuildCurveParam,
  CollectFeeMode,
  ConfigParameters,
  MigrationFeeOption,
  MigrationOption,
  TokenDecimal,
  TokenType,
  deriveDbcPoolAddress,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import WalletConnectModal from "@/components/common/modal/walletConnectModal/WalletConnectModal";
import { useDispatch } from "react-redux";
import { APPEND_MODAL } from "@/contexts/global/slice/modalSlice";

const cx = classNames.bind(styles);

const ValidationAlert = ({
  isOpen,
  onClose,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className={cx("validation-alert")}>
      <div className={cx("alert-content")}>
        <div className={cx("alert-icon")}>
          <Image
            src="/icons/red-circle-warning.svg"
            alt="Warning"
            width={20}
            height={20}
          />
        </div>
        <p className={cx("alert-message")}>
          Fill in all the necessary information.
        </p>
        <button className={cx("alert-close")} onClick={onClose}>
          <Image src="/icons/close.svg" alt="Close" width={16} height={16} />
        </button>
      </div>
    </div>
  );
};

// WalletConnectModal은 이제 공통 컴포넌트를 사용하므로 제거

const CreateTokenStepTwo = ({
  isActive,
  onClose,
  onBack,
  tokenData,
}: {
  isActive: boolean;
  onClose: () => void;
  onBack: () => void;
  tokenData: any;
}) => {
  const router = useRouter();
  const CREATION_FEE_SOL = 0.2;

  const [formData, setFormData] = useState({
    buyAmount: "0.1",
    slippage: "0.5",
    creationFee: CREATION_FEE_SOL.toString(),
  });
  const [isCreating, setIsCreating] = useState(false);
  const { mintTokenCreateBondAndBuy } = useBondingCurve();
  const { publicKey } = useWallet();
  const [estimatedTokenOut, setEstimatedTokenOut] = useState<string>("0.00");
  const [successData, setSuccessData] = useState<null | {
    fundId?: string;
    poolAddress?: string;
    tokenName: string;
    tokenTicker: string;
    tokenAddress: string;
  }>(null);
  const [loadingState, setLoadingState] = useState<
    "idle" | "progress" | "success" | "failure"
  >("idle");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showCreationFeeTooltip, setShowCreationFeeTooltip] = useState(false);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[class*="info-icon-container"]')) {
        setShowCreationFeeTooltip(false);
      }
    };

    if (showCreationFeeTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showCreationFeeTooltip]);

  // 간단한 추정치: 초기 가격 가정 후 슬리피지 반영 (UI 안내용)
  useEffect(() => {
    const buySol = parseFloat(formData.buyAmount || "0");
    const slippagePct = parseFloat(formData.slippage || "0");
    if (!isFinite(buySol) || buySol <= 0) {
      setEstimatedTokenOut("0.00");
      return;
    }
    // Heuristic: assume early-curve price around 0.000001 SOL per token (1e-6)
    const assumedPriceSolPerToken = 0.000001;
    const rawOut = buySol / assumedPriceSolPerToken;
    const outAfterSlippage = rawOut * (1 - Math.max(0, slippagePct) / 100);
    const formatted =
      outAfterSlippage >= 1
        ? Math.floor(outAfterSlippage).toLocaleString()
        : outAfterSlippage.toFixed(2);
    setEstimatedTokenOut(formatted);
  }, [formData.buyAmount, formData.slippage]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateToken = async () => {
    // Ensure latest gate info before checking
    try {
      const { syncAgentGateInfo } = await import("@/shared/utils/userGate");
      await syncAgentGateInfo(publicKey?.toBase58());
    } catch (e) {
      // ignore error
    }
    // 에이전트 생성 조건 확인
    const { checkAgentCreationCondition, showAgentCreationAlert } =
      await import("@/shared/utils/agentCreation");

    if (!showAgentCreationAlert()) {
      return; // 조건을 만족하지 않으면 생성 중단
    }

    setIsCreating(true);
    setLoadingState("progress");
    setLoadingMessage("Creating token...");

    try {
      // Get saved tokenId from localStorage
      const tokenId = localStorage.getItem("agentTokenId");
      if (!tokenId) {
        throw new Error(
          "No tokenId found. Please complete the previous step first."
        );
      }

      // Generate Keypairs locally
      const mint = Keypair.generate();
      const curve = Keypair.generate();

      const buildParams: BuildCurveParam = {
        totalTokenSupply: 1000000000,
        migrationOption: MigrationOption.MET_DAMM_V2,
        tokenBaseDecimal: TokenDecimal.SIX,
        tokenQuoteDecimal: TokenDecimal.NINE,
        percentageSupplyOnMigration: 20,
        migrationQuoteThreshold: 85,
        lockedVestingParam: {
          totalLockedVestingAmount: 0,
          numberOfVestingPeriod: 0,
          cliffUnlockAmount: 0,
          totalVestingDuration: 0,
          cliffDurationFromMigrationTime: 0,
        },
        baseFeeParams: {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 200,
            endingFeeBps: 200,
            numberOfPeriod: 0,
            totalDuration: 0,
          },
        },
        dynamicFeeEnabled: false,
        activationType: ActivationType.Slot,
        collectFeeMode: CollectFeeMode.QuoteToken,
        migrationFeeOption: MigrationFeeOption.FixedBps200,
        tokenType: TokenType.SPL,
        partnerLpPercentage: 0,
        creatorLpPercentage: 0,
        partnerLockedLpPercentage: 50,
        creatorLockedLpPercentage: 50,
        creatorTradingFeePercentage: 50,
        leftover: 1000,
        tokenUpdateAuthority: 0,
        migrationFee: {
          feePercentage: 10,
          creatorFeePercentage: 0,
        },
      };

      const config: ConfigParameters = buildCurve(buildParams);

      let bondingCurveResult;
      try {
        const firstBuyAmountSOL = parseFloat(formData.buyAmount || "0");
        const creationFeeSOL = parseFloat(formData.creationFee || "0");
        // Partner address 설정
        const partnerAddress = "8GZeAPQ2gTcd6kD1EFZC6fAvgksqzuQ9eYy9hVGKqZws";

        // Get imageUrl from localStorage (saved from create-agent API response)
        const imageUrl =
          localStorage.getItem("agentImageUrl") ||
          "https://ipfs.io/ipfs/bafkreibnhnekv72bec4wnz7shphp2rxy5v6cggy3fdlor2vllfcfi6w4bm";

        bondingCurveResult = await mintTokenCreateBondAndBuy(
          mint,
          tokenData.name,
          tokenData.ticker,
          imageUrl,
          publicKey?.toBase58() || "",
          curve,
          config as any,
          NATIVE_MINT.toBase58(),
          partnerAddress, // Partner address 사용
          isNaN(firstBuyAmountSOL) ? 0 : firstBuyAmountSOL,
          isNaN(creationFeeSOL) ? 0 : creationFeeSOL
        );

        // Meteora SDK 결과 검증
        if (!bondingCurveResult || !bondingCurveResult.signature) {
          throw new Error("Meteora SDK returned invalid result");
        }
      } catch (meteoraError) {
        const msg =
          meteoraError instanceof Error
            ? meteoraError.message
            : typeof meteoraError === "object" && meteoraError !== null
            ? JSON.stringify(meteoraError, null, 2)
            : String(meteoraError);

        if (
          msg.includes("User rejected") ||
          msg.includes("WalletSignTransactionError") ||
          msg.includes("WALLET_REJECTED")
        ) {
          throw new Error(
            "WALLET_REJECTED: You rejected the wallet signature. Please approve to create the token."
          );
        }

        // InstructionError 처리
        if ((meteoraError as any)?.InstructionError) {
          const instructionError = (meteoraError as any).InstructionError;
          const errorDetails = Array.isArray(instructionError)
            ? `Instruction ${instructionError[0]}: ${JSON.stringify(
                instructionError[1]
              )}`
            : JSON.stringify(instructionError);
          throw new Error(`Meteora SDK InstructionError: ${errorDetails}`);
        }

        throw new Error(`Meteora SDK failed: ${msg}`);
      }
      // Pool 생성 후 검증 및 실제 Pool 주소 확인
      let resolvedPoolAddress: string | null = null;
      try {
        const { Connection, PublicKey } = await import("@solana/web3.js");
        const { DynamicBondingCurveClient } = await import(
          "@meteora-ag/dynamic-bonding-curve-sdk"
        );
        const mainnetConnection = new Connection(
          process.env.NEXT_PUBLIC_HELIUS_API_KEY
            ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
            : "https://api.mainnet-beta.solana.com",
          {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: 120000, // 120초로 타임아웃 증가
          }
        );

        // Wait for transaction confirmation to avoid racing the RPC
        try {
          await mainnetConnection.confirmTransaction(
            bondingCurveResult.signature,
            "confirmed"
          );
        } catch (confirmError) {
          // ignore error
        }

        // Poll for the pool account to appear as RPC can be eventually consistent
        const client = DynamicBondingCurveClient.create(mainnetConnection);
        const state: any = (client as any).state;
        const maxAttempts = 15;
        const delayMs = 1500;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            if (state?.getPoolByBaseMint) {
              const poolAcc = await state.getPoolByBaseMint(mint.publicKey);
              const pk = poolAcc?.publicKey?.toBase58?.();
              if (pk) {
                resolvedPoolAddress = pk;
                break;
              }
            }
          } catch {}

          // Fallback: derive PDA and check account existence
          try {
            const poolPk = deriveDbcPoolAddress(
              NATIVE_MINT,
              mint.publicKey,
              curve.publicKey
            );
            const info = await mainnetConnection.getAccountInfo(poolPk);
            if (info) {
              resolvedPoolAddress = poolPk.toBase58();
              break;
            }
          } catch {}

          await new Promise((r) => setTimeout(r, delayMs));
        }

        if (!resolvedPoolAddress) {
          throw new Error(
            "Pool was not created successfully on mainnet (timed out waiting for account)"
          );
        }
      } catch (verificationError) {
        // ignore error
        const vmsg =
          verificationError instanceof Error
            ? verificationError.message
            : String(verificationError);
        throw new Error(`Pool verification failed: ${vmsg}`);
      }

      // Use the resolved pool address (not config) for backend persistence
      const actualPoolAddress = resolvedPoolAddress!;

      // Prepare request body for create-token API

      const requestBody = {
        tokenId: tokenId,
        tokenAddress: mint.publicKey.toBase58(),
        bondingCurvePool: actualPoolAddress,
      };

      // Send POST request to create-token API
      const response = await fetch("/api/create-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Save fundId if received
      if (result.fundId) {
        localStorage.setItem("fundId", result.fundId);

        // Get tokenId and imageUrl from localStorage
        const tokenId = localStorage.getItem("agentTokenId");
        const imageUrl = localStorage.getItem("agentImageUrl");

        // Save token info to localStorage for my-tokens page
        const tokenInfo = {
          fundId: result.fundId,
          tokenId: tokenId || undefined, // Save tokenId
          name: tokenData.name,
          ticker: tokenData.ticker,
          creator: publicKey?.toBase58() || "",
          tokenAddress: mint.publicKey.toBase58(),
          imageUrl: imageUrl || undefined, // Save imageUrl
          marketCap: 0, // Will be updated when metadata is loaded
          isMigration: false, // Will be updated when metadata is loaded
          website: tokenData.socialLinks.website,
          twitter: tokenData.socialLinks.twitter,
          telegram: tokenData.socialLinks.telegram,
          strategy: tokenData.tradingStrategy,
          poolAddress: actualPoolAddress, // Use the actual pool address
          createdAt: new Date().toISOString(),
        };

        // Add to existing tokens list
        const existingTokens = JSON.parse(
          localStorage.getItem("homo_tokens") || "[]"
        );
        existingTokens.push(tokenInfo);
        localStorage.setItem("homo_tokens", JSON.stringify(existingTokens));

        // Also save token-specific data for easier lookup
        const tokenKey = `token_${result.fundId}`;
        localStorage.setItem(tokenKey, JSON.stringify(tokenInfo));

        setLoadingState("success");
        setLoadingMessage(`Successfully created $${tokenData.ticker}`);

        // 에이전트 생성 성공 시 agentCount 증가
        const { incrementAgentCount } = await import(
          "@/shared/utils/agentCreation"
        );
        incrementAgentCount();

        // Wait a moment to show success state before redirecting
        setTimeout(() => {
          // Clean up localStorage after successful creation
          localStorage.removeItem("agentTokenId");
          localStorage.removeItem("agentImageUrl");

          const params = new URLSearchParams();
          params.set("fundId", result.fundId);
          params.set("token", mint.publicKey.toBase58());
          params.set("symbol", tokenData.ticker);
          if (actualPoolAddress) params.set("poolAddress", actualPoolAddress);
          if (bondingCurveResult?.signature)
            params.set("lastSig", bondingCurveResult.signature);
          params.set("from", "create-token");
          router.replace(`/tradingview?${params.toString()}`);
          onClose();
        }, 2000);
        return;
      } else {
        const params = new URLSearchParams();
        params.set("token", mint.publicKey.toBase58());
        params.set("symbol", tokenData.ticker);
        if (actualPoolAddress) params.set("poolAddress", actualPoolAddress);
        if (bondingCurveResult?.signature)
          params.set("lastSig", bondingCurveResult.signature);
        params.set("from", "create-token");
        router.replace(`/tradingview?${params.toString()}`);
        onClose();
        return;
      }

      // Clear tokenId from localStorage
      localStorage.removeItem("agentTokenId");
    } catch (error) {
      console.error("❌ [CREATE-TOKEN] Full error details:", error);
      console.error(
        "❌ [CREATE-TOKEN] Error message:",
        error instanceof Error ? error.message : String(error)
      );
      console.error(
        "❌ [CREATE-TOKEN] Error stack:",
        error instanceof Error ? error.stack : "No stack"
      );
      console.error("❌ [CREATE-TOKEN] Error type:", typeof error);
      console.error(
        "❌ [CREATE-TOKEN] Error object:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );

      const msg = error instanceof Error ? error.message : String(error);

      // 에이전트 생성 실패 시 agentCount 롤백
      const { decrementAgentCount } = await import(
        "@/shared/utils/agentCreation"
      );
      decrementAgentCount();

      setLoadingState("failure");
      if (
        msg.includes("WALLET_REJECTED") ||
        msg.includes("User rejected") ||
        msg.includes("WalletSignTransactionError")
      ) {
        setLoadingMessage(`Transaction cancelled by user: ${msg}`);
      } else if (msg.includes("Wallet not connected")) {
        setLoadingMessage("connect Wallet");
      } else {
        setLoadingMessage(`Transaction failed: ${msg}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const totalAmount =
    parseFloat(formData.buyAmount) + parseFloat(formData.creationFee);

  const clearLoadingState = () => {
    setLoadingState("idle");
    setLoadingMessage("");
  };

  const handleSuccessConfirm = () => {
    if (!successData) return;

    const { fundId, poolAddress, tokenAddress, tokenTicker } = successData;
    const params = new URLSearchParams();

    if (fundId) params.set("fundId", fundId);
    if (tokenAddress) params.set("token", tokenAddress);
    if (tokenTicker) params.set("symbol", tokenTicker);
    if (poolAddress) params.set("poolAddress", poolAddress);
    params.set("from", "main");

    const destination = `/tradingview?${params.toString()}`;

    setSuccessData(null);
    onClose();
    router.replace(destination);
  };

  if (!isActive && !successData) return null;

  return (
    <div className={cx("step-two-wrapper")}>
      <div className={cx("create-token-modal")}>
        {/* Top header with simple nav and progress bar */}
        <div
          className={cx("modal-header")}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          ></div>
          {/* Loading Bar - positioned inside modal after progress bar */}
          {loadingState !== "idle" && (
            <div className={cx("loading-bar-container", loadingState)}>
              <div
                className={cx(
                  "loading-icon",
                  loadingState === "success"
                    ? "success-icon"
                    : loadingState === "failure"
                    ? "failure-icon"
                    : "spinner"
                )}
              >
                {loadingState === "success" && "✓"}
                {loadingState === "failure" && "!"}
                {loadingState === "progress" && ""}
              </div>
              <div className={cx("loading-content")}>{loadingMessage}</div>
              <button
                className={cx("loading-close")}
                onClick={clearLoadingState}
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className={cx("modal-form")}>
          <div className={cx("form-row")}>
            <div className={cx("form-group", "half-width")}>
              <label htmlFor="buy-amount" className="m3-label-large-em">
                Buy Amount (Optional)
              </label>
              <div className={cx("input-with-unit")}>
                <input
                  type="text"
                  id="buy-amount"
                  value={formData.buyAmount}
                  onChange={(e) =>
                    handleInputChange("buyAmount", e.target.value)
                  }
                />
                <span className={cx("unit")}>SOL</span>
              </div>
              <p className={cx("buy-amount-hint")}>
                Optional, but buying a few tokens helps protect your launch from
                snipers. You&apos;ll get{" "}
                <span className={cx("buy-amount-value")}>
                  {estimatedTokenOut} {tokenData?.ticker || "TOKEN"}
                </span>
              </p>
            </div>
            <div className={cx("form-group", "half-width")}>
              <label htmlFor="slippage" className="m3-label-large-em">
                Slippage (%)
              </label>
              <input
                type="text"
                id="slippage"
                value={formData.slippage}
                onChange={(e) => handleInputChange("slippage", e.target.value)}
              />
            </div>
          </div>
          <div className={cx("form-group")}>
            <label htmlFor="creation-fee" className="m3-label-large-em">
              Creation Fee
            </label>
            <div className={cx("input-with-unit")}>
              <input
                type="text"
                id="creation-fee"
                value={formData.creationFee}
                readOnly
                disabled
              />
              <span className={cx("unit")}>SOL</span>
            </div>
          </div>

          <div className={cx("total-amount")}>
            <span className={cx("total-amount-label", "m3-title-medium")}>
              Total Amount
            </span>
            <span className={cx("total-amount-value")}>
              <span className={cx("amount-number")}>
                {totalAmount.toFixed(1)}
              </span>
              <span className={cx("amount-unit")}> SOL</span>
            </span>
          </div>
          <div className={cx("modal-actions")}>
            <div className={cx("actions-right")}>
              <button
                className={cx("btn", "btn-cancel")}
                onClick={onClose}
                disabled={isCreating || loadingState === "progress"}
              >
                Cancel
              </button>
              <button
                className={cx("btn", "btn-back")}
                onClick={onBack}
                disabled={isCreating || loadingState === "progress"}
              >
                Back
              </button>
              <button
                className={cx("btn", "btn-create")}
                onClick={handleCreateToken}
                disabled={isCreating || loadingState === "progress"}
              >
                {isCreating ? "Creating..." : "Launch Token"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateTokenPageContent = () => {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const [tokenData, setTokenData] = useState({
    name: "Solana",
    ticker: "SOL",
    image: null as File | null,
    socialLinks: {
      twitter: "",
      telegram: "",
      website: "",
    },
    tradingStrategy: "", // ✅ 수정: 빈 문자열로 시작
  });

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const s = searchParams?.get("strategy");
    if (s) {
      setTokenData((prev) => ({ ...prev, tradingStrategy: s }));
    }
  }, [searchParams]);

  const [isExpanded, setIsExpanded] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [showTradingIdeasModal, setShowTradingIdeasModal] = useState(false);

  // 지갑 연결 상태 확인 (리다이렉트 제거)
  // useEffect(() => {
  //   if (!connected) {
  //     router.push("/");
  //   }
  // }, [connected, router]);

  const handleInputChange = (field: string, value: string) => {
    setTokenData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setTokenData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  const handleImageUpload = (file: File | null) => {
    setTokenData((prev) => ({
      ...prev,
      image: file,
    }));
  };

  const handleRandomize = async () => {
    setIsRandomizing(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(
        `/api/token/random-strategy?t=${timestamp}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch random strategy");
      }

      const data = await response.json();

      setTokenData((prev) => ({
        ...prev,
        tradingStrategy: data.strategy,
      }));
    } catch (error) {
      console.error("Error fetching random strategy:", error);
      // Fallback to a default strategy if API fails
      setTokenData((prev) => ({
        ...prev,
        tradingStrategy:
          "Invest in tokens or projects that are shilled by @your_x_handle. Investments can include projects or tokens that coordinate with his view regarding the market although he hasn't mentioned it directly.",
      }));
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!tokenData.name.trim()) {
      errors.push("Name");
    }

    if (!tokenData.ticker.trim()) {
      errors.push("Ticker");
    }

    if (!tokenData.tradingStrategy.trim()) {
      errors.push("Trading Strategy");
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!connected) {
      handleOpenWalletConnectModal();
      return;
    }

    handleSubmitToken();
  };

  const handleSubmitToken = async () => {
    if (!connected) {
      // 지갑이 연결되지 않은 경우 지갑 연결 모달 열기
      handleOpenWalletConnectModal();
      return;
    } else {
      // 폼 유효성 검사
      const errors = validateForm();

      if (errors.length > 0) {
        setValidationMessage(
          `Please fill in the following required fields: ${errors.join(", ")}`
        );
        setShowValidationModal(true);
      } else {
        // Generate Keypairs and send API request
        try {
          const mint = Keypair.generate();
          const curve = Keypair.generate();

          const creatorAddress = publicKey?.toBase58() || "";

          const formDataToSend = new FormData();
          formDataToSend.append("creator", creatorAddress);
          formDataToSend.append("name", tokenData.name);
          formDataToSend.append("ticker", tokenData.ticker);

          // Add file if exists
          if (tokenData.image) {
            formDataToSend.append("file", tokenData.image);
          } else {
            // Use default image from public folder
            const defaultImageResponse = await fetch(
              "/images/DefaultTokenImage.png"
            );
            const defaultImageBlob = await defaultImageResponse.blob();
            formDataToSend.append(
              "file",
              defaultImageBlob,
              "DefaultTokenImage.png"
            );
          }

          formDataToSend.append("strategyPrompt", tokenData.tradingStrategy);

          // Optional fields
          if (tokenData.socialLinks.website) {
            formDataToSend.append("website", tokenData.socialLinks.website);
          }
          if (tokenData.socialLinks.twitter) {
            formDataToSend.append("twitter", tokenData.socialLinks.twitter);
          }
          if (tokenData.socialLinks.telegram) {
            formDataToSend.append("telegram", tokenData.socialLinks.telegram);
          }

          // Send POST request to our API proxy route
          const response = await fetch("/api/create-agent", {
            method: "POST",
            body: formDataToSend,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          // Save tokenId and navigate to handleCreateToken screen
          if (result.tokenId) {
            // Store tokenId in localStorage for the next step
            localStorage.setItem("agentTokenId", result.tokenId);

            // Store imageUrl if received from API
            if (result.imageUrl) {
              localStorage.setItem("agentImageUrl", result.imageUrl);
            }

            // Advance to step two of the flow
            setCurrentStep(2);
          } else {
            throw new Error("No tokenId received from API");
          }
        } catch (error) {
          // ignore error
          const msg = error instanceof Error ? error.message : String(error);
          alert(`Token creation failed. Please try again.\n\n${msg}`);
        }
      }
    }
  };

  const handleOpenWalletConnectModal = () => {
    dispatch(APPEND_MODAL({ key: "wallet-modal", params: {} }));
  };

  const handleBackToStepOne = () => {
    setCurrentStep(1);
  };

  const getButtonText = () => {
    return connected ? "Next" : "Connect Wallet to Create Token";
  };

  const totalSteps = 2;
  const progressPercent = (currentStep / totalSteps) * 100;
  const progressAccentColor = currentStep === 2 ? "#F5F5F5" : "#F5F5F5";

  const renderStepOne = () => (
    <>
      <div className={cx("token-form")}>
        {/* Token Details Section */}
        <div className={cx("form-section")}>
          <div className={cx("input-group-row")}>
            <div className={cx("input-group")}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={tokenData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter token name"
              />
            </div>
            <div className={cx("input-group")}>
              <label htmlFor="ticker">Ticker</label>
              <input
                type="text"
                id="ticker"
                value={tokenData.ticker}
                onChange={(e) => handleInputChange("ticker", e.target.value)}
                placeholder="$ Ticker"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        <div className={cx("form-section")}>
          <label htmlFor="image-upload">Image or GIF</label>
          <div
            className={cx("image-upload-area", { "drag-active": dragActive })}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {tokenData.image ? (
              <div className={cx("image-preview")}>
                <img src={URL.createObjectURL(tokenData.image)} alt="Token" />
                <button
                  className={cx("remove-image-btn")}
                  onClick={() => handleImageUpload(null)}
                >
                  &times;
                </button>
                <p className={cx("upload-text")}>
                  Drag and drop an image or GIF
                </p>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*, .gif"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  className={cx("select-file-btn")}
                  onClick={() =>
                    document.getElementById("image-upload")?.click()
                  }
                >
                  Reselect file
                </button>
              </div>
            ) : (
              <>
                <div className={cx("upload-icon")}>
                  <Image
                    src="/icons/upload.svg"
                    alt="Upload icon"
                    width={24}
                    height={24}
                  />
                </div>
                <p className={cx("upload-text")}>
                  Drag and drop an image or GIF
                </p>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*, .gif"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  className={cx("select-file-btn")}
                  onClick={() =>
                    document.getElementById("image-upload")?.click()
                  }
                >
                  Select a file
                </button>
              </>
            )}
          </div>
        </div>

        {/* Social Links Section */}
        <div className={cx("form-section")}>
          <div
            className={cx("social-links-header")}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className={cx("social-links-label")}>
              * Social Links (Optional)
            </span>
            <div className={cx("arrow-container")}>
              <Image
                src={isExpanded ? "/icons/upside.svg" : "/icons/downside.svg"}
                alt={
                  isExpanded ? "Collapse social links" : "Expand social links"
                }
                className={cx("arrow-icon", { expanded: isExpanded })}
                width={16}
                height={16}
              />
            </div>
          </div>
          {isExpanded && (
            <div className={cx("social-links-content")}>
              <div className={cx("social-input-group")}>
                <div className={cx("input-icon")}>
                  <Image
                    src="/icons/website.svg"
                    alt="Website icon"
                    width={20}
                    height={20}
                  />
                </div>
                <input
                  type="text"
                  id="website"
                  value={tokenData.socialLinks.website}
                  onChange={(e) =>
                    handleSocialLinkChange("website", e.target.value)
                  }
                  placeholder="Website URL"
                />
              </div>
              <div className={cx("social-input-group")}>
                <div className={cx("input-icon")}>
                  <Image
                    src="/icons/twitterlink.svg"
                    alt="Twitter icon"
                    width={20}
                    height={20}
                  />
                </div>
                <input
                  type="text"
                  id="twitter"
                  value={tokenData.socialLinks.twitter}
                  onChange={(e) =>
                    handleSocialLinkChange("twitter", e.target.value)
                  }
                  placeholder="X URL"
                />
              </div>
              <div className={cx("social-input-group")}>
                <div className={cx("input-icon")}>
                  <Image
                    src="/icons/tg.svg"
                    alt="Telegram icon"
                    width={20}
                    height={20}
                  />
                </div>
                <input
                  type="text"
                  id="telegram"
                  value={tokenData.socialLinks.telegram}
                  onChange={(e) =>
                    handleSocialLinkChange("telegram", e.target.value)
                  }
                  placeholder="Telegram URL"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trading Strategy Section */}
      <div className={cx("trading-strategy-section")}>
        <div className={cx("form-section")}>
          <label htmlFor="trading-strategy">Trading Strategy</label>
          <div className={cx("strategy-input-container")}>
            <textarea
              id="trading-strategy"
              value={tokenData.tradingStrategy}
              onChange={(e) =>
                handleInputChange("tradingStrategy", e.target.value)
              }
              placeholder="e.g. Invest in tokens or projects that are shilled by @your_x_handle. Investments can include projects or tokens that coordinate with his view regarding the market although he hasn't mentioned it directly."
              rows={6}
            />
            <div className={cx("randomize-button-container")}>
              <button
                type="button"
                className={cx("randomize-button")}
                onClick={handleRandomize}
                disabled={isRandomizing}
              >
                <Image
                  src="/icons/aiIcon.svg"
                  alt="AI icon"
                  width={16}
                  height={16}
                />
                {isRandomizing ? "Loading..." : "Randomize"}
              </button>
            </div>
          </div>
        </div>
        <div className={cx("trading-ideas")}>
          <span className={cx("trading-ideas-text")}>Trading Ideas</span>
          <Image
            src="/icons/info.svg"
            alt="Info icon"
            width={16}
            height={16}
            onClick={() => setShowTradingIdeasModal(true)}
            style={{ cursor: "pointer" }}
          />
        </div>
        <div className={cx("button-container")}>
          <button
            className={cx("btn", "btn-cancel")}
            onClick={() => router.push("/")}
          >
            Cancel
          </button>
          <button className={cx("btn", "btn-next")} onClick={handleSubmit}>
            {getButtonText()}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className={cx("create-token-page")}>
      <Header />
      <ActivityTicker />
      <div className={cx("container")}>
        <ValidationAlert
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          message={validationMessage}
        />

        {/* Header with Launch Token title and progress bar */}
        <div className={cx("page-header")}>
          <h1 className={cx("launch-title")}>Launch Token</h1>
          <div className={cx("progress-section")}>
            <div className={cx("progress-text")}>
              <span className={cx("current-step")}>{currentStep}</span>
              <span className={cx("total-steps")}>/2</span>
            </div>
            <div className={cx("progress-bar")}>
              <div
                className={cx("progress-fill")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {currentStep === 1 ? (
          renderStepOne()
        ) : (
          <CreateTokenStepTwo
            isActive={currentStep === 2}
            onClose={handleBackToStepOne}
            onBack={handleBackToStepOne}
            tokenData={tokenData}
          />
        )}
      </div>

      {/* Trading Ideas Modal */}
      {showTradingIdeasModal && (
        <div
          className={cx("modal-overlay")}
          onClick={() => setShowTradingIdeasModal(false)}
        >
          <div
            className={cx("trading-ideas-modal")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cx("modal-header")}>
              <h2 className={cx("modal-title")}>
                Trading ideas that work well on buff.trade
              </h2>
              <button
                className={cx("modal-close")}
                onClick={() => setShowTradingIdeasModal(false)}
              >
                ×
              </button>
            </div>
            <div className={cx("modal-content")}>
              <p className={cx("modal-description")}>
                We look at price, wallet data, and Twitter talk. Combination of
                these ideas works best.
              </p>
              <div className={cx("trading-suggestions")}>
                <div className={cx("suggestion-item")}>
                  Follow <strong>@buffdottrade</strong> and{" "}
                  <strong>@homo_memetus</strong> for token calls.
                </div>
                <div className={cx("suggestion-item")}>
                  Buy small coins under <strong>$2M</strong> cap. Sell if you
                  make <strong>+50%</strong>, cut loss at <strong>-20%</strong>.
                </div>
                <div className={cx("suggestion-item")}>
                  Check holders. Avoid coins where{" "}
                  <strong>top 10 wallets own over 80%</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 지갑 연결은 이제 header의 WalletConnectButton을 통해 공통 모달 사용 */}
    </div>
  );
};

const CreateTokenPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <CreateTokenPageContent />
  </Suspense>
);

export default CreateTokenPage;
