"use client";
import WalletConnectModal from "@/components/common/modal/walletConnectModal/WalletConnectModal";
import LoginFlowModal from "@/components/common/modal/loginFlowModal/LoginFlowModal";
import { getModal } from "@/contexts/global/slice/modalSlice";
import { RootState } from "@/contexts/global/store";
import WalletProvider from "@/contexts/partials/wallet/WalletProvider";
import React, { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Reactotron from "reactotron-react-js";
import { setupFetchInterceptor } from "@/utils/fetchInterceptor";

type Props = {
  children: ReactNode;
};

const AppProvider = ({ children }: Props) => {
  const walletConnectModal = useSelector((state: RootState) =>
    getModal(state as RootState, "wallet-modal")
  );
  const loginFlowModal = useSelector((state: RootState) =>
    getModal(state as RootState, "login-flow-modal")
  );
  const dispatch = useDispatch();

  // Reactotron 초기화 (비활성화)
  useEffect(() => {
    // Reactotron 비활성화 - WebSocket 연결 오류 방지
    // if (process.env.NODE_ENV === "development") {
    //   // Reactotron 설정
    //   Reactotron.configure({
    //     host: "localhost",
    //     port: 9090,
    //     name: "HomoDotFun App",
    //   }).connect();
    //   // Reactotron 연결 완료 후 인터셉터 설정
    //   const timer = setTimeout(() => {
    //     setupFetchInterceptor();
    //   }, 1000); // 1초 후 인터셉터 설정
    //   return () => clearTimeout(timer);
    // }
  }, []);

  return (
    <WalletProvider>
      {children}
      <section id="modal-root" />
      {walletConnectModal && <WalletConnectModal />}
      {loginFlowModal && (
        <LoginFlowModal
          isOpen={Boolean(loginFlowModal)}
          onClose={() =>
            dispatch({
              type: "modal/CLOSE_MODAL",
              payload: { key: "login-flow-modal" },
            })
          }
        />
      )}
    </WalletProvider>
  );
};

export default AppProvider;
