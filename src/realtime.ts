import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

let io: Server | null = null;

export function initRealtime(server: HttpServer, allowedOrigins: string[]) {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  });
  return io;
}

export type ChangeScope = "phones" | "investments" | "payments" | "ledger" | "auth";

/**
 * Tells every connected client (both roles) that something changed, so pages can
 * silently refetch instead of requiring a manual reload. Deliberately coarse-grained —
 * this is a small internal app, not a high-traffic product, so "refetch this scope" is
 * simpler and safer than hand-maintaining precise diffs everywhere.
 */
export function broadcastChange(scope: ChangeScope) {
  io?.emit("data:changed", { scope, at: new Date().toISOString() });
}
