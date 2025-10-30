import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/shared/api/profile";
import type { ProfileTokenResponse } from "@/shared/types/data/profile";
import { useAuth } from "@/shared/hooks/useAuth";

export const useProfileTokens = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery<ProfileTokenResponse>({
    queryKey: ["profile", "tokens"],
    queryFn: profileApi.getTokens,
    enabled: isAuthenticated && !authLoading,
  });
};

export const useRewards = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery<number>({
    queryKey: ["profile", "rewards"],
    queryFn: profileApi.getRewards,
    enabled: isAuthenticated && !authLoading,
  });
};
