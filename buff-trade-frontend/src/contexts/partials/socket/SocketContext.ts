import { SocketType } from "@/shared/types/etc/socket";
import { Context, createContext } from "react";

type SocketContextType = {
  socket: SocketType | null;
  isConnected?: boolean;
};

const defaultValue: SocketContextType = {
  socket: null,
  isConnected: false,
};

export const SocketContext: Context<SocketContextType> =
  createContext<SocketContextType>(defaultValue);
