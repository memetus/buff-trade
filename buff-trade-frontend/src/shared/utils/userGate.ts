/**
 * Utilities for synchronizing user gating info (whitelist, agentCount) from backend
 */

/**
 * Login with the given wallet and refresh `/users/detail` to sync
 * `accessToken`, `agentCount`, and `isWhitelisted` into localStorage.
 *
 * Returns true if sync succeeded, false otherwise.
 */
export async function syncAgentGateInfo(
  walletAddress?: string
): Promise<boolean> {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    // If we have a wallet address, perform a login to refresh accessToken
    if (walletAddress) {
      try {
        const loginRes = await fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress, timezone }),
        });

        if (loginRes.ok) {
          const loginJson = await loginRes.json();
          if (loginJson?.accessToken) {
            localStorage.setItem("accessToken", loginJson.accessToken);
          }
        }
      } catch (e) {
        // ignore login errors; we might already have a valid token
      }
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      return false;
    }

    const detailRes = await fetch("/api/users/detail", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!detailRes.ok) {
      return false;
    }

    const detailJson = await detailRes.json();

    // agentCount 검증 제거됨 - isInvited 인증으로 전환
    if (detailJson?.userInfo?.avatarUrl) {
      localStorage.setItem("wallet_avatar", detailJson.userInfo.avatarUrl);
    }
    if (detailJson?.userInfo?.username) {
      localStorage.setItem("wallet_name", detailJson.userInfo.username);
    }

    return true;
  } catch (error) {
    return false;
  }
}
