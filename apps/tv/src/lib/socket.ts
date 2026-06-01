import { io, type Socket } from "socket.io-client";
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from "@imlipos/contracts";
import { SOCKET_URL } from "./config";

export type TvSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectSocket(
  deviceToken: string,
  screenId: string,
  handlers: {
    onItemUpdated: (itemId: string, isAvailable: boolean) => void;
    onCategoryUpdated: (categoryId: string, isAvailable: boolean) => void;
    onRefresh: () => void;
    onReassigned: (screenId: string) => void;
    onReconnect: () => void;
    onUnpair: () => void;
  },
): TvSocket {
  const socket: TvSocket = io(SOCKET_URL, {
    auth: { token: deviceToken },
    transports: ["websocket"],
  });

  socket.on("connect", () => socket.emit(CLIENT_EVENTS.joinScreen, screenId));
  socket.io.on("reconnect", () => {
    socket.emit(CLIENT_EVENTS.joinScreen, screenId);
    handlers.onReconnect(); // re-fetch authoritative state
  });

  socket.on(SERVER_EVENTS.itemUpdated, (p) =>
    handlers.onItemUpdated(p.itemId, p.isAvailable),
  );
  socket.on(SERVER_EVENTS.categoryUpdated, (p) =>
    handlers.onCategoryUpdated(p.categoryId, p.isAvailable),
  );
  socket.on(SERVER_EVENTS.menuRefresh, () => handlers.onRefresh());
  socket.on(SERVER_EVENTS.screenReassigned, (p) =>
    handlers.onReassigned(p.screenId),
  );
  socket.on(SERVER_EVENTS.deviceUnpaired, () => handlers.onUnpair());

  return socket;
}
