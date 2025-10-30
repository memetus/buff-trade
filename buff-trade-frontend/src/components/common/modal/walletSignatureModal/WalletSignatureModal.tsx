import React, { useState } from "react";
import styles from "./WalletSignatureModal.module.scss";
import classNames from "classnames/bind";

const cx = classNames.bind(styles);

interface WalletSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: () => Promise<void>;
  walletAddress?: string;
  isLoading?: boolean;
  signatureMessage?: string;
}

const WalletSignatureModal: React.FC<WalletSignatureModalProps> = ({
  isOpen,
  onClose,
  onSign,
  walletAddress,
  isLoading = false,
  signatureMessage = "",
}) => {
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async () => {
    setIsSigning(true);
    try {
      await onSign();
    } catch (error) {
    } finally {
      setIsSigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cx("modal-overlay")}>
      <div className={cx("modal-container")}>
        {/* Header */}
        <div className={cx("modal-header")}>
          <h2 className={cx("modal-title")}>Wallet Authentication</h2>
          <button className={cx("close-button")} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className={cx("modal-content")}>
          {/* Icon */}
          <div className={cx("wallet-icon")}>
            <div className={cx("icon-circle")}>
              <div className={cx("icon-face")}>
                <div className={cx("eyes")}>
                  <div className={cx("eye")}></div>
                  <div className={cx("eye")}></div>
                </div>
                <div className={cx("mouth")}></div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className={cx("content-title")}>Sign Message</h3>
          <p className={cx("content-subtitle")}>
            Sign a message with the wallet you want to use to sign in
          </p>

          {/* Warning */}
          <div className={cx("warning-box")}>
            <p className={cx("warning-text")}>
              Linking this wallet will make your wallet address public
            </p>
          </div>

          {/* Wallet Address */}
          <div className={cx("wallet-address-section")}>
            <label className={cx("address-label")}>Wallet Address</label>
            <div className={cx("address-input-container")}>
              <input
                type="text"
                value={walletAddress || ""}
                readOnly
                className={cx("address-input")}
              />
              <button className={cx("copy-button")}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Message to Sign */}
          <div className={cx("message-section")}>
            <label className={cx("message-label")}>Message to Sign</label>
            <div className={cx("message-content")}>
              <pre className={cx("message-text")}>
                {signatureMessage || "Loading message..."}
              </pre>
            </div>
          </div>

          {/* Hardware Wallet Checkbox */}
          <div className={cx("hardware-wallet-section")}>
            <label className={cx("checkbox-container")}>
              <input type="checkbox" className={cx("checkbox")} />
              <span className={cx("checkbox-text")}>
                I&apos;m using Ledger or hardware wallet
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={cx("modal-footer")}>
          <button
            className={cx("cancel-button")}
            onClick={onClose}
            disabled={isSigning}
          >
            Cancel
          </button>
          <button
            className={cx("sign-button")}
            onClick={handleSign}
            disabled={isSigning || isLoading}
          >
            {isSigning ? "Signing..." : "Sign Message"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletSignatureModal;
