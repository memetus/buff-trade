import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query";
import { jsonFetch } from "./client";

export type VerifyInviteResponse = {
  accessToken?: string;
  isInvited?: boolean;
  [key: string]: unknown;
};

export const useVerifyInviteMutation = (
  options?: UseMutationOptions<
    VerifyInviteResponse,
    Error,
    { inviteCode: string }
  >
) => {
  return useMutation<VerifyInviteResponse, Error, { inviteCode: string }>({
    mutationKey: ["verify-invite"],
    mutationFn: ({ inviteCode }) => {
      // accessToken 확인
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          throw new Error("Access token not found. Please login first.");
        }
      }

      return jsonFetch<VerifyInviteResponse>("/api/users/verify-invited", {
        method: "POST",
        headers: (() => {
          const base: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (typeof window !== "undefined") {
            try {
              const token = localStorage.getItem("accessToken");
              if (token) {
                base.Authorization = `Bearer ${token}`;
              } else {
              }
            } catch (error) {}
          }
          return base;
        })(),
        body: JSON.stringify({ inviteCode }),
      });
    },
    ...options,
  });
};

export type LoginResponse = {
  accessToken?: string;
  avatarUrl?: string;
  username?: string;
  [key: string]: unknown;
};

export const useLoginMutation = (
  options?: UseMutationOptions<
    LoginResponse,
    Error,
    { wallet: string; timezone: string }
  >
) => {
  return useMutation<
    LoginResponse,
    Error,
    { wallet: string; timezone: string }
  >({
    mutationKey: ["login"],
    mutationFn: ({ wallet, timezone }) =>
      jsonFetch<LoginResponse>("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, timezone }),
      }),
    ...options,
  });
};

export type UserDetailResponse = {
  userInfo?: {
    avatarUrl?: string;
    username?: string;
  };
  agentCount?: number;
  isInvited?: boolean;
  [key: string]: unknown;
};

const fetchUserDetail = async (): Promise<UserDetailResponse> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
  }
  return jsonFetch<UserDetailResponse>("/api/users/detail", {
    method: "GET",
    headers,
  });
};

export const useUserDetailQuery = (
  options?: Omit<
    UseQueryOptions<UserDetailResponse, Error, UserDetailResponse, any>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<UserDetailResponse, Error>({
    queryKey: ["user-detail"],
    queryFn: fetchUserDetail,
    ...options,
  });
};
