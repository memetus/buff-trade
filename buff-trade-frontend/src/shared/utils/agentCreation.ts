/**
 * 에이전트 생성 관련 유틸리티 함수들
 */

export interface AgentCreationCondition {
  canCreate: boolean;
  reason?: string;
  agentCount: number;
  isWhitelisted: boolean;
}

/**
 * 에이전트 생성 가능 여부를 확인합니다.
 * 조건: 모든 검증 제거됨 (isInvited 인증된 사용자는 무제한 생성 가능)
 */
export const checkAgentCreationCondition = (): AgentCreationCondition => {
  if (typeof window === "undefined") {
    return {
      canCreate: false,
      reason: "Client-side only",
      agentCount: 0,
      isWhitelisted: true,
    };
  }

  const agentCountStr = localStorage.getItem("agentCount");
  const agentCount = agentCountStr ? parseInt(agentCountStr, 10) : 0;

  // 모든 검증 제거 - isInvited로 인증된 사용자는 무제한 생성 가능
  return {
    canCreate: true,
    agentCount,
    isWhitelisted: true,
  };
};

/**
 * 에이전트 생성 불가 시 표시할 알림 메시지를 반환합니다.
 */
export const getAgentCreationAlertMessage = (
  condition: AgentCreationCondition
): string => {
  if (condition.canCreate) {
    return "";
  }

  return "You cannot create agents at this time.";
};

/**
 * 에이전트 생성 가능 여부를 확인하고 알림을 표시합니다.
 */
export const showAgentCreationAlert = (): boolean => {
  const condition = checkAgentCreationCondition();

  if (!condition.canCreate) {
    const message = getAgentCreationAlertMessage(condition);
    alert(message);
    return false;
  }

  return true;
};

/**
 * 에이전트 생성 성공 후 agentCount를 증가시킵니다.
 */
export const incrementAgentCount = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const currentCount = parseInt(localStorage.getItem("agentCount") || "0", 10);
  const newCount = currentCount + 1;
  localStorage.setItem("agentCount", newCount.toString());
};

/**
 * 에이전트 생성 실패 시 agentCount를 감소시킵니다 (롤백용).
 */
export const decrementAgentCount = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const currentCount = parseInt(localStorage.getItem("agentCount") || "0", 10);
  const newCount = Math.max(0, currentCount - 1);
  localStorage.setItem("agentCount", newCount.toString());
};
