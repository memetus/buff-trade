"use client";
import { SocketType } from "@/shared/types/etc/socket";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SocketContext } from "./SocketContext";

type Props = {
  children: ReactNode;
};

const SocketProvider = ({ children }: Props) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socket, setSocket] = useState<SocketType | null>(null);

  useEffect(() => {
    const socket: SocketType = io(
      `wss://dev-launch-webserver.memetus.asia/token`,
      {
        transports: ["websocket"],
        addTrailingSlash: true,
        rejectUnauthorized: false,
        agent: false,
        upgrade: false,
      }
    ).connect();

    setSocket(socket);

    function onError(error: Error) {
      throw new Error(error.message);
    }

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);

      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

export default SocketProvider;
