import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Firebase Admin is kept for potential future use, but direct Firestore updates 
// from the server are disabled to avoid permission issues in this environment.
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

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

    socket.on("user_online", async (userData) => {
      onlineUsers.set(socket.id, userData);
      io.emit("update_online_users", Array.from(onlineUsers.values()));
      
      // Firestore updates are disabled on the server-side in this environment 
      // to avoid PERMISSION_DENIED errors. Presence is handled via Socket.IO 
      // and client-side heartbeats.
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

    socket.on("accept_invite", ({ roomId, fromUserId, toUserId, gameType }) => {
      socket.join(roomId);
      // Notify both players specifically
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === fromUserId || user.uid === toUserId) {
          io.to(id).emit("match_started", { roomId, fromUserId, toUserId, gameType });
        }
      }
    });

    socket.on("decline_invite", ({ fromUserId, toUserId, fromUserName }) => {
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === fromUserId) {
          io.to(id).emit("invite_declined", { toUserId, fromUserName });
        }
      }
    });

    socket.on("send_private_message", ({ toUserId, message }) => {
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === toUserId) {
          io.to(id).emit("receive_private_message", message);
        }
      }
    });

    socket.on("send_rematch", ({ toUserId, fromUser, roomId, gameType }) => {
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === toUserId) {
          io.to(id).emit("receive_rematch", { fromUser, roomId, gameType });
        }
      }
    });

    socket.on("accept_rematch", ({ roomId, gameType }) => {
      io.to(roomId).emit("rematch_reset", { gameType });
    });

    socket.on("decline_rematch", ({ roomId, toUserId }) => {
      for (const [id, user] of onlineUsers.entries()) {
        if (user.uid === toUserId) {
          io.to(id).emit("rematch_declined", { roomId });
        }
      }
    });

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("forfeit", ({ roomId, userId }) => {
      socket.to(roomId).emit("opponent_forfeited", { userId });
    });

    socket.on("make_move", ({ roomId, move }) => {
      socket.to(roomId).emit("receive_move", move);
    });

    socket.on("typing_status", ({ roomId, toUserId, isTyping, userName }) => {
      if (toUserId) {
        // Private chat
        for (const [id, user] of onlineUsers.entries()) {
          if (user.uid === toUserId) {
            io.to(id).emit("user_typing", { roomId, userId: socket.id, userName, isTyping });
          }
        }
      } else {
        // Global/Public chat
        socket.to(roomId).emit("user_typing", { roomId, userId: socket.id, userName, isTyping });
      }
    });

    socket.on("disconnect", async () => {
      const userData = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      io.emit("update_online_users", Array.from(onlineUsers.values()));
      console.log("User disconnected");
      
      // Offline status is handled via Socket.IO broadcast above.
      // Firestore update is skipped to avoid permission issues.
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
