"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.broadcastChange = broadcastChange;
const socket_io_1 = require("socket.io");
let io = null;
function initSocket(httpServer, allowedOrigins) {
    io = new socket_io_1.Server(httpServer, {
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
function broadcastChange(scope) {
    io?.emit("data:changed", { scope, at: Date.now() });
}
