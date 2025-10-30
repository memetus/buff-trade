import { useCallback, useState } from "react";

export const useConnectionTest = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-connection");
      const data = await response.json();

      setTestResult(data);
      return data;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "❌ Connection test failed",
      };
      setTestResult(errorResult);
      return errorResult;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return {
    testConnection,
    isTesting,
    testResult,
  };
};
