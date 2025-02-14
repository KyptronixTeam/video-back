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
    console.log(`User ${clientId} is calling user ${userId}`);
    if (activeCalls[userId]) {
      console.log(`User ${userId} is busy. Notifying ${clientId}`);
      socket.emit("user-busy");
      return;
    }

    activeCalls[userId] = clientId;
    activeCalls[clientId] = userId;

    console.log(`Notifying user ${userId} about incoming call from ${clientId}`);
    io.to(userId).emit("incoming-call", { from: clientId });
  });

  socket.on("accept-call", ({ userId, clientId }) => {
    console.log(`User ${userId} accepted call from ${clientId}`);
    io.to(clientId).emit("call-accepted", { from: userId });
  });

  socket.on("offer", (data) => {
    console.log(`Offer received from ${data.from} to ${data.to}`);
    io.to(data.to).emit("offer", { from: data.from, offer: data.offer });
  });

  socket.on("answer", (data) => {
    console.log(`Answer received from ${data.from} to ${data.to}`);
    io.to(data.to).emit("answer", { from: data.from, answer: data.answer });
  });

  socket.on("ice-candidate", (data) => {
    console.log(`ICE candidate received from ${data.from} to ${data.to}`);
    io.to(data.to).emit("ice-candidate", { from: data.from, candidate: data.candidate });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    Object.keys(activeCalls).forEach((key) => {
      if (activeCalls[key] === socket.id) {
        console.log(`Removing ${key} from active calls`);
        delete activeCalls[key];
      }
    });
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));