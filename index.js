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

let users = [];

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    if (users.length >= 4) {
      socket.emit("room-full");
      return;
    }
    users.push(socket.id);
    socket.join(roomId);
    socket.emit("users", users.filter((id) => id !== socket.id));
    socket.to(roomId).emit("user-joined", socket.id);
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
    users = users.filter((id) => id !== socket.id);
    io.emit("user-disconnected", socket.id);
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
