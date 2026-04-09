import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Socket.io Logic
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("user_online", (userData) => {
      onlineUsers.set(socket.id, userData);
      io.emit("update_online_users", Array.from(onlineUsers.values()));
    });

    socket.on("send_global_chat", (message) => {
      io.emit("receive_global_chat", message);
    });

    socket.on("send_game_invite", ({ toUserId, fromUser, gameType }) => {
      // Find the specific socket for the target user
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === toUserId) {
          io.to(id).emit("receive_game_invite", { toUserId, fromUser, gameType });
        }
      }
    });

    socket.on("accept_invite", ({ roomId, fromUserId, toUserId }) => {
      socket.join(roomId);
      // Notify both players specifically
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === fromUserId || user.uid === toUserId) {
          io.to(id).emit("match_started", { roomId, fromUserId, toUserId });
        }
      }
    });

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("make_move", ({ roomId, move }) => {
      socket.to(roomId).emit("receive_move", move);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);
      io.emit("update_online_users", Array.from(onlineUsers.values()));
      console.log("User disconnected");
    });
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
