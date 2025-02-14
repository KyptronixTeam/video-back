const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store active calls
const activeCalls = {}; // { userId: socketId }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("call-user", ({ userId, clientId }) => {
    if (activeCalls[userId]) {
      socket.emit("user-busy");
      return;
    }

    activeCalls[userId] = clientId;
    activeCalls[clientId] = userId;

    io.to(userId).emit("incoming-call", { from: clientId });
  });

  socket.on("accept-call", ({ userId, clientId }) => {
    io.to(clientId).emit("call-accepted", { from: userId });
  });

  socket.on("offer", (data) => {
    io.to(data.to).emit("offer", { from: data.from, offer: data.offer });
  });

  socket.on("answer", (data) => {
    io.to(data.to).emit("answer", { from: data.from, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    io.to(data.to).emit("ice-candidate", { from: data.from, candidate: data.candidate });
  });

  socket.on("disconnect", () => {
    Object.keys(activeCalls).forEach((key) => {
      if (activeCalls[key] === socket.id) {
        delete activeCalls[key];
      }
    });

    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));