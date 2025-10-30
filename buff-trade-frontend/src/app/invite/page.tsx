"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/hooks/useAuth";
import styles from "./page.module.scss";
import classNames from "classnames/bind";
import { useWallet } from "@solana/wallet-adapter-react";
import WalletConnectModal from "@/components/common/modal/walletConnectModal/WalletConnectModal";

const cx = classNames.bind(styles);

const InvitePage = () => {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [inviteCode, setInviteCode] = useState(["", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);

  // 지갑 연결 및 invite code 인증 여부 확인
  useEffect(() => {
    const isInvited = localStorage.getItem("isInvited");
    const isConnected = localStorage.getItem("isConnected");

    // 지갑이 연결되어 있고 invite code도 인증된 경우 main 페이지로 이동
    if (isConnected === "true" && isInvited === "true") {
      router.push("/main");
    }
  }, [router]);

  // 월렛 연결 상태 실시간 감지 - 연결되면 자동으로 main 페이지로 이동
  useEffect(() => {
    if (connected && publicKey) {
      const isInvited = localStorage.getItem("isInvited");
      // 지갑이 연결되면 isConnected 플래그 설정
      localStorage.setItem("isConnected", "true");

      // invite code도 인증된 경우 main 페이지로 이동
      if (isInvited === "true") {
        router.push("/main");
      }
    }
  }, [connected, publicKey, router]);

  // 월렛 연결 상태 감지 - 연결되면 모달 자동 닫기
  useEffect(() => {
    if (connected && publicKey && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [connected, publicKey, showWalletModal]);

  const handleGetCode = () => {
    // 텔레그램 링크로 이동
    window.open("https://t.me/+bx-muRLtDxg5MTNh", "_blank");
  };

  const handleHaveCode = () => {
    setShowCodeInput(true);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // 한 글자만 입력 가능

    const newCode = [...inviteCode];
    newCode[index] = value.toUpperCase();
    setInviteCode(newCode);

    // 다음 입력 필드로 자동 이동
    if (value && index < 4) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !inviteCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleProceed = async () => {
    const code = inviteCode.join("");
    if (code.length === 5) {
      if (!connected || !publicKey) {
        setErrorMessage("Please connect your wallet to continue.");
        setShowWalletModal(true);
        setTimeout(() => setErrorMessage(""), 3000);
        return;
      }
      setIsLoading(true);
      setErrorMessage(""); // 에러 메시지 초기화
      try {
        const response = await fetch("/api/users/verify-invited", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inviteCode: code,
          }),
        });

        if (response.ok) {
          let data: any = null;
          try {
            data = await response.json();
          } catch {
            data = null;
          }

          try {
            if (data?.accessToken) {
              localStorage.setItem("accessToken", data.accessToken);
            }
            localStorage.setItem("isInvited", "true");
            // LoginFlowModal을 보여주기 위한 플래그 설정
            localStorage.removeItem("hasSeenLoginFlow");
            if (publicKey) {
              localStorage.setItem("invitedWallet", publicKey.toBase58());
            }
          } catch (storageError) {
            console.warn("Failed to persist invite state", storageError);
          }

          router.push("/main");
        } else {
          const errorData = await response.json();
          console.error("Verification failed:", errorData);
          setErrorMessage("Invalid invite code. Please try again.");
          // 3초 후 에러 메시지 자동 제거
          setTimeout(() => {
            setErrorMessage("");
          }, 3000);
        }
      } catch (error) {
        console.error("Error verifying invite code:", error);
        setErrorMessage("Error verifying invite code. Please try again.");
        // 3초 후 에러 메시지 자동 제거
        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={cx("invite-root")}>
      <div className={cx("invite-container")}>
        <div className={cx("invite-card")}>
          <div className={cx("logo-section")}>
            <div className={cx("logo")}>
              <img
                src="/icons/logo_pc_hover.svg"
                alt="Buff Logo"
                width="132"
                height="32"
              />
            </div>
          </div>

          {!showCodeInput ? (
            <>
              <h2 className={cx("title")}>Get an invite code</h2>
              <p className={cx("description")}>
                buff.trade is exclusive, invite-only now. To buy, sell, and
                create <br />
                tokens enter our alpha community.
              </p>
              <div className={cx("button-group")}>
                <button
                  className={cx("get-code-button")}
                  onClick={handleGetCode}
                  disabled={isLoading}
                >
                  {isLoading ? "Getting code..." : "Get a code"}
                </button>
                <button
                  className={cx("have-code-button")}
                  onClick={handleHaveCode}
                >
                  Already have a code
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className={cx("title")}>Got an invite code?</h2>
              <p className={cx("description")}>
                Only waitlisted members can create up to 3 tokens with agents.
                <br />
                Apply for the alpha launch group.
              </p>
              <div className={cx("code-input-group")}>
                {inviteCode.map((char, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength={1}
                    value={char}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={cx("code-input")}
                  />
                ))}
              </div>
              {errorMessage && (
                <div className={cx("error-message")}>{errorMessage}</div>
              )}
              <button
                className={cx("proceed-button")}
                onClick={handleProceed}
                disabled={inviteCode.join("").length !== 5 || isLoading}
              >
                {isLoading ? "Verifying..." : "Proceed"}
              </button>
            </>
          )}
        </div>
      </div>
      {showWalletModal && (
        <div
          className={cx("wallet-modal-overlay")}
          onClick={() => setShowWalletModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <WalletConnectModal onClose={() => setShowWalletModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitePage;
