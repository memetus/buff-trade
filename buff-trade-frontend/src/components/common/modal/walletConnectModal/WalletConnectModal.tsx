"use client";
import BaseModal from "@/components/base/baseModal/BaseModal";
import React, { useCallback, useRef, useState, useEffect } from "react";
import styles from "@/components/common/modal/walletConnectModal/WalletConnectModal.module.scss";
import classNames from "classnames/bind";
import CloseIcon from "@/public/icons/close.svg";
import { useDispatch } from "react-redux";
import { CLOSE_MODAL } from "@/contexts/global/slice/modalSlice";
import { useOnClick } from "@/shared/hooks/useOnClick";
import { WALLET_LIST } from "@/shared/constants/supportWallet";
import WalletButton from "../../button/walletButton/WalletButton";
import LineArrowIcon from "@/public/icons/line-arrow-right.svg";
import { useWalletConnect } from "@/shared/hooks/useWalletConnect";
import WalletSignatureModal from "../walletSignatureModal/WalletSignatureModal";
import { useWalletDetection } from "@/shared/hooks/useWalletDetection";
import LoginFlowModal from "../loginFlowModal/LoginFlowModal";
import { useLoginMutation, useUserDetailQuery } from "@/shared/api/users";

const cx = classNames.bind(styles);

type WalletConnectModalProps = {
  onClose?: () => void;
};

