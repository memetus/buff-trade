"use client";
import { useSocket } from "@/contexts/partials/socket/SocketProvider";
import React, { useEffect } from "react";

const SocketCheckButton = () => {
  const { socket } = useSocket();


  useEffect(() => {
    socket?.on("tokens", (data: string) => {
    });
  }, [socket]);
  return <div></div>;
};

export default SocketCheckButton;
