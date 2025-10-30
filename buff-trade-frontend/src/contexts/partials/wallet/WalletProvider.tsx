"use client";
import React, { ReactNode, useMemo, useState } from "react";
import { WalletContext } from "./WalletContext";

type Props = {
  children: ReactNode;
};

const WalletProvider = ({ children }: Props) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const contextValue = useMemo(() => {
    return {
      address,
      isLoading,
      setIsLoading,
    };
  }, [address, isLoading, setIsLoading]);

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletProvider;
