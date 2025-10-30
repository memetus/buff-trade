import { Socket } from "socket.io-client";

export interface BaseSocketEvent {
  basicEmit: (event: string, data: Buffer) => void;
  error: (error: Error) => void;
}

export interface SocketEvent extends BaseSocketEvent {
  tokens: (data: string) => void;
}

export type SocketType = Socket<SocketEvent>;
