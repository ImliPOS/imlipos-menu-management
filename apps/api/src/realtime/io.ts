import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import {
  CLIENT_EVENTS,
  ROOM,
  SERVER_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type ItemUpdatedPayload,
  type CategoryUpdatedPayload,
  type MenuRefreshPayload,
} from "@imlipos/contracts";
import { eq } from "drizzle-orm";
import { verifyDeviceToken, verifySupabaseToken } from "../auth/tokens.js";
import { db, schema } from "../db/client.js";
import { env } from "../env.js";

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initIO(server: HttpServer) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  /** Authenticate the socket handshake: either a device token or an owner token. */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("missing token"));
    try {
      // Device tokens win first; fall back to Supabase owner tokens.
      try {
        const d = await verifyDeviceToken(token);
        socket.data.kind = "device";
        socket.data.shopId = d.shopId;
        socket.data.screenId = d.screenId;
        socket.data.deviceId = d.sub;
      } catch {
        const user = await verifySupabaseToken(token);
        const [shop] = await db
          .select({ id: schema.shops.id })
          .from(schema.shops)
          .where(eq(schema.shops.ownerId, user.userId))
          .limit(1);
        socket.data.kind = "owner";
        socket.data.shopId = shop?.id;
      }
      next();
    } catch {
      next(new Error("invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // A device auto-joins its own room (targeted un-pair / layout refresh) and
    // the shop-devices room (any menu change → refetch).
    if (socket.data.kind === "device" && socket.data.deviceId) {
      socket.join(ROOM.device(socket.data.deviceId));
      if (socket.data.shopId) socket.join(ROOM.shopDevices(socket.data.shopId));
    }
    socket.on(CLIENT_EVENTS.joinScreen, (screenId) => {
      // Only allow a device to join the screen its token is scoped to.
      if (socket.data.kind === "device" && socket.data.screenId === screenId) {
        socket.join(ROOM.screen(screenId));
      }
    });
    socket.on(CLIENT_EVENTS.joinShop, (shopIdArg) => {
      if (socket.data.kind === "owner" && socket.data.shopId === shopIdArg) {
        socket.join(ROOM.shop(shopIdArg));
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

export function emitItemUpdated(screenIds: string[], p: ItemUpdatedPayload) {
  for (const id of screenIds)
    getIO().to(ROOM.screen(id)).emit(SERVER_EVENTS.itemUpdated, { ...p, screenId: id });
}

export function emitCategoryUpdated(
  screenIds: string[],
  p: CategoryUpdatedPayload,
) {
  for (const id of screenIds)
    getIO()
      .to(ROOM.screen(id))
      .emit(SERVER_EVENTS.categoryUpdated, { ...p, screenId: id });
}

export function emitMenuRefresh(screenId: string, p: MenuRefreshPayload) {
  getIO().to(ROOM.screen(screenId)).emit(SERVER_EVENTS.menuRefresh, p);
}

export function emitScreenReassigned(screenId: string) {
  getIO()
    .to(ROOM.screen(screenId))
    .emit(SERVER_EVENTS.screenReassigned, { screenId });
}

/** Tell a specific device to un-pair immediately (removed/revoked). */
export function emitDeviceUnpaired(deviceId: string) {
  getIO().to(ROOM.device(deviceId)).emit(SERVER_EVENTS.deviceUnpaired);
}

/** Tell one device to refetch (e.g. its layout changed). */
export function emitDeviceRefresh(deviceId: string) {
  getIO()
    .to(ROOM.device(deviceId))
    .emit(SERVER_EVENTS.menuRefresh, { screenId: deviceId, version: Date.now() });
}

/** Tell every layout-based display in a shop to refetch (menu changed). */
export function emitShopMenuChanged(shopId: string) {
  getIO()
    .to(ROOM.shopDevices(shopId))
    .emit(SERVER_EVENTS.menuRefresh, { screenId: shopId, version: Date.now() });
}
