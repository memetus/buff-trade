import { useCallback, useState } from "react";

export const useCopy = () => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string | null>(null);

  const handleTextCopy = useCallback((text: string, timeout: number = 1000) => {
    setCopyText(text);
    navigator.clipboard.writeText(text);

    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      setCopyText(null);
    }, timeout);
  }, []);

  return {
    isCopied,
    copyText,
    textCopy: handleTextCopy,
  };
};
