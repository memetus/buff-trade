"use client";
import React, { useState, useEffect } from "react";
import BaseModal from "@/components/base/baseModal/BaseModal";
import { useVerifyInviteMutation } from "@/shared/api/users";
import {
  trackInviteModalView,
  trackInviteCodeSubmit,
} from "@/shared/utils/ga4";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  onSuccess?: () => void; // 원래 액션을 실행할 콜백
  walletAddress?: string;
};

const InviteCodeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onVerified,
  onSuccess,
  walletAddress,
}) => {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Invite modal view 이벤트 추적
  useEffect(() => {
    if (isOpen) {
      trackInviteModalView();
    }
  }, [isOpen]);
  const verifyInvite = useVerifyInviteMutation({
    onSuccess: (data) => {
      if (data?.accessToken) {
        try {
          localStorage.setItem("accessToken", data.accessToken);
        } catch {}
      }

      try {
        localStorage.setItem(
          "isInvited",
          String(Boolean(data?.isInvited ?? true))
        );
        if (walletAddress) {
          localStorage.setItem("invitedWallet", walletAddress);
        }
      } catch {}

      onVerified();
      if (onSuccess) {
        onSuccess();
      }

      // GA4 Invite Code Submit Success 이벤트
      trackInviteCodeSubmit(true);
    },
    onError: (mutationError) => {
      console.error("Invite verification error:", mutationError);

      // accessToken 관련 에러 처리
      if (mutationError.message?.includes("Access token not found")) {
        setError("Please connect your wallet first and try again");
      }
      // 401 에러는 인증 문제이므로 일반적인 메시지 표시
      else if (
        mutationError.message?.includes("401") ||
        mutationError.message?.includes("Unauthorized")
      ) {
        setError("Please connect your wallet first");
      }
      // 400 에러는 잘못된 invite code
      else if (
        mutationError.message?.includes("400") ||
        mutationError.message?.includes("Failed to verify invite code")
      ) {
        setError("Invalid invite code. Please check and try again.");
      } else {
        setError("Please enter a valid invite code");
      }

      // GA4 Invite Code Submit Fail 이벤트
      trackInviteCodeSubmit(false);
    },
  });

  if (!isOpen) return null;

  const handleVerify = async () => {
    setError(null);
    verifyInvite.mutate({ inviteCode });
  };

  return (
    <BaseModal>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 12,
            padding: 20,
            width: 360,
            color: "#e2e8f0",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Enter Invite Code</h3>
          <p style={{ marginTop: 0, marginBottom: 16, color: "#a0aec0" }}>
            Access to create token and trading requires an invite code.
          </p>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter invite code"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              marginBottom: 12,
            }}
          />

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #444",
                color: "#cbd5e0",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleVerify}
              disabled={verifyInvite.isPending || !inviteCode}
              style={{
                background: "#4f46e5",
                border: "1px solid #4f46e5",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 12px",
                opacity: verifyInvite.isPending || !inviteCode ? 0.6 : 1,
              }}
            >
              {verifyInvite.isPending ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default InviteCodeModal;
