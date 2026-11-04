import { Server as IOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: IOServer | null = null;

export type ChangeScope =
  | "phones"
  | "dashboard"
  | "investments"
  | "ledger"
  | "shop-payments";

export function initSocket(httpServer: HTTPServer, allowedOrigins: string[]) {
  io = new IOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  return io;
}

/**
 * Broadcast "something changed" to every connected client (owner and shop dashboards
 * alike). Clients decide whether a given scope is relevant to what they currently have
 * open and refetch accordingly — this keeps the server side dead simple while still
 * giving every screen live updates with no page reload.
 */
export function broadcastChange(scope: ChangeScope) {
  io?.emit("data:changed", { scope, at: Date.now() });
}
