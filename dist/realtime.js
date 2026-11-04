"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRealtime = initRealtime;
exports.broadcastChange = broadcastChange;
const socket_io_1 = require("socket.io");
let io = null;
function initRealtime(server, allowedOrigins) {
    io = new socket_io_1.Server(server, {
        cors: { origin: allowedOrigins, credentials: true },
    });
    return io;
}
/**
 * Tells every connected client (both roles) that something changed, so pages can
 * silently refetch instead of requiring a manual reload. Deliberately coarse-grained —
 * this is a small internal app, not a high-traffic product, so "refetch this scope" is
 * simpler and safer than hand-maintaining precise diffs everywhere.
 */
function broadcastChange(scope) {
    io?.emit("data:changed", { scope, at: new Date().toISOString() });
}