const WalletConnectModal = ({ onClose }: WalletConnectModalProps) => {
  const dispatch = useDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const {
    advancedSelect,
    advancedConnect,
    publicKey,
    wallet,
    isLoading,
    showSignatureModal,
    isSignatureRequired,
    handleSignature,
    handleCloseSignatureModal,
    signatureMessage,
  } = useWalletConnect();
  const [walletName, setWalletName] = useState<string | undefined>(undefined);
  const autoConnectInFlightRef = useRef(false);
  const [showLoginFlow, setShowLoginFlow] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // 개발/테스트용: 로그인 플로우 강제 표시
  const [forceShowLoginFlow, setForceShowLoginFlow] = useState(false);

  const hasSeenLoginFlow = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("loginFlowShown") === "true";
    } catch {
      return false;
    }
  }, []);

  const markLoginFlowSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("loginFlowShown", "true");
    } catch {}
  }, []);

  // Wallet detection hook
  const { handleWalletClick, isMobile } = useWalletDetection();

  const loginMutation = useLoginMutation();
  const userDetailQuery = useUserDetailQuery({
    enabled: false,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const closeAndNotify = useCallback(() => {
    if (onClose) {
      try {
        onClose();
      } catch (error) {
        console.error("WalletConnectModal onClose error", error);
      }
    }
  }, [onClose]);

  const handleClose = useCallback(() => {
    setWalletName(undefined);
    autoConnectInFlightRef.current = false;
    setShowLoginFlow(false);
    setIsFirstTimeUser(false);
    dispatch(CLOSE_MODAL({ key: "wallet-modal" }));
    closeAndNotify();
  }, [dispatch, closeAndNotify]);

  const handleLoginFlowComplete = useCallback(() => {
    setShowLoginFlow(false);
    setIsFirstTimeUser(false);
    setForceShowLoginFlow(false);
    markLoginFlowSeen();

    // accessToken이 localStorage에 저장되었는지 확인
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
    } else {
    }

    // 로그인 플로우 완료 후 모달 닫기
    dispatch(CLOSE_MODAL({ key: "wallet-modal" }));
    closeAndNotify();
  }, [dispatch, closeAndNotify, markLoginFlowSeen]);

  const handleLoginFlowClose = useCallback(() => {
    setShowLoginFlow(false);
    setIsFirstTimeUser(false);
    setForceShowLoginFlow(false);
    markLoginFlowSeen();
    // 로그인 플로우 닫기 시에도 모달 닫기
    dispatch(CLOSE_MODAL({ key: "wallet-modal" }));
    closeAndNotify();
  }, [dispatch, closeAndNotify, markLoginFlowSeen]);

  useOnClick({
    ref,
    handler: () => handleClose(),
    mouseEvent: "click",
  });

  // 월렛 연결 상태 감지 - 연결되면 모달 자동 닫기
  useEffect(() => {
    if (publicKey && !isLoading) {
      // 월렛이 연결되고 로딩이 완료되면 모달 닫기
      setTimeout(() => {
        handleClose();
      }, 1000); // 1초 지연 후 닫기 (연결 완료 확인)
    }
  }, [publicKey, isLoading, handleClose]);

  // 로그인 및 모달 닫기 공통 처리
  const doLoginAndClose = useCallback(
    async (signaturePublicKey?: any) => {
      try {
        // 서명에서 전달받은 publicKey를 우선 사용, 없으면 다른 소스에서 가져오기
        const currentPublicKey =
          signaturePublicKey || publicKey || wallet?.adapter?.publicKey;
        const addr = currentPublicKey?.toBase58();
        const timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

        if (addr) {
          try {
            const json = await loginMutation.mutateAsync({
              wallet: addr,
              timezone,
            });

            if (typeof window !== "undefined" && json) {
              if (json.accessToken) {
                localStorage.setItem("accessToken", json.accessToken);
              }

              const detailResult = await userDetailQuery.refetch();
              const detailJson = detailResult.data;

              if (detailJson?.userInfo?.avatarUrl) {
                localStorage.setItem(
                  "wallet_avatar",
                  detailJson.userInfo.avatarUrl
                );
              }
              if (detailJson?.userInfo?.username) {
                localStorage.setItem(
                  "wallet_name",
                  detailJson.userInfo.username
                );
              }

              if (typeof detailJson?.isInvited === "boolean") {
                try {
                  localStorage.setItem(
                    "isInvited",
                    String(detailJson.isInvited)
                  );
                  if (detailJson.isInvited && addr) {
                    localStorage.setItem("invitedWallet", addr);
                  }
                  if (!detailJson.isInvited) {
                    localStorage.removeItem("invitedWallet");
                  }
                } catch {}
              }

              if (json.avatarUrl) {
                localStorage.setItem("wallet_avatar", json.avatarUrl);
              }
              if (json.username) {
                localStorage.setItem("wallet_name", json.username);
              }
            }
          } catch (error) {
            console.error("Login attempt failed", error);
          }
        }
      } catch (e: any) {
      } finally {
        // 로그인 API 호출 후 로그인 플로우 표시
        if (!isSignatureRequired) {
          const invited =
            typeof window !== "undefined"
              ? localStorage.getItem("isInvited") === "true"
              : false;
          if (invited && !hasSeenLoginFlow()) {
            setShowLoginFlow(true);
            setIsFirstTimeUser(true);
            markLoginFlowSeen();
          }
        }
      }
    },
    [
      publicKey,
      wallet,
      isSignatureRequired,
      loginMutation,
      userDetailQuery,
      hasSeenLoginFlow,
      markLoginFlowSeen,
    ]
  );

  return (
    <>
      {!showLoginFlow && (
        <BaseModal>
          <div className={cx("modal-container")}>
            <section className={cx("modal")} ref={ref}>
              <div className={cx("modal-head")}>
                <h3 className={cx("modal-title")}>Connect Wallet</h3>
                <div className={cx("modal-actions")}>
                  <button
                    className={cx("close-button")}
                    aria-label={"close-button"}
                    onClick={handleClose}
                  >
                    <CloseIcon
                      viewBox="0 0 24 24"
                      className={cx("close-button-icon")}
                    />
                  </button>
                </div>
              </div>
              <div className={cx("modal-body")}>
                {WALLET_LIST.map((wallet, index) => {
                  return (
                    <WalletButton
                      key={index}
                      walletName={wallet.displayName}
                      onClick={async () => {
                        try {
                          // 모바일 환경에서는 딥링크를 먼저 시도
                          if (isMobile()) {
                            const isWalletInstalled = handleWalletClick(
                              wallet.walletName
                            );

                            if (!isWalletInstalled) {
                              return;
                            }

                            // 모바일에서는 딥링크가 이미 실행되었으므로
                            // 지갑 선택만 하고 연결은 사용자가 앱에서 처리
                            await advancedSelect(wallet.walletName);
                            setWalletName(wallet.displayName);
                            return;
                          }

                          // 데스크톱 환경에서는 기존 로직 사용
                          // 1) 지갑 설치 상태 확인
                          const isWalletInstalled = handleWalletClick(
                            wallet.walletName
                          );

                          if (!isWalletInstalled) {
                            // 지갑이 설치되지 않은 경우 다운로드 페이지로 이동
                            return;
                          }

                          // 2) 지갑 선택 처리
                          await advancedSelect(wallet.walletName);
                          setWalletName(wallet.displayName);

                          if (!autoConnectInFlightRef.current && !isLoading) {
                            autoConnectInFlightRef.current = true;
                            try {
                              await advancedConnect(doLoginAndClose, false); // Show signature for wallet connection
                            } finally {
                              autoConnectInFlightRef.current = false;
                            }
                          }
                        } catch (error) {
                          console.error(
                            `Error connecting to ${wallet.walletName}:`,
                            error
                          );
                          setWalletName(undefined);
                        }
                      }}
                      icon={wallet.icon}
                    />
                  );
                })}
              </div>
              <div className={cx("modal-footer")}>
                <button
                  className={cx("section-move-button")}
                  disabled={!walletName || isLoading}
                  onClick={async () => {
                    if (isLoading || autoConnectInFlightRef.current) {
                      return;
                    }

                    try {
                      // 모바일 환경에서는 딥링크가 이미 실행되었으므로
                      // 추가 연결 시도는 하지 않음
                      if (isMobile()) {
                        return;
                      }

                      autoConnectInFlightRef.current = true;
                      // 보조 버튼도 동일한 단일 플로우 수행
                      await advancedConnect(doLoginAndClose, false); // Show signature for wallet connection
                    } catch (error) {
                      // ignore error
                    } finally {
                      autoConnectInFlightRef.current = false;
                    }
                  }}
                >
                  <span className={cx("button-text")}>
                    {isLoading
                      ? "Connecting..."
                      : walletName
                      ? isMobile()
                        ? `Open ${walletName} App`
                        : `Connect with ${walletName}`
                      : "Please select wallet"}
                  </span>
                  {walletName && !isLoading && (
                    <LineArrowIcon viewBox="0 0 24 24" className={cx("icon")} />
                  )}
                </button>
              </div>
            </section>
          </div>
        </BaseModal>
      )}

      {/* Wallet Signature Modal - Independent from BaseModal */}
      <WalletSignatureModal
        isOpen={showSignatureModal || false}
        onClose={handleCloseSignatureModal}
        onSign={handleSignature}
        walletAddress={publicKey?.toBase58()}
        isLoading={isLoading}
        signatureMessage={signatureMessage}
      />

      {/* Login Flow Modal - Show for first-time users or when forced */}
      <LoginFlowModal
        isOpen={showLoginFlow || forceShowLoginFlow}
        onClose={handleLoginFlowClose}
        onComplete={handleLoginFlowComplete}
      />
    </>
  );
};

export default WalletConnectModal;
