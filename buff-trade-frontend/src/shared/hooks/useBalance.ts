"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKey } from "../constants/queryKey";
import { fetchBalance } from "@/shared/api/onchain";

export const useBalance = (address: string | null) => {
  const { data, isLoading, error, isEnabled } = useQuery<
    { result: { value: number } } | undefined
  >({
    queryKey: [queryKey.fetchBalance, address],
    queryFn: () => fetchBalance(address),
  });

  return {
    balance: data?.result?.value ?? 0,
    isLoading,
    error,
    isEnabled,
  };
};
