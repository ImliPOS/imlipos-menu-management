export * from "./menu";
export * from "./screen";
export * from "./device";
export * from "./socket";

/** Auth token claim shapes shared across services. */
export interface OwnerClaims {
  sub: string; // user id
  shopId: string;
  email?: string;
}

export interface DeviceClaims {
  sub: string; // device id
  shopId: string;
  screenId: string;
  kind: "device";
}
