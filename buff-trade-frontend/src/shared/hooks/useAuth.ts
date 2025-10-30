"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    accessToken: null,
  });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;

      const accessToken = localStorage.getItem("accessToken");
      const isAuthenticated = !!accessToken;

      setAuthState({
        isAuthenticated,
        isLoading: false,
        accessToken,
      });

      // 인증되지 않은 경우 landing 페이지로 리다이렉트 (개발 환경에서만)
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment && !isAuthenticated) {
        router.push("/");
      }
    };

    checkAuth();

    // localStorage 변경 감지
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "accessToken") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("wallet_avatar");
    localStorage.removeItem("wallet_name");
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
    });
    router.push("/");
  };

  return {
    ...authState,
    logout,
  };
};
