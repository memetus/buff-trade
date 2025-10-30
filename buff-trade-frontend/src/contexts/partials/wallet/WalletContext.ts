import {
  Context,
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
} from "react";

export type WalletContextType = {
  address: string | null;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};

const defaultValue: WalletContextType = {
  address: null,
  isLoading: false,
  setIsLoading: () => {},
};

export const WalletContext: Context<WalletContextType> =
  createContext<WalletContextType>(defaultValue);

export const useWalletContext = (): WalletContextType => {
  return useContext(WalletContext);
};
