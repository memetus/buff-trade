import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWalletContext } from "@/contexts/partials/wallet/WalletContext";
import { useSignMessage } from "./useSignMessage";
import { trackConnectWalletSuccess } from "@/shared/utils/ga4";

const normalizeWalletName = (value?: string | null) =>
  value?.toLowerCase().replace(/\s+/g, "") ?? null;

export const useWalletConnect = () => {
  const { isLoading, setIsLoading } = useWalletContext();
  const { signMessage, message, verifySign, messageText } = useSignMessage();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSignatureRequired, setIsSignatureRequired] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<
    (() => Promise<void>) | null
  >(null);

  const {
    select,
    connect,
    wallet,
    publicKey,
    disconnect,
    connected,
    disconnecting,
  } = useWallet();

  const walletRef = useRef(wallet);
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  const targetWalletNameRef = useRef<string | null>(null);
  const publicKeyRef = useRef(publicKey ?? null);

  useEffect(() => {
    walletRef.current = wallet;

    if (wallet?.adapter?.name) {
      targetWalletNameRef.current = wallet.adapter.name;
    }

    if (!wallet) {
      targetWalletNameRef.current = null;
    }
  }, [wallet]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // 지갑 연결 성공 이벤트 추적
  useEffect(() => {
    if (connected && publicKey && wallet?.adapter?.name) {
      // user_id는 publicKey의 base58 문자열 사용
      const user_id = publicKey.toBase58();
      const wallet_provider = wallet.adapter.name;

      // GA4 이벤트 발화
      trackConnectWalletSuccess(user_id, wallet_provider);
    }
  }, [connected, publicKey, wallet?.adapter?.name]);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);

  useEffect(() => {
    publicKeyRef.current = publicKey ?? null;
  }, [publicKey]);

  const waitForWalletSelection = useCallback(
    async (expectedName?: string | null) => {
      const normalizedTarget = normalizeWalletName(expectedName);

      await new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const check = () => {
          const adapterName = normalizeWalletName(
            walletRef.current?.adapter?.name
          );

          if (
            walletRef.current &&
            (!normalizedTarget || adapterName === normalizedTarget)
          ) {
            return resolve();
          }

          if (Date.now() - start > 3000) {
            const errorMessage = normalizedTarget
              ? `Wallet selection timeout for ${expectedName}`
              : "No wallet selected";

            return reject(new Error(errorMessage));
          }

          setTimeout(check, 100);
        };

        check();
      });
    },
    []
  );

  const ensureWalletSelected = useCallback(async () => {
    const normalizedCurrent = normalizeWalletName(
      walletRef.current?.adapter?.name
    );
    const normalizedTarget = normalizeWalletName(targetWalletNameRef.current);

    if (
      walletRef.current &&
      (!normalizedTarget || normalizedCurrent === normalizedTarget)
    ) {
      return;
    }

    await waitForWalletSelection(targetWalletNameRef.current);
  }, [waitForWalletSelection]);

  const waitForPublicKey = useCallback(async () => {
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();

      const check = () => {
        const currentWallet = walletRef.current as any;
        const currentPublicKey =
          currentWallet?.adapter?.publicKey ??
          currentWallet?.publicKey ??
          publicKeyRef.current ??
          null;

        if (currentPublicKey) {
          return resolve();
        }

        if (Date.now() - start > 5000) {
          return reject(new Error("PublicKey not available"));
        }

        setTimeout(check, 100);
      };

      check();
    });
  }, []);

  const advancedSelect = useCallback(
    async (walletName: string) => {
      targetWalletNameRef.current = walletName;

      // Selecting a wallet should be instantaneous and not flip global loading
      select(walletName as WalletName);

      try {
        await waitForWalletSelection(walletName);
      } catch (error) {
        targetWalletNameRef.current = null;
        throw error;
      }
    },
    [select, waitForWalletSelection]
  );

  const handleSignature = useCallback(
    async (callbackToExecute?: ((publicKey?: any) => Promise<void>) | null) => {
      const adapter = walletRef.current?.adapter as
        | (typeof walletRef.current & {
            signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
            publicKey?: { toBytes: () => Uint8Array } | Uint8Array;
          })
        | undefined;

      const adapterSigner =
        adapter && typeof adapter.signMessage === "function"
          ? adapter.signMessage.bind(adapter)
          : undefined;

      const currentPublicKeyRaw =
        (adapter?.publicKey as
          | { toBytes: () => Uint8Array }
          | Uint8Array
          | null
          | undefined) ??
        (walletRef.current as any)?.publicKey ??
        publicKeyRef.current ??
        publicKey ??
        null;

      const signer = adapterSigner ?? signMessage;

      if (!signer || !currentPublicKeyRaw) return;

      const pkBytes =
        typeof (currentPublicKeyRaw as any).toBytes === "function"
          ? (currentPublicKeyRaw as any).toBytes()
          : currentPublicKeyRaw;

      try {
        const signature = await signer(message);
        const valid = await verifySign(message, signature, pkBytes);

        if (!valid) {
          throw new Error("Signature verification failed");
        }

        setShowSignatureModal(false);
        setIsSignatureRequired(false);

        // Complete the connection process after successful signature
        setIsLoading(false);

        // Add a small delay to ensure wallet state is fully updated
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Execute pending callback if exists
        const callbackToRun = callbackToExecute || pendingCallback;

        if (callbackToRun) {
          try {
            // 서명에 사용된 publicKey를 콜백에 전달
            const signaturePublicKey = currentPublicKeyRaw;
            await callbackToRun(signaturePublicKey);
          } catch (callbackError) {
            // 콜백 실행 실패 시 무시 (사용자에게 노출하지 않음)
          }
          setPendingCallback(null);
        }

        // Close wallet connect modal after successful signature
        // This will be handled by the component that uses this hook
      } catch (error) {
        throw error; // Re-throw to show error in modal
      }
    },
    [signMessage, message, verifySign, pendingCallback, setIsLoading, publicKey]
  );

  const handleCloseSignatureModal = useCallback(() => {
    setShowSignatureModal(false);
    // If signature is required but user closes modal, disconnect wallet
    if (isSignatureRequired) {
      disconnectRef.current?.();
    }
    // Complete the connection process even if signature is cancelled
    setIsLoading(false);
    // Clear pending callback
    setPendingCallback(null);
  }, [isSignatureRequired, setIsLoading]);

  // 지갑 연결 해제 시 모든 캐시와 상태 초기화
  const handleDisconnect = useCallback(() => {
    // 1. 지갑 연결 해제
    disconnectRef.current?.();

    targetWalletNameRef.current = null;

    // 2. 모든 서명 모달 상태 초기화
    setShowSignatureModal(false);
    setIsSignatureRequired(false);
    setPendingCallback(null);

    // 3. 로컬 스토리지 캐시 삭제
    if (typeof window !== "undefined") {
      // 지갑 관련 캐시 삭제
      localStorage.removeItem("wallet_avatar");
      localStorage.removeItem("wallet_name");
      localStorage.removeItem("wallet_address");
      localStorage.removeItem("wallet_connected");

      // 기타 관련 캐시 삭제
      localStorage.removeItem("user_profile");
      localStorage.removeItem("user_preferences");
      localStorage.removeItem("wallet_signature");
    }

    // 4. 로딩 상태 초기화
    setIsLoading(false);
  }, [setIsLoading]);

  const advancedConnect = useCallback(
    async (callback?: () => Promise<void>, skipSignature = false) => {
      setIsLoading(true);
      try {
        await ensureWalletSelected();

        const selectedWallet = walletRef.current;
        if (!selectedWallet) {
          throw new Error("No wallet selected");
        }

        // Check if wallet is already connected
        if (connected && publicKey) {
          // Wallet is already connected, check if we need signature
          if (skipSignature) {
            setIsLoading(false);
            if (callback) callback();
            return;
          }
        } else {
          const connectFn = connectRef.current;
          if (!connectFn) throw new Error("Connect function unavailable");
          await connectFn();

          // Wait for publicKey to be ready after connect
          await waitForPublicKey();
        }

        // Get the actual publicKey from the selected wallet
        const currentWallet = walletRef.current as any;
        const actualPublicKey =
          currentWallet?.adapter?.publicKey ??
          currentWallet?.publicKey ??
          publicKeyRef.current ??
          null;
        const signMessageFn =
          currentWallet?.adapter?.signMessage ?? signMessage;

        // Check if signature is required and not skipped
        if (signMessageFn && actualPublicKey && !skipSignature) {
          setIsSignatureRequired(true);
          setShowSignatureModal(true);
          setPendingCallback(callback || null);

          try {
            await handleSignature(callback);
          } catch (signatureError) {
            // keep modal open for manual retry via the UI
            setIsLoading(false);
          }

          // Don't complete connection until signature is done
          // The signature completion will be handled in handleSignature
        } else {
          // If no signature required, complete connection immediately
          setTimeout(() => {
            setIsLoading(false);
            if (callback) callback();
          }, 300);
        }
      } catch (error) {
        // WalletConnectionError 처리 (콘솔 로그 제거)
        // 사용자에게는 기본 에러 메시지만 표시

        setIsLoading(false);
      }
    },
    [
      publicKey,
      setIsLoading,
      ensureWalletSelected,
      signMessage,
      connected,
      waitForPublicKey,
      handleSignature,
    ]
  );

  return {
    select,
    connect,
    wallet,
    publicKey,
    disconnect,
    connected,
    disconnecting,
    advancedConnect,
    advancedSelect,
    isLoading,
    setIsLoading,
    // Signature modal states
    showSignatureModal,
    isSignatureRequired,
    handleSignature,
    handleCloseSignatureModal,
    signatureMessage: messageText,
    // Enhanced disconnect with cache clearing
    handleDisconnect,
  };
};
