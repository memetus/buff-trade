import type { ProfileTokenResponse } from "@/shared/types/data/profile";

export const profileApi = {
  async getTokens(): Promise<ProfileTokenResponse> {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    if (!token) {
      throw new Error("No access token found");
    }

    try {
      const response = await fetch("/api/profile/token", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("profileApi: API error response:", errorText);

        // 401 에러 시 토큰 만료로 간주하고 토큰 제거
        if (response.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
          }
        }

        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("profileApi: Fetch error:", error);
      throw error;
    }
  },

  async getRewards(): Promise<number> {
    try {
      const data = await profileApi.getTokens();
      const rewards =
        data?.tokenInfoList?.reduce((total, token) => {
          return total + (token.unclaimedRewards || 0);
        }, 0) || 0;
      return rewards;
    } catch (error) {
      console.error("profileApi: Error calculating rewards:", error);
      throw error;
    }
  },
};
