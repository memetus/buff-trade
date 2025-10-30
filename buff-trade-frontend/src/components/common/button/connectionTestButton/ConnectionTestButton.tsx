"use client";
import { useState } from "react";
import { useConnectionTest } from "@/shared/hooks/useConnectionTest";
import cx from "classnames";
import styles from "./ConnectionTestButton.module.scss";

interface ConnectionTestButtonProps {
  className?: string;
}

const ConnectionTestButton = ({ className }: ConnectionTestButtonProps) => {
  const { testConnection, isTesting, testResult } = useConnectionTest();

  const handleTest = async () => {
    await testConnection();
  };

  return (
    <div className={cx(styles.container, className)}>
      <button
        className={cx(styles.button, { [styles.loading]: isTesting })}
        onClick={handleTest}
        disabled={isTesting}
      >
        {isTesting ? "🧪 Testing..." : "🧪 Test Network Connection"}
      </button>

      {testResult && (
        <div
          className={cx(styles.result, {
            [styles.success]: testResult.success,
            [styles.error]: !testResult.success,
          })}
        >
          <div className={styles.message}>{testResult.message}</div>

          {testResult.success && testResult.tests && (
            <div className={styles.details}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Network:</span>
                <span className={styles.value}>{testResult.network}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Endpoint:</span>
                <span className={styles.value}>{testResult.endpoint}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Blockhash:</span>
                <span className={styles.value}>
                  {testResult.tests.blockhash?.slice(0, 8)}...
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Genesis Hash:</span>
                <span className={styles.value}>
                  {testResult.tests.genesisHash?.slice(0, 8)}...
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Cluster Nodes:</span>
                <span className={styles.value}>
                  {testResult.tests.clusterNodes}
                </span>
              </div>
            </div>
          )}

          {!testResult.success && testResult.error && (
            <div className={styles.errorDetails}>
              <div className={styles.errorText}>{testResult.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTestButton;
