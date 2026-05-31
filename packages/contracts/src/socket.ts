import { z } from "zod";

/**
 * Socket.IO event contract — shared by the API server, the web admin, and the
 * TV client so payload shapes can never drift between them.
 *
 * Room convention:
 *   - TV clients join   `screen:{screenId}`
 *   - Admin clients join `shop:{shopId}`
 */

export const ROOM = {
  screen: (screenId: string) => `screen:${screenId}` as const,
  shop: (shopId: string) => `shop:${shopId}` as const,
};

/** Server → client events. */
export const SERVER_EVENTS = {
  itemUpdated: "item.updated",
  categoryUpdated: "category.updated",
  screenReassigned: "screen.reassigned",
  menuRefresh: "menu.refresh",
} as const;

/** Client → server events. */
export const CLIENT_EVENTS = {
  /** Device authenticates + joins its screen room. */
  joinScreen: "join.screen",
  /** Admin joins its shop room to sync multiple tabs. */
  joinShop: "join.shop",
} as const;

export const itemUpdatedPayload = z.object({
  screenId: z.string().uuid(),
  itemId: z.string().uuid(),
  isAvailable: z.boolean(),
  version: z.number().int(),
});
export type ItemUpdatedPayload = z.infer<typeof itemUpdatedPayload>;

export const categoryUpdatedPayload = z.object({
  screenId: z.string().uuid(),
  categoryId: z.string().uuid(),
  isAvailable: z.boolean(),
  version: z.number().int(),
});
export type CategoryUpdatedPayload = z.infer<typeof categoryUpdatedPayload>;

export const screenReassignedPayload = z.object({
  /** New screen the device should switch to. */
  screenId: z.string().uuid(),
});
export type ScreenReassignedPayload = z.infer<typeof screenReassignedPayload>;

/** Tells a TV its cached snapshot is stale and it should refetch. */
export const menuRefreshPayload = z.object({
  screenId: z.string().uuid(),
  version: z.number().int(),
});
export type MenuRefreshPayload = z.infer<typeof menuRefreshPayload>;

/** Typed maps for socket.io generics on both ends. */
export interface ServerToClientEvents {
  "item.updated": (p: ItemUpdatedPayload) => void;
  "category.updated": (p: CategoryUpdatedPayload) => void;
  "screen.reassigned": (p: ScreenReassignedPayload) => void;
  "menu.refresh": (p: MenuRefreshPayload) => void;
}

export interface ClientToServerEvents {
  "join.screen": (screenId: string) => void;
  "join.shop": (shopId: string) => void;
}
